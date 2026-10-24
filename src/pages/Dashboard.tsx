import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Trophy, 
  BookOpen, 
  Clock, 
  Target, 
  ArrowRight, 
  MessageSquare, 
  PlayCircle, 
  Sparkles, 
  Search, 
  CheckCircle2, 
  Circle,
  GraduationCap,
  Flame,
  FileText
} from 'lucide-react';
import { Button } from '../components/Button';
import { dataService, type Course, type UserCourseProgress, type StudyDay } from '../lib/dataService';
import { useAuthStore } from '../store/authStore';
import { useAppModalStore } from '../store/appModalStore';
import { useToastStore } from '../store/toastStore';

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { openSearch } = useAppModalStore();
  const { addToast } = useToastStore();

  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState(0);
  const [recentDiscussions, setRecentDiscussions] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState({ totalTopics: 0, pendingExams: 0 });
  const [nextTopic, setNextTopic] = useState<StudyDay | null>(null);
  const [studyDays, setStudyDays] = useState<StudyDay[]>([]);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [activeProgress, setActiveProgress] = useState<UserCourseProgress | null>(null);
  const [enrolledCount, setEnrolledCount] = useState(0);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) return;
      setLoading(true);

      try {
        // 1. User points
        const { data: profile } = await dataService.getUserPoints(user.id);
        if (profile) setPoints(profile.points);

        // 2. Discussions
        const { data: discussions } = await dataService.getDiscussions();
        if (discussions) setRecentDiscussions(discussions.slice(0, 3));

        // 3. Stats & Study Days
        const stats = await dataService.getDashboardStats();
        setDashboardStats(stats);

        const { data: days } = await dataService.getStudyDays();
        if (days && days.length > 0) {
          setStudyDays(days);
          // Find first uncompleted study day, fallback to days[0]
          const pending = days.find((d: StudyDay) => d.status !== 'Complete');
          setNextTopic(pending || days[0]);
        }

        // 4. Courses & In-progress tracking
        const courses = await dataService.getCourses();
        let inProgressCourse: Course | null = null;
        let inProgressProg: UserCourseProgress | null = null;
        let activeCount = 0;

        for (const c of courses) {
          const prog = await dataService.getUserCourseProgress(user.id, c.id);
          if (prog && prog.completed_lessons && prog.completed_lessons.length > 0) {
            activeCount++;
            if (!inProgressCourse) {
              inProgressCourse = c;
              inProgressProg = prog;
            }
          }
        }

        // If no course in progress but courses exist, default to the first course
        if (!inProgressCourse && courses.length > 0) {
          inProgressCourse = courses[0];
          inProgressProg = (await dataService.getUserCourseProgress(user.id, courses[0].id)) || null;
        }

        setActiveCourse(inProgressCourse);
        setActiveProgress(inProgressProg);
        setEnrolledCount(activeCount > 0 ? activeCount : (courses.length > 0 ? 1 : 0));
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [user]);

  const handleToggleTopic = async (day: StudyDay) => {
    const newStatus = day.status === 'Complete' ? 'Pending' : 'Complete';
    setStudyDays((prev) => prev.map((d) => (d.id === day.id ? { ...d, status: newStatus } : d)));
    if (nextTopic && nextTopic.id === day.id) {
      setNextTopic({ ...nextTopic, status: newStatus });
    }

    const { error } = await dataService.updateStudyDay(day.id, { status: newStatus });
    if (error) {
      addToast('Failed to update status', 'error');
    } else {
      addToast(
        newStatus === 'Complete'
          ? 'Topic marked as complete! (+10 Points)'
          : 'Topic marked as pending',
        'success'
      );
    }
  };

  const userEmail = user?.email || 'Student';
  const userName = userEmail.split('@')[0];
  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  // Calculate course completion
  const totalLessonsInActiveCourse =
    activeCourse?.sections?.reduce((acc, s) => acc + s.lessons.length, 0) || 1;
  const completedLessonsCount = activeProgress?.completed_lessons?.length || 0;
  const coursePercent = Math.min(
    100,
    Math.round((completedLessonsCount / totalLessonsInActiveCourse) * 100)
  );

  // Calculate syllabus completion
  const completedDaysCount = studyDays.filter((d) => d.status === 'Complete').length;
  const studyPlanPercent =
    studyDays.length > 0 ? Math.round((completedDaysCount / studyDays.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 sm:gap-8 animate-fade-in pb-12 max-w-7xl mx-auto">
      {/* 1. WELCOME & ACTION BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-7 rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] via-[var(--surface)] to-[var(--surface-hover)] shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-bold tracking-wide uppercase">
              {currentDateFormatted}
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              <Flame size={13} className="text-amber-500" />
              <span>3-Day Streak</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] font-[var(--font-heading)] tracking-tight">
            Welcome back, {userName}! 👋
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-xl">
            Pick up right where you left off. Continue your lessons, review study plans, and take mock quizzes.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={openSearch}
            className="btn btn-secondary text-xs sm:text-sm py-2 px-3 sm:px-4 rounded-xl flex items-center gap-2 shadow-xs"
          >
            <Search size={15} className="text-[var(--primary)]" />
            <span>Search</span>
            <kbd className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-muted)]">
              ⌘K
            </kbd>
          </button>
          <Link to="/courses">
            <Button size="sm" variant="primary" icon={<PlayCircle size={15} />}>
              Explore Courses
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. FOUR REFINED METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {/* Metric 1: XP / Score */}
        <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] transition-all shadow-xs space-y-2 group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Total Points
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Trophy size={16} />
            </div>
          </div>
          {loading ? (
            <div className="h-8 w-16 bg-[var(--surface-hover)] rounded animate-pulse" />
          ) : (
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] font-[var(--font-heading)]">
                {points}
              </span>
              <span className="text-xs font-semibold text-[var(--text-muted)]">XP</span>
            </div>
          )}
          <p className="text-[11px] text-[var(--text-muted)] truncate flex items-center gap-1">
            <span className="text-emerald-500 font-semibold">+15 XP</span> per completed quiz
          </p>
        </div>

        {/* Metric 2: Enrolled Courses */}
        <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] transition-all shadow-xs space-y-2 group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Courses
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <PlayCircle size={16} />
            </div>
          </div>
          {loading ? (
            <div className="h-8 w-16 bg-[var(--surface-hover)] rounded animate-pulse" />
          ) : (
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] font-[var(--font-heading)]">
                {enrolledCount}
              </span>
              <span className="text-xs font-semibold text-[var(--text-muted)]">Active</span>
            </div>
          )}
          <p className="text-[11px] text-[var(--text-muted)] truncate">
            {completedLessonsCount} lecture{completedLessonsCount !== 1 ? 's' : ''} finished
          </p>
        </div>

        {/* Metric 3: Study Plan Progress */}
        <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] transition-all shadow-xs space-y-2 group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Study Syllabus
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <BookOpen size={16} />
            </div>
          </div>
          {loading ? (
            <div className="h-8 w-16 bg-[var(--surface-hover)] rounded animate-pulse" />
          ) : (
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] font-[var(--font-heading)]">
                {studyPlanPercent}%
              </span>
              <span className="text-xs font-semibold text-[var(--text-muted)]">
                ({completedDaysCount}/{studyDays.length || 0})
              </span>
            </div>
          )}
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-[var(--surface-hover)] rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${studyPlanPercent}%` }}
            />
          </div>
        </div>

        {/* Metric 4: Scheduled Exams */}
        <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] transition-all shadow-xs space-y-2 group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Mock Exams
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <GraduationCap size={16} />
            </div>
          </div>
          {loading ? (
            <div className="h-8 w-16 bg-[var(--surface-hover)] rounded animate-pulse" />
          ) : (
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] font-[var(--font-heading)]">
                {dashboardStats.pendingExams}
              </span>
              <span className="text-xs font-semibold text-[var(--text-muted)]">Available</span>
            </div>
          )}
          <Link
            to="/exams"
            className="text-[11px] font-semibold text-[var(--primary)] hover:underline flex items-center gap-1"
          >
            <span>Take practice quiz</span>
            <ArrowRight size={11} />
          </Link>
        </div>
      </div>

      {/* 3. HERO: CONTINUE LEARNING CARD */}
      {activeCourse && (
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7 shadow-xs relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            {/* Left: Thumbnail & Course Info */}
            <div className="flex items-center gap-4 sm:gap-6 flex-1 min-w-0">
              <div className="relative w-24 h-24 sm:w-32 sm:h-24 rounded-2xl overflow-hidden shrink-0 border border-[var(--border)] bg-[var(--surface-hover)]">
                {activeCourse.thumbnail_url ? (
                  <img
                    src={activeCourse.thumbnail_url}
                    alt={activeCourse.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--primary)] bg-[var(--primary)]/10 font-bold">
                    <PlayCircle size={32} />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-white/90 text-[var(--primary)] flex items-center justify-center shadow-md">
                    <PlayCircle size={18} />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)]">
                    In Progress
                  </span>
                  <span className="text-xs text-[var(--text-muted)] truncate">
                    {activeCourse.instructor_name}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[var(--text-main)] truncate font-[var(--font-heading)]">
                  {activeCourse.title}
                </h3>
                <div className="space-y-1 pt-1 max-w-md">
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>Course Progress</span>
                    <span className="font-bold text-[var(--text-main)]">{coursePercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-[var(--surface-hover)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--primary)] rounded-full transition-all duration-500"
                      style={{ width: `${coursePercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: One-Click Resume Button */}
            <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end">
              <Link to={`/courses/${activeCourse.id}`} className="hidden sm:inline-block">
                <Button variant="secondary" size="md">
                  Course Details
                </Button>
              </Link>
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate(`/courses/${activeCourse.id}/learn`)}
                icon={<ArrowRight size={16} />}
                className="w-full md:w-auto shadow-md shadow-indigo-500/20"
              >
                Resume Learning
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. TWO-COLUMN WORKSPACE: TODAY'S SYLLABUS & COMMUNITY FORUMS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left Column (2 spans): Today's Study Deliverable */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target size={18} className="text-[var(--primary)]" />
              <h3 className="text-base font-bold text-[var(--text-main)] font-[var(--font-heading)]">
                Today's Study Plan Deliverable
              </h3>
            </div>
            <Link
              to="/study-plan"
              className="text-xs font-semibold text-[var(--primary)] hover:underline flex items-center gap-1"
            >
              <span>View full syllabus</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          {loading ? (
            <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] h-44 animate-pulse" />
          ) : nextTopic ? (
            <div className="p-5 sm:p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-4 hover:border-[var(--primary)] transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <button
                    type="button"
                    onClick={() => handleToggleTopic(nextTopic)}
                    className="mt-1 text-[var(--text-muted)] hover:text-emerald-500 transition-colors shrink-0"
                    title={nextTopic.status === 'Complete' ? 'Mark as Pending' : 'Mark as Complete'}
                  >
                    {nextTopic.status === 'Complete' ? (
                      <CheckCircle2 size={22} className="text-emerald-500 fill-emerald-500/10" />
                    ) : (
                      <Circle size={22} />
                    )}
                  </button>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--surface-hover)] text-[var(--text-muted)] border border-[var(--border)]">
                        Week {nextTopic.week} • Day {nextTopic.day}
                      </span>
                      <span className="text-xs font-semibold text-[var(--primary)]">
                        {nextTopic.phase || 'Foundations'}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-[var(--text-main)]">
                      {nextTopic.subject}: {nextTopic.module}
                    </h4>
                    {nextTopic.detailed_topics && (
                      <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                        {nextTopic.detailed_topics}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[var(--surface-hover)] text-[var(--text-muted)] border border-[var(--border)] flex items-center gap-1">
                    <Clock size={12} />
                    <span>{nextTopic.hours || 2}h Goal</span>
                  </span>
                </div>
              </div>

              {/* Targets Checklist */}
              {nextTopic.daily_deliverable && (
                <div className="p-3.5 rounded-xl bg-[var(--surface-hover)]/60 border border-[var(--border)] text-xs space-y-1.5">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--text-muted)] block">
                    Daily Deliverable & Practice Target
                  </span>
                  <p className="text-xs text-[var(--text-main)] font-medium leading-relaxed">
                    {nextTopic.daily_deliverable}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1.5">
                  <Target size={13} className="text-emerald-500" />
                  <span>Target: {nextTopic.mcq_target || 30} MCQs</span>
                </span>
                <Link to="/study-plan">
                  <Button size="sm" variant="secondary" className="text-xs">
                    Start Today's Session
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] space-y-2">
              <BookOpen size={32} className="mx-auto text-[var(--text-muted)] opacity-50" />
              <p className="text-sm font-semibold text-[var(--text-main)]">All study topics completed!</p>
              <p className="text-xs text-[var(--text-muted)]">Check out the full syllabus to review past weeks.</p>
            </div>
          )}

          {/* Quick Learning Shortcuts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <Link
              to="/resources"
              className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] transition-all flex items-center gap-3 shadow-xs group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <FileText size={18} />
              </div>
              <div className="overflow-hidden">
                <span className="text-xs font-bold text-[var(--text-main)] block truncate">
                  PDF Handbooks
                </span>
                <span className="text-[10px] text-[var(--text-muted)] block truncate">
                  Read offline guides
                </span>
              </div>
            </Link>

            <Link
              to="/exams"
              className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] transition-all flex items-center gap-3 shadow-xs group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <GraduationCap size={18} />
              </div>
              <div className="overflow-hidden">
                <span className="text-xs font-bold text-[var(--text-main)] block truncate">
                  Mock Quizzes
                </span>
                <span className="text-[10px] text-[var(--text-muted)] block truncate">
                  Test your accuracy
                </span>
              </div>
            </Link>

            <Link
              to="/leaderboard"
              className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] transition-all flex items-center gap-3 shadow-xs group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Trophy size={18} />
              </div>
              <div className="overflow-hidden">
                <span className="text-xs font-bold text-[var(--text-main)] block truncate">
                  Leaderboard
                </span>
                <span className="text-[10px] text-[var(--text-muted)] block truncate">
                  Community rankings
                </span>
              </div>
            </Link>
          </div>
        </div>

        {/* Right Column (1 span): Discussion Board & Activity */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} className="text-[var(--primary)]" />
              <h3 className="text-base font-bold text-[var(--text-main)] font-[var(--font-heading)]">
                Community Board
              </h3>
            </div>
            <Link
              to="/discussion"
              className="text-xs font-semibold text-[var(--primary)] hover:underline flex items-center gap-1"
            >
              <span>Join discussions</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs divide-y divide-[var(--border)] space-y-3">
            {loading ? (
              <div className="space-y-3 py-2">
                <div className="h-10 bg-[var(--surface-hover)] rounded animate-pulse" />
                <div className="h-10 bg-[var(--surface-hover)] rounded animate-pulse" />
              </div>
            ) : recentDiscussions.length === 0 ? (
              <div className="text-center py-6 text-xs text-[var(--text-muted)] space-y-2">
                <MessageSquare size={24} className="mx-auto opacity-40" />
                <p>No recent discussions.</p>
                <Link to="/discussion" className="text-[var(--primary)] font-bold hover:underline block">
                  Start the first topic →
                </Link>
              </div>
            ) : (
              recentDiscussions.map((d) => (
                <div key={d.id} className="pt-3 first:pt-0 space-y-1 group">
                  <Link
                    to="/discussion"
                    className="text-xs font-bold text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors block line-clamp-1"
                  >
                    {d.title}
                  </Link>
                  <p className="text-[11px] text-[var(--text-muted)] line-clamp-1">
                    {d.content || 'Discussion topic in community board.'}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-0.5">
                    <span>{new Date(d.created_at).toLocaleDateString()}</span>
                    <span className="text-[var(--primary)] font-semibold flex items-center gap-1">
                      Reply <ArrowRight size={10} />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Motivational Tip Box */}
          <div className="p-4 rounded-2xl border border-[var(--border)] bg-gradient-to-br from-indigo-500/5 to-purple-500/5 space-y-2">
            <div className="flex items-center gap-2 text-[var(--primary)]">
              <Sparkles size={16} />
              <h5 className="text-xs font-bold">Study Tip of the Day</h5>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Break study hours into 25-minute Pomodoro focus sprints. Solving 5 MCQs immediately after watching a lecture increases long-term retention by 40%.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
