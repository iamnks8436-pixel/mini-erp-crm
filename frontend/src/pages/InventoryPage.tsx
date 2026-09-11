import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeftRight,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
  Package,
} from 'lucide-react';
import { inventoryApi, productApi } from '../api';
import { StockMovement, Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/ui/Modal';

export const InventoryPage: React.FC = () => {
  const { hasRole } = useAuth();
  const canRecordMovements = hasRole(['Admin', 'Warehouse']);

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedProductId, setSelectedProductId] = useState<string>('all');

  // New Movement Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalProductId, setModalProductId] = useState<string>('');
  const [modalType, setModalType] = useState<'IN' | 'OUT'>('IN');
  const [modalQty, setModalQty] = useState('');
  const [modalReason, setModalReason] = useState('');
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchMovements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await inventoryApi.getMovements({
        product_id: selectedProductId !== 'all' ? parseInt(selectedProductId, 10) : undefined,
        limit: 100,
      });
      setMovements(data.movements);
    } catch (err: any) {
      setError(err.message || 'Failed to load stock movements');
    } finally {
      setLoading(false);
    }
  }, [selectedProductId]);

  const fetchProductsList = async () => {
    try {
      const data = await productApi.getAll();
      setProducts(data.products);
    } catch {
      // Ignored for filter list
    }
  };

  useEffect(() => {
    fetchMovements();
    fetchProductsList();
  }, [fetchMovements]);

  const handleOpenModal = () => {
    if (products.length > 0) {
      setModalProductId(String(products[0].id));
    }
    setModalType('IN');
    setModalQty('');
    setModalReason('');
    setModalError(null);
    setIsModalOpen(true);
  };

  const selectedProduct = products.find((p) => String(p.id) === modalProductId);

  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      setModalError('Please select a valid product');
      return;
    }

    const qty = parseInt(modalQty, 10);
    if (!qty || qty <= 0) {
      setModalError('Quantity must be greater than 0');
      return;
    }

    if (modalType === 'OUT' && qty > selectedProduct.current_stock) {
      setModalError(
        `Insufficient stock! Product "${selectedProduct.product_name}" only has ${selectedProduct.current_stock} units. Stock cannot become negative.`
      );
      return;
    }

    if (!modalReason.trim()) {
      setModalError('Please specify the reason for this movement');
      return;
    }

    try {
      setModalSaving(true);
      setModalError(null);
      await inventoryApi.createMovement({
        product_id: selectedProduct.id,
        quantity_changed: qty,
        movement_type: modalType,
        reason: modalReason.trim(),
      });
      setIsModalOpen(false);
      fetchMovements();
      fetchProductsList();
    } catch (err: any) {
      setModalError(err.message || 'Failed to record stock movement');
    } finally {
      setModalSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory & Stock Movement Audit</h1>
          <p className="page-description">
            Complete transaction ledger for all inbound receipts, outbound delivery dispatches, and inventory adjustments.
          </p>
        </div>
        {canRecordMovements && (
          <button type="button" className="btn btn-primary" onClick={handleOpenModal}>
            <Plus size={18} />
            <span>Record Movement</span>
          </button>
        )}
      </div>

      {error && (
        <div className="alert-banner alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            Filter by Product:
          </span>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '240px' }}
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
          >
            <option value="all">All Products ({products.length})</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.product_name} ({p.sku}) — Stock: {p.current_stock}
              </option>
            ))}
          </select>
        </div>

        <button type="button" className="btn btn-secondary" onClick={fetchMovements}>
          <RefreshCw size={15} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Movement Ledger Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Product Description</th>
                <th>SKU</th>
                <th>Movement Type</th>
                <th>Quantity</th>
                <th>Reason / Reference</th>
                <th>Recorded By</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                      <RefreshCw className="spin" size={18} />
                      <span>Loading stock movements ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : movements.length > 0 ? (
                movements.map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {formatDate(m.created_at)}
                    </td>
                    <td style={{ fontWeight: 600 }}>{m.product_name}</td>
                    <td>
                      <span className="badge badge-neutral" style={{ fontFamily: 'monospace' }}>
                        {m.sku}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          m.movement_type === 'IN' ? 'badge-success' : 'badge-info'
                        }`}
                      >
                        {m.movement_type === 'IN' ? (
                          <ArrowDownRight size={13} />
                        ) : (
                          <ArrowUpRight size={13} />
                        )}
                        <span>{m.movement_type}</span>
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      {m.movement_type === 'IN' ? `+${m.quantity_changed}` : `-${m.quantity_changed}`}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{m.reason}</td>
                    <td>
                      <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                        {m.user_name || 'System / Auto'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <ArrowLeftRight size={40} className="empty-state-icon" />
                      <h3 className="empty-state-title">No stock movements recorded</h3>
                      <p className="empty-state-description">
                        No transactions recorded for the selected filter criteria.
                      </p>
                      {canRecordMovements && (
                        <button type="button" className="btn btn-primary btn-sm" onClick={handleOpenModal}>
                          <Plus size={16} />
                          <span>Record First Movement</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Stock Movement Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Stock Movement"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={modalSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveMovement}
              disabled={modalSaving}
            >
              {modalSaving ? 'Recording Movement...' : 'Record & Update Stock'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveMovement}>
          {modalError && (
            <div className="alert-banner alert-danger">
              <AlertCircle size={18} />
              <span>{modalError}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Select Product *</label>
            <select
              className="form-select"
              value={modalProductId}
              onChange={(e) => setModalProductId(e.target.value)}
              required
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.product_name} ({p.sku}) — Available Stock: {p.current_stock}
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div
              style={{
                background: '#f8fafc',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                marginBottom: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={18} color="#2563eb" />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Location: {selectedProduct.warehouse_location}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Current Stock: </span>
                <span style={{ fontWeight: 800, color: selectedProduct.current_stock <= selectedProduct.minimum_stock ? '#dc2626' : '#059669' }}>
                  {selectedProduct.current_stock} units
                </span>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Movement Direction *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                className={`btn ${modalType === 'IN' ? 'btn-success' : 'btn-secondary'}`}
                onClick={() => setModalType('IN')}
              >
                <Plus size={16} />
                <span>IN (Receipt / Restock)</span>
              </button>
              <button
                type="button"
                className={`btn ${modalType === 'OUT' ? 'btn-danger' : 'btn-secondary'}`}
                onClick={() => setModalType('OUT')}
              >
                <span>OUT (Dispatch / Write-off)</span>
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Quantity to Change *</label>
            <input
              type="number"
              min="1"
              className="form-input"
              placeholder="e.g. 25"
              value={modalQty}
              onChange={(e) => setModalQty(e.target.value)}
              required
            />
            {modalType === 'OUT' && selectedProduct && Number(modalQty) > selectedProduct.current_stock && (
              <div className="form-error">
                Cannot dispatch more than current stock ({selectedProduct.current_stock} available). Negative inventory prohibited.
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Audit Reason / PO Reference *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Supplier container PO# 9012, Damaged in transit, Re-binning..."
              value={modalReason}
              onChange={(e) => setModalReason(e.target.value)}
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
