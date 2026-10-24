import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, HelpCircle, Calendar, GraduationCap, ArrowRight, Search, Award } from 'lucide-react';
import { Button } from '../components/Button';
import { dataService } from '../lib/dataService';

interface Exam {
  id: string;
  title: string;
  type: string;
  duration: number;
  questions: number;
  due_date: string | null;
}

export function Exams() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    async function fetchExams() {
      setLoading(true);
      const { data, error } = await dataService.getExams();
      if (!error && data) {
        setExams(data);
      }
      setLoading(false);
    }
    fetchExams();
  }, []);

  const filteredExams = exams.filter((exam) => {
    const matchesSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || exam.type.toLowerCase().includes(typeFilter);
    return matchesSearch && matchesType;
  });

  return (
    <div className="flex flex-col gap-6 sm:gap-8 animate-fade-in pb-12 max-w-7xl mx-auto">
      {/* HEADER BANNER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 sm:p-7 rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] via-[var(--surface)] to-[var(--surface-hover)] shadow-sm">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-wider">
            <GraduationCap size={14} />
            <span>Mock Tests & Assessments</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] font-[var(--font-heading)] tracking-tight">
            Exams & Quizzes
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-xl">
            Test your knowledge, practice timed examination simulations, and earn leaderboard points.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs font-bold text-[var(--text-muted)]">
            {exams.length} Test{exams.length !== 1 ? 's' : ''} Available
          </span>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--surface)] p-3.5 rounded-2xl border border-[var(--border)] shadow-xs">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search exam by title or topic..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] text-xs sm:text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['all', 'mock', 'practice'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setTypeFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize whitespace-nowrap transition-all ${
                typeFilter === f
                  ? 'bg-[var(--primary)] text-white shadow-xs'
                  : 'bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {f === 'all' ? 'All Quizzes' : `${f} Tests`}
            </button>
          ))}
        </div>
      </div>

      {/* EXAMS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] space-y-4 animate-pulse h-48"
            />
          ))
        ) : filteredExams.length === 0 ? (
          <div className="col-span-full text-center py-16 border-2 border-dashed border-[var(--border)] rounded-3xl bg-[var(--surface)] space-y-3">
            <GraduationCap size={44} className="mx-auto text-[var(--text-muted)] opacity-40" />
            <h3 className="text-base font-bold text-[var(--text-main)]">No exams found</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              {searchQuery
                ? `No quizzes matched "${searchQuery}". Try clearing your search.`
                : 'There are no active examinations available right now.'}
            </p>
          </div>
        ) : (
          filteredExams.map((exam) => {
            const isMock = exam.type.toLowerCase().includes('mock');

            return (
              <div
                key={exam.id}
                className="p-5 sm:p-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] transition-all duration-200 hover:shadow-lg flex flex-col justify-between gap-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        isMock
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {exam.type}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">
                      <Award size={12} />
                      <span>+15 XP</span>
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors line-clamp-2">
                    {exam.title}
                  </h3>

                  <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] pt-1">
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-[var(--primary)]" />
                      <span>{exam.duration} mins</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <HelpCircle size={14} className="text-emerald-500" />
                      <span>{exam.questions} Questions</span>
                    </div>
                  </div>

                  {exam.due_date && (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] pt-1 border-t border-[var(--border)]">
                      <Calendar size={13} />
                      <span>
                        Due:{' '}
                        {new Date(exam.due_date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  variant="primary"
                  size="md"
                  className="w-full flex items-center justify-center gap-2 shadow-sm"
                  onClick={() => navigate(`/exams/${exam.id}`)}
                >
                  <span>Start Practice Quiz</span>
                  <ArrowRight size={14} />
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
