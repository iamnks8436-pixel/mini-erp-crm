import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  AlertCircle,
  Building2,
  Calendar,
} from 'lucide-react';
import { challanApi } from '../api';
import { Challan, ChallanStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export const ChallansPage: React.FC = () => {
  const { hasRole } = useAuth();
  const canCreate = hasRole(['Admin', 'Sales']);
  const navigate = useNavigate();

  const [challans, setChallans] = useState<Challan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Confirmation / Cancellation dialogs
  const [confirmTargetChallan, setConfirmTargetChallan] = useState<Challan | null>(null);
  const [cancelTargetChallan, setCancelTargetChallan] = useState<Challan | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchChallans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await challanApi.getAll({
        search: search.trim() || undefined,
        status: statusFilter,
        page,
        limit: 10,
      });
      setChallans(data.challans);
      setTotalPages(data.pagination.totalPages || 1);
      setTotalCount(data.pagination.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load challans');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    fetchChallans();
  }, [fetchChallans]);

  const handleConfirmAction = async () => {
    if (!confirmTargetChallan) return;
    try {
      setActionLoading(true);
      setError(null);
      await challanApi.confirm(confirmTargetChallan.id);
      setConfirmTargetChallan(null);
      fetchChallans();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm challan');
      setConfirmTargetChallan(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelAction = async () => {
    if (!cancelTargetChallan) return;
    try {
      setActionLoading(true);
      setError(null);
      await challanApi.cancel(cancelTargetChallan.id);
      setCancelTargetChallan(null);
      fetchChallans();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel challan');
      setCancelTargetChallan(null);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: ChallanStatus) => {
    switch (status) {
      case 'Confirmed':
        return (
          <span className="badge badge-success">
            <CheckCircle2 size={12} />
            <span>Confirmed</span>
          </span>
        );
      case 'Draft':
        return (
          <span className="badge badge-warning">
            <span>Draft</span>
          </span>
        );
      case 'Cancelled':
        return (
          <span className="badge badge-neutral" style={{ color: '#ef4444', backgroundColor: '#fef2f2' }}>
            <XCircle size={12} />
            <span>Cancelled</span>
          </span>
        );
    }
  };

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(Number(amount) || 0);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales Delivery Challans</h1>
          <p className="page-description">
            Create, manage, and confirm inventory dispatch challans with atomic stock reduction.
          </p>
        </div>
        {canCreate && (
          <button type="button" className="btn btn-primary" onClick={() => navigate('/challans/new')}>
            <Plus size={18} />
            <span>Create Sales Challan</span>
          </button>
        )}
      </div>

      {error && (
        <div className="alert-banner alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search className="search-icon" size={16} />
          <input
            type="text"
            className="form-input search-input"
            placeholder="Search by challan #, customer name, business..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <select
          className="form-select"
          style={{ width: 'auto', minWidth: '160px' }}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">All Statuses</option>
          <option value="Draft">Draft (Pending)</option>
          <option value="Confirmed">Confirmed (Dispatched)</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <button type="button" className="btn btn-secondary" onClick={fetchChallans}>
          <RefreshCw size={15} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Challans Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Challan Number</th>
                <th>Customer & Firm</th>
                <th>Items Count</th>
                <th>Total Qty</th>
                <th>Total Value</th>
                <th>Status</th>
                <th>Created Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                      <RefreshCw className="spin" size={18} />
                      <span>Loading delivery challans...</span>
                    </div>
                  </td>
                </tr>
              ) : challans.length > 0 ? (
                challans.map((ch) => (
                  <tr key={ch.id}>
                    <td>
                      <Link
                        to={`/challans/${ch.id}`}
                        style={{ fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}
                      >
                        {ch.challan_number}
                      </Link>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        By: {ch.user_name || 'Sales Staff'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{ch.customer_name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <Building2 size={12} />
                        <span>{ch.business_name}</span>
                      </div>
                    </td>
                    <td>{ch.item_count || '—'} items</td>
                    <td style={{ fontWeight: 700 }}>{ch.total_quantity}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(ch.total_amount)}</td>
                    <td>{getStatusBadge(ch.status)}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Calendar size={12} />
                        <span>{formatDate(ch.created_at)}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                        <Link to={`/challans/${ch.id}`} className="btn btn-secondary btn-sm" title="View Challan Details">
                          <Eye size={14} />
                          <span>View</span>
                        </Link>

                        {/* Quick Confirm & Cancel for Draft Challans */}
                        {canCreate && ch.status === 'Draft' && (
                          <>
                            <button
                              type="button"
                              className="btn btn-success btn-sm"
                              onClick={() => setConfirmTargetChallan(ch)}
                              title="Confirm Challan and Deduct Stock"
                            >
                              <CheckCircle2 size={14} />
                              <span>Confirm</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ color: '#dc2626' }}
                              onClick={() => setCancelTargetChallan(ch)}
                              title="Cancel Draft Challan"
                            >
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <FileText size={40} className="empty-state-icon" />
                      <h3 className="empty-state-title">No delivery challans found</h3>
                      <p className="empty-state-description">
                        Create a draft challan for a wholesale client to prepare order fulfillment.
                      </p>
                      {canCreate && (
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/challans/new')}>
                          <Plus size={16} />
                          <span>Create New Challan</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalCount > 0 && (
          <div className="pagination-wrap">
            <div>
              Showing {challans.length} of {totalCount} challans
            </div>
            <div className="pagination-controls">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span style={{ display: 'flex', alignItems: 'center', padding: '0 0.5rem', fontSize: '0.85rem' }}>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Challan Dialog */}
      <ConfirmDialog
        isOpen={confirmTargetChallan !== null}
        onClose={() => setConfirmTargetChallan(null)}
        onConfirm={handleConfirmAction}
        title="Confirm & Dispatch Challan"
        message={`Are you sure you want to confirm Challan #${confirmTargetChallan?.challan_number}? This will permanently reduce current inventory stock for all line items and generate audit OUT movement logs in a single database transaction.`}
        confirmText="Confirm & Deduct Stock"
        variant="primary"
        loading={actionLoading}
      />

      {/* Cancel Challan Dialog */}
      <ConfirmDialog
        isOpen={cancelTargetChallan !== null}
        onClose={() => setCancelTargetChallan(null)}
        onConfirm={handleCancelAction}
        title="Cancel Draft Challan"
        message={`Are you sure you want to cancel Challan #${cancelTargetChallan?.challan_number}? The challan will be marked as Cancelled. No stock has been deducted.`}
        confirmText="Cancel Challan"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
};
