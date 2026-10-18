import React, { useState } from 'react';
import { 
  X, 
  CreditCard, 
  CheckCircle2, 
  Copy, 
  Check, 
  Upload, 
  Clock, 
  ShieldCheck, 
  Loader2,
  Smartphone,
  Building2,
  ArrowRight
} from 'lucide-react';
import { Button } from './Button';
import { dataService, type Course, type CourseEnrollment } from '../lib/dataService';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';

interface EnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
  onSuccess: (enrollment: CourseEnrollment) => void;
}

export function EnrollmentModal({ isOpen, onClose, course, onSuccess }: EnrollmentModalProps) {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();

  const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Nagad' | 'Rocket' | 'Bank'>('bKash');
  const [senderNumber, setSenderNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [amount, setAmount] = useState<number>(course.price ?? 2500);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [studentNotes, setStudentNotes] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<CourseEnrollment | null>(null);

  if (!isOpen) return null;

  const paymentAccounts = {
    bKash: {
      type: 'Personal (Send Money)',
      number: '01712-345678',
      cleanNumber: '01712345678',
      color: '#E2136E',
      instructions: [
        'Open your bKash app or dial *247#',
        'Choose "Send Money" (Personal)',
        'Enter receiver number: 01712345678',
        `Enter Amount: ৳${amount || course.price || 2500}`,
        'Put Reference: Your Name or Course Name',
        'Save the Transaction ID (TrxID) and take a screenshot of confirmation'
      ]
    },
    Nagad: {
      type: 'Personal (Send Money)',
      number: '01812-345678',
      cleanNumber: '01812345678',
      color: '#F7941D',
      instructions: [
        'Open your Nagad app or dial *167#',
        'Choose "Send Money"',
        'Enter receiver number: 01812345678',
        `Enter Amount: ৳${amount || course.price || 2500}`,
        'Enter PIN and complete payment',
        'Copy the Transaction ID and capture a receipt screenshot'
      ]
    },
    Rocket: {
      type: 'Personal (Send Money)',
      number: '01912-345678-9',
      cleanNumber: '019123456789',
      color: '#8C3494',
      instructions: [
        'Open Rocket App or dial *322#',
        'Select "Send Money"',
        'Enter 12-digit number: 019123456789',
        `Amount: ৳${amount || course.price || 2500}`,
        'Note the TrxID and take a screenshot of the receipt'
      ]
    },
    Bank: {
      type: 'Direct Bank Transfer',
      bankName: 'City Bank Ltd',
      accountName: 'StudyMate Academy BD',
      accountNumber: '2301987654001',
      branch: 'Gulshan Branch, Dhaka',
      routingNumber: '225261328',
      instructions: [
        'Transfer via Internet Banking, BEFTN, NPSB, or branch deposit',
        'Account Name: StudyMate Academy BD',
        'Account Number: 2301987654001 (City Bank Ltd)',
        'Attach the deposit slip or transaction receipt screenshot below'
      ]
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        addToast('Receipt file must be under 15MB', 'error');
        return;
      }
      setProofFile(file);
      if (file.type.startsWith('image/')) {
        setProofPreview(URL.createObjectURL(file));
      } else {
        setProofPreview(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      addToast('Please login to enroll in this course.', 'error');
      return;
    }

    if (!senderNumber.trim()) {
      addToast('Please enter your sender mobile/account number.', 'error');
      return;
    }

    if (!transactionId.trim()) {
      addToast('Please enter your Transaction ID (TrxID).', 'error');
      return;
    }

    setSubmitting(true);

    try {
      let uploadedProofUrl = '';
      if (proofFile) {
        const { url, error: uploadErr } = await dataService.uploadEnrollmentProof(proofFile);
        if (uploadErr) {
          console.warn('Proof upload error:', uploadErr);
        } else if (url) {
          uploadedProofUrl = url;
        }
      }

      const { data, error } = await dataService.submitEnrollment({
        course_id: course.id,
        user_id: user.id,
        payment_method: paymentMethod,
        sender_number: senderNumber.trim(),
        transaction_id: transactionId.trim().toUpperCase(),
        amount: Number(amount) || 0,
        proof_url: uploadedProofUrl,
        student_notes: studentNotes.trim(),
      });

      if (error) {
        throw error;
      }

      if (data) {
        setSubmittedData(data);
        addToast('Enrollment request submitted! Awaiting admin approval.', 'success');
        onSuccess(data);
      }
    } catch (err: any) {
      console.error('Failed to submit enrollment:', err);
      addToast(err?.message || 'Failed to submit enrollment. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[var(--surface)] border border-[var(--border)] rounded-3xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)] bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--primary)] text-white flex items-center justify-center shadow-md">
              <CreditCard size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-main)] font-[var(--font-heading)]">
                Course Enrollment & Manual Payment
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                {course.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-full hover:bg-[var(--surface-hover)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {submittedData ? (
            /* SUCCESS CONFIRMATION STATE */
            <div className="py-8 text-center space-y-5 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={36} />
              </div>
              
              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-2xl font-bold text-[var(--text-main)]">
                  Payment Submitted Successfully!
                </h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  Your payment details have been received and are now pending verification by our admin team.
                </p>
              </div>

              <div className="bg-[var(--surface-hover)] p-4 rounded-2xl border border-[var(--border)] max-w-md mx-auto text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Transaction ID:</span>
                  <span className="font-mono font-bold text-[var(--text-main)]">{submittedData.transaction_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Payment Method:</span>
                  <span className="font-semibold text-[var(--text-main)]">{submittedData.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Sender Account:</span>
                  <span className="font-medium text-[var(--text-main)]">{submittedData.sender_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Amount:</span>
                  <span className="font-bold text-emerald-500">৳{submittedData.amount} BDT</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-[var(--border)]">
                  <span className="text-[var(--text-muted)]">Status:</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <Clock size={12} /> Under Review
                  </span>
                </div>
              </div>

              <div className="pt-4 flex justify-center gap-3">
                <Button variant="primary" onClick={onClose}>
                  Done
                </Button>
              </div>
            </div>
          ) : (
            /* ENROLLMENT FORM & PAYMENT INSTRUCTIONS */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* COURSE SUMMARY BANNER */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-[var(--surface-hover)] to-[var(--surface)] border border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="w-16 h-12 object-cover rounded-xl border border-[var(--border)]"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-main)] line-clamp-1">{course.title}</h4>
                    <p className="text-xs text-[var(--text-muted)]">{course.instructor_name} • {course.duration}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-[var(--text-muted)] block uppercase font-semibold">Course Fee</span>
                  <span className="text-lg font-black text-indigo-500">
                    {course.price ? `৳ ${course.price.toLocaleString()} BDT` : 'Free'}
                  </span>
                </div>
              </div>

              {/* PAYMENT METHOD SELECTOR TABS */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  Select Payment Option
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['bKash', 'Nagad', 'Rocket', 'Bank'] as const).map((method) => {
                    const isSelected = paymentMethod === method;
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-500/10 shadow-sm ring-1 ring-indigo-500'
                            : 'border-[var(--border)] bg-[var(--surface-hover)] hover:bg-[var(--surface)] text-[var(--text-muted)]'
                        }`}
                      >
                        {method === 'Bank' ? (
                          <Building2 size={20} className={isSelected ? 'text-indigo-500' : ''} />
                        ) : (
                          <Smartphone size={20} className={isSelected ? 'text-indigo-500' : ''} />
                        )}
                        <span className={`text-xs font-bold ${isSelected ? 'text-[var(--text-main)]' : ''}`}>
                          {method}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PAYMENT ACCOUNT DETAILS BOX */}
              <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-500 uppercase tracking-wide flex items-center gap-1.5">
                    <ShieldCheck size={14} /> Official {paymentMethod} Account
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {paymentAccounts[paymentMethod].type}
                  </span>
                </div>

                {paymentMethod === 'Bank' ? (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)]">Bank Name:</span>
                      <span className="font-bold text-[var(--text-main)]">{paymentAccounts.Bank.bankName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)]">Account Name:</span>
                      <span className="font-bold text-[var(--text-main)]">{paymentAccounts.Bank.accountName}</span>
                    </div>
                    <div className="flex items-center justify-between bg-[var(--surface)] p-2 rounded-xl border border-[var(--border)]">
                      <span className="text-[var(--text-muted)]">Account Number:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[var(--text-main)] text-sm">
                          {paymentAccounts.Bank.accountNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(paymentAccounts.Bank.accountNumber, 'bank_acc')}
                          className="p-1 hover:bg-[var(--surface-hover)] rounded text-indigo-500"
                          title="Copy account number"
                        >
                          {copiedKey === 'bank_acc' ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)]">Branch & Routing:</span>
                      <span className="font-medium text-[var(--text-main)]">
                        {paymentAccounts.Bank.branch} (Routing: {paymentAccounts.Bank.routingNumber})
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-[var(--surface)] p-3 rounded-2xl border border-[var(--border)]">
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] uppercase block font-semibold">
                        Send Money To:
                      </span>
                      <span className="font-mono text-base font-extrabold text-[var(--text-main)] tracking-wider">
                        {paymentAccounts[paymentMethod].number}
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => handleCopy(paymentAccounts[paymentMethod].cleanNumber, paymentMethod)}
                      icon={copiedKey === paymentMethod ? <Check size={14} /> : <Copy size={14} />}
                      className="text-xs"
                    >
                      {copiedKey === paymentMethod ? 'Copied!' : 'Copy Number'}
                    </Button>
                  </div>
                )}

                {/* Step-by-step instructions */}
                <div className="pt-2 border-t border-indigo-500/10">
                  <p className="text-[11px] font-semibold text-[var(--text-muted)] mb-1.5">How to pay:</p>
                  <ol className="text-[11px] text-[var(--text-muted)] list-decimal pl-4 space-y-1">
                    {paymentAccounts[paymentMethod].instructions.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                </div>

                {course.payment_instructions && (
                  <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-600 dark:text-amber-400">
                    <p className="font-bold">Course-specific Note:</p>
                    <p>{course.payment_instructions}</p>
                  </div>
                )}
              </div>

              {/* INPUT FIELDS */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* SENDER NUMBER */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-main)] flex items-center justify-between">
                      <span>Sender Phone Number / A/C <span className="text-red-500">*</span></span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 01712345678"
                      value={senderNumber}
                      onChange={(e) => setSenderNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] text-sm text-[var(--text-main)] focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  {/* TRANSACTION ID */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-main)] flex items-center justify-between">
                      <span>Transaction ID (TrxID) <span className="text-red-500">*</span></span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 9B8A7C6D5E"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] text-sm text-[var(--text-main)] focus:outline-none focus:border-indigo-500 font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* PAID AMOUNT */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-main)]">
                      Paid Amount (BDT)
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] text-sm text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* PROOF RECEIPT UPLOAD */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-main)] flex items-center justify-between">
                      <span>Payment Screenshot / Receipt</span>
                      <span className="text-[10px] text-[var(--text-muted)]">(Image or PDF)</span>
                    </label>
                    <label className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl border border-dashed border-[var(--border)] hover:border-indigo-500 bg-[var(--surface-hover)] cursor-pointer text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors overflow-hidden">
                      <Upload size={16} className="text-indigo-500 flex-shrink-0" />
                      <span className="truncate flex-1">
                        {proofFile ? proofFile.name : 'Upload screenshot or PDF...'}
                      </span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* PROOF THUMBNAIL PREVIEW IF IMAGE */}
                {proofPreview && (
                  <div className="relative inline-block border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
                    <img
                      src={proofPreview}
                      alt="Proof Preview"
                      className="h-20 w-auto object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setProofFile(null);
                        setProofPreview(null);
                      }}
                      className="absolute top-1 right-1 bg-black/70 hover:bg-black text-white p-1 rounded-full text-xs"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}

                {/* STUDENT NOTES */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-main)]">
                    Additional Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Enrolled for ICT Exam preparation batch"
                    value={studentNotes}
                    onChange={(e) => setStudentNotes(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] text-xs text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* FOOTER ACTIONS */}
              <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between gap-3">
                <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
                  <Clock size={13} className="text-indigo-500" />
                  <span>Verified by Admin usually within 1 hour</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={submitting}
                    icon={submitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  >
                    {submitting ? 'Submitting...' : 'Submit Payment Proof'}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
