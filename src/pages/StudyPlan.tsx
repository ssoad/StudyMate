import { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  BookOpen, 
  Compass, 
  CheckCircle2, 
  Circle, 
  Clock, 
  CheckSquare
} from 'lucide-react';
import { dataService, type StudyDay } from '../lib/dataService';
import { useToastStore } from '../store/toastStore';

export function StudyPlan() {
  const [studyDays, setStudyDays] = useState<StudyDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => {
    async function fetchStudyDays() {
      const { data, error } = await dataService.getStudyDays();
      if (!error && data) {
        setStudyDays(data as StudyDay[]);

        // Auto-expand the first phase
        const phases = Array.from(new Set(data.map((d) => d.phase)));
        if (phases.length > 0) {
          setExpandedPhase(phases[0]);
        }
      }
      setLoading(false);
    }
    fetchStudyDays();
  }, []);

  const toggleDayStatus = async (day: StudyDay) => {
    const newStatus = day.status === 'Complete' ? 'Pending' : 'Complete';

    // Optimistic UI update
    setStudyDays((prev) => prev.map((d) => (d.id === day.id ? { ...d, status: newStatus } : d)));

    // Backend update
    const { error } = await dataService.updateStudyDay(day.id, { status: newStatus });
    if (error) {
      addToast('Failed to update status', 'error');
      // Revert on error
      setStudyDays((prev) => prev.map((d) => (d.id === day.id ? { ...d, status: day.status } : d)));
    } else {
      addToast(
        newStatus === 'Complete'
          ? 'Study day marked as complete! (+10 XP)'
          : 'Study day marked as pending',
        'success'
      );
    }
  };

  const groupByPhase = studyDays.reduce((acc, day) => {
    const phase = day.phase || 'Uncategorized';
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(day);
    return acc;
  }, {} as Record<string, StudyDay[]>);

  const totalDays = studyDays.length;
  const completedDays = studyDays.filter((d) => d.status === 'Complete').length;
  const progressPercent = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

  const renderChecklist = (text: string) => {
    if (!text) return null;
    const items = text
      .split('\n')
      .map((t) => t.replace(/^[•\-*]\s*/, '').trim())
      .filter(Boolean);

    if (items.length === 1) return <div className="text-xs text-[var(--text-muted)]">{items[0]}</div>;

    return (
      <ul className="space-y-1 pl-1 list-none">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <CheckSquare size={13} className="text-[var(--primary)] mt-0.5 shrink-0" />
            <span className="text-xs text-[var(--text-muted)] leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8 animate-fade-in pb-12 max-w-7xl mx-auto">
      {/* HEADER BANNER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 sm:p-7 rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] via-[var(--surface)] to-[var(--surface-hover)] shadow-sm">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <Compass size={14} />
            <span>Structured Syllabus</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] font-[var(--font-heading)] tracking-tight">
            Study Plan & Daily Deliverables
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-xl">
            Track daily topics, solve practice targets, and mark completed sessions as you advance through the curriculum.
          </p>
        </div>

        {!loading && totalDays > 0 && (
          <div className="flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)] font-semibold">Total Progress:</span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-500/20">
                {completedDays} / {totalDays} Days ({progressPercent}%)
              </span>
            </div>
            <div className="w-full sm:w-48 bg-[var(--surface-hover)] rounded-full h-2 overflow-hidden border border-[var(--border)]">
              <div
                className="bg-emerald-500 h-full transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* SYLLABUS PHASES ACCORDION */}
      <div className="space-y-4 sm:space-y-6">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] space-y-4 animate-pulse h-36"
            />
          ))
        ) : Object.keys(groupByPhase).length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-[var(--border)] rounded-3xl bg-[var(--surface)] space-y-3">
            <BookOpen size={44} className="mx-auto text-[var(--text-muted)] opacity-40" />
            <h3 className="text-base font-bold text-[var(--text-main)]">Curriculum is empty</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              There are no study days assigned yet. Admins can import the curriculum CSV in the Admin Panel.
            </p>
          </div>
        ) : (
          Object.entries(groupByPhase).map(([phase, days]) => {
            const isExpanded = expandedPhase === phase;
            const phaseCompletedDays = days.filter((d) => d.status === 'Complete').length;
            const isPhaseComplete = phaseCompletedDays === days.length && days.length > 0;

            // Group by week inside phase
            const phaseByWeek = days.reduce((acc, day) => {
              if (!acc[day.week]) acc[day.week] = [];
              acc[day.week].push(day);
              return acc;
            }, {} as Record<number, StudyDay[]>);

            return (
              <div
                key={phase}
                className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-xs overflow-hidden transition-all"
              >
                {/* Phase Header */}
                <button
                  type="button"
                  onClick={() => setExpandedPhase(isExpanded ? null : phase)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left hover:bg-[var(--surface-hover)] transition-colors select-none"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {isPhaseComplete ? (
                      <CheckCircle2 size={24} className="text-emerald-500 fill-emerald-500/10 shrink-0" />
                    ) : (
                      <Circle size={24} className="text-[var(--text-muted)] shrink-0" />
                    )}
                    <div className="overflow-hidden">
                      <h3 className="text-base font-bold text-[var(--text-main)] truncate font-[var(--font-heading)]">
                        {phase}
                      </h3>
                      <span className="text-xs text-[var(--text-muted)]">
                        {phaseCompletedDays} / {days.length} Days Completed
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--surface-hover)] text-[var(--text-muted)] border border-[var(--border)]">
                      {days.length} Days
                    </span>
                    <ChevronDown
                      size={18}
                      className={`text-[var(--text-muted)] transform transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {/* Phase Content */}
                {isExpanded && (
                  <div className="p-4 sm:p-6 bg-[var(--surface-hover)]/40 border-t border-[var(--border)] space-y-6 animate-fade-in">
                    {Object.entries(phaseByWeek).map(([week, weekDays]) => (
                      <div key={week} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
                            Week {week}
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          {weekDays.map((day) => {
                            const isDone = day.status === 'Complete';

                            return (
                              <div
                                key={day.id}
                                className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-3 shadow-xs ${
                                  isDone
                                    ? 'bg-[var(--surface)] border-emerald-500/30 opacity-90'
                                    : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--primary)]'
                                }`}
                              >
                                <div className="space-y-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] flex flex-col items-center justify-center shrink-0 text-center leading-none">
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                          Day
                                        </span>
                                        <span className="text-sm font-extrabold text-[var(--text-main)] mt-0.5">
                                          {day.day}
                                        </span>
                                      </div>

                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)]">
                                            {day.subject}
                                          </span>
                                          <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 font-medium">
                                            <Clock size={11} />
                                            {day.hours}h session
                                          </span>
                                        </div>
                                        <h5 className="font-bold text-sm text-[var(--text-main)] mt-0.5">
                                          {day.module || day.subject || 'Study Session'}
                                        </h5>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => toggleDayStatus(day)}
                                      className="p-1.5 rounded-full hover:bg-[var(--surface-hover)] transition-colors shrink-0"
                                      title={isDone ? 'Mark as Pending' : 'Mark as Complete'}
                                    >
                                      {isDone ? (
                                        <CheckCircle2 size={22} className="text-emerald-500 fill-emerald-500/10" />
                                      ) : (
                                        <Circle size={22} className="text-[var(--text-muted)] hover:text-emerald-500" />
                                      )}
                                    </button>
                                  </div>

                                  {day.detailed_topics && (
                                    <p className="text-xs text-[var(--text-muted)] leading-relaxed whitespace-pre-wrap">
                                      {day.detailed_topics}
                                    </p>
                                  )}

                                  {/* MCQ & Written targets */}
                                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                                    <div className="p-2 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)]">
                                      <span className="text-sm font-bold text-[var(--text-main)] block">
                                        {day.mcq_target || 30}
                                      </span>
                                      <span className="text-[9px] uppercase font-bold text-[var(--text-muted)]">
                                        MCQs
                                      </span>
                                    </div>
                                    <div className="p-2 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)]">
                                      <span className="text-sm font-bold text-[var(--text-main)] block">
                                        {day.written_target || 5}
                                      </span>
                                      <span className="text-[9px] uppercase font-bold text-[var(--text-muted)]">
                                        Written
                                      </span>
                                    </div>
                                    <div className="p-2 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)]">
                                      <span className="text-sm font-bold text-[var(--text-main)] block">
                                        {day.pyq_target || 10}
                                      </span>
                                      <span className="text-[9px] uppercase font-bold text-[var(--text-muted)]">
                                        PYQs
                                      </span>
                                    </div>
                                  </div>

                                  {/* Practice checklist & Daily deliverable */}
                                  {(day.practice_checklist || day.daily_deliverable) && (
                                    <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/15 space-y-2 text-xs">
                                      {day.practice_checklist && (
                                        <div className="space-y-1">
                                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary)] block">
                                            Practice Checklist
                                          </span>
                                          {renderChecklist(day.practice_checklist)}
                                        </div>
                                      )}
                                      {day.daily_deliverable && (
                                        <div
                                          className={`space-y-0.5 ${
                                            day.practice_checklist ? 'pt-2 border-t border-indigo-500/10' : ''
                                          }`}
                                        >
                                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary)] block">
                                            Deliverable
                                          </span>
                                          <p className="text-xs font-semibold text-[var(--text-main)]">
                                            {day.daily_deliverable}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
