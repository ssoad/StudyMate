import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, 
  Search, 
  Plus, 
  BookOpen, 
  Clock, 
  Star, 
  Users, 
  FileText, 
  Sparkles, 
  GraduationCap, 
  ChevronRight,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { YoutubeIcon } from '../components/YoutubeIcon';
import { Card, CardBody } from '../components/Card';
import { Button } from '../components/Button';
import { CourseModal } from '../components/CourseModal';
import { dataService, type Course, type UserCourseProgress } from '../lib/dataService';
import { useAuthStore } from '../store/authStore';

export function Courses() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userProgressMap, setUserProgressMap] = useState<Record<string, UserCourseProgress>>({});

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    const data = await dataService.getCourses();
    setCourses(data);

    // Load progress for user if logged in
    if (user) {
      const progressEntries: Record<string, UserCourseProgress> = {};
      for (const course of data) {
        const prog = await dataService.getUserCourseProgress(user.id, course.id);
        if (prog) {
          progressEntries[course.id] = prog;
        }
      }
      setUserProgressMap(progressEntries);
    }

    setLoading(false);
  };

  const categories = [
    'All',
    'Web Development',
    'Artificial Intelligence',
    'Computer Science',
    'Mobile Development',
    'Exam Preparation',
  ];

  // Filtering
  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.instructor_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'All' || course.category === selectedCategory;
    const matchesLevel = selectedLevel === 'all' || course.level === selectedLevel || course.level === 'all_levels';

    return matchesSearch && matchesCategory && matchesLevel;
  });

  // Calculate in-progress courses
  const inProgressCourses = courses.filter((c) => {
    const prog = userProgressMap[c.id];
    return prog && prog.completed_lessons && prog.completed_lessons.length > 0;
  });

  return (
    <div className="flex flex-col gap-6 sm:gap-8 animate-fade-in pb-12">
      {/* HERO BANNER */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-12 border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] via-[var(--surface-hover)] to-[var(--surface)] shadow-lg">
        {/* Decorative backdrop glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/10 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-semibold tracking-wide uppercase">
            <Sparkles size={14} />
            <span>Interactive Learning Hub</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[var(--text-main)] font-[var(--font-heading)]">
            Level Up Your Skills With{' '}
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Video Courses
            </span>
          </h1>

          <p className="text-sm sm:text-base text-[var(--text-muted)] leading-relaxed">
            Learn at your own pace with structured video playlists, downloadable textbooks, cheatsheets, and live progress tracking.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={() => setIsModalOpen(true)}
              icon={<Plus size={20} />}
              className="shadow-lg shadow-indigo-500/20 hover:scale-[1.02] transition-transform"
            >
              Create New Course
            </Button>
          </div>
        </div>
      </div>

      {/* CONTINUE LEARNING SECTION (IF ANY ENROLLED) */}
      {inProgressCourses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="text-[var(--primary)]" size={24} />
              <h2 className="text-xl font-bold text-[var(--text-main)]">Continue Learning</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {inProgressCourses.map((course) => {
              const prog = userProgressMap[course.id];
              const totalLessons = course.sections?.reduce((acc, s) => acc + s.lessons.length, 0) || 1;
              const completedCount = prog?.completed_lessons?.length || 0;
              const percent = Math.min(100, Math.round((completedCount / totalLessons) * 100));

              return (
                <div
                  key={course.id}
                  onClick={() => navigate(`/courses/${course.id}`)}
                  className="cursor-pointer group rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                        {course.category}
                      </span>
                      <span className="text-xs font-mono font-bold text-[var(--text-muted)]">
                        {completedCount}/{totalLessons} lessons
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors line-clamp-2">
                      {course.title}
                    </h3>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-xs text-[var(--text-muted)]">
                        <span>Progress</span>
                        <span className="font-semibold text-[var(--text-main)]">{percent}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[var(--surface-hover)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-2 border-t border-[var(--border)] flex items-center justify-between text-xs font-semibold text-[var(--primary)]">
                    <span>Resume Course</span>
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-[var(--surface)] p-4 rounded-2xl border border-[var(--border)] shadow-sm">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search courses by title, topic, or instructor..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
          />
        </div>

        {/* Level filter */}
        <div className="flex items-center gap-2">
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="py-2.5 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] cursor-pointer"
          >
            <option value="all">All Difficulty Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      {/* CATEGORY PILLS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
              selectedCategory === cat
                ? 'bg-[var(--primary)] text-white shadow-md shadow-indigo-500/25 scale-[1.02]'
                : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] border border-[var(--border)]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* COURSE CARDS GRID */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <Loader2 size={36} className="animate-spin text-[var(--primary)]" />
          <p className="text-sm text-[var(--text-muted)]">Loading available courses...</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-[var(--border)] rounded-2xl bg-[var(--surface)] space-y-3">
          <BookOpen size={48} className="mx-auto text-[var(--text-muted)] opacity-50" />
          <h3 className="text-lg font-bold text-[var(--text-main)]">No courses found</h3>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
            Try adjusting your search query or create the first course with a YouTube playlist!
          </p>
          <Button
            size="sm"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus size={16} />}
            className="mt-2"
          >
            Create Course Now
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const totalLectures = course.sections?.reduce((acc, s) => acc + s.lessons.length, 0) || 0;
            const totalResources = (course.resources?.length || 0) + (course.sections?.reduce((acc, s) => acc + s.lessons.reduce((lacc, l) => lacc + (l.resources?.length || 0), 0), 0) || 0);
            const prog = userProgressMap[course.id];
            const isCompleted = prog && prog.completed_lessons && totalLectures > 0 && prog.completed_lessons.length >= totalLectures;

            return (
              <Card
                key={course.id}
                className="overflow-hidden border-[var(--border)] bg-[var(--surface)] hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col group cursor-pointer"
              >
                {/* THUMBNAIL */}
                <div 
                  className="relative aspect-video overflow-hidden bg-gray-900"
                  onClick={() => navigate(`/courses/${course.id}`)}
                >
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  
                  {/* Category Pill */}
                  <span className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-full border border-white/10">
                    {course.category}
                  </span>

                  {/* Level Pill */}
                  <span className="absolute top-3 right-3 bg-black/70 backdrop-blur-md text-emerald-400 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-white/10 capitalize">
                    {course.level.replace('_', ' ')}
                  </span>

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-[var(--primary)] text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                      <Play size={20} className="ml-0.5 fill-current" />
                    </div>
                  </div>

                  {/* Price Tag */}
                  <span className="absolute bottom-2.5 left-2.5 bg-black/75 backdrop-blur-md text-emerald-400 text-xs font-black px-2.5 py-1 rounded-lg border border-emerald-500/20 shadow">
                    {course.price ? `৳ ${course.price.toLocaleString()}` : 'Free'}
                  </span>

                  {/* YouTube Badge */}
                  {course.youtube_playlist_id && (
                    <div className="absolute bottom-2 right-2 bg-red-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow">
                      <YoutubeIcon size={12} />
                      <span>Playlist</span>
                    </div>
                  )}
                </div>

                {/* CONTENT */}
                <CardBody 
                  className="p-5 flex-1 flex flex-col justify-between space-y-4"
                  style={{ padding: '1.25rem' }}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <div className="flex items-center text-amber-500 font-bold gap-1">
                        <Star size={14} className="fill-amber-400 text-amber-400" />
                        <span>{course.rating.toFixed(1)}</span>
                      </div>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock size={13} />
                        {course.duration}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Users size={13} />
                        {course.enrolled_count.toLocaleString()}
                      </span>
                    </div>

                    <h3 
                      onClick={() => navigate(`/courses/${course.id}`)}
                      className="font-bold text-base text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors line-clamp-2"
                    >
                      {course.title}
                    </h3>

                    <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>
                  </div>

                  {/* Instructor & Resources Footer */}
                  <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {course.instructor_avatar ? (
                        <img
                          src={course.instructor_avatar}
                          alt={course.instructor_name}
                          className="w-7 h-7 rounded-full object-cover border border-[var(--border)]"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[var(--primary)] text-white text-[10px] font-bold flex items-center justify-center">
                          {course.instructor_name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs font-medium text-[var(--text-main)] truncate max-w-[110px]">
                        {course.instructor_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {totalResources > 0 && (
                        <span 
                          className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20"
                          title={`${totalResources} Downloadable Books & PDFs`}
                        >
                          <FileText size={12} />
                          {totalResources} PDF{totalResources > 1 ? 's' : ''}
                        </span>
                      )}

                      {isCompleted && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                          <CheckCircle2 size={12} />
                          Done
                        </span>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE COURSE MODAL */}
      <CourseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(newCourse) => {
          setCourses([newCourse, ...courses]);
        }}
      />
    </div>
  );
}
