import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  ArrowLeftRight,
  FileText,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user, logout, hasRole } = useAuth();

  const getRoleBadgeClass = () => {
    switch (user?.role) {
      case 'Admin':
        return 'badge-danger';
      case 'Sales':
        return 'badge-info';
      case 'Warehouse':
        return 'badge-warning';
      case 'Accounts':
        return 'badge-success';
      default:
        return 'badge-neutral';
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo-icon">M</div>
        <div>
          <div className="sidebar-title">Mini ERP + CRM</div>
          <div className="sidebar-subtitle">Operations Portal</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Operations</div>

        {/* Dashboard: All Roles */}
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>

        {/* Customers: Admin, Sales, Accounts */}
        {hasRole(['Admin', 'Sales', 'Accounts']) && (
          <NavLink
            to="/customers"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Users size={18} />
            <span>Customers</span>
          </NavLink>
        )}

        {/* Products: Admin, Warehouse, Sales, Accounts */}
        <NavLink
          to="/products"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Package size={18} />
          <span>Products</span>
        </NavLink>

        {/* Inventory / Stock Movements: Admin, Warehouse, Accounts */}
        {hasRole(['Admin', 'Warehouse', 'Accounts']) && (
          <NavLink
            to="/inventory"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <ArrowLeftRight size={18} />
            <span>Stock Movements</span>
          </NavLink>
        )}

        {/* Sales Challans: Admin, Sales, Warehouse, Accounts */}
        <NavLink
          to="/challans"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <FileText size={18} />
          <span>Sales Challans</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile-summary">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div className="user-avatar">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <div
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#f8fafc',
                  maxWidth: '120px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.name || 'Logged User'}
              </div>
              <span className={`badge ${getRoleBadgeClass()}`} style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', marginTop: '0.15rem' }}>
                <ShieldCheck size={10} />
                {user?.role}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            style={{ color: '#94a3b8', border: '1px solid #334155', padding: '0.4rem' }}
            onClick={logout}
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
