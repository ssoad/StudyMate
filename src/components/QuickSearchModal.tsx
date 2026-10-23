import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  X, 
  PlayCircle, 
  BookOpen, 
  FileText, 
  GraduationCap, 
  Trophy, 
  MessageSquare, 
  ArrowRight,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import { dataService, type Course } from '../lib/dataService';
import { useAuthStore } from '../store/authStore';

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickSearchModal({ isOpen, onClose }: QuickSearchModalProps) {
  const navigate = useNavigate();
  const { user, role } = useAuthStore();
  const [query, setQuery] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);

  const isAdmin =
    role === 'admin' ||
    user?.email === 'admin@studymate.org' ||
    user?.email === 'admin@studymate.local' ||
    (user as any)?.app_metadata?.role === 'admin';

  useEffect(() => {
    if (isOpen) {
      loadSearchData();
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const loadSearchData = async () => {
    setLoading(true);
    try {
      const data = await dataService.getCourses();
      setCourses(data);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const staticNavigation = [
    { title: 'Video Courses Hub', path: '/courses', category: 'Pages', icon: <PlayCircle size={16} /> },
    { title: 'Study Plan & Milestones', path: '/study-plan', category: 'Pages', icon: <BookOpen size={16} /> },
    { title: 'Community Resources & Textbooks', path: '/resources', category: 'Pages', icon: <FileText size={16} /> },
    { title: 'Mock Exams & Quizzes', path: '/exams', category: 'Pages', icon: <GraduationCap size={16} /> },
    { title: 'Global Leaderboard', path: '/leaderboard', category: 'Pages', icon: <Trophy size={16} /> },
    { title: 'Community Discussion', path: '/discussion', category: 'Pages', icon: <MessageSquare size={16} /> },
  ];

  if (isAdmin) {
    staticNavigation.push(
      { title: 'Course Enrollments Verification', path: '/admin/enrollments', category: 'Admin', icon: <CreditCard size={16} /> },
      { title: 'Admin Overview & Metrics', path: '/admin', category: 'Admin', icon: <ShieldCheck size={16} /> },
      { title: 'Manage Courses & Curriculum', path: '/admin/courses', category: 'Admin', icon: <PlayCircle size={16} /> },
      { title: 'Manage Study Plans', path: '/admin/study-plans', category: 'Admin', icon: <FileText size={16} /> }
    );
  }

  const q = query.toLowerCase().trim();

  const filteredNav = staticNavigation.filter((item) =>
    !q || item.title.toLowerCase().includes(q)
  );

  const filteredCourses = courses.filter((c) =>
    !q ||
    c.title.toLowerCase().includes(q) ||
    c.category.toLowerCase().includes(q) ||
    c.instructor_name.toLowerCase().includes(q) ||
    (c.sections || []).some((s) => s.title.toLowerCase().includes(q))
  );

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 pt-16 sm:pt-24 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-[var(--surface)] border border-[var(--border)] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[75vh]">
        {/* Search Header */}
        <div className="p-3.5 sm:p-4 border-b border-[var(--border)] flex items-center gap-3 bg-[var(--surface-hover)]">
          <Search size={20} className="text-[var(--primary)] shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses, lessons, topics, exams..."
            className="w-full bg-transparent text-sm sm:text-base text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none"
            autoFocus
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-full hover:bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
            >
              <X size={16} />
            </button>
          ) : (
            <span className="hidden sm:inline-block text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]">
              ESC
            </span>
          )}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
          {/* Courses Results */}
          {filteredCourses.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-2 block">
                Courses ({filteredCourses.length})
              </span>
              <div className="space-y-1">
                {filteredCourses.slice(0, 6).map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelect(`/courses/${c.id}`)}
                    className="p-2.5 sm:p-3 rounded-xl hover:bg-[var(--surface-hover)] border border-transparent hover:border-[var(--border)] transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-900 shrink-0 border border-[var(--border)]">
                        <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="text-xs sm:text-sm font-bold text-[var(--text-main)] group-hover:text-[var(--primary)] truncate transition-colors">
                          {c.title}
                        </h4>
                        <p className="text-[11px] text-[var(--text-muted)] truncate">
                          {c.category} • {c.instructor_name} • {c.duration}
                        </p>
                      </div>
                    </div>
                    <ArrowRight size={15} className="text-[var(--text-muted)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation / Pages Results */}
          {filteredNav.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-2 block">
                Quick Navigation
              </span>
              <div className="space-y-1">
                {filteredNav.map((item) => (
                  <div
                    key={item.path}
                    onClick={() => handleSelect(item.path)}
                    className="p-2.5 sm:p-3 rounded-xl hover:bg-[var(--surface-hover)] border border-transparent hover:border-[var(--border)] transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 rounded-lg bg-[var(--surface)] text-[var(--primary)] border border-[var(--border)] shrink-0">
                        {item.icon}
                      </div>
                      <div className="overflow-hidden">
                        <span className="text-xs sm:text-sm font-semibold text-[var(--text-main)] group-hover:text-[var(--primary)] truncate block transition-colors">
                          {item.title}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">{item.path}</span>
                      </div>
                    </div>
                    <ArrowRight size={15} className="text-[var(--text-muted)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredCourses.length === 0 && filteredNav.length === 0 && !loading && (
            <div className="py-12 text-center space-y-2">
              <Search size={32} className="mx-auto text-[var(--text-muted)] opacity-50" />
              <p className="text-sm font-medium text-[var(--text-main)]">No results found for "{query}"</p>
              <p className="text-xs text-[var(--text-muted)]">Try searching by topic, category, or course title.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--border)] bg-[var(--surface-hover)]/50 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <span>Tap any item to jump directly</span>
          <span className="font-mono">StudyMate App</span>
        </div>
      </div>
    </div>
  );
}
