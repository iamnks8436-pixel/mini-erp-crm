import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Search,
  Plus,
  Edit2,
  Trash2,
  ArrowLeftRight,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { productApi, inventoryApi } from '../api';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

interface ProductFormData {
  product_name: string;
  sku: string;
  category: string;
  unit_price: string;
  current_stock: string;
  minimum_stock: string;
  warehouse_location: string;
}

const initialProductForm: ProductFormData = {
  product_name: '',
  sku: '',
  category: '',
  unit_price: '',
  current_stock: '0',
  minimum_stock: '10',
  warehouse_location: '',
};

export const ProductsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const canManageProducts = hasRole(['Admin', 'Warehouse']);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState('all');

  // Product Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialProductForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Stock Adjustment Modal
  const [adjustModalProduct, setAdjustModalProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT'>('IN');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  // Delete Confirm
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await productApi.getAll({
        search: search.trim() || undefined,
        category: categoryFilter,
        stockStatus: stockStatusFilter,
      });
      setProducts(data.products);
      setCategories(data.categories || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, stockStatusFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData(initialProductForm);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      product_name: p.product_name,
      sku: p.sku,
      category: p.category,
      unit_price: String(p.unit_price),
      current_stock: String(p.current_stock),
      minimum_stock: String(p.minimum_stock),
      warehouse_location: p.warehouse_location,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateProductForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.product_name.trim()) errors.product_name = 'Product name is required';
    if (!formData.sku.trim()) errors.sku = 'SKU is required';
    if (!formData.category.trim()) errors.category = 'Category is required';
    if (!formData.unit_price || Number(formData.unit_price) <= 0) errors.unit_price = 'Unit price must be > 0';
    if (!formData.warehouse_location.trim()) errors.warehouse_location = 'Warehouse location is required';
    if (!editingProduct && (formData.current_stock === '' || Number(formData.current_stock) < 0)) {
      errors.current_stock = 'Current stock cannot be negative';
    }
    if (formData.minimum_stock === '' || Number(formData.minimum_stock) < 0) {
      errors.minimum_stock = 'Minimum stock cannot be negative';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateProductForm()) return;

    try {
      setSaving(true);
      setError(null);

      if (editingProduct) {
        await productApi.update(editingProduct.id, {
          product_name: formData.product_name.trim(),
          sku: formData.sku.trim().toUpperCase(),
          category: formData.category.trim(),
          unit_price: Number(formData.unit_price),
          minimum_stock: Number(formData.minimum_stock),
          warehouse_location: formData.warehouse_location.trim(),
        });
      } else {
        await productApi.create({
          product_name: formData.product_name.trim(),
          sku: formData.sku.trim().toUpperCase(),
          category: formData.category.trim(),
          unit_price: Number(formData.unit_price),
          current_stock: Number(formData.current_stock),
          minimum_stock: Number(formData.minimum_stock),
          warehouse_location: formData.warehouse_location.trim(),
        });
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      setError(err.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await productApi.delete(deleteId);
      setDeleteId(null);
      fetchProducts();
    } catch (err: any) {
      setError(err.message || 'Failed to delete product');
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenStockAdjust = (p: Product) => {
    setAdjustModalProduct(p);
    setAdjustType('IN');
    setAdjustQty('');
    setAdjustReason('Stock count adjustment');
    setAdjustError(null);
  };

  const handleSaveStockAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalProduct) return;

    const qty = parseInt(adjustQty, 10);
    if (!qty || qty <= 0) {
      setAdjustError('Quantity must be greater than 0');
      return;
    }

    if (adjustType === 'OUT' && qty > adjustModalProduct.current_stock) {
      setAdjustError(
        `Cannot remove ${qty} units. Current stock is only ${adjustModalProduct.current_stock}. Stock cannot be negative.`
      );
      return;
    }

    if (!adjustReason.trim()) {
      setAdjustError('Please specify a reason for this movement');
      return;
    }

    try {
      setAdjustSaving(true);
      setAdjustError(null);
      await inventoryApi.createMovement({
        product_id: adjustModalProduct.id,
        quantity_changed: qty,
        movement_type: adjustType,
        reason: adjustReason.trim(),
      });
      setAdjustModalProduct(null);
      fetchProducts();
    } catch (err: any) {
      setAdjustError(err.message || 'Failed to record stock movement');
    } finally {
      setAdjustSaving(false);
    }
  };

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(Number(amount) || 0);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Product Catalog & Inventory</h1>
          <p className="page-description">
            Maintain item SKU directory, pricing, bin locations, and safety threshold alerts.
          </p>
        </div>
        {canManageProducts && (
          <button type="button" className="btn btn-primary" onClick={handleOpenCreate}>
            <Plus size={18} />
            <span>Add New Product</span>
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
            placeholder="Search by product name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="form-select"
          style={{ width: 'auto', minWidth: '160px' }}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          className="form-select"
          style={{ width: 'auto', minWidth: '160px' }}
          value={stockStatusFilter}
          onChange={(e) => setStockStatusFilter(e.target.value)}
        >
          <option value="all">All Stock Statuses</option>
          <option value="in_stock">In Stock (&gt; 0)</option>
          <option value="low">Low Stock (≤ Safety Stock)</option>
          <option value="out_of_stock">Out of Stock (= 0)</option>
        </select>

        <button type="button" className="btn btn-secondary" onClick={fetchProducts}>
          <RefreshCw size={15} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Products Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Product Description</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Unit Price</th>
                <th>Stock Level</th>
                <th>Location</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                      <RefreshCw className="spin" size={18} />
                      <span>Loading products...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length > 0 ? (
                products.map((p) => {
                  const isOut = p.current_stock === 0;
                  const isLow = p.current_stock <= p.minimum_stock;

                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.product_name}</td>
                      <td>
                        <span className="badge badge-neutral" style={{ fontFamily: 'monospace' }}>
                          {p.sku}
                        </span>
                      </td>
                      <td>{p.category}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(p.unit_price)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span
                            style={{
                              fontSize: '1rem',
                              fontWeight: 700,
                              color: isOut ? '#dc2626' : isLow ? '#d97706' : '#059669',
                            }}
                          >
                            {p.current_stock}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>
                            / min {p.minimum_stock}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {p.warehouse_location}
                      </td>
                      <td>
                        {isOut ? (
                          <span className="badge badge-danger">Out of Stock</span>
                        ) : isLow ? (
                          <span className="badge badge-warning">Low Stock</span>
                        ) : (
                          <span className="badge badge-success">Available</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          {canManageProducts && (
                            <>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleOpenStockAdjust(p)}
                                title="Adjust Stock (IN/OUT)"
                              >
                                <ArrowLeftRight size={14} />
                                <span>Adjust</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleOpenEdit(p)}
                                title="Edit Product Specs"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ color: '#dc2626' }}
                                onClick={() => setDeleteId(p.id)}
                                title="Delete Product"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                          {!canManageProducts && (
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-sub)' }}>Catalog View</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <Package size={40} className="empty-state-icon" />
                      <h3 className="empty-state-title">No products found</h3>
                      <p className="empty-state-description">
                        Try changing your search terms or filter settings.
                      </p>
                      {canManageProducts && (
                        <button type="button" className="btn btn-primary btn-sm" onClick={handleOpenCreate}>
                          <Plus size={16} />
                          <span>Add New Product</span>
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

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add New Product to Catalog'}
        size="lg"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveProduct}
              disabled={saving}
            >
              {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveProduct}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Wireless Barcode Scanner 2D"
                value={formData.product_name}
                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
              />
              {formErrors.product_name && <div className="form-error">{formErrors.product_name}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">SKU / Item Code *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. SCAN-BC-2D-WL"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
              />
              {formErrors.sku && <div className="form-error">{formErrors.sku}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Category *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Point of Sale, Peripherals..."
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
              {formErrors.category && <div className="form-error">{formErrors.category}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Unit Price (INR) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="form-input"
                placeholder="2450.00"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
              />
              {formErrors.unit_price && <div className="form-error">{formErrors.unit_price}</div>}
            </div>

            {!editingProduct && (
              <div className="form-group">
                <label className="form-label">Initial Opening Stock</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  placeholder="0"
                  value={formData.current_stock}
                  onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                />
                {formErrors.current_stock && <div className="form-error">{formErrors.current_stock}</div>}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Minimum Safety Stock *</label>
              <input
                type="number"
                min="0"
                className="form-input"
                placeholder="10"
                value={formData.minimum_stock}
                onChange={(e) => setFormData({ ...formData, minimum_stock: e.target.value })}
              />
              {formErrors.minimum_stock && <div className="form-error">{formErrors.minimum_stock}</div>}
            </div>

            <div className="form-group" style={{ gridColumn: editingProduct ? 'span 2' : 'span 1' }}>
              <label className="form-label">Warehouse Bin / Location *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Warehouse-A / Shelf-05"
                value={formData.warehouse_location}
                onChange={(e) => setFormData({ ...formData, warehouse_location: e.target.value })}
              />
              {formErrors.warehouse_location && <div className="form-error">{formErrors.warehouse_location}</div>}
            </div>
          </div>
        </form>
      </Modal>

      {/* Stock Adjustment Modal */}
      {adjustModalProduct && (
        <Modal
          isOpen={true}
          onClose={() => setAdjustModalProduct(null)}
          title={`Adjust Stock: ${adjustModalProduct.product_name}`}
          footer={
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setAdjustModalProduct(null)}
                disabled={adjustSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveStockAdjust}
                disabled={adjustSaving}
              >
                {adjustSaving ? 'Recording...' : 'Record Movement'}
              </button>
            </>
          }
        >
          <form onSubmit={handleSaveStockAdjust}>
            {adjustError && (
              <div className="alert-banner alert-danger">
                <AlertCircle size={18} />
                <span>{adjustError}</span>
              </div>
            )}

            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Product SKU:</span>
                <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{adjustModalProduct.sku}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Location:</span>
                <span style={{ fontWeight: 600 }}>{adjustModalProduct.warehouse_location}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Live Current Stock:</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {adjustModalProduct.current_stock} units
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Movement Type *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  type="button"
                  className={`btn ${adjustType === 'IN' ? 'btn-success' : 'btn-secondary'}`}
                  onClick={() => setAdjustType('IN')}
                >
                  <Plus size={16} />
                  <span>IN (Inbound / Restock)</span>
                </button>
                <button
                  type="button"
                  className={`btn ${adjustType === 'OUT' ? 'btn-danger' : 'btn-secondary'}`}
                  onClick={() => setAdjustType('OUT')}
                >
                  <span>OUT (Damage / Sample / Adj)</span>
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Quantity Changed *</label>
              <input
                type="number"
                min="1"
                className="form-input"
                placeholder="Units to add or remove"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                required
              />
              {adjustType === 'OUT' && Number(adjustQty) > adjustModalProduct.current_stock && (
                <div className="form-error">
                  Cannot remove more than currently available stock ({adjustModalProduct.current_stock})
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Audit Reason *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Inbound PO# 88129, Damage write-off, Physical count audit..."
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                required
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Product"
        message="Are you sure you want to delete this product? Products with linked sales challans or multiple stock movements cannot be deleted to maintain audit integrity."
        confirmText="Delete Product"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};
