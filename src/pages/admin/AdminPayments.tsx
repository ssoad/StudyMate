import { useEffect, useMemo, useState } from 'react';
import { Building2, Eye, EyeOff, Pencil, Plus, Smartphone, Trash2, Wallet, X } from 'lucide-react';
import { Button } from '../../components/Button';
import { dataService, type Course } from '../../lib/dataService';
import {
  DEFAULT_STEPS,
  formatTaka,
  paymentService,
  paymentSteps,
  type PaymentKind,
  type PaymentMethod,
  type PaymentMethodInput,
} from '../../lib/paymentAccounts';
import { useToastStore } from '../../store/toastStore';

const EMPTY: PaymentMethodInput = {
  course_id: null,
  label: '',
  kind: 'mobile',
  account_type: 'Personal · Send Money',
  account_name: '',
  account_number: '',
  instructions: DEFAULT_STEPS.mobile,
  is_active: true,
  sort_order: 0,
};

export function AdminPayments() {
  const addToast = useToastStore((s) => s.addToast);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ id: string | null; form: PaymentMethodInput } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data, error }, courseList] = await Promise.all([paymentService.listAll(), dataService.getCourses()]);
    if (error) addToast(`Couldn't load payment methods: ${error}`, 'error');
    setMethods(data);
    setCourses(courseList);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups = useMemo(() => {
    const byScope = new Map<string, PaymentMethod[]>();
    for (const m of methods) {
      const key = m.course_id ?? 'all';
      byScope.set(key, [...(byScope.get(key) ?? []), m]);
    }
    const out: { key: string; title: string; note: string; items: PaymentMethod[] }[] = [
      {
        key: 'all',
        title: 'All courses',
        note: 'Shown for every course that has no methods of its own.',
        items: byScope.get('all') ?? [],
      },
    ];
    for (const c of courses) {
      const items = byScope.get(c.id);
      if (items?.length) out.push({ key: c.id, title: c.title, note: 'Replaces the "All courses" list for this course.', items });
    }
    return out;
  }, [methods, courses]);

  const startNew = (courseId: string | null = null) =>
    setEditing({ id: null, form: { ...EMPTY, course_id: courseId, sort_order: methods.length } });

  const startEdit = (m: PaymentMethod) => {
    const { id, created_at: _c, updated_at: _u, ...form } = m;
    setEditing({ id, form });
  };

  const save = async () => {
    if (!editing) return;
    const f = editing.form;
    if (!f.label.trim() || !f.account_number.trim()) {
      addToast('Name and account number are required', 'error');
      return;
    }
    setSaving(true);
    const clean = { ...f, label: f.label.trim(), account_number: f.account_number.trim() };
    const { error } = editing.id ? await paymentService.update(editing.id, clean) : await paymentService.create(clean);
    setSaving(false);
    if (error) {
      addToast(`Couldn't save: ${error.message}`, 'error');
      return;
    }
    addToast(editing.id ? 'Payment method updated' : 'Payment method added', 'success');
    setEditing(null);
    load();
  };

  const toggleActive = async (m: PaymentMethod) => {
    const { error } = await paymentService.update(m.id, { is_active: !m.is_active });
    if (error) addToast(`Couldn't update: ${error.message}`, 'error');
    else load();
  };

  const remove = async (m: PaymentMethod) => {
    if (!window.confirm(`Delete "${m.label}" (${m.account_number})? Students will no longer see it.`)) return;
    const { error } = await paymentService.remove(m.id);
    if (error) addToast(`Couldn't delete: ${error.message}`, 'error');
    else {
      addToast('Payment method deleted', 'success');
      load();
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Wallet size={22} className="text-[var(--primary)]" /> Payments
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Where students send course fees. Changes show up in the web and Android enrollment forms right away.
          </p>
        </div>
        <Button onClick={() => startNew(null)} icon={<Plus size={16} />}>
          Add method
        </Button>
      </header>

      {loading ? (
        <div className="h-40 animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface-hover)]" />
      ) : (
        groups.map((g) => (
          <section key={g.key} className="space-y-2">
            <div className="flex items-end justify-between gap-3 px-1">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold">{g.title}</h2>
                <p className="text-xs text-[var(--text-muted)]">{g.note}</p>
              </div>
              {g.key !== 'all' && (
                <Button size="sm" variant="ghost" onClick={() => startNew(g.key)} icon={<Plus size={14} />}>
                  Add
                </Button>
              )}
            </div>
            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
              {g.items.length === 0 ? (
                <p className="p-4 text-sm text-[var(--text-muted)]">
                  No payment methods yet. Students will be asked to contact you for payment details.
                </p>
              ) : (
                g.items.map((m, i) => (
                  <div
                    key={m.id}
                    className={`flex items-center gap-3 p-4 ${i > 0 ? 'border-t border-[var(--border)]' : ''} ${m.is_active ? '' : 'opacity-60'}`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
                      {m.kind === 'bank' ? <Building2 size={18} /> : <Smartphone size={18} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-medium">
                        {m.label}
                        {!m.is_active && <span className="badge !px-2 !py-0.5">Hidden</span>}
                      </p>
                      <p className="truncate font-mono text-sm text-[var(--text-muted)]">
                        {m.account_number}
                        {m.account_type && <span className="font-sans"> · {m.account_type}</span>}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button type="button" className="btn btn-ghost btn-sm !p-2" onClick={() => toggleActive(m)} aria-label={m.is_active ? 'Hide from students' : 'Show to students'} title={m.is_active ? 'Hide from students' : 'Show to students'}>
                        {m.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm !p-2" onClick={() => startEdit(m)} aria-label={`Edit ${m.label}`}>
                        <Pencil size={16} />
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm !p-2 text-[var(--error)]" onClick={() => remove(m)} aria-label={`Delete ${m.label}`}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        ))
      )}

      {!loading && courses.length > 0 && (
        <p className="px-1 text-xs text-[var(--text-muted)]">
          Need different accounts for one course? Add a method and choose that course under "Applies to".
        </p>
      )}

      {editing && (
        <PaymentMethodDialog
          isNew={editing.id === null}
          form={editing.form}
          courses={courses}
          saving={saving}
          onChange={(form) => setEditing({ ...editing, form })}
          onCancel={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  );
}

function PaymentMethodDialog({
  isNew,
  form,
  courses,
  saving,
  onChange,
  onCancel,
  onSave,
}: {
  isNew: boolean;
  form: PaymentMethodInput;
  courses: Course[];
  saving: boolean;
  onChange: (f: PaymentMethodInput) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const set = <K extends keyof PaymentMethodInput>(k: K, v: PaymentMethodInput[K]) => onChange({ ...form, [k]: v });
  const previewCourse = courses.find((c) => c.id === form.course_id) ?? courses[0];
  const previewAmount = previewCourse?.price ?? 0;
  const preview = paymentSteps({ ...form, id: 'preview' } as PaymentMethod, previewAmount);

  return (
    <div className="menu-sheet-backdrop" onClick={onCancel}>
      <div className="menu-sheet !max-w-xl" role="dialog" aria-modal="true" aria-label={isNew ? 'Add payment method' : 'Edit payment method'} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <h3 className="text-lg font-semibold">{isNew ? 'Add payment method' : 'Edit payment method'}</h3>
          <button type="button" className="btn btn-ghost btn-sm !p-2" onClick={onCancel} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <form
          className="menu-sheet-body space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
        >
          <Field label="Applies to">
            <select className="input" value={form.course_id ?? ''} onChange={(e) => set('course_id', e.target.value || null)}>
              <option value="">All courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  Only: {c.title}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name shown to students">
              <input className="input" value={form.label} maxLength={40} placeholder="bKash" onChange={(e) => set('label', e.target.value)} required />
            </Field>
            <Field label="Type">
              <select
                className="input"
                value={form.kind}
                onChange={(e) => {
                  const kind = e.target.value as PaymentKind;
                  // Swap the default steps only if they haven't been customised.
                  const isDefault = Object.values(DEFAULT_STEPS).includes(form.instructions);
                  onChange({ ...form, kind, instructions: isDefault ? DEFAULT_STEPS[kind] : form.instructions });
                }}
              >
                <option value="mobile">Mobile banking</option>
                <option value="bank">Bank account</option>
                <option value="other">Other</option>
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={form.kind === 'bank' ? 'Account number' : 'Number'}>
              <input className="input font-mono" value={form.account_number} maxLength={60} placeholder={form.kind === 'bank' ? '1234567890001' : '01XXXXXXXXX'} onChange={(e) => set('account_number', e.target.value)} required />
            </Field>
            <Field label="Account type (optional)">
              <input className="input" value={form.account_type} maxLength={80} placeholder={form.kind === 'bank' ? 'City Bank, Gulshan · Routing 225…' : 'Personal · Send Money'} onChange={(e) => set('account_type', e.target.value)} />
            </Field>
          </div>

          <Field label="Account name (optional)">
            <input className="input" value={form.account_name} maxLength={120} placeholder="StudyMate Academy" onChange={(e) => set('account_name', e.target.value)} />
          </Field>

          <Field label="Steps, one per line" hint="{amount} becomes the course fee.">
            <textarea className="input min-h-[120px]" value={form.instructions} maxLength={2000} onChange={(e) => set('instructions', e.target.value)} />
          </Field>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
              Show to students
            </label>
            <label className="flex items-center gap-2 text-sm">
              Order
              <input type="number" className="input !w-20 !py-1.5" value={form.sort_order} onChange={(e) => set('sort_order', Number(e.target.value) || 0)} />
            </label>
          </div>

          {preview.length > 0 && previewCourse && (
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-hover)] p-3 text-xs text-[var(--text-muted)]">
              <p className="mb-1 font-medium text-[var(--text-main)]">
                Preview for {previewCourse.title} ({formatTaka(previewAmount)})
              </p>
              <ol className="list-decimal space-y-0.5 pl-4">
                {preview.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : isNew ? 'Add method' : 'Save changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-baseline justify-between gap-2 text-xs font-medium text-[var(--text-muted)]">
        {label}
        {hint && <span className="font-normal">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
