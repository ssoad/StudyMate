import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, CalendarDays, Plus, Search } from 'lucide-react';
import { buttonClass } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { studyPlanService, VISIBILITY_LABEL, type PlanVisibility } from '../../lib/studyPlans';
import { useToastStore } from '../../store/toastStore';

interface AdminPlanRow {
  id: string;
  title: string;
  visibility: PlanVisibility;
  is_official: boolean;
  updated_at: string;
  owner: { full_name: string | null; email: string | null } | null;
  days: { count: number }[];
  members: { count: number }[];
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Admins see every plan (RLS lets them), publish official plans and moderate public ones. */
export function AdminStudyPlans() {
  const addToast = useToastStore((s) => s.addToast);
  const [rows, setRows] = useState<AdminPlanRow[] | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'official' | 'public'>('all');

  const load = async () => {
    const { data, error } = await supabase!
      .from('study_plans')
      .select('id, title, visibility, is_official, updated_at, owner:profiles!study_plans_owner_id_fkey(full_name, email), days:study_plan_days(count), members:study_plan_members(count)')
      .order('is_official', { ascending: false })
      .order('updated_at', { ascending: false });
    if (error) addToast(`Couldn't load plans: ${error.message}`, 'error');
    setRows((data as unknown as AdminPlanRow[]) ?? []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (filter === 'official' && !r.is_official) return false;
      if (filter === 'public' && r.visibility !== 'public') return false;
      return !q || `${r.title} ${r.owner?.full_name ?? ''} ${r.owner?.email ?? ''}`.toLowerCase().includes(q);
    });
  }, [rows, query, filter]);

  const setOfficial = async (row: AdminPlanRow, official: boolean) => {
    const err = await studyPlanService.update(row.id, { is_official: official, ...(official ? { visibility: 'public' as const } : {}) });
    if (err) addToast(`Couldn't update: ${err}`, 'error');
    else {
      addToast(official ? 'Published as an official plan' : 'No longer official', 'success');
      load();
    }
  };

  const setVisibility = async (row: AdminPlanRow, visibility: PlanVisibility) => {
    const err = await studyPlanService.update(row.id, { visibility });
    if (err) addToast(`Couldn't update: ${err}`, 'error');
    else load();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <CalendarDays size={22} className="text-[var(--primary)]" /> Study plans
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Publish official plans for students, and review plans people share publicly.
          </p>
        </div>
        <Link to="/study-plan/new" className={buttonClass('primary')}>
          <Plus size={16} /> New plan
        </Link>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input className="input !pl-9" placeholder="Search by title or owner" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <select className="input sm:!w-44" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
          <option value="all">All plans</option>
          <option value="official">Official</option>
          <option value="public">Public</option>
        </select>
      </div>

      {rows === null ? (
        <div className="h-48 animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface-hover)]" />
      ) : visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--text-muted)]">No plans match.</p>
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
          {visible.map((r, i) => (
            <div key={r.id} className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center ${i > 0 ? 'border-t border-[var(--border)]' : ''}`}>
              <div className="min-w-0 flex-1">
                <Link to={`/study-plan/${r.id}`} className="flex items-center gap-1.5 font-medium text-[var(--text-main)] hover:text-[var(--primary)]">
                  <span className="truncate">{r.title}</span>
                  {r.is_official && <BadgeCheck size={16} className="shrink-0 text-[var(--primary)]" aria-label="Official" />}
                </Link>
                <p className="truncate text-xs text-[var(--text-muted)]">
                  {r.owner?.full_name || r.owner?.email || 'StudyMate'} · {plural(r.days?.[0]?.count ?? 0, 'day')} · {r.members?.[0]?.count ?? 0} following
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="input !w-auto !py-1.5 text-sm"
                  value={r.visibility}
                  onChange={(e) => setVisibility(r, e.target.value as PlanVisibility)}
                  aria-label={`Visibility of ${r.title}`}
                >
                  {(['private', 'unlisted', 'public'] as PlanVisibility[]).map((v) => (
                    <option key={v} value={v}>
                      {VISIBILITY_LABEL[v]}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={r.is_official} onChange={(e) => setOfficial(r, e.target.checked)} />
                  Official
                </label>
                <Link to={`/study-plan/${r.id}/edit`} className={buttonClass('ghost', 'sm')}>
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
