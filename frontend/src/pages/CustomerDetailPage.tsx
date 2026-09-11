import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Plus,
  Save,
  AlertCircle,
  RefreshCw,
  Clock,
  ReceiptText,
} from 'lucide-react';
import { customerApi } from '../api';
import { Customer, Challan } from '../types';
import { useAuth } from '../context/AuthContext';

export const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canModify = hasRole(['Admin', 'Sales']);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [challans, setChallans] = useState<Challan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // CRM Note editing state
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [status, setStatus] = useState<'Lead' | 'Active' | 'Inactive'>('Active');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSuccess, setNotesSuccess] = useState(false);

  const fetchCustomer = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await customerApi.getById(parseInt(id, 10));
      setCustomer(data.customer);
      setChallans(data.challans || []);
      setNotes(data.customer.notes || '');
      setFollowUpDate(data.customer.follow_up_date ? data.customer.follow_up_date.slice(0, 10) : '');
      setStatus(data.customer.status);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch customer profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const handleUpdateCrmNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    try {
      setSavingNotes(true);
      setNotesSuccess(false);
      setError(null);
      await customerApi.update(customer.id, {
        customer_name: customer.customer_name,
        mobile: customer.mobile,
        email: customer.email,
        business_name: customer.business_name,
        gst_number: customer.gst_number,
        customer_type: customer.customer_type,
        address: customer.address,
        status,
        notes: notes.trim() || null,
        follow_up_date: followUpDate || null,
      });
      setNotesSuccess(true);
      setTimeout(() => setNotesSuccess(false), 4000);
      fetchCustomer();
    } catch (err: any) {
      setError(err.message || 'Failed to update follow-up notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(Number(amount) || 0);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <RefreshCw className="spin" size={32} style={{ color: 'var(--primary)', margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading customer details...</p>
        <style>{`
          .spin { animation: spin 1s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div>
        <Link to="/customers" className="btn btn-secondary btn-sm" style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={16} />
          <span>Back to Customers</span>
        </Link>
        <div className="alert-banner alert-danger">
          <AlertCircle size={20} />
          <span>{error || 'Customer not found'}</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Navigation Breadcrumb */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <Link to="/customers" className="btn btn-secondary btn-sm">
          <ArrowLeft size={16} />
          <span>Back to Customer Directory</span>
        </Link>

        {canModify && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => navigate(`/challans/new?customerId=${customer.id}`)}
          >
            <Plus size={16} />
            <span>Create Sales Challan</span>
          </button>
        )}
      </div>

      {notesSuccess && (
        <div className="alert-banner alert-success">
          <span>CRM follow-up notes and customer status updated successfully!</span>
        </div>
      )}

      {/* Main Grid: Customer Details & Notes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Contact & Business Profile Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <span className="badge badge-info" style={{ marginBottom: '0.35rem' }}>
                {customer.customer_type} Account
              </span>
              <h2 className="card-title" style={{ fontSize: '1.3rem' }}>{customer.customer_name}</h2>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{customer.business_name}</div>
            </div>
            <span
              className={`badge ${
                customer.status === 'Active'
                  ? 'badge-success'
                  : customer.status === 'Lead'
                  ? 'badge-warning'
                  : 'badge-neutral'
              }`}
            >
              {customer.status}
            </span>
          </div>

          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <Building2 size={18} color="#64748b" style={{ marginTop: '0.2rem' }} />
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Business Name & GST
                </div>
                <div style={{ fontWeight: 600 }}>{customer.business_name}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-sub)' }}>
                  GSTIN: {customer.gst_number || 'Not Registered / None'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <Phone size={18} color="#64748b" style={{ marginTop: '0.2rem' }} />
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Phone / Mobile
                </div>
                <div style={{ fontWeight: 600 }}>{customer.mobile}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <Mail size={18} color="#64748b" style={{ marginTop: '0.2rem' }} />
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Email Address
                </div>
                <div style={{ fontWeight: 600 }}>{customer.email}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <MapPin size={18} color="#64748b" style={{ marginTop: '0.2rem' }} />
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Billing & Shipping Address
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '0.15rem' }}>
                  {customer.address}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
              <Clock size={18} color="#64748b" style={{ marginTop: '0.2rem' }} />
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Account Created
                </div>
                <div style={{ fontSize: '0.85rem' }}>
                  {new Date(customer.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CRM Follow-up & Interaction Notes Card */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={18} color="#2563eb" />
              <h3 className="card-title">CRM Follow-up & Activity Notes</h3>
            </div>
          </div>

          <div className="card-body">
            <form onSubmit={handleUpdateCrmNotes}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Customer Lifecycle Status</label>
                  <select
                    className="form-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    disabled={!canModify}
                  >
                    <option value="Active">Active Customer</option>
                    <option value="Lead">Sales Lead</option>
                    <option value="Inactive">Inactive / Suspended</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Next Follow-up Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    disabled={!canModify}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Ongoing Notes, Deal Pipeline & Payment Terms</label>
                <textarea
                  className="form-textarea"
                  rows={5}
                  placeholder="Record call logs, price quotations, credit terms, delivery preferences..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={!canModify}
                />
              </div>

              {canModify && (
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  disabled={savingNotes}
                >
                  <Save size={16} />
                  <span>{savingNotes ? 'Saving Notes...' : 'Save Follow-up Notes'}</span>
                </button>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Linked Sales Challans Section */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ReceiptText size={20} color="#2563eb" />
            <h3 className="card-title">Sales Delivery Challans History ({challans.length})</h3>
          </div>
          {canModify && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => navigate(`/challans/new?customerId=${customer.id}`)}
            >
              <Plus size={15} />
              <span>Create Challan</span>
            </button>
          )}
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Challan Number</th>
                <th>Total Quantity</th>
                <th>Total Amount</th>
                <th>Status</th>
                <th>Created Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {challans.length > 0 ? (
                challans.map((ch) => (
                  <tr key={ch.id}>
                    <td>
                      <Link
                        to={`/challans/${ch.id}`}
                        style={{ fontWeight: 600, color: 'var(--primary)', fontFamily: 'monospace' }}
                      >
                        {ch.challan_number}
                      </Link>
                    </td>
                    <td style={{ fontWeight: 600 }}>{ch.total_quantity} units</td>
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
                    <td>
                      {new Date(ch.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link to={`/challans/${ch.id}`} className="btn btn-secondary btn-sm">
                        <span>View Details</span>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem' }}>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      No delivery challans recorded for this customer yet.
                    </div>
                    {canModify && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/challans/new?customerId=${customer.id}`)}
                      >
                        <Plus size={14} />
                        <span>Create First Challan</span>
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
