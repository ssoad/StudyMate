import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, CopyPlus, FileSpreadsheet, Plus, Trash2 } from 'lucide-react';
import { Button } from '../components/Button';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import {
  byWeekDay,
  emptyDay,
  parsePlanSpreadsheet,
  studyPlanService,
  VISIBILITY_HELP,
  VISIBILITY_LABEL,
  type PlanDayInput,
  type PlanVisibility,
} from '../lib/studyPlans';

type EditableDay = PlanDayInput & { id?: string; key: string };

let keySeq = 0;
const withKey = (d: PlanDayInput & { id?: string }): EditableDay => ({ ...d, key: d.id ?? `new-${++keySeq}` });

export function StudyPlanEditor() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { user, role } = useAuthStore();
  const isAdmin = role === 'admin';
  const addToast = useToastStore((s) => s.addToast);
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<PlanVisibility>('private');
  const [official, setOfficial] = useState(false);
  const [firstDay] = useState(() => withKey(emptyDay()));
  const [days, setDays] = useState<EditableDay[]>(isNew ? [firstDay] : []);
  const [open, setOpen] = useState<string | null>(isNew ? firstDay.key : null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (isNew || !id) return;
    studyPlanService.get(id).then(({ plan, days }) => {
      if (!plan) {
        addToast('Plan not found', 'error');
        navigate('/study-plan');
        return;
      }
      if (plan.owner_id !== user?.id && !isAdmin) {
        addToast('Only the plan owner can edit it. Make a copy to change it.', 'info');
        navigate(`/study-plan/${plan.id}`);
        return;
      }
      setTitle(plan.title);
      setDescription(plan.description);
      setVisibility(plan.visibility);
      setOfficial(plan.is_official);
      setDays(days.map(({ plan_id: _p, ...d }) => withKey(d)));
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const touch = () => setDirty(true);
  const updateDay = (key: string, patch: Partial<PlanDayInput>) => {
    setDays((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
    touch();
  };
  const addDay = () => {
    const last = [...days].sort(byWeekDay).at(-1);
    const next = withKey(emptyDay(last));
    setDays((prev) => [...prev, next]);
    setOpen(next.key);
    touch();
  };
  const duplicateDay = (d: EditableDay) => {
    const { id: _id, key: _k, ...rest } = d;
    const copy = withKey({ ...rest, day: d.day + 1 });
    setDays((prev) => [...prev, copy]);
    setOpen(copy.key);
    touch();
  };
  const removeDay = (key: string) => {
    setDays((prev) => prev.filter((d) => d.key !== key));
    touch();
  };

  const importFile = async (file: File) => {
    try {
      const parsed = await parsePlanSpreadsheet(file);
      if (parsed.length === 0) {
        addToast('No days found. Expected columns: Week, Day, Phase, Subject, Module, Topics, Hours, MCQ, Written, PYQ, Checklist, Deliverable.', 'error');
        return;
      }
      const replace = days.length > 0 && window.confirm(`Import ${parsed.length} days. Replace the ${days.length} existing days? (Cancel adds them instead.)`);
      setDays((prev) => [...(replace ? [] : prev), ...parsed.map((d) => withKey(d))]);
      touch();
      addToast(`Imported ${parsed.length} days. Review and save.`, 'success');
    } catch {
      addToast("Couldn't read that file. Use .xlsx or .csv.", 'error');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const save = async () => {
    if (!user) return;
    if (!title.trim()) {
      addToast('Give the plan a title', 'error');
      return;
    }
    setSaving(true);
    let planId = id;
    if (isNew) {
      const { plan, error } = await studyPlanService.create({
        title: title.trim(),
        description: description.trim(),
        visibility,
        owner_id: user.id,
        ...(isAdmin ? { is_official: official } : {}),
      });
      if (error || !plan) {
        setSaving(false);
        addToast(`Couldn't create plan: ${error}`, 'error');
        return;
      }
      planId = plan.id;
    } else {
      const err = await studyPlanService.update(id!, {
        title: title.trim(),
        description: description.trim(),
        visibility,
        ...(isAdmin ? { is_official: official } : {}),
      });
      if (err) {
        setSaving(false);
        addToast(`Couldn't save: ${err}`, 'error');
        return;
      }
    }
    const cleanDays = days
      .filter((d) => d.subject.trim() || d.module.trim() || d.detailed_topics.trim())
      .map(({ key: _k, ...d }) => d);
    const err = await studyPlanService.saveDays(planId!, cleanDays);
    setSaving(false);
    if (err) {
      addToast(`Plan saved, but days failed: ${err}`, 'error');
      if (isNew) navigate(`/study-plan/${planId}/edit`, { replace: true });
      return;
    }
    setDirty(false);
    addToast('Plan saved', 'success');
    navigate(`/study-plan/${planId}`);
  };

  if (loading) return <div className="mx-auto h-64 max-w-3xl animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface-hover)]" />;

  const sorted = [...days].sort(byWeekDay);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-28">
      <Link to={isNew ? '/study-plan' : `/study-plan/${id}`} className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-main)]">
        <ArrowLeft size={16} /> {isNew ? 'Study plans' : 'Back to plan'}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">{isNew ? 'New study plan' : 'Edit plan'}</h1>

      <section className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-[var(--text-muted)]">Title</span>
          <input className="input" value={title} maxLength={120} placeholder="e.g. 60-day AD (ICT) revision" onChange={(e) => { setTitle(e.target.value); touch(); }} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-[var(--text-muted)]">Description (optional)</span>
          <textarea className="input min-h-[80px]" value={description} maxLength={4000} placeholder="Who it's for and how to use it" onChange={(e) => { setDescription(e.target.value); touch(); }} />
        </label>

        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-[var(--text-muted)]">Who can see it</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {(['private', 'unlisted', 'public'] as PlanVisibility[]).map((v) => (
              <label
                key={v}
                className={`cursor-pointer rounded-[var(--radius-md)] border p-3 text-sm transition-colors ${
                  visibility === v ? 'border-[var(--primary)] bg-[var(--primary-soft)]' : 'border-[var(--border)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                <input type="radio" name="visibility" className="sr-only" checked={visibility === v} onChange={() => { setVisibility(v); touch(); }} />
                <span className="block font-medium">{VISIBILITY_LABEL[v]}</span>
                <span className="block text-xs text-[var(--text-muted)]">{VISIBILITY_HELP[v]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {isAdmin && (
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-1" checked={official} onChange={(e) => { setOfficial(e.target.checked); touch(); }} />
            <span>
              <span className="font-medium">Official plan</span>
              <span className="block text-xs text-[var(--text-muted)]">Shown first in Browse with an Official badge. Make it Public so students can find it.</span>
            </span>
          </label>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2 px-1">
          <h2 className="text-base font-semibold">
            Days <span className="font-normal text-[var(--text-muted)]">({days.length})</span>
          </h2>
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
            <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()} icon={<FileSpreadsheet size={16} />}>
              Import spreadsheet
            </Button>
            <Button size="sm" variant="secondary" onClick={addDay} icon={<Plus size={16} />}>
              Add day
            </Button>
          </div>
        </div>

        {sorted.length === 0 && (
          <p className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--text-muted)]">
            No days yet. Add one, or import a spreadsheet.
          </p>
        )}

        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
          {sorted.map((d, i) => {
            const isOpen = open === d.key;
            return (
              <div key={d.key} className={i > 0 ? 'border-t border-[var(--border)]' : ''}>
                <button type="button" onClick={() => setOpen(isOpen ? null : d.key)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[var(--surface-hover)]" aria-expanded={isOpen}>
                  <span className="w-16 shrink-0 text-xs text-[var(--text-muted)]">
                    W{d.week} · D{d.day}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{d.module || d.subject || <span className="text-[var(--text-muted)]">Untitled day</span>}</span>
                  <ChevronDown size={16} className={`shrink-0 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="space-y-3 border-t border-[var(--border)] bg-[var(--surface-hover)]/40 p-4">
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                      <Num label="Week" value={d.week} min={1} onChange={(v) => updateDay(d.key, { week: Math.max(1, v) })} />
                      <Num label="Day" value={d.day} min={1} onChange={(v) => updateDay(d.key, { day: Math.max(1, v) })} />
                      <Num label="Hours" value={d.hours} min={0} step={0.5} onChange={(v) => updateDay(d.key, { hours: Math.min(24, Math.max(0, v)) })} />
                      <Text label="Phase" value={d.phase} onChange={(v) => updateDay(d.key, { phase: v })} className="col-span-3 sm:col-span-1" />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Text label="Subject" value={d.subject} onChange={(v) => updateDay(d.key, { subject: v })} />
                      <Text label="Module / title" value={d.module} onChange={(v) => updateDay(d.key, { module: v })} />
                    </div>
                    <Area label="Topics" value={d.detailed_topics} onChange={(v) => updateDay(d.key, { detailed_topics: v })} />
                    <div className="grid grid-cols-3 gap-3">
                      <Num label="MCQs" value={d.mcq_target} min={0} onChange={(v) => updateDay(d.key, { mcq_target: Math.max(0, v) })} />
                      <Num label="Written" value={d.written_target} min={0} onChange={(v) => updateDay(d.key, { written_target: Math.max(0, v) })} />
                      <Num label="PYQs" value={d.pyq_target} min={0} onChange={(v) => updateDay(d.key, { pyq_target: Math.max(0, v) })} />
                    </div>
                    <Area label="Practice checklist (one per line)" value={d.practice_checklist} onChange={(v) => updateDay(d.key, { practice_checklist: v })} />
                    <Text label="Deliverable" value={d.daily_deliverable} onChange={(v) => updateDay(d.key, { daily_deliverable: v })} />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => duplicateDay(d)} icon={<CopyPlus size={15} />}>
                        Duplicate
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => removeDay(d.key)} icon={<Trash2 size={15} />} className="!text-[var(--error)]">
                        Remove
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Sticky save bar, above the mobile bottom nav */}
      <div className="editor-save-bar">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <span className="text-sm text-[var(--text-muted)]">{dirty ? 'Unsaved changes' : isNew ? 'New plan' : 'All changes saved'}</span>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : isNew ? 'Create plan' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Num({ label, value, onChange, min, step = 1 }: { label: string; value: number; onChange: (v: number) => void; min?: number; step?: number }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-[var(--text-muted)]">{label}</span>
      <input type="number" inputMode="decimal" className="input !py-2" value={value} min={min} step={step} onChange={(e) => onChange(Number(e.target.value) || 0)} />
    </label>
  );
}

function Text({ label, value, onChange, className = '' }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <span className="text-xs text-[var(--text-muted)]">{label}</span>
      <input className="input !py-2" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-[var(--text-muted)]">{label}</span>
      <textarea className="input min-h-[72px] !py-2" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
