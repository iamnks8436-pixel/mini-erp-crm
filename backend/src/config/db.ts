import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface DbClient {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  release(): Promise<void>;
}

class DatabaseManager {
  private pgPool: pg.Pool | null = null;
  private pglite: PGlite | null = null;
  private isExternal = false;

  async init(): Promise<void> {
    const dbUrl = process.env.DATABASE_URL?.trim();

    if (dbUrl && (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://'))) {
      try {
        this.pgPool = new pg.Pool({
          connectionString: dbUrl,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        });
        // Test connection
        const res = await this.pgPool.query('SELECT 1 as connected');
        if (res.rows.length > 0) {
          this.isExternal = true;
          console.log('[Database] Connected to external PostgreSQL database at', dbUrl.split('@')[1] || 'URL');
          return;
        }
      } catch (err: any) {
        console.warn('[Database] Failed to connect to external DATABASE_URL, falling back to local persistent PostgreSQL engine:', err.message);
        this.pgPool = null;
      }
    }

    // Local persistent PGlite
    const dataDir = path.resolve(process.cwd(), '.data', 'postgres');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.pglite = new PGlite(dataDir);
    await this.pglite.waitReady;
    console.log('[Database] Initialized persistent local PostgreSQL engine in', dataDir);
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    if (!this.pgPool && !this.pglite) {
      await this.init();
    }

    if (this.isExternal && this.pgPool) {
      const res = await this.pgPool.query(sql, params);
      return {
        rows: res.rows as T[],
        rowCount: res.rowCount ?? res.rows.length,
      };
    } else if (this.pglite) {
      const res = await this.pglite.query(sql, params);
      return {
        rows: res.rows as T[],
        rowCount: res.rows.length,
      };
    } else {
      throw new Error('Database not initialized');
    }
  }

  async getClient(): Promise<DbClient> {
    if (!this.pgPool && !this.pglite) {
      await this.init();
    }

    if (this.isExternal && this.pgPool) {
      const client = await this.pgPool.connect();
      return {
        query: async <T = any>(sql: string, params: any[] = []) => {
          const res = await client.query(sql, params);
          return { rows: res.rows as T[], rowCount: res.rowCount ?? res.rows.length };
        },
        release: async () => {
          client.release();
        },
      };
    } else if (this.pglite) {
      // PGlite is single-instance in Node process; we wrap it with transaction methods
      return {
        query: async <T = any>(sql: string, params: any[] = []) => {
          const res = await this.pglite!.query(sql, params);
          return { rows: res.rows as T[], rowCount: res.rows.length };
        },
        release: async () => {
          // No-op for PGlite
        },
      };
    } else {
      throw new Error('Database not initialized');
    }
  }

  async transaction<T>(callback: (client: DbClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rbErr) {
        console.error('Error during rollback:', rbErr);
      }
      throw error;
    } finally {
      await client.release();
    }
  }
}

export const db = new DatabaseManager();

export async function runMigrations(): Promise<void> {
  const schemaPath = path.resolve(__dirname, '../db/schema.sql');
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found at: ${schemaPath}`);
  }
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Split schema into individual executable blocks or execute full text
  try {
    await db.query(schemaSql);
    console.log('[Database] Migrations executed successfully.');
  } catch (err: any) {
    // If multiple statements fail in one query in external pg, execute sequentially
    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      await db.query(stmt);
    }
    console.log('[Database] Migrations executed sequentially.');
  }
}
