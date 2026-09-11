import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Printer,
  AlertCircle,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { challanApi } from '../api';
import { Challan } from '../types';
import { useAuth } from '../context/AuthContext';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export const ChallanDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  const canModify = hasRole(['Admin', 'Sales']);

  const [challan, setChallan] = useState<Challan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Confirmation & Cancellation modals
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchChallan = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await challanApi.getById(parseInt(id, 10));
      setChallan(data.challan);
    } catch (err: any) {
      setError(err.message || 'Failed to load challan details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallan();
  }, [id]);

  const handleConfirmChallan = async () => {
    if (!challan) return;
    try {
      setActionLoading(true);
      setError(null);
      const res = await challanApi.confirm(challan.id);
      setSuccessMessage(res.message || 'Challan confirmed successfully! Stock reduced and OUT movements recorded.');
      setShowConfirmModal(false);
      fetchChallan();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm challan');
      setShowConfirmModal(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelChallan = async () => {
    if (!challan) return;
    try {
      setActionLoading(true);
      setError(null);
      const res = await challanApi.cancel(challan.id);
      setSuccessMessage(res.message || 'Challan has been cancelled.');
      setShowCancelModal(false);
      fetchChallan();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel challan');
      setShowCancelModal(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
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
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <RefreshCw className="spin" size={32} style={{ color: 'var(--primary)', margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading delivery challan note...</p>
        <style>{`
          .spin { animation: spin 1s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (error && !challan) {
    return (
      <div>
        <Link to="/challans" className="btn btn-secondary btn-sm" style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={16} />
          <span>Back to Challans</span>
        </Link>
        <div className="alert-banner alert-danger">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!challan) return null;

  // Check if draft items have sufficient stock
  const hasInsufficientStock = challan.status === 'Draft' && challan.items?.some(
    (item) => item.live_stock !== undefined && item.quantity > item.live_stock
  );

  return (
    <div>
      {/* Top Controls (Hidden during print) */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <Link to="/challans" className="btn btn-secondary btn-sm">
          <ArrowLeft size={16} />
          <span>Back to Challans List</span>
        </Link>

        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handlePrint}>
            <Printer size={16} />
            <span>Print Delivery Note</span>
          </button>

          {canModify && challan.status === 'Draft' && (
            <>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ color: '#dc2626' }}
                onClick={() => setShowCancelModal(true)}
              >
                <XCircle size={16} />
                <span>Cancel Challan</span>
              </button>

              <button
                type="button"
                className="btn btn-success btn-sm"
                onClick={() => setShowConfirmModal(true)}
                disabled={hasInsufficientStock}
                title={hasInsufficientStock ? 'Cannot confirm: insufficient stock for one or more items' : 'Confirm and deduct inventory'}
              >
                <CheckCircle2 size={16} />
                <span>Confirm & Dispatch</span>
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="alert-banner alert-danger no-print">
          <AlertCircle size={20} />
          <div>
            <strong>Operation Failed:</strong> {error}
          </div>
        </div>
      )}

      {successMessage && (
        <div className="alert-banner alert-success no-print">
          <CheckCircle2 size={20} />
          <span>{successMessage}</span>
        </div>
      )}

      {challan.status === 'Confirmed' && (
        <div className="alert-banner alert-success no-print" style={{ borderLeft: '4px solid #059669' }}>
          <CheckCircle2 size={20} color="#059669" />
          <div>
            <strong>Challan Confirmed & Inventory Shipped</strong>
            <p style={{ fontSize: '0.82rem', marginTop: '0.1rem' }}>
              Stock deduction and OUT movement records have been committed to the database ledger.
            </p>
          </div>
        </div>
      )}

      {challan.status === 'Cancelled' && (
        <div className="alert-banner alert-danger no-print">
          <XCircle size={20} color="#dc2626" />
          <div>
            <strong>Challan Cancelled</strong>
            <p style={{ fontSize: '0.82rem', marginTop: '0.1rem' }}>
              This draft order was cancelled. No inventory was deducted.
            </p>
          </div>
        </div>
      )}

      {challan.status === 'Draft' && hasInsufficientStock && (
        <div className="alert-banner alert-warning no-print">
          <AlertTriangle size={20} color="#d97706" />
          <div>
            <strong>Stock Shortage Detected</strong>
            <p style={{ fontSize: '0.82rem', marginTop: '0.1rem' }}>
              Current warehouse inventory is lower than required quantities for one or more items. Restock items or update the challan before confirming.
            </p>
          </div>
        </div>
      )}

      {/* Printable Delivery Challan Document */}
      <div
        className="printable-challan"
        style={{
          background: '#ffffff',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '2.5rem',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Document Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '2px solid #0f172a',
            paddingBottom: '1.5rem',
            marginBottom: '1.75rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '6px',
                  background: '#2563eb',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.1rem',
                }}
              >
                M
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
                Mini ERP + CRM Portal
              </h1>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Wholesale Distribution & Logistics Fulfillment
            </p>
            <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Central Distribution Hub, Sector 4, Logistics Park
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: '1.3rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: '#0f172a',
              }}
            >
              DELIVERY CHALLAN
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace', color: '#2563eb', marginTop: '0.2rem' }}>
              {challan.challan_number}
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <span
                className={`badge ${
                  challan.status === 'Confirmed'
                    ? 'badge-success'
                    : challan.status === 'Draft'
                    ? 'badge-warning'
                    : 'badge-danger'
                }`}
                style={{ fontSize: '0.82rem', padding: '0.2rem 0.6rem' }}
              >
                {challan.status}
              </span>
            </div>
          </div>
        </div>

        {/* Metadata Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '2rem',
            paddingBottom: '1.5rem',
            borderBottom: '1px solid var(--border)',
            marginBottom: '1.5rem',
          }}
        >
          {/* Customer / Consignee */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.5rem' }}>
              CONSIGNEE / BILLED TO
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
              {challan.customer_name}
            </div>
            <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.9rem', marginTop: '0.15rem' }}>
              {challan.business_name}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: '0.35rem' }}>
              {challan.customer_address}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.35rem' }}>
              GSTIN: {challan.customer_gst || 'Unregistered / None'}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Mobile: {challan.customer_mobile} | Email: {challan.customer_email}
            </div>
          </div>

          {/* Challan Logistics Meta */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', justifyContent: 'flex-start' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.2rem' }}>
              DISPATCH PARTICULARS
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: '#64748b' }}>Challan Date:</span>
              <strong>{formatDate(challan.created_at)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: '#64748b' }}>Prepared By:</span>
              <strong>{challan.user_name || 'Authorized Staff'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: '#64748b' }}>Delivery Mode:</span>
              <strong>Wholesale Road Freight</strong>
            </div>
            {challan.notes && (
              <div style={{ marginTop: '0.5rem', background: '#f8fafc', padding: '0.6rem', borderRadius: '4px', fontSize: '0.82rem' }}>
                <span style={{ color: '#64748b', display: 'block', fontWeight: 600 }}>Notes & Instructions:</span>
                <span>{challan.notes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Snapshot Items Table */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.65rem' }}>
            Line Items Snapshot (Historical Prices & SKUs Preserved)
          </div>
          <table className="table" style={{ border: '1px solid var(--border)' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9' }}>
                <th style={{ width: '45px' }}>#</th>
                <th>Item Description (Snapshot)</th>
                <th>SKU Code</th>
                {challan.status === 'Draft' && <th className="no-print">Available Stock</th>}
                <th style={{ textAlign: 'right' }}>Unit Price (Snapshot)</th>
                <th style={{ textAlign: 'center', width: '90px' }}>Quantity</th>
                <th style={{ textAlign: 'right' }}>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {challan.items && challan.items.length > 0 ? (
                challan.items.map((item, idx) => {
                  const isStockShort =
                    challan.status === 'Draft' &&
                    item.live_stock !== undefined &&
                    item.quantity > item.live_stock;

                  return (
                    <tr key={item.id || idx}>
                      <td>{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{item.product_name_snapshot}</td>
                      <td>
                        <span className="badge badge-neutral" style={{ fontFamily: 'monospace' }}>
                          {item.sku_snapshot}
                        </span>
                      </td>
                      {challan.status === 'Draft' && (
                        <td className="no-print">
                          <span
                            style={{
                              fontWeight: 700,
                              color: isStockShort ? '#dc2626' : '#059669',
                            }}
                          >
                            {item.live_stock ?? '—'} units
                          </span>
                          {isStockShort && (
                            <span style={{ fontSize: '0.7rem', color: '#dc2626', display: 'block', fontWeight: 600 }}>
                              Short by {item.quantity - (item.live_stock || 0)}!
                            </span>
                          )}
                        </td>
                      )}
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {formatCurrency(item.unit_price_snapshot)}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.95rem' }}>
                        {item.quantity}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        {formatCurrency(item.total_price)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                    No items in this challan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals & Signatures */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem', alignItems: 'flex-start' }}>
          {/* Declaration and Signature */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', marginTop: '1rem' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5 }}>
              Declaration: Received the goods mentioned above in good condition and exact quantity as per this delivery challan.
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingRight: '2rem' }}>
              <div style={{ borderTop: '1px solid #94a3b8', width: '160px', textAlign: 'center', paddingTop: '0.4rem', fontSize: '0.8rem', color: '#64748b' }}>
                Receiver's Signature
              </div>
              <div style={{ borderTop: '1px solid #94a3b8', width: '160px', textAlign: 'center', paddingTop: '0.4rem', fontSize: '0.8rem', color: '#64748b' }}>
                Authorized Signatory
              </div>
            </div>
          </div>

          {/* Financial Totals Card */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              <span style={{ color: '#64748b' }}>Total Physical Quantity:</span>
              <strong>{challan.total_quantity} units</strong>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--border)',
                alignItems: 'baseline',
              }}
            >
              <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Total Challan Value:</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563eb' }}>
                {formatCurrency(challan.total_amount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmChallan}
        title="Confirm Challan & Deduct Inventory"
        message={`Are you sure you want to confirm Challan #${challan.challan_number}? Stock for all ${challan.total_quantity} units will be immediately subtracted from the warehouse inventory, and corresponding OUT stock movement records will be saved.`}
        confirmText="Confirm & Deduct Stock"
        variant="primary"
        loading={actionLoading}
      />

      {/* Cancellation Dialog */}
      <ConfirmDialog
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelChallan}
        title="Cancel Draft Challan"
        message={`Are you sure you want to cancel Challan #${challan.challan_number}? This cannot be undone.`}
        confirmText="Cancel Challan"
        variant="danger"
        loading={actionLoading}
      />

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
          }
          .sidebar, .top-header, .no-print {
            display: none !important;
          }
          .main-content-wrapper {
            margin: 0 !important;
            padding: 0 !important;
          }
          .page-container {
            padding: 0 !important;
            max-width: 100% !important;
          }
          .printable-challan {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};
