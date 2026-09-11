import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  AlertCircle,
  Save,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Package,
} from 'lucide-react';
import { challanApi, customerApi, productApi } from '../api';
import { Customer, Product } from '../types';

interface LineItemForm {
  product_id: number;
  quantity: number;
}

export const ChallanCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedCustomerId = searchParams.get('customerId');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form State
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItemForm[]>([]);

  // Validation & Submitting
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadDependencies = async () => {
      try {
        setLoadingInitial(true);
        const [custRes, prodRes] = await Promise.all([
          customerApi.getAll({ limit: 100 }),
          productApi.getAll(),
        ]);
        setCustomers(custRes.customers);
        setProducts(prodRes.products);

        if (preselectedCustomerId) {
          const parsed = parseInt(preselectedCustomerId, 10);
          if (!isNaN(parsed)) {
            setCustomerId(parsed);
          }
        } else if (custRes.customers.length > 0) {
          setCustomerId(custRes.customers[0].id);
        }

        // Initialize with 1 empty line item if products exist
        if (prodRes.products.length > 0) {
          setItems([{ product_id: prodRes.products[0].id, quantity: 1 }]);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to initialize challan creation form');
      } finally {
        setLoadingInitial(false);
      }
    };

    loadDependencies();
  }, [preselectedCustomerId]);

  const handleAddItem = () => {
    if (products.length === 0) return;
    // Pick first product not already in items, or default to first
    const usedIds = new Set(items.map((i) => i.product_id));
    const available = products.find((p) => !usedIds.has(p.id)) || products[0];
    setItems([...items, { product_id: available.id, quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setError('A challan must contain at least one product item');
      return;
    }
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  const handleItemChange = (index: number, field: keyof LineItemForm, value: number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const getProductById = (id: number): Product | undefined => {
    return products.find((p) => p.id === id);
  };

  // Calculations
  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalAmount = items.reduce((sum, item) => {
    const p = getProductById(item.product_id);
    const unitPrice = p ? Number(p.unit_price) : 0;
    return sum + unitPrice * (Number(item.quantity) || 0);
  }, 0);

  // Check if any product has insufficient stock for direct confirmation
  const insufficientStockItems = items
    .map((item) => {
      const p = getProductById(item.product_id);
      if (!p) return null;
      if (item.quantity > p.current_stock) {
        return {
          name: p.product_name,
          required: item.quantity,
          available: p.current_stock,
        };
      }
      return null;
    })
    .filter(Boolean);

  const handleSubmitChallan = async (status: 'Draft' | 'Confirmed') => {
    if (!customerId) {
      setError('Please select a customer for this challan');
      return;
    }

    if (items.length === 0) {
      setError('Please add at least one line item');
      return;
    }

    for (const item of items) {
      if (!item.quantity || item.quantity <= 0) {
        setError('All product quantities must be greater than 0');
        return;
      }
    }

    // If directly confirming, alert if client-side stock is insufficient
    if (status === 'Confirmed' && insufficientStockItems.length > 0) {
      const bad = insufficientStockItems[0]!;
      setError(
        `Insufficient stock for product: ${bad.name} (Available: ${bad.available}, Required: ${bad.required}). Stock cannot be reduced below zero.`
      );
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await challanApi.create({
        customer_id: Number(customerId),
        notes: notes.trim() || null,
        status,
        items: items.map((i) => ({
          product_id: i.product_id,
          quantity: Number(i.quantity),
        })),
      });

      // Navigate to Challan Details
      navigate(`/challans/${res.challan.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create sales challan');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(Number(amount) || 0);
  };

  const selectedCustomer = customers.find((c) => c.id === customerId);

  if (loadingInitial) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
        Loading product catalog and customer records...
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link to="/challans" className="btn btn-secondary btn-sm" style={{ marginBottom: '0.5rem' }}>
            <ArrowLeft size={16} />
            <span>Back to Challans</span>
          </Link>
          <h1 className="page-title">Generate Delivery Challan</h1>
          <p className="page-description">
            Create a formal sales challan for order dispatch. Drafts hold items without deducting inventory; Confirmation executes immediate stock reduction.
          </p>
        </div>
      </div>

      {error && (
        <div className="alert-banner alert-danger">
          <AlertCircle size={20} />
          <div>
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {insufficientStockItems.length > 0 && (
        <div className="alert-banner alert-warning">
          <AlertTriangle size={20} />
          <div>
            <strong>Warning: Insufficient Warehouse Stock Detected</strong>
            <p style={{ fontSize: '0.84rem', marginTop: '0.15rem' }}>
              One or more selected items exceed currently available inventory. You can still save this challan as a{' '}
              <strong>Draft</strong>, but direct confirmation will be rejected until restocked.
            </p>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Column: Customer & Items */}
        <div>
          {/* Customer Selection Card */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={18} color="#2563eb" />
                <h3 className="card-title">Customer / Consignee Information</h3>
              </div>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Select Customer / Wholesale Partner *</label>
                <select
                  className="form-select"
                  value={customerId}
                  onChange={(e) => setCustomerId(Number(e.target.value))}
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customer_name} — {c.business_name} ({c.customer_type})
                    </option>
                  ))}
                </select>
              </div>

              {selectedCustomer && (
                <div
                  style={{
                    background: '#f8fafc',
                    padding: '1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: '0.85rem',
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Contact Person: </span>
                      <strong>{selectedCustomer.customer_name}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Firm: </span>
                      <strong>{selectedCustomer.business_name}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Mobile: </span>
                      <span>{selectedCustomer.mobile}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>GSTIN: </span>
                      <span>{selectedCustomer.gst_number || 'None'}</span>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Delivery Address: </span>
                      <span>{selectedCustomer.address}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table Card */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={18} color="#2563eb" />
                <h3 className="card-title">Challan Line Items ({items.length})</h3>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddItem}
              >
                <Plus size={15} />
                <span>Add Product Line</span>
              </button>
            </div>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '40%' }}>Product Selection</th>
                    <th>Unit Price</th>
                    <th>Available Stock</th>
                    <th style={{ width: '110px' }}>Dispatch Qty</th>
                    <th>Total Value</th>
                    <th style={{ textAlign: 'center', width: '60px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const prod = getProductById(item.product_id);
                    const unitPrice = prod ? Number(prod.unit_price) : 0;
                    const lineTotal = unitPrice * (item.quantity || 0);
                    const isInsufficient = prod && item.quantity > prod.current_stock;

                    return (
                      <tr key={index}>
                        <td>
                          <select
                            className="form-select"
                            value={item.product_id}
                            onChange={(e) =>
                              handleItemChange(index, 'product_id', Number(e.target.value))
                            }
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.product_name} ({p.sku})
                              </option>
                            ))}
                          </select>
                          {prod && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                              SKU: <span style={{ fontFamily: 'monospace' }}>{prod.sku}</span> | Zone: {prod.warehouse_location}
                            </div>
                          )}
                        </td>
                        <td style={{ fontWeight: 600 }}>{formatCurrency(unitPrice)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span
                              style={{
                                fontWeight: 700,
                                color: prod?.current_stock === 0 ? '#dc2626' : isInsufficient ? '#d97706' : '#059669',
                              }}
                            >
                              {prod ? prod.current_stock : 0}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>units</span>
                          </div>
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            className="form-input"
                            style={{
                              borderColor: isInsufficient ? '#dc2626' : 'var(--border)',
                              fontWeight: 700,
                            }}
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(index, 'quantity', Math.max(1, parseInt(e.target.value, 10) || 1))
                            }
                          />
                          {isInsufficient && (
                            <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 600 }}>
                              Exceeds stock!
                            </span>
                          )}
                        </td>
                        <td style={{ fontWeight: 700 }}>{formatCurrency(lineTotal)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#dc2626', padding: '0.35rem' }}
                            onClick={() => handleRemoveItem(index)}
                            title="Remove Line Item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddItem}
              >
                <Plus size={15} />
                <span>Add Another Line Item</span>
              </button>
            </div>
          </div>

          {/* Notes Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Dispatch & Logistics Notes</h3>
            </div>
            <div className="card-body">
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Driver details, vehicle number, transporter name, delivery instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary & Actions */}
        <div style={{ position: 'sticky', top: '80px' }}>
          <div className="card">
            <div className="card-header" style={{ backgroundColor: '#f8fafc' }}>
              <h3 className="card-title">Challan Summary</h3>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Line Items:</span>
                <strong>{items.length} items</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Physical Quantity:</span>
                <strong style={{ fontSize: '1.05rem', color: 'var(--primary)' }}>{totalQuantity} units</strong>
              </div>

              <div
                style={{
                  borderTop: '1px solid var(--border)',
                  paddingTop: '0.85rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Grand Total Value:</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                  {formatCurrency(totalAmount)}
                </span>
              </div>

              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  background: '#f8fafc',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  lineHeight: 1.4,
                }}
              >
                ℹ️ <strong>Stock Policy:</strong> Saving as <strong>Draft</strong> reserves order data without deducting stock. <strong>Confirm & Dispatch</strong> locks inventory and logs audit OUT movements in a database transaction.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: '0.7rem' }}
                  onClick={() => handleSubmitChallan('Draft')}
                  disabled={submitting}
                >
                  <Save size={16} />
                  <span>{submitting ? 'Saving...' : 'Save as Draft Challan'}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.75rem', fontWeight: 600 }}
                  onClick={() => handleSubmitChallan('Confirmed')}
                  disabled={submitting || insufficientStockItems.length > 0}
                >
                  <CheckCircle2 size={16} />
                  <span>Confirm & Dispatch Immediately</span>
                </button>

                {insufficientStockItems.length > 0 && (
                  <p style={{ color: '#dc2626', fontSize: '0.72rem', textAlign: 'center' }}>
                    Cannot confirm directly: resolve low stock items or save as draft.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
