import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, ShieldCheck, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Header: React.FC = () => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return 'Dashboard Overview';
    if (path.startsWith('/customers')) return 'Customer Relationship Management';
    if (path.startsWith('/products')) return 'Product Catalog';
    if (path.startsWith('/inventory')) return 'Inventory & Stock Movements';
    if (path === '/challans/new') return 'Create Sales Challan';
    if (path.startsWith('/challans')) return 'Sales Delivery Challans';
    return 'Operations Portal';
  };

  return (
    <header className="top-header">
      <div className="header-title-area">
        <h2 className="header-page-title">{getPageTitle()}</h2>
      </div>

      <div className="header-actions">
        {/* Quick action buttons based on role */}
        {hasRole(['Admin', 'Sales']) && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => navigate('/challans/new')}
          >
            <Plus size={16} />
            <span>New Challan</span>
          </button>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.35rem 0.75rem',
            background: 'var(--surface-hover)',
            borderRadius: '9999px',
            border: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: '#2563eb',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user?.name}</span>
          <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
            <ShieldCheck size={11} />
            {user?.role}
          </span>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={logout}
          title="Logout"
        >
          <LogOut size={15} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};
