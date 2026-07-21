import { useToastStore, type ToastMessage } from '../store/toastStore';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: ToastMessage; onClose: () => void }) {
  const icons = {
    success: <CheckCircle size={18} color="var(--secondary)" />,
    error: <AlertCircle size={18} color="var(--error)" />,
    info: <Info size={18} color="var(--primary)" />,
  };

  const bgColors = {
    success: 'rgba(16, 185, 129, 0.1)',
    error: 'rgba(239, 68, 68, 0.1)',
    info: 'rgba(79, 70, 229, 0.1)',
  };

  const borderColors = {
    success: 'rgba(16, 185, 129, 0.2)',
    error: 'rgba(239, 68, 68, 0.2)',
    info: 'rgba(79, 70, 229, 0.2)',
  };

  return (
    <div
      className="glass-panel animate-fade-in"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '1rem 1.25rem',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-md)',
        minWidth: '280px',
        maxWidth: '400px',
        backgroundColor: bgColors[toast.type],
        borderColor: borderColors[toast.type],
        pointerEvents: 'auto',
        transition: 'all 0.3s ease',
      }}
    >
      {icons[toast.type]}
      <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-main)' }}>
        {toast.message}
      </span>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0.25rem',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
        }}
        className="hover:bg-[var(--surface-hover)]"
      >
        <X size={14} />
      </button>
    </div>
  );
}
