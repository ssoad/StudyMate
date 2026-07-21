import { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody } from '../components/Card';
import { ChevronDown, ChevronUp, BookOpen, Compass, CheckCircle2, Circle, Clock, CheckSquare } from 'lucide-react';
import { dataService, type StudyDay } from '../lib/dataService';
import { useToastStore } from '../store/toastStore';

export function StudyPlan() {
  const [studyDays, setStudyDays] = useState<StudyDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const addToast = useToastStore(state => state.addToast);

  useEffect(() => {
    async function fetchStudyDays() {
      const { data, error } = await dataService.getStudyDays();
      if (!error && data) {
        setStudyDays(data as StudyDay[]);
        
        // Auto-expand the first phase
        const phases = Array.from(new Set(data.map(d => d.phase)));
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
    setStudyDays(prev => prev.map(d => d.id === day.id ? { ...d, status: newStatus } : d));
    
    // Backend update
    const { error } = await dataService.updateStudyDay(day.id, { status: newStatus });
    if (error) {
      addToast('Failed to update status', 'error');
      // Revert on error
      setStudyDays(prev => prev.map(d => d.id === day.id ? { ...d, status: day.status } : d));
    }
  };

  const groupByPhase = studyDays.reduce((acc, day) => {
    const phase = day.phase || 'Uncategorized';
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(day);
    return acc;
  }, {} as Record<string, StudyDay[]>);

  const totalDays = studyDays.length;
  const completedDays = studyDays.filter(d => d.status === 'Complete').length;
  const progressPercent = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

  const renderChecklist = (text: string) => {
    if (!text) return null;
    const items = text.split('\n')
      .map(t => t.replace(/^[•\-*]\s*/, '').trim())
      .filter(Boolean);
      
    if (items.length === 1) return <div className="text-xs text-muted">{items[0]}</div>;
    
    return (
      <ul className="flex flex-col gap-1 m-0 p-0 pl-1 list-none">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <CheckSquare size={12} className="text-blue-500 mt-[2px] flex-shrink-0" />
            <span className="text-xs text-muted">{item}</span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.25rem' }}>Study Plan</h1>
          <p className="text-muted" style={{ fontSize: '1rem' }}>Track your daily exam preparation progress.</p>
        </div>
        
        {!loading && totalDays > 0 && (
          <div className="flex flex-col items-end gap-1">
            <div className="badge badge-primary flex gap-2 items-center" style={{ padding: '0.5rem 1rem' }}>
              <Compass size={16} />
              <span>{completedDays} / {totalDays} Days Completed</span>
            </div>
            <div className="w-full bg-[var(--surface-hover)] rounded-full h-1.5 overflow-hidden">
              <div className="bg-[var(--primary)] h-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6">
        {loading ? (
          // SKELETON LOADER
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardBody className="flex flex-col gap-3">
                  <div className="skeleton" style={{ height: '24px', width: '120px', borderRadius: '4px' }} />
                  <div className="skeleton" style={{ height: '16px', width: '240px', borderRadius: '4px' }} />
                </CardBody>
              </Card>
            ))}
          </div>
        ) : Object.keys(groupByPhase).length === 0 ? (
          <Card glass style={{ borderStyle: 'dashed', borderColor: 'var(--border)' }}>
            <CardBody className="text-center flex flex-col items-center justify-center p-8 gap-3">
              <div style={{ background: 'var(--surface-hover)', padding: '1rem', borderRadius: '50%', color: 'var(--text-muted)' }}>
                <BookOpen size={36} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Curriculum is empty</h3>
              <p className="text-muted text-sm m-0" style={{ maxWidth: '360px' }}>
                There are no study days assigned yet. Admins can import the curriculum CSV in the Admin Panel.
              </p>
            </CardBody>
          </Card>
        ) : (
          Object.entries(groupByPhase).map(([phase, days]) => {
            const isExpanded = expandedPhase === phase;
            const phaseCompletedDays = days.filter(d => d.status === 'Complete').length;
            const isPhaseComplete = phaseCompletedDays === days.length && days.length > 0;

            // Group by week inside the phase
            const phaseByWeek = days.reduce((acc, day) => {
              if (!acc[day.week]) acc[day.week] = [];
              acc[day.week].push(day);
              return acc;
            }, {} as Record<number, StudyDay[]>);

            return (
              <Card key={phase} style={{ overflow: 'hidden' }}>
                <div 
                  onClick={() => setExpandedPhase(isExpanded ? null : phase)}
                  style={{ cursor: 'pointer', transition: 'background-color var(--transition-fast)' }}
                  className="hover:bg-[var(--surface-hover)]"
                >
                  <CardHeader style={{ borderBottom: isExpanded ? '1px solid var(--border)' : 'none', padding: '1.25rem 1.5rem' }}>
                    <div className="flex justify-between items-center w-full">
                      <div className="flex items-center gap-3">
                        {isPhaseComplete ? (
                          <CheckCircle2 size={24} className="text-success" />
                        ) : (
                          <Circle size={24} className="text-muted" />
                        )}
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                            {phase}
                          </h3>
                          <span className="text-sm text-muted">
                            {phaseCompletedDays} / {days.length} Days Completed
                          </span>
                        </div>
                      </div>
                      <div className="text-muted">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                  </CardHeader>
                </div>
                
                {isExpanded && (
                  <CardBody className="flex flex-col gap-6" style={{ padding: '1.5rem', backgroundColor: 'var(--surface-hover)' }}>
                    {Object.entries(phaseByWeek).map(([week, weekDays]) => (
                      <div key={week} className="flex flex-col gap-3">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--primary)] pl-1">Week {week}</h4>
                        
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          {weekDays.map(day => (
                            <div 
                              key={day.id}
                              className={`flex flex-col p-4 rounded-lg border transition-all ${
                                day.status === 'Complete' 
                                  ? 'bg-[var(--surface)] border-success/30 opacity-80' 
                                  : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--primary)]'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-4">
                                <div className="flex gap-3">
                                  <div className="flex flex-col items-center justify-center bg-[var(--surface-hover)] rounded-md px-3 py-1 flex-shrink-0 h-fit">
                                    <span className="text-[10px] text-muted font-bold uppercase">Day</span>
                                    <span className="text-lg font-bold">{day.day}</span>
                                  </div>
                                  
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      <span className="badge badge-secondary text-[10px]">{day.subject}</span>
                                      <span className="text-xs text-muted font-medium flex items-center gap-1">
                                        <Clock size={12}/> {day.hours}h
                                      </span>
                                    </div>
                                    <h5 className="font-bold text-base m-0 leading-tight">
                                      {day.subject || day.module || 'Study Session'}
                                    </h5>
                                  </div>
                                </div>
                                
                                <button 
                                  onClick={() => toggleDayStatus(day)}
                                  className={`p-2 rounded-full transition-colors flex-shrink-0 ${
                                    day.status === 'Complete' 
                                      ? 'text-success bg-success/10 hover:bg-success/20' 
                                      : 'text-muted hover:text-primary hover:bg-[var(--surface-hover)]'
                                  }`}
                                  title={day.status === 'Complete' ? 'Mark Pending' : 'Mark Complete'}
                                >
                                  {day.status === 'Complete' ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                </button>
                              </div>

                              <div className="mt-3 pl-[3.25rem]">
                                <p className="text-sm text-muted m-0 mb-3 whitespace-pre-wrap">{day.detailed_topics}</p>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                                  <div className="bg-[var(--surface-hover)] p-2 rounded text-center">
                                    <div className="text-lg font-bold text-main leading-none">{day.mcq_target}</div>
                                    <div className="text-[10px] text-muted uppercase mt-1">MCQ</div>
                                  </div>
                                  <div className="bg-[var(--surface-hover)] p-2 rounded text-center">
                                    <div className="text-lg font-bold text-main leading-none">{day.written_target}</div>
                                    <div className="text-[10px] text-muted uppercase mt-1">Written</div>
                                  </div>
                                  <div className="bg-[var(--surface-hover)] p-2 rounded text-center">
                                    <div className="text-lg font-bold text-main leading-none">{day.pyq_target}</div>
                                    <div className="text-[10px] text-muted uppercase mt-1">PYQ</div>
                                  </div>
                                </div>
                                
                                {(day.practice_checklist || day.daily_deliverable) && (
                                  <div className="flex flex-col gap-3 bg-blue-500/5 p-3 rounded border border-blue-500/10">
                                    {day.practice_checklist && (
                                      <div className="flex flex-col gap-1">
                                        <div className="text-[10px] font-bold text-blue-500 uppercase">Checklist</div>
                                        {renderChecklist(day.practice_checklist)}
                                      </div>
                                    )}
                                    {day.daily_deliverable && (
                                      <div className={`flex flex-col gap-1 ${day.practice_checklist ? 'border-t border-blue-500/10 pt-2' : ''}`}>
                                        <div className="text-[10px] font-bold text-blue-500 uppercase">Deliverable</div>
                                        <div className="text-xs font-medium">{day.daily_deliverable}</div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardBody>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
