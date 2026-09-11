import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogIn, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    try {
      setLoading(true);
      setError(null);
      await login(demoEmail, demoPass);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        backgroundImage: 'radial-gradient(ellipse at 80% 20%, rgba(37, 99, 235, 0.15), transparent 50%), radial-gradient(ellipse at 20% 80%, rgba(16, 185, 129, 0.1), transparent 50%)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Portal Header */}
        <div
          style={{
            padding: '2.25rem 2rem 1.75rem',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid var(--border)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563eb, #1e40af)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)',
            }}
          >
            <Shield size={28} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Mini ERP + CRM
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#64748b', marginTop: '0.25rem' }}>
            Wholesale Operations & Distribution Portal
          </p>
        </div>

        {/* Login Form */}
        <div style={{ padding: '2rem' }}>
          {error && (
            <div className="alert-banner alert-danger" style={{ marginBottom: '1.25rem' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.75rem' }}>
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', fontWeight: 600 }}
              disabled={loading}
            >
              <LogIn size={18} />
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
            </button>
          </form>

          {/* Quick Demo Role Logins */}
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px dashed var(--border)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.75rem',
              }}
            >
              <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
                Quick Demo Sign-In
              </span>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>1-Click Credentials</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'flex-start', padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                onClick={() => handleQuickLogin('admin@example.com', 'Admin@123')}
                disabled={loading}
              >
                <CheckCircle2 size={14} color="#dc2626" />
                <span>Admin</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'flex-start', padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                onClick={() => handleQuickLogin('sales@example.com', 'Sales@123')}
                disabled={loading}
              >
                <CheckCircle2 size={14} color="#2563eb" />
                <span>Sales</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'flex-start', padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                onClick={() => handleQuickLogin('warehouse@example.com', 'Warehouse@123')}
                disabled={loading}
              >
                <CheckCircle2 size={14} color="#d97706" />
                <span>Warehouse</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'flex-start', padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                onClick={() => handleQuickLogin('accounts@example.com', 'Accounts@123')}
                disabled={loading}
              >
                <CheckCircle2 size={14} color="#059669" />
                <span>Accounts</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
