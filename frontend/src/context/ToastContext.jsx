import { createContext, useContext, useState } from 'react';
import { CheckCircle, XCircle, Info, HelpCircle } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]); // [{id, message, type}]
  const [confirm, setConfirm] = useState(null); // {message, onConfirm}

  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const showConfirm = (message, onConfirm) => {
    setConfirm({ message, onConfirm });
  };

  const handleConfirmAccept = () => {
    if (confirm?.onConfirm) {
      confirm.onConfirm();
    }
    setConfirm(null);
  };

  const handleConfirmCancel = () => {
    setConfirm(null);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={16} />;
      case 'error':
        return <XCircle size={16} />;
      default:
        return <Info size={16} />;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, showConfirm }}>
      {children}

      {/* Floating Toasts container */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast-${t.type}`}>
              {getIcon(t.type)}
              <span>{t.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Custom Confirm Modal */}
      {confirm && (
        <div className="modal-overlay" style={{ zIndex: 3000 }} onClick={handleConfirmCancel}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <HelpCircle size={20} style={{ color: 'var(--accent)' }} />
                <h2 style={{ fontSize: '1rem' }}>Konfirmasi Tindakan</h2>
              </div>
            </div>
            <div className="modal-body" style={{ padding: '20px 24px' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{confirm.message}</p>
            </div>
            <div className="modal-footer" style={{ background: '#f8fafc', padding: '12px 24px' }}>
              <button className="btn btn-ghost btn-sm" onClick={handleConfirmCancel}>
                Batal
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleConfirmAccept}
                style={{ background: 'var(--danger)', color: 'white' }}
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
