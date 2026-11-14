import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BadgeCheck, CalendarDays } from 'lucide-react';
import { Button, buttonClass } from '../components/Button';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { studyPlanService, type PlanByCode } from '../lib/studyPlans';

/** Landing page for a shared plan link: /study-plan/join/:code */
export function StudyPlanJoin() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const addToast = useToastStore((s) => s.addToast);
  const [plan, setPlan] = useState<PlanByCode | null | undefined>(undefined);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    studyPlanService.getByCode(code).then(setPlan);
  }, [code]);

  const join = async () => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/study-plan/join/${code}`)}`);
      return;
    }
    setJoining(true);
    const { planId, error } = await studyPlanService.joinByCode(code);
    setJoining(false);
    if (error || !planId) {
      addToast(`Couldn't add plan: ${error}`, 'error');
      return;
    }
    addToast('Added to your plans', 'success');
    navigate(`/study-plan/${planId}`, { replace: true });
  };

  if (plan === undefined) {
    return <div className="mx-auto mt-8 h-48 max-w-lg animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface-hover)]" />;
  }

  if (plan === null) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-xl font-semibold">This link doesn't work</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">The plan may have been made private or deleted. Ask the person who shared it for a new link.</p>
        <Link to="/study-plan?tab=browse" className={buttonClass('secondary', 'md', 'mt-4')}>
          Browse plans
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg py-6">
      <div className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="text-sm text-[var(--text-muted)]">{plan.owner_name} shared a study plan</p>
        <div className="space-y-2">
          {plan.is_official && (
            <span className="badge badge-primary">
              <BadgeCheck size={13} className="mr-1" /> Official
            </span>
          )}
          <h1 className="text-2xl font-semibold tracking-tight">{plan.title}</h1>
          <p className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
            <CalendarDays size={15} /> {plan.day_count} {plan.day_count === 1 ? 'day' : 'days'}
          </p>
          {plan.description && <p className="whitespace-pre-wrap text-[var(--text-muted)]">{plan.description}</p>}
        </div>
        <Button onClick={join} disabled={joining} className="w-full" size="lg">
          {joining ? 'Adding…' : user ? 'Add to my plans' : 'Sign in to add this plan'}
        </Button>
        <p className="text-center text-xs text-[var(--text-muted)]">You'll get your own progress. The owner's later changes appear in your copy too.</p>
      </div>
    </div>
  );
}
