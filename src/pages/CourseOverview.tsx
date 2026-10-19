import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Play, 
  BookOpen, 
  Clock, 
  Star, 
  Users, 
  FileText, 
  GraduationCap, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle, 
  Download, 
  Eye,
  Lock, 
  HelpCircle,
  Loader2,
  X,
  CreditCard
} from 'lucide-react';
import { Button } from '../components/Button';
import { EnrollmentModal } from '../components/EnrollmentModal';
import { dataService, type Course, type CourseLesson, type CourseEnrollment } from '../lib/dataService';
import { getYouTubeEmbedUrl, extractVideoId } from '../lib/youtube';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';

export function CourseOverview() {
  const { id: courseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuthStore();
  const { addToast } = useToastStore();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState<CourseEnrollment | null>(null);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  // Preview modal state
  const [previewLesson, setPreviewLesson] = useState<CourseLesson | null>(null);

  useEffect(() => {
    if (courseId) {
      loadCourseAndEnrollment(courseId);
    }
  }, [courseId, user]);

  const loadCourseAndEnrollment = async (cId: string) => {
    setLoading(true);
    const data = await dataService.getCourseById(cId);
    if (!data) {
      addToast('Course not found.', 'error');
      navigate('/courses');
      return;
    }

    setCourse(data);

    // Expand first 2 sections by default
    if (data.sections && data.sections.length > 0) {
      const initialExpanded: Record<string, boolean> = {};
      data.sections.forEach((sec, idx) => {
        initialExpanded[sec.id] = idx < 2;
      });
      setExpandedSections(initialExpanded);
    }

    // Check user enrollment
    if (user) {
      const userEnrollment = await dataService.getCourseEnrollment(cId, user.id);
      setEnrollment(userEnrollment);
    }

    setLoading(false);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const expandAll = () => {
    if (!course?.sections) return;
    const allExp: Record<string, boolean> = {};
    course.sections.forEach((s) => (allExp[s.id] = true));
    setExpandedSections(allExp);
  };

  const collapseAll = () => {
    setExpandedSections({});
  };

  const handleEnrollClick = () => {
    if (!user) {
      // Direct guest to login with return redirect
      navigate(`/login?redirect=/courses/${courseId}`);
      return;
    }
    setIsEnrollModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 size={40} className="animate-spin text-indigo-500" />
        <p className="text-sm text-[var(--text-muted)] font-medium">Loading course syllabus and overview...</p>
      </div>
    );
  }

  if (!course) return null;

  const totalLectures = course.sections?.reduce((acc, s) => acc + (s.lessons?.length || 0), 0) || 0;
  const totalResources = (course.resources?.length || 0) + (course.sections?.reduce((acc, s) => acc + s.lessons.reduce((lacc, l) => lacc + (l.resources?.length || 0), 0), 0) || 0);
  const isAdmin =
    role === 'admin' ||
    user?.email === 'admin@studymate.org' ||
    user?.email === 'admin@studymate.local' ||
    (user as any)?.app_metadata?.role === 'admin';
  const isApproved = isAdmin || enrollment?.status === 'approved';
  const isPending = enrollment?.status === 'pending';
  const isRejected = enrollment?.status === 'rejected';

  // Find first previewable lesson for hero preview button
  const firstPreviewLesson = course.sections?.[0]?.lessons?.[0] || null;

  return (
    <div className="animate-fade-in pb-20 space-y-8">
      {/* BREADCRUMB */}
      <nav className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <Link to="/" className="hover:text-[var(--text-main)] transition-colors">Home</Link>
        <span>/</span>
        <Link to="/courses" className="hover:text-[var(--text-main)] transition-colors">Courses</Link>
        <span>/</span>
        <span className="text-[var(--text-main)] font-semibold truncate max-w-xs">{course.title}</span>
      </nav>

      {/* HERO SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* LEFT 2 COLUMNS: Course details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-xs font-bold uppercase tracking-wider">
                {course.category}
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-semibold capitalize">
                {course.level.replace('_', ' ')}
              </span>
              {isApproved && (
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 size={13} /> Enrolled
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-[var(--text-main)] font-[var(--font-heading)] leading-tight">
              {course.title}
            </h1>

            <p className="text-base text-[var(--text-muted)] leading-relaxed">
              {course.description}
            </p>

            {/* STATS ROW */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2 text-xs sm:text-sm text-[var(--text-muted)]">
              <div className="flex items-center gap-1.5 text-amber-500 font-bold">
                <Star size={16} className="fill-amber-400 text-amber-400" />
                <span>{course.rating.toFixed(1)}</span>
                <span className="text-[var(--text-muted)] font-normal">(Rating)</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <Users size={16} className="text-indigo-500" />
                <span className="font-semibold text-[var(--text-main)]">{course.enrolled_count.toLocaleString()}</span>
                <span>Students Enrolled</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <Clock size={16} className="text-purple-500" />
                <span>{course.duration}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <BookOpen size={16} className="text-emerald-500" />
                <span>{course.sections?.length || 0} Modules</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <FileText size={16} className="text-pink-500" />
                <span>{totalResources} PDFs / Notes</span>
              </div>
            </div>

            {/* INSTRUCTOR CARD */}
            <div className="flex items-center gap-3 pt-4 border-t border-[var(--border)]">
              {course.instructor_avatar ? (
                <img
                  src={course.instructor_avatar}
                  alt={course.instructor_name}
                  className="w-12 h-12 rounded-full object-cover border border-[var(--border)] shadow-sm"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-sm flex items-center justify-center shadow-md">
                  {course.instructor_name.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-semibold block">Instructor</span>
                <h4 className="text-sm font-bold text-[var(--text-main)]">{course.instructor_name}</h4>
                <p className="text-xs text-[var(--text-muted)]">{course.instructor_title || 'Expert Computer Science & ICT Instructor'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sticky Purchase / Action Card */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-xl overflow-hidden">
            {/* THUMBNAIL WITH PREVIEW PLAY */}
            <div 
              className="relative aspect-video bg-gray-950 overflow-hidden cursor-pointer group"
              onClick={() => {
                if (firstPreviewLesson) setPreviewLesson(firstPreviewLesson);
              }}
            >
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2 group-hover:bg-black/30 transition-colors">
                <div className="w-14 h-14 rounded-full bg-white/90 text-indigo-600 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                  <Play size={24} className="ml-1 fill-current" />
                </div>
                <span className="text-xs font-bold text-white tracking-wide bg-black/60 px-3 py-1 rounded-full backdrop-blur-md">
                  Watch Preview Lecture
                </span>
              </div>
            </div>

            {/* CARD CONTENT */}
            <div className="p-6 space-y-6">
              {/* PRICE ROW */}
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-[var(--text-main)] font-[var(--font-heading)]">
                    {course.price ? `৳ ${course.price.toLocaleString()} BDT` : 'Free'}
                  </span>
                  {course.price && course.price > 0 && (
                    <>
                      <span className="text-sm text-[var(--text-muted)] line-through">
                        ৳ {(course.price * 2).toLocaleString()} BDT
                      </span>
                      <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        50% OFF
                      </span>
                    </>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                  <ShieldCheck size={14} className="text-emerald-500" /> One-time payment • Lifetime classroom access
                </p>
              </div>

              {/* ACTION CTA BUTTONS */}
              <div className="space-y-3">
                {isApproved ? (
                  <div className="space-y-2">
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 size={16} />
                      <span>You have full access to this course!</span>
                    </div>
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full shadow-lg shadow-indigo-500/25 font-bold"
                      onClick={() => navigate(`/courses/${course.id}/learn`)}
                      icon={<Play size={18} />}
                    >
                      Enter Classroom 🚀
                    </Button>
                  </div>
                ) : isPending ? (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-sm">
                        <Clock size={16} /> Enrollment Pending Approval
                      </div>
                      <p className="leading-relaxed">
                        Your payment of <strong>৳{enrollment?.amount}</strong> via <strong>{enrollment?.payment_method}</strong> (TrxID: <span className="font-mono">{enrollment?.transaction_id}</span>) is being verified by admin.
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="lg"
                      className="w-full text-xs font-semibold"
                      onClick={() => setIsEnrollModalOpen(true)}
                    >
                      Update / View Payment Details
                    </Button>
                  </div>
                ) : isRejected ? (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-sm">
                        <AlertCircle size={16} /> Enrollment Rejected
                      </div>
                      <p className="leading-relaxed">
                        Reason: {enrollment?.admin_notes || 'Transaction details could not be verified.'}
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full font-bold"
                      onClick={() => setIsEnrollModalOpen(true)}
                    >
                      Re-submit Payment Proof
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full shadow-xl shadow-indigo-500/25 font-bold text-base hover:scale-[1.02] transition-transform"
                    onClick={handleEnrollClick}
                    icon={<CreditCard size={18} />}
                  >
                    {user ? 'Enroll Now 🎓' : 'Enroll Now (Sign In) 🎓'}
                  </Button>
                )}

                {!user && (
                  <p className="text-[11px] text-center text-[var(--text-muted)]">
                    Public overview. Sign in or create an account to enroll.
                  </p>
                )}
              </div>

              {/* INCLUDED PERKS */}
              <div className="pt-4 border-t border-[var(--border)] space-y-2.5 text-xs text-[var(--text-muted)]">
                <p className="font-bold text-[var(--text-main)] text-xs uppercase tracking-wider">This course includes:</p>
                <div className="flex items-center gap-2">
                  <Play size={14} className="text-indigo-500 flex-shrink-0" />
                  <span>{totalLectures} on-demand video lectures</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-indigo-500 flex-shrink-0" />
                  <span>{totalResources} lecture notes & reference books</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-indigo-500 flex-shrink-0" />
                  <span>Full lifetime access</span>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap size={14} className="text-indigo-500 flex-shrink-0" />
                  <span>Certificate of completion</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-indigo-500 flex-shrink-0" />
                  <span>Direct instructor Q&A support</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SYLLABUS & CURRICULUM SECTION */}
      <div className="space-y-6 pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-main)] font-[var(--font-heading)]">
              Course Curriculum
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {course.sections?.length || 0} Modules • {totalLectures} Lectures • {course.duration} Total Length
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={expandAll}>
              Expand All
            </Button>
            <Button size="sm" variant="secondary" onClick={collapseAll}>
              Collapse All
            </Button>
          </div>
        </div>

        {/* ACCORDION MODULES */}
        <div className="space-y-4">
          {course.sections && course.sections.length > 0 ? (
            course.sections.map((section, sIdx) => {
              const isExpanded = expandedSections[section.id];
              const sectionLessons = section.lessons || [];
              const sectionPdfs = sectionLessons.reduce((acc, l) => acc + (l.resources?.length || 0), 0);

              return (
                <div
                  key={section.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden transition-all duration-200"
                >
                  {/* SECTION HEADER */}
                  <div
                    onClick={() => toggleSection(section.id)}
                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-[var(--surface-hover)] transition-colors select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 font-bold text-xs flex items-center justify-center">
                        {sIdx + 1}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[var(--text-main)]">
                          {section.title}
                        </h3>
                        <p className="text-xs text-[var(--text-muted)]">
                          {sectionLessons.length} Lectures {sectionPdfs > 0 && `• ${sectionPdfs} PDF Notes`}
                        </p>
                      </div>
                    </div>
                    <div className="text-[var(--text-muted)]">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>

                  {/* LECTURES LIST */}
                  {isExpanded && (
                    <div className="border-t border-[var(--border)] divide-y divide-[var(--border)] bg-[var(--surface)]/50">
                      {sectionLessons.map((lesson, lIdx) => {
                        const hasPdf = lesson.resources && lesson.resources.length > 0;
                        const canPreview = lesson.is_preview || (sIdx === 0 && lIdx === 0);

                        return (
                          <div
                            key={lesson.id}
                            className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-[var(--surface-hover)] transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="text-indigo-500 flex-shrink-0">
                                {isApproved ? (
                                  <Play size={16} />
                                ) : canPreview ? (
                                  <Play size={16} className="text-emerald-500" />
                                ) : (
                                  <Lock size={16} className="text-[var(--text-muted)]" />
                                )}
                              </div>
                              <span className="text-xs font-mono text-[var(--text-muted)]">
                                {sIdx + 1}.{lIdx + 1}
                              </span>
                              <span className="text-sm font-medium text-[var(--text-main)] truncate">
                                {lesson.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 flex-shrink-0">
                              {/* ATTACHED PDF BADGE */}
                              {hasPdf && (
                                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-pink-600 dark:text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-md border border-pink-500/20">
                                  <FileText size={12} />
                                  {lesson.resources!.length} Note{lesson.resources!.length > 1 ? 's' : ''}
                                </span>
                              )}

                              {/* FREE PREVIEW BUTTON */}
                              {canPreview && !isApproved && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewLesson(lesson)}
                                  className="text-xs font-bold text-emerald-500 hover:text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/20 flex items-center gap-1 transition-colors"
                                >
                                  <Play size={12} className="fill-current" /> Preview
                                </button>
                              )}

                              {/* CLASSROOM LINK IF ENROLLED */}
                              {isApproved && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => navigate(`/courses/${course.id}/learn`)}
                                  className="text-xs"
                                >
                                  Watch
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-sm text-[var(--text-muted)]">No curriculum sections listed yet.</p>
          )}
        </div>
      </div>

      {/* RESOURCES SHOWCASE */}
      {totalResources > 0 && (
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pink-500/10 text-pink-500 flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--text-main)] font-[var(--font-heading)]">
                {totalResources} Reference Books, Hand-Written Notes & MCQ Question Banks
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                {isAdmin ? 'Available for download and offline study.' : 'Read and revise online directly in your browser.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            {/* Show top preview resources */}
            {course.sections?.flatMap((s) => s.lessons).flatMap((l) => l.resources || []).slice(0, 6).map((res) => (
              <div
                key={res.id}
                className="p-3 rounded-2xl bg-[var(--surface-hover)] border border-[var(--border)] flex items-center gap-3 text-xs"
              >
                <FileText size={18} className="text-pink-500 flex-shrink-0" />
                <span className="font-medium text-[var(--text-main)] truncate flex-1">{res.title}</span>
                {isApproved ? (
                  isAdmin ? (
                    <a
                      href={res.file_url}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-[var(--surface)] hover:text-indigo-500 text-[var(--text-muted)] border border-[var(--border)] transition-colors"
                      title="Download Note (Admin Only)"
                    >
                      <Download size={14} />
                    </a>
                  ) : (
                    <a
                      href={res.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-[var(--surface)] hover:text-indigo-500 text-[var(--text-muted)] border border-[var(--border)] transition-colors"
                      title="Read Online in Browser"
                    >
                      <Eye size={14} />
                    </a>
                  )
                ) : (
                  <span title="Enroll to unlock">
                    <Lock size={14} className="text-[var(--text-muted)]" />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FREQUENTLY ASKED QUESTIONS */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 space-y-4">
        <h3 className="text-lg font-bold text-[var(--text-main)] font-[var(--font-heading)] flex items-center gap-2">
          <HelpCircle size={20} className="text-indigo-500" /> Frequently Asked Questions
        </h3>
        
        <div className="space-y-3 text-xs sm:text-sm">
          <div className="p-4 rounded-2xl bg-[var(--surface-hover)] border border-[var(--border)] space-y-1">
            <h4 className="font-bold text-[var(--text-main)]">How does manual enrollment work?</h4>
            <p className="text-[var(--text-muted)] leading-relaxed">
              Send the course fee via bKash, Nagad, Rocket, or Bank transfer to our official account. Submit your sender number and Transaction ID (TrxID) in the enrollment form. Our administrator verifies the transaction and activates your classroom access immediately.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--surface-hover)] border border-[var(--border)] space-y-1">
            <h4 className="font-bold text-[var(--text-main)]">How long does approval take?</h4>
            <p className="text-[var(--text-muted)] leading-relaxed">
              Enrollments are reviewed manually around the clock. Approvals typically take between 15 minutes to 1 hour.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--surface-hover)] border border-[var(--border)] space-y-1">
            <h4 className="font-bold text-[var(--text-main)]">Can I watch videos offline or stream them fast?</h4>
            <p className="text-[var(--text-muted)] leading-relaxed">
              All 45 lectures are hosted locally with high-performance HTTP 206 range-seeking streaming, allowing instant scrubbing and buffering without lag.
            </p>
          </div>
        </div>
      </div>

      {/* ENROLLMENT MODAL */}
      <EnrollmentModal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        course={course}
        onSuccess={(newEnrollment) => {
          setEnrollment(newEnrollment);
        }}
      />

      {/* PREVIEW VIDEO MODAL */}
      {previewLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-4xl bg-[var(--surface)] border border-[var(--border)] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Free Preview Lecture</span>
                <h3 className="text-base font-bold text-[var(--text-main)] line-clamp-1">{previewLesson.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewLesson(null)}
                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-full hover:bg-[var(--surface-hover)]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="aspect-video w-full bg-black">
              {previewLesson.video_url ? (
                <video
                  src={previewLesson.video_url}
                  controls
                  controlsList="nodownload"
                  onContextMenu={(e) => e.preventDefault()}
                  autoPlay
                  className="w-full h-full object-contain"
                />
              ) : previewLesson.youtube_video_url ? (
                <iframe
                  src={getYouTubeEmbedUrl({
                    videoId: previewLesson.youtube_video_id || extractVideoId(previewLesson.youtube_video_url),
                    autoplay: true,
                  })}
                  title={previewLesson.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="flex items-center justify-center h-full text-white text-sm">
                  Video preview not available.
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[var(--border)] flex items-center justify-between bg-[var(--surface)]">
              <span className="text-xs text-[var(--text-muted)]">
                Enjoyed the preview? Enroll to unlock all 45 lectures & notes.
              </span>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setPreviewLesson(null);
                  handleEnrollClick();
                }}
              >
                Enroll Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
