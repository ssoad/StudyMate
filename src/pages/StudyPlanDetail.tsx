import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Check, Copy, Pencil, Plus, Share2, Trash2 } from 'lucide-react';
import { Button, buttonClass } from '../components/Button';
import { PlanDayCard } from '../components/PlanDayCard';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { shareUrl, studyPlanService, VISIBILITY_HELP, VISIBILITY_LABEL, type PlanDay, type StudyPlan } from '../lib/studyPlans';

export function StudyPlanDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuthStore();
  const addToast = useToastStore((s) => s.addToast);

  const [plan, setPlan] = useState<StudyPlan | null | undefined>(undefined);
  const [days, setDays] = useState<PlanDay[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [following, setFollowing] = useState(false);
  const [busyDay, setBusyDay] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { plan, days } = await studyPlanService.get(id);
      if (cancelled) return;
      setPlan(plan);
      setDays(days);
      if (user && plan) {
        const [doneIds, isFollowing] = await Promise.all([
          studyPlanService.completedDayIds(user.id, days.map((d) => d.id)),
          studyPlanService.isFollowing(user.id, plan.id),
        ]);
        if (!cancelled) {
          setDone(doneIds);
          setFollowing(isFollowing);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, user]);

  const isOwner = !!user && !!plan && plan.owner_id === user.id;
  const canEdit = isOwner || role === 'admin';
  const inLibrary = isOwner || following;

  const weeks = useMemo(() => {
    const map = new Map<number, PlanDay[]>();
    for (const d of days) map.set(d.week, [...(map.get(d.week) ?? []), d]);
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [days]);

  const pct = days.length ? Math.round((done.size / days.length) * 100) : 0;
  const nextDay = days.find((d) => !done.has(d.id));

  const requireUser = () => {
    if (user) return true;
    navigate(`/login?redirect=${encodeURIComponent(`/study-plan/${id}`)}`);
    return false;
  };

  const toggleDay = async (day: PlanDay) => {
    if (!requireUser() || !plan) return;
    const nowDone = !done.has(day.id);
    setBusyDay(day.id);
    // Tracking a public plan adds it to the library so it shows up under My plans.
    if (nowDone && !inLibrary) {
      const err = await studyPlanService.follow(user!.id, plan.id);
      if (!err) setFollowing(true);
    }
    const err = await studyPlanService.setDayDone(user!.id, day.id, nowDone);
    setBusyDay(null);
    if (err) {
      addToast(`Couldn't update: ${err}`, 'error');
      return;
    }
    setDone((prev) => {
      const next = new Set(prev);
      if (nowDone) next.add(day.id);
      else next.delete(day.id);
      return next;
    });
  };

  const follow = async () => {
    if (!requireUser() || !plan) return;
    setWorking(true);
    const err = await studyPlanService.follow(user!.id, plan.id);
    setWorking(false);
    if (err) addToast(`Couldn't add plan: ${err}`, 'error');
    else {
      setFollowing(true);
      addToast('Added to your plans', 'success');
    }
  };

  const unfollow = async () => {
    if (!user || !plan) return;
    setWorking(true);
    const err = await studyPlanService.unfollow(user.id, plan.id);
    setWorking(false);
    if (err) addToast(`Couldn't remove plan: ${err}`, 'error');
    else {
      setFollowing(false);
      addToast('Removed from your plans. Your progress is kept if you add it again.', 'info');
    }
  };

  const makeCopy = async () => {
    if (!requireUser() || !plan) return;
    setWorking(true);
    const { planId, error } = await studyPlanService.copy(plan.id);
    setWorking(false);
    if (error || !planId) addToast(`Couldn't copy: ${error}`, 'error');
    else {
      addToast('Copied to your plans. It starts private.', 'success');
      navigate(`/study-plan/${planId}/edit`);
    }
  };

  const share = async () => {
    if (!plan) return;
    if (plan.visibility === 'private') {
      addToast('This plan is private. Change it to "Link only" or "Public" in Edit to share it.', 'info');
      return;
    }
    const url = shareUrl(plan.share_code);
    try {
      if (navigator.share) await navigator.share({ title: plan.title, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        addToast('Share link copied', 'success');
      }
    } catch {
      /* user cancelled the share sheet */
    }
  };

  const remove = async () => {
    if (!plan || !window.confirm(`Delete "${plan.title}"? Everyone following it loses it too. This can't be undone.`)) return;
    const err = await studyPlanService.remove(plan.id);
    if (err) addToast(`Couldn't delete: ${err}`, 'error');
    else {
      addToast('Plan deleted', 'success');
      navigate('/study-plan');
    }
  };

  if (plan === undefined) {
    return <div className="mx-auto h-64 max-w-5xl animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface-hover)]" />;
  }
  if (plan === null) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-xl font-semibold">Plan not found</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">It may be private, deleted, or you need to open it from its share link.</p>
        <Link to="/study-plan?tab=browse" className={buttonClass('secondary', 'md', 'mt-4')}>
          Browse plans
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <Link to="/study-plan" className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-main)]">
        <ArrowLeft size={16} /> Study plans
      </Link>

      <header className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {plan.is_official && (
              <span className="badge badge-primary">
                <BadgeCheck size={13} className="mr-1" /> Official
              </span>
            )}
            {canEdit && (
              <span className="badge" title={VISIBILITY_HELP[plan.visibility]}>
                {VISIBILITY_LABEL[plan.visibility]}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{plan.title}</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {isOwner ? 'Your plan' : `by ${plan.owner?.full_name || 'StudyMate'}`} · {days.length} {days.length === 1 ? 'day' : 'days'}
          </p>
          {plan.description && <p className="max-w-3xl whitespace-pre-wrap text-[var(--text-muted)]">{plan.description}</p>}
        </div>

        <div className="flex flex-wrap gap-2">
          {!isOwner &&
            (following ? (
              <Button variant="secondary" onClick={unfollow} disabled={working} icon={<Check size={16} />}>
                In your plans
              </Button>
            ) : (
              <Button onClick={follow} disabled={working} icon={<Plus size={16} />}>
                Add to my plans
              </Button>
            ))}
          {canEdit && (
            <Link to={`/study-plan/${plan.id}/edit`} className={buttonClass(isOwner ? 'primary' : 'secondary')}>
              <Pencil size={16} /> Edit
            </Link>
          )}
          {plan.visibility !== 'private' && (
            <Button variant="secondary" onClick={share} icon={copied ? <Check size={16} /> : <Share2 size={16} />}>
              {copied ? 'Copied' : 'Share'}
            </Button>
          )}
          {user && (
            <Button variant="ghost" onClick={makeCopy} disabled={working} icon={<Copy size={16} />}>
              Make a copy
            </Button>
          )}
          {canEdit && (
            <Button variant="ghost" onClick={remove} icon={<Trash2 size={16} />} className="!text-[var(--error)]">
              Delete
            </Button>
          )}
        </div>
      </header>

      {inLibrary && days.length > 0 && (
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-[var(--text-muted)]">
              {done.size} of {days.length} {days.length === 1 ? 'day' : 'days'} done
            </span>
            <span className="font-semibold">{pct}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-hover)]">
            <div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${pct}%` }} />
          </div>
          {nextDay && (
            <p className="mt-3 text-sm">
              <span className="text-[var(--text-muted)]">Next up: </span>
              <span className="font-medium">
                Week {nextDay.week}, Day {nextDay.day} · {nextDay.module || nextDay.subject}
              </span>
            </p>
          )}
        </section>
      )}

      {days.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--text-muted)]">
          This plan has no days yet.
          {canEdit && (
            <div className="mt-3">
              <Link to={`/study-plan/${plan.id}/edit`} className={buttonClass('primary')}>
                Add days
              </Link>
            </div>
          )}
        </div>
      ) : (
        weeks.map(([week, wdays]) => {
          const weekDone = wdays.filter((d) => done.has(d.id)).length;
          return (
            <section key={week} className="space-y-3">
              <div className="flex items-baseline justify-between px-1">
                <h2 className="text-base font-semibold">
                  Week {week}
                  {wdays[0]?.phase && <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">{wdays[0].phase}</span>}
                </h2>
                {inLibrary && (
                  <span className="text-xs text-[var(--text-muted)]">
                    {weekDone}/{wdays.length} done
                  </span>
                )}
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {wdays.map((d) => (
                  <PlanDayCard
                    key={d.id}
                    day={d}
                    done={done.has(d.id)}
                    busy={busyDay === d.id}
                    onToggle={user ? () => toggleDay(d) : undefined}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
