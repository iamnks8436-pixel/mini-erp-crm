import React from 'react';
import { Navigate, Outlet, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: 'var(--bg)',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid var(--border)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Loading Operations Portal...
        </p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '3rem auto', textAlign: 'center' }}>
        <div className="card-body" style={{ padding: '3rem 2rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}
          >
            <ShieldAlert size={32} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Access Restricted
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            Your account role <strong>{user.role}</strong> does not have permission to view this section.
            Required roles: <strong>{allowedRoles.join(', ')}</strong>.
          </p>
          <Link to="/dashboard" className="btn btn-primary">
            <ArrowLeft size={16} />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return <Outlet />;
};
