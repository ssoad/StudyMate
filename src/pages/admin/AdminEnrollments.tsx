import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  ExternalLink, 
  Eye, 
  Copy, 
  Check, 
  RefreshCw, 
  FileText, 
  Loader2,
  X,
  DollarSign,
  Users
} from 'lucide-react';
import { Card, CardBody } from '../../components/Card';
import { Button } from '../../components/Button';
import { dataService, type CourseEnrollment } from '../../lib/dataService';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { playNotificationChime } from '../../lib/notificationSound';

export function AdminEnrollments() {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();

  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedTrxId, setCopiedTrxId] = useState<string | null>(null);

  // Lightbox Modal for Receipt
  const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null);

  // Reject Modal
  const [rejectingEnrollment, setRejectingEnrollment] = useState<CourseEnrollment | null>(null);
  const [rejectReason, setRejectReason] = useState('Transaction ID not found in statement.');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    let prevPendingCount = -1;

    const fetchLatest = async (isInitial = false) => {
      try {
        if (isInitial) setLoading(true);
        const data = await dataService.getAllEnrollments();
        const pendingNow = data.filter((e) => e.status === 'pending').length;
        if (prevPendingCount !== -1 && pendingNow > prevPendingCount) {
          playNotificationChime();
          addToast(`🔔 New enrollment request arrived! (${pendingNow} pending)`, 'info');
        }
        prevPendingCount = pendingNow;
        setEnrollments(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (isInitial) setLoading(false);
      }
    };

    fetchLatest(true);
    const interval = setInterval(() => fetchLatest(false), 6000);

    return () => clearInterval(interval);
  }, []);

  const loadEnrollments = async (showFullSpinner = false) => {
    if (showFullSpinner) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    try {
      const data = await dataService.getAllEnrollments();
      setEnrollments(data);
    } catch (err) {
      console.error(err);
      addToast('Failed to load enrollments.', 'error');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTrxId(text);
    setTimeout(() => setCopiedTrxId(null), 2000);
  };

  const handleApprove = async (enrollment: CourseEnrollment) => {
    setProcessingId(enrollment.id);
    try {
      const res = await dataService.updateEnrollmentStatus(
        enrollment.id,
        'approved',
        'Approved by admin.',
        user?.id,
        enrollment.course_id
      );

      if (res.error) throw res.error;

      addToast(`Enrollment approved for ${enrollment.user?.email || 'student'}!`, 'success');
      // Update local state
      setEnrollments((prev) =>
        prev.map((e) =>
          e.id === enrollment.id
            ? { ...e, status: 'approved', approved_at: new Date().toISOString(), approved_by: user?.id }
            : e
        )
      );
    } catch (err: any) {
      console.error(err);
      addToast(err?.message || 'Failed to approve enrollment.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingEnrollment) return;
    setProcessingId(rejectingEnrollment.id);
    try {
      const res = await dataService.updateEnrollmentStatus(
        rejectingEnrollment.id,
        'rejected',
        rejectReason.trim(),
        user?.id
      );

      if (res.error) throw res.error;

      addToast('Enrollment rejected.', 'info');
      setEnrollments((prev) =>
        prev.map((e) =>
          e.id === rejectingEnrollment.id
            ? { ...e, status: 'rejected', admin_notes: rejectReason.trim() }
            : e
        )
      );
      setRejectingEnrollment(null);
    } catch (err: any) {
      console.error(err);
      addToast(err?.message || 'Failed to reject enrollment.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Stats calculation
  const totalCount = enrollments.length;
  const pendingCount = enrollments.filter((e) => e.status === 'pending').length;
  const approvedCount = enrollments.filter((e) => e.status === 'approved').length;
  const rejectedCount = enrollments.filter((e) => e.status === 'rejected').length;
  const totalRevenue = enrollments
    .filter((e) => e.status === 'approved')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Filtered list
  const filteredEnrollments = enrollments.filter((item) => {
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      (item.transaction_id || '').toLowerCase().includes(query) ||
      (item.sender_number || '').toLowerCase().includes(query) ||
      (item.user?.email || '').toLowerCase().includes(query) ||
      (item.user?.full_name || '').toLowerCase().includes(query) ||
      (item.course?.title || '').toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-16">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-xs font-bold uppercase tracking-wider mb-2">
            <CreditCard size={14} /> Admin Verification Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] font-[var(--font-heading)]">
            Course Enrollments
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)]">
            Verify manual bKash/Nagad/Rocket/Bank payments, review proof receipts, and activate student classroom access.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Real-Time Sync (6s)</span>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadEnrollments(false)}
            disabled={isRefreshing}
            icon={<RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />}
          >
            {isRefreshing ? 'Syncing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* STATS METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-[var(--border)] bg-[var(--surface)]">
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--text-muted)] font-semibold">Total Requests</p>
              <h3 className="text-2xl font-black text-[var(--text-main)] mt-1">{totalCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Users size={20} />
            </div>
          </CardBody>
        </Card>

        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wide">
                Pending Review
              </p>
              <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{pendingCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock size={20} />
            </div>
          </CardBody>
        </Card>

        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wide">
                Approved
              </p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{approvedCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
          </CardBody>
        </Card>

        <Card className="border-red-500/30 bg-red-500/5">
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-red-600 dark:text-red-400 font-bold uppercase tracking-wide">
                Rejected
              </p>
              <h3 className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">{rejectedCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
              <XCircle size={20} />
            </div>
          </CardBody>
        </Card>

        <Card className="border-[var(--border)] bg-[var(--surface)] col-span-2 lg:col-span-1">
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--text-muted)] font-semibold">Total Revenue</p>
              <h3 className="text-2xl font-black text-indigo-500 mt-1">৳{totalRevenue.toLocaleString()}</h3>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <DollarSign size={20} />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* FILTER TABS & SEARCH BAR */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-[var(--surface)] p-4 rounded-2xl border border-[var(--border)] shadow-sm">
        {/* Status Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold capitalize whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {st} {st === 'pending' && pendingCount > 0 ? `(${pendingCount})` : ''}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search TrxID, sender number, student or course..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] text-xs text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* ENROLLMENTS TABLE */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <Loader2 size={32} className="animate-spin text-indigo-500" />
          <p className="text-xs text-[var(--text-muted)]">Loading enrollment requests...</p>
        </div>
      ) : filteredEnrollments.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-[var(--border)] rounded-2xl bg-[var(--surface)] space-y-2">
          <CreditCard size={40} className="mx-auto text-[var(--text-muted)] opacity-40" />
          <h3 className="text-base font-bold text-[var(--text-main)]">No enrollments found</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            {statusFilter !== 'all'
              ? `There are no enrollments matching status "${statusFilter}".`
              : 'Students who submit manual payment will appear here for verification.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-hover)] text-[var(--text-muted)] uppercase tracking-wider font-semibold text-[11px]">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Course</th>
                <th className="py-3 px-4">Payment & TrxID</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Proof</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredEnrollments.map((item) => {
                const isProcessing = processingId === item.id;
                const formattedDate = new Date(item.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <tr key={item.id} className="hover:bg-[var(--surface-hover)]/60 transition-colors">
                    {/* Student */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        {item.user?.avatar_url ? (
                          <img
                            src={item.user.avatar_url}
                            alt="avatar"
                            className="w-8 h-8 rounded-full object-cover border border-[var(--border)]"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 font-bold text-xs flex items-center justify-center">
                            {(item.user?.full_name || item.user?.email || 'U').substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-[var(--text-main)] truncate max-w-[140px]">
                            {item.user?.full_name || item.user?.email?.split('@')[0] || 'Student'}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)] truncate max-w-[140px]">
                            {item.user?.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Course */}
                    <td className="py-3.5 px-4 max-w-[200px]">
                      <div className="flex items-center gap-2">
                        {item.course?.thumbnail_url && (
                          <img
                            src={item.course.thumbnail_url}
                            alt="course"
                            className="w-9 h-6 object-cover rounded border border-[var(--border)] flex-shrink-0"
                          />
                        )}
                        <span className="font-medium text-[var(--text-main)] truncate" title={item.course?.title}>
                          {item.course?.title || 'Unknown Course'}
                        </span>
                      </div>
                    </td>

                    {/* Payment & TrxID */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 font-bold text-[10px]">
                            {item.payment_method}
                          </span>
                          <span className="text-[11px] text-[var(--text-muted)] font-mono">
                            {item.sender_number}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px]">
                          <span className="text-[var(--text-muted)]">TrxID:</span>
                          <span className="font-mono font-bold text-[var(--text-main)]">
                            {item.transaction_id || 'N/A'}
                          </span>
                          {item.transaction_id && (
                            <button
                              type="button"
                              onClick={() => handleCopy(item.transaction_id!)}
                              className="p-0.5 hover:text-indigo-500 text-[var(--text-muted)]"
                              title="Copy TrxID"
                            >
                              {copiedTrxId === item.transaction_id ? <Check size={12} /> : <Copy size={12} />}
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)]">{formattedDate}</p>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        ৳{Number(item.amount || 0).toLocaleString()}
                      </span>
                    </td>

                    {/* Proof Receipt */}
                    <td className="py-3.5 px-4">
                      {item.proof_url ? (
                        <button
                          type="button"
                          onClick={() => setPreviewProofUrl(item.proof_url!)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] hover:border-indigo-500 text-indigo-500 font-medium text-xs transition-colors"
                        >
                          <Eye size={13} /> View Receipt
                        </button>
                      ) : (
                        <span className="text-[11px] text-[var(--text-muted)] italic">No file attached</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {item.status === 'approved' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-bold text-[11px]">
                          <CheckCircle2 size={13} /> Approved
                        </span>
                      ) : item.status === 'rejected' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 font-bold text-[11px]">
                          <XCircle size={13} /> Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 font-bold text-[11px]">
                          <Clock size={13} /> Pending Review
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.status !== 'approved' && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleApprove(item)}
                            disabled={isProcessing}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-2.5"
                            icon={isProcessing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={13} />}
                          >
                            Approve
                          </Button>
                        )}

                        {item.status !== 'rejected' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setRejectingEnrollment(item);
                              setRejectReason('Transaction ID not found in statement.');
                            }}
                            disabled={isProcessing}
                            className="text-red-500 hover:bg-red-500/10 border-red-500/20 text-xs h-7 px-2.5"
                            icon={<XCircle size={13} />}
                          >
                            Reject
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* RECEIPT LIGHTBOX MODAL */}
      {previewProofUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative max-w-3xl w-full bg-[var(--surface)] border border-[var(--border)] rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                <FileText size={16} className="text-indigo-500" />
                Submitted Payment Proof / Receipt
              </h3>
              <div className="flex items-center gap-2">
                <a
                  href={previewProofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-xs text-indigo-500 hover:underline flex items-center gap-1"
                >
                  <ExternalLink size={14} /> Open Full
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewProofUrl(null)}
                  className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-full hover:bg-[var(--surface-hover)]"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex items-center justify-center bg-black/40">
              {previewProofUrl.endsWith('.pdf') ? (
                <iframe src={previewProofUrl} title="Receipt PDF" className="w-full h-[65vh] border-0" />
              ) : (
                <img
                  src={previewProofUrl}
                  alt="Payment Receipt"
                  className="max-h-[70vh] w-auto object-contain rounded-xl shadow-md"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* REJECT CONFIRMATION MODAL */}
      {rejectingEnrollment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="relative max-w-md w-full bg-[var(--surface)] border border-[var(--border)] rounded-3xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-500">
              <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center">
                <AlertCircle size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-main)]">Reject Enrollment Request</h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Student: {rejectingEnrollment.user?.email}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-main)]">
                Reason for Rejection (Visible to Student)
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] text-xs text-[var(--text-main)] focus:outline-none focus:border-red-500"
                placeholder="Explain why the enrollment was rejected..."
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  'Transaction ID not found in statement.',
                  'Paid amount is lower than course fee.',
                  'Duplicate Transaction ID submitted.',
                  'Unreadable screenshot / invalid receipt.',
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setRejectReason(reason)}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--surface-hover)] hover:bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border)]"
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setRejectingEnrollment(null)}
                disabled={processingId === rejectingEnrollment.id}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleConfirmReject}
                disabled={processingId === rejectingEnrollment.id}
                icon={processingId === rejectingEnrollment.id ? <Loader2 size={14} className="animate-spin" /> : undefined}
              >
                Confirm Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
