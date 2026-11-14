import { CheckCircle2, Circle, Clock } from 'lucide-react';
import type { PlanDay } from '../lib/studyPlans';

function checklistItems(text: string): string[] {
  return text
    .split('\n')
    .map((t) => t.replace(/^[•\-*]\s*/, '').trim())
    .filter(Boolean);
}

/** One day of a study plan, with an optional done toggle. */
export function PlanDayCard({
  day,
  done,
  onToggle,
  busy,
}: {
  day: PlanDay;
  done: boolean;
  onToggle?: () => void;
  busy?: boolean;
}) {
  const targets = [
    { label: 'MCQs', value: day.mcq_target },
    { label: 'Written', value: day.written_target },
    { label: 'PYQs', value: day.pyq_target },
  ].filter((t) => t.value > 0);
  const checklist = checklistItems(day.practice_checklist);

  return (
    <article
      className={`flex flex-col gap-3 rounded-[var(--radius-lg)] border bg-[var(--surface)] p-4 transition-colors ${
        done ? 'border-emerald-500/40' : 'border-[var(--border)]'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-hover)] leading-none">
          <span className="text-[10px] font-medium text-[var(--text-muted)]">Day</span>
          <span className="text-base font-semibold">{day.day}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-muted)]">
            {day.subject && <span className="font-medium text-[var(--primary)]">{day.subject}</span>}
            {day.hours > 0 && (
              <span className="inline-flex items-center gap-1">
                <Clock size={12} /> {day.hours}h
              </span>
            )}
          </div>
          <h4 className={`mt-0.5 text-sm font-semibold ${done ? 'text-[var(--text-muted)] line-through decoration-1' : ''}`}>
            {day.module || day.subject || 'Study session'}
          </h4>
        </div>
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            disabled={busy}
            className="-m-1 shrink-0 rounded-full p-1.5 hover:bg-[var(--surface-hover)] disabled:opacity-50"
            aria-pressed={done}
            aria-label={done ? `Mark day ${day.day} not done` : `Mark day ${day.day} done`}
          >
            {done ? <CheckCircle2 size={24} className="text-emerald-500" /> : <Circle size={24} className="text-[var(--text-muted)]" />}
          </button>
        )}
      </div>

      {day.detailed_topics && <p className="whitespace-pre-wrap text-sm text-[var(--text-muted)]">{day.detailed_topics}</p>}

      {targets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {targets.map((t) => (
            <span key={t.label} className="rounded-full bg-[var(--surface-hover)] px-2.5 py-1 text-xs">
              <span className="font-semibold">{t.value}</span> <span className="text-[var(--text-muted)]">{t.label}</span>
            </span>
          ))}
        </div>
      )}

      {(checklist.length > 0 || day.daily_deliverable) && (
        <div className="space-y-2 border-t border-[var(--border)] pt-3 text-xs">
          {checklist.length > 0 && (
            <ul className="space-y-1">
              {checklist.map((item, i) => (
                <li key={i} className="flex gap-2 text-[var(--text-muted)]">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--text-muted)]" />
                  {item}
                </li>
              ))}
            </ul>
          )}
          {day.daily_deliverable && (
            <p>
              <span className="text-[var(--text-muted)]">Deliverable: </span>
              <span className="font-medium">{day.daily_deliverable}</span>
            </p>
          )}
        </div>
      )}
    </article>
  );
}
