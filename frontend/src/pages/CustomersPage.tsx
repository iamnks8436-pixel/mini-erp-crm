import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Calendar,
  AlertCircle,
  RefreshCw,
  Phone,
  Mail,
  Building2,
} from 'lucide-react';
import { customerApi } from '../api';
import { Customer, CustomerStatus, CustomerType } from '../types';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

interface CustomerFormData {
  customer_name: string;
  mobile: string;
  email: string;
  business_name: string;
  gst_number: string;
  customer_type: CustomerType;
  address: string;
  status: CustomerStatus;
  follow_up_date: string;
  notes: string;
}

const initialFormData: CustomerFormData = {
  customer_name: '',
  mobile: '',
  email: '',
  business_name: '',
  gst_number: '',
  customer_type: 'Wholesale',
  address: '',
  status: 'Active',
  follow_up_date: '',
  notes: '',
};

export const CustomersPage: React.FC = () => {
  const { hasRole } = useAuth();
  const canModify = hasRole(['Admin', 'Sales']);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Delete Confirm
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await customerApi.getAll({
        search: search.trim() || undefined,
        status: statusFilter,
        type: typeFilter,
        page,
        limit: 10,
      });
      setCustomers(data.customers);
      setTotalPages(data.pagination.totalPages || 1);
      setTotalCount(data.pagination.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter, page]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setFormData(initialFormData);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      customer_name: c.customer_name,
      mobile: c.mobile,
      email: c.email,
      business_name: c.business_name,
      gst_number: c.gst_number || '',
      customer_type: c.customer_type,
      address: c.address,
      status: c.status,
      follow_up_date: c.follow_up_date ? c.follow_up_date.slice(0, 10) : '',
      notes: c.notes || '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.customer_name.trim()) errors.customer_name = 'Customer name is required';
    if (!formData.mobile.trim()) errors.mobile = 'Mobile number is required';
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Valid email is required';
    if (!formData.business_name.trim()) errors.business_name = 'Business name is required';
    if (!formData.address.trim()) errors.address = 'Address is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSaving(true);
      setError(null);
      const payload = {
        ...formData,
        gst_number: formData.gst_number.trim() || null,
        follow_up_date: formData.follow_up_date || null,
        notes: formData.notes.trim() || null,
      };

      if (editingCustomer) {
        await customerApi.update(editingCustomer.id, payload);
      } else {
        await customerApi.create(payload);
      }

      setIsModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      setError(err.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await customerApi.delete(deleteId);
      setDeleteId(null);
      fetchCustomers();
    } catch (err: any) {
      setError(err.message || 'Failed to delete customer');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: CustomerStatus) => {
    switch (status) {
      case 'Active':
        return <span className="badge badge-success">Active</span>;
      case 'Lead':
        return <span className="badge badge-warning">Lead</span>;
      case 'Inactive':
        return <span className="badge badge-neutral">Inactive</span>;
    }
  };

  const getTypeBadge = (type: CustomerType) => {
    switch (type) {
      case 'Distributor':
        return <span className="badge badge-info">Distributor</span>;
      case 'Wholesale':
        return <span className="badge badge-neutral" style={{ backgroundColor: '#f3e8ff', color: '#6b21a8' }}>Wholesale</span>;
      case 'Retail':
        return <span className="badge badge-neutral">Retail</span>;
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer CRM</h1>
          <p className="page-description">
            Manage wholesale clients, leads, contact directories, and follow-up schedules.
          </p>
        </div>
        {canModify && (
          <button type="button" className="btn btn-primary" onClick={handleOpenCreate}>
            <Plus size={18} />
            <span>Add Customer</span>
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
            placeholder="Search by customer name, business, mobile, email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <select
          className="form-select"
          style={{ width: 'auto', minWidth: '150px' }}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Lead">Lead</option>
          <option value="Inactive">Inactive</option>
        </select>

        <select
          className="form-select"
          style={{ width: 'auto', minWidth: '150px' }}
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">All Types</option>
          <option value="Distributor">Distributor</option>
          <option value="Wholesale">Wholesale</option>
          <option value="Retail">Retail</option>
        </select>

        <button type="button" className="btn btn-secondary" onClick={fetchCustomers}>
          <RefreshCw size={15} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Customer List Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Customer & Business</th>
                <th>Contact Info</th>
                <th>Type</th>
                <th>Status</th>
                <th>Follow-up</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                      <RefreshCw className="spin" size={18} />
                      <span>Loading customers...</span>
                    </div>
                  </td>
                </tr>
              ) : customers.length > 0 ? (
                customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link
                        to={`/customers/${c.id}`}
                        style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.95rem' }}
                      >
                        {c.customer_name}
                      </Link>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                        <Building2 size={13} />
                        <span>{c.business_name}</span>
                        {c.gst_number && (
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>• GST: {c.gst_number}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem' }}>
                        <Phone size={13} color="#64748b" />
                        <span>{c.mobile}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        <Mail size={13} color="#64748b" />
                        <span>{c.email}</span>
                      </div>
                    </td>
                    <td>{getTypeBadge(c.customer_type)}</td>
                    <td>{getStatusBadge(c.status)}</td>
                    <td>
                      {c.follow_up_date ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                          <Calendar size={13} color="#2563eb" />
                          <span>{new Date(c.follow_up_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-sub)', fontSize: '0.8rem' }}>None</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <Link
                          to={`/customers/${c.id}`}
                          className="btn btn-secondary btn-sm"
                          title="View Customer Profile"
                        >
                          <Eye size={14} />
                          <span>View</span>
                        </Link>
                        {canModify && (
                          <>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenEdit(c)}
                              title="Edit Customer"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ color: '#dc2626' }}
                              onClick={() => setDeleteId(c.id)}
                              title="Delete Customer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <Users size={40} className="empty-state-icon" />
                      <h3 className="empty-state-title">No customers found</h3>
                      <p className="empty-state-description">
                        Try adjusting your search query or filters to find what you are looking for.
                      </p>
                      {canModify && (
                        <button type="button" className="btn btn-primary btn-sm" onClick={handleOpenCreate}>
                          <Plus size={16} />
                          <span>Add New Customer</span>
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
              Showing {customers.length} of {totalCount} customers
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

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? 'Edit Customer' : 'Add New Customer'}
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
              onClick={handleSaveCustomer}
              disabled={saving}
            >
              {saving ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Create Customer'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveCustomer}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Customer Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Rajesh Sharma"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              />
              {formErrors.customer_name && <div className="form-error">{formErrors.customer_name}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Business / Firm Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Apex Telecom Distributors"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
              />
              {formErrors.business_name && <div className="form-error">{formErrors.business_name}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Mobile Number *</label>
              <input
                type="tel"
                className="form-input"
                placeholder="+91 98201 44551"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              />
              {formErrors.mobile && <div className="form-error">{formErrors.mobile}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input
                type="email"
                className="form-input"
                placeholder="rajesh@apextelecom.in"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              {formErrors.email && <div className="form-error">{formErrors.email}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">GST Number (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="27AABCA1234F1Z8"
                value={formData.gst_number}
                onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Customer Type</label>
              <select
                className="form-select"
                value={formData.customer_type}
                onChange={(e) => setFormData({ ...formData, customer_type: e.target.value as CustomerType })}
              >
                <option value="Wholesale">Wholesale</option>
                <option value="Distributor">Distributor</option>
                <option value="Retail">Retail</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Account Status</label>
              <select
                className="form-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as CustomerStatus })}
              >
                <option value="Active">Active</option>
                <option value="Lead">Lead</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Follow-up Date</label>
              <input
                type="date"
                className="form-input"
                value={formData.follow_up_date}
                onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Complete Shipping & Billing Address *</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Plot/Shop number, street, city, state, pincode"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
            {formErrors.address && <div className="form-error">{formErrors.address}</div>}
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">CRM Notes & Payment Terms</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Credit period, discount terms, contact preferences..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Customer Account"
        message="Are you sure you want to delete this customer? This action cannot be undone. Customers with linked sales challans cannot be deleted."
        confirmText="Delete Customer"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};
