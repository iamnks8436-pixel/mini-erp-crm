import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary' | 'warning';
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}) => {
  const getButtonClass = () => {
    switch (variant) {
      case 'danger':
        return 'btn-danger';
      case 'warning':
        return 'btn-warning';
      default:
        return 'btn-primary';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => {} : onClose}
      title={title}
      footer={
        <>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn ${getButtonClass()}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div
          style={{
            padding: '0.6rem',
            borderRadius: '50%',
            backgroundColor: variant === 'danger' ? '#fee2e2' : '#fef3c7',
            color: variant === 'danger' ? '#dc2626' : '#d97706',
          }}
        >
          <AlertTriangle size={24} />
        </div>
        <div>
          <p style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>{message}</p>
        </div>
      </div>
    </Modal>
  );
};
