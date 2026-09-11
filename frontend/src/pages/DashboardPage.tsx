import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Package,
  AlertTriangle,
  FileText,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { dashboardApi } from '../api';
import { DashboardStats } from '../types';
import { useAuth } from '../context/AuthContext';

export const DashboardPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dashboardApi.getStats();
      setStats(data.stats);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatCurrency = (amount: number | string) => {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <RefreshCw className="spin" size={32} style={{ color: 'var(--primary)', margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading operational metrics...</p>
        <style>{`
          .spin { animation: spin 1s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="alert-banner alert-danger">
        <AlertTriangle size={20} />
        <div>
          <strong>Error loading dashboard:</strong> {error}
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            style={{ marginLeft: '1rem' }}
            onClick={fetchStats}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.75rem 2rem',
          color: '#ffffff',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div>
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#38bdf8',
              marginBottom: '0.25rem',
            }}
          >
            Operations Overview
          </span>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Welcome back, {user?.name}
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Role: <strong>{user?.role}</strong> — Real-time operational stock, CRM pipelines, and delivery challans.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={fetchStats}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          {hasRole(['Admin', 'Sales']) && (
            <Link to="/challans/new" className="btn btn-primary btn-sm">
              <Plus size={16} />
              <span>Create Challan</span>
            </Link>
          )}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="metrics-grid">
        {/* Total Customers */}
        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
            <Users size={24} />
          </div>
          <div>
            <div className="metric-label">Total Customers</div>
            <div className="metric-value">{stats.totalCustomers}</div>
            <div className="metric-subtext">Active accounts & leads</div>
          </div>
        </div>

        {/* Total Products */}
        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
            <Package size={24} />
          </div>
          <div>
            <div className="metric-label">Catalog Products</div>
            <div className="metric-value">{stats.totalProducts}</div>
            <div className="metric-subtext">Across all warehouse zones</div>
          </div>
        </div>

        {/* Low Stock Products */}
        <div className="metric-card" style={stats.lowStockCount > 0 ? { borderColor: '#fde68a', backgroundColor: '#fffdf5' } : {}}>
          <div className="metric-icon-wrap" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="metric-label">Low Stock Alerts</div>
            <div className="metric-value" style={{ color: stats.lowStockCount > 0 ? '#b91c1c' : 'inherit' }}>
              {stats.lowStockCount}
            </div>
            <div className="metric-subtext" style={{ color: '#b91c1c', fontWeight: 600 }}>
              {stats.outOfStockCount > 0 ? `${stats.outOfStockCount} critical out-of-stock` : 'Below safety threshold'}
            </div>
          </div>
        </div>

        {/* Draft Challans */}
        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
            <FileText size={24} />
          </div>
          <div>
            <div className="metric-label">Draft Challans</div>
            <div className="metric-value">{stats.draftChallans}</div>
            <div className="metric-subtext">Pending confirmation / dispatch</div>
          </div>
        </div>

        {/* Confirmed Challans */}
        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="metric-label">Confirmed Challans</div>
            <div className="metric-value">{stats.confirmedChallans}</div>
            <div className="metric-subtext">Inventory deducted & fulfilled</div>
          </div>
        </div>

        {/* Revenue */}
        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#f5f3ff', color: '#7c3aed' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="metric-label">Fulfilled Revenue</div>
            <div className="metric-value" style={{ fontSize: '1.25rem' }}>
              {formatCurrency(stats.totalRevenue)}
            </div>
            <div className="metric-subtext">{stats.totalItemsSold} items shipped</div>
          </div>
        </div>
      </div>

      {/* Prominent Low Stock Alert Section */}
      {stats.lowStockProducts && stats.lowStockProducts.length > 0 && (
        <div className="card" style={{ borderColor: '#fed7aa' }}>
          <div className="card-header" style={{ backgroundColor: '#fff7ed' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <AlertTriangle size={20} color="#ea580c" />
              <h3 className="card-title" style={{ color: '#9a3412' }}>
                Inventory Replenishment Warnings ({stats.lowStockProducts.length} items)
              </h3>
            </div>
            <Link to="/inventory" className="btn btn-secondary btn-sm">
              <span>View Stock Movements</span>
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Product Details</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Warehouse Location</th>
                  <th>Current Stock</th>
                  <th>Min Safety Stock</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.lowStockProducts.map((p) => {
                  const isOut = p.current_stock === 0;
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.product_name}</td>
                      <td>
                        <span className="badge badge-neutral" style={{ fontFamily: 'monospace' }}>
                          {p.sku}
                        </span>
                      </td>
                      <td>{p.category}</td>
                      <td>{p.warehouse_location}</td>
                      <td style={{ fontWeight: 700, color: isOut ? '#dc2626' : '#d97706' }}>
                        {p.current_stock}
                      </td>
                      <td>{p.minimum_stock}</td>
                      <td>
                        {isOut ? (
                          <span className="badge badge-danger">Out of Stock</span>
                        ) : (
                          <span className="badge badge-warning">Low Stock</span>
                        )}
                      </td>
                      <td>
                        {hasRole(['Admin', 'Warehouse']) ? (
                          <Link to="/inventory" className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem' }}>
                            + Inbound Restock
                          </Link>
                        ) : (
                          <span style={{ color: 'var(--text-sub)', fontSize: '0.78rem' }}>View only</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Two-Column Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '1.5rem' }}>
        {/* Recent Challans */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Delivery Challans</h3>
            <Link to="/challans" className="btn btn-secondary btn-sm">
              <span>View All</span>
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Challan #</th>
                  <th>Customer</th>
                  <th>Qty</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentChallans && stats.recentChallans.length > 0 ? (
                  stats.recentChallans.map((ch) => (
                    <tr key={ch.id}>
                      <td>
                        <Link
                          to={`/challans/${ch.id}`}
                          style={{ fontWeight: 600, color: 'var(--primary)', fontFamily: 'monospace' }}
                        >
                          {ch.challan_number}
                        </Link>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{ch.customer_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ch.business_name}</div>
                      </td>
                      <td>{ch.total_quantity}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(ch.total_amount)}</td>
                      <td>
                        <span
                          className={`badge ${
                            ch.status === 'Confirmed'
                              ? 'badge-success'
                              : ch.status === 'Draft'
                              ? 'badge-warning'
                              : 'badge-danger'
                          }`}
                        >
                          {ch.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No recent challans recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Stock Movements */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Stock Movements</h3>
            {hasRole(['Admin', 'Warehouse', 'Accounts']) && (
              <Link to="/inventory" className="btn btn-secondary btn-sm">
                <span>View All</span>
                <ArrowRight size={14} />
              </Link>
            )}
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>Reason</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentMovements && stats.recentMovements.length > 0 ? (
                  stats.recentMovements.map((sm) => (
                    <tr key={sm.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{sm.product_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {sm.sku}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            sm.movement_type === 'IN' ? 'badge-success' : 'badge-info'
                          }`}
                        >
                          {sm.movement_type === 'IN' ? (
                            <ArrowDownRight size={12} />
                          ) : (
                            <ArrowUpRight size={12} />
                          )}
                          {sm.movement_type}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{sm.quantity_changed}</td>
                      <td style={{ fontSize: '0.8rem', maxWidth: '180px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {sm.reason}
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {formatDate(sm.created_at)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No recent stock movements.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
