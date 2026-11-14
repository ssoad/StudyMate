import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BadgeCheck, CalendarDays, Link2, Plus, Search, Users } from 'lucide-react';
import { Button, buttonClass } from '../components/Button';
import { useAuthStore } from '../store/authStore';
import {
  studyPlanService,
  VISIBILITY_LABEL,
  type LibraryPlan,
  type PublicPlanSummary,
} from '../lib/studyPlans';

type Tab = 'mine' | 'browse';

/** Accepts a full share link or just the code. */
function extractCode(input: string): string {
  const t = input.trim();
  const m = t.match(/join\/([A-Za-z0-9]+)/);
  return (m ? m[1] : t).replace(/[^A-Za-z0-9]/g, '');
}

export function StudyPlans() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab: Tab = user ? ((params.get('tab') as Tab) || 'mine') : 'browse';
  const setTab = (t: Tab) => setParams(t === 'mine' ? {} : { tab: t }, { replace: true });

  const [library, setLibrary] = useState<LibraryPlan[] | null>(null);
  const [publicPlans, setPublicPlans] = useState<PublicPlanSummary[] | null>(null);
  const [query, setQuery] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    if (user && tab === 'mine' && library === null) studyPlanService.library(user.id).then(setLibrary);
    if (tab === 'browse' && publicPlans === null) studyPlanService.listPublic().then(setPublicPlans);
  }, [user, tab, library, publicPlans]);

  const filteredPublic = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!publicPlans) return null;
    if (!q) return publicPlans;
    return publicPlans.filter((p) => `${p.title} ${p.description} ${p.owner_name}`.toLowerCase().includes(q));
  }, [publicPlans, query]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Study plans</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Follow a plan day by day, make your own, and share it with friends.
          </p>
        </div>
        {user && (
          <Link to="/study-plan/new" className={buttonClass('primary')}>
            <Plus size={16} /> New plan
          </Link>
        )}
      </header>

      {user && (
        <div className="inline-flex rounded-[var(--radius-md)] bg-[var(--surface-hover)] p-1" role="tablist">
          {(['mine', 'browse'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-[calc(var(--radius-md)-2px)] px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === t ? 'bg-[var(--surface)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)]'
              }`}
            >
              {t === 'mine' ? 'My plans' : 'Browse'}
            </button>
          ))}
        </div>
      )}

      {tab === 'mine' ? (
        library === null ? (
          <ListSkeleton />
        ) : library.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] p-8 text-center">
            <CalendarDays size={28} className="mx-auto text-[var(--text-muted)]" />
            <h2 className="mt-3 text-base font-semibold">No plans yet</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--text-muted)]">
              Add a plan from Browse to start tracking, or create your own.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button onClick={() => setTab('browse')}>Browse plans</Button>
              <Link to="/study-plan/new" className={buttonClass('secondary')}>
                Create a plan
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {library.map((p) => {
              const pct = p.day_count ? Math.round((p.done_count / p.day_count) * 100) : 0;
              return (
                <Link
                  key={p.id}
                  to={`/study-plan/${p.id}`}
                  className="group flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 text-[var(--text-main)] transition-colors hover:border-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 font-semibold">{p.title}</h3>
                    {p.is_official && <BadgeCheck size={18} className="shrink-0 text-[var(--primary)]" aria-label="Official" />}
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    <span className="badge !px-2 !py-0.5">{p.relation === 'owner' ? 'Yours' : 'Following'}</span>
                    {p.relation === 'owner' && <span className="badge !px-2 !py-0.5">{VISIBILITY_LABEL[p.visibility]}</span>}
                  </div>
                  <div className="mt-auto space-y-1.5">
                    <div className="flex justify-between text-xs text-[var(--text-muted)]">
                      <span>
                        {p.done_count} of {p.day_count} {p.day_count === 1 ? 'day' : 'days'}
                      </span>
                      <span className="font-medium text-[var(--text-main)]">{pct}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-hover)]">
                      <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input className="input !pl-9" placeholder="Search plans" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <form
              className="flex gap-2 sm:w-80"
              onSubmit={(e) => {
                e.preventDefault();
                const c = extractCode(code);
                if (c) navigate(`/study-plan/join/${c}`);
              }}
            >
              <label className="relative flex-1">
                <Link2 size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input className="input !pl-9" placeholder="Paste a share link or code" value={code} onChange={(e) => setCode(e.target.value)} />
              </label>
              <Button type="submit" variant="secondary" disabled={!extractCode(code)}>
                Open
              </Button>
            </form>
          </div>

          {filteredPublic === null ? (
            <ListSkeleton />
          ) : filteredPublic.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">
              {query ? 'No plans match your search.' : 'No public plans yet.'}
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredPublic.map((p) => (
                <Link
                  key={p.id}
                  to={`/study-plan/${p.id}`}
                  className="flex flex-col gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 text-[var(--text-main)] transition-colors hover:border-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 font-semibold">{p.title}</h3>
                    {p.is_official && (
                      <span className="badge badge-primary shrink-0 !px-2 !py-0.5">
                        <BadgeCheck size={12} className="mr-1" /> Official
                      </span>
                    )}
                  </div>
                  {p.description && <p className="line-clamp-2 text-sm text-[var(--text-muted)]">{p.description}</p>}
                  <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-[var(--text-muted)]">
                    <span>by {p.owner_name}</span>
                    <span>{p.day_count} {p.day_count === 1 ? 'day' : 'days'}</span>
                    <span className="inline-flex items-center gap-1">
                      <Users size={12} /> {p.follower_count}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-32 animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface-hover)]" />
      ))}
    </div>
  );
}
