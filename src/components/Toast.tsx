import { useToastStore, type ToastMessage } from '../store/toastStore';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="toast-stack"    >
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

  return (
    <div className="toast-item animate-fade-in" role={toast.type === 'error' ? 'alert' : 'status'}>
      {icons[toast.type]}
      <span className="flex-1 text-sm font-medium text-[var(--text-main)]">
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
