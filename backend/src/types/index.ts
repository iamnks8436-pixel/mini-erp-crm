import { Request } from 'express';

export type UserRole = 'Admin' | 'Sales' | 'Warehouse' | 'Accounts';

export interface User {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: string;
}

export type CustomerType = 'Retail' | 'Wholesale' | 'Distributor';
export type CustomerStatus = 'Lead' | 'Active' | 'Inactive';

export interface Customer {
  id: number;
  customer_name: string;
  mobile: string;
  email: string;
  business_name: string;
  gst_number: string | null;
  customer_type: CustomerType;
  address: string;
  status: CustomerStatus;
  follow_up_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  product_name: string;
  sku: string;
  category: string;
  unit_price: number;
  current_stock: number;
  minimum_stock: number;
  warehouse_location: string;
  created_at: string;
  updated_at: string;
}

export type MovementType = 'IN' | 'OUT';

export interface StockMovement {
  id: number;
  product_id: number;
  quantity_changed: number;
  movement_type: MovementType;
  reason: string;
  created_by: number | null;
  created_at: string;
  product_name?: string;
  sku?: string;
  user_name?: string;
}

export type ChallanStatus = 'Draft' | 'Confirmed' | 'Cancelled';

export interface Challan {
  id: number;
  challan_number: string;
  customer_id: number;
  total_quantity: number;
  total_amount: number;
  status: ChallanStatus;
  notes: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  business_name?: string;
  user_name?: string;
  items?: ChallanItem[];
}

export interface ChallanItem {
  id: number;
  challan_id: number;
  product_id: number;
  product_name_snapshot: string;
  sku_snapshot: string;
  unit_price_snapshot: number;
  quantity: number;
  total_price: number;
  created_at: string;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}
