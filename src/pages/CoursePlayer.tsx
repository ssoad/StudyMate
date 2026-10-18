import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Circle, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  FileText, 
  BookOpen, 
  Download, 
  Upload, 
  Plus, 
  MessageSquare, 
  Layers, 
  Sparkles, 
  Loader2,
  Clock,
  Send
} from 'lucide-react';
import { YoutubeIcon } from '../components/YoutubeIcon';
import { Button } from '../components/Button';
import { VideoTranscript } from '../components/VideoTranscript';
import { dataService, type Course, type CourseLesson, type UserCourseProgress, type CourseResource } from '../lib/dataService';
import { getYouTubeEmbedUrl, formatDuration } from '../lib/youtube';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';

export function CoursePlayer() {
  const { id: courseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuthStore();
  const { addToast } = useToastStore();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentLesson, setCurrentLesson] = useState<CourseLesson | null>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [progress, setProgress] = useState<UserCourseProgress | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Tabbed sub-player drawer
  const [activeTab, setActiveTab] = useState<'resources' | 'transcript' | 'notes' | 'overview' | 'qa'>('resources');

  // Video playback time & seeking
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [showSideTranscript, setShowSideTranscript] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Notes state
  const [lessonNote, setLessonNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSavedTime, setNoteSavedTime] = useState<string | null>(null);

  // Q&A state
  const [qaList, setQaList] = useState<Array<{ id: string; author: string; text: string; time: string }>>([
    {
      id: 'qa-1',
      author: 'Alex M.',
      text: 'What is the best way to structure folder layout for large modular projects?',
      time: '2 hours ago',
    },
    {
      id: 'qa-2',
      author: 'Instructor Sarah',
      text: 'Great question! Check the attached PDF Architecture Guide in the Resources tab for our recommended domain-driven layout.',
      time: '1 hour ago',
    },
  ]);
  const [newQuestion, setNewQuestion] = useState('');

  // Resource Upload modal for this course
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadType, setUploadType] = useState<'pdf' | 'book' | 'document' | 'link' | 'code'>('book');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadUrl, setUploadUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Load Course and Progress
  useEffect(() => {
    if (!courseId) return;
    loadCourseData(courseId);
  }, [courseId, user]);

  const loadCourseData = async (cId: string) => {
    setLoading(true);
    const data = await dataService.getCourseById(cId);
    if (!data) {
      addToast('Course not found.', 'error');
      navigate('/courses');
      return;
    }

    // Verify enrollment permissions (admin, free course, or approved enrollment)
    const isAdmin =
      role === 'admin' ||
      user?.email === 'admin@studymate.org' ||
      user?.email === 'admin@studymate.local' ||
      (user as any)?.app_metadata?.role === 'admin';

    if (!user) {
      addToast('Please sign in to access the classroom.', 'info');
      navigate(`/courses/${cId}`);
      return;
    }

    if (!isAdmin && data.price && data.price > 0) {
      const enrollment = await dataService.getCourseEnrollment(cId, user.id);
      if (!enrollment || enrollment.status !== 'approved') {
        addToast('You must have an approved enrollment to access the course classroom.', 'error');
        navigate(`/courses/${cId}`);
        return;
      }
    }

    // Load progress
    let userProg: UserCourseProgress | null = null;
    userProg = await dataService.getUserCourseProgress(user.id, cId);
    setProgress(userProg);

    // Determine initial lesson
    let initialLesson: CourseLesson | null = null;
    let initialSecIdx = 0;

    if (data.sections && data.sections.length > 0) {
      if (userProg?.last_lesson_id) {
        // Find last active lesson
        data.sections.forEach((sec, sIdx) => {
          const match = sec.lessons.find((l) => l.id === userProg?.last_lesson_id);
          if (match) {
            initialLesson = match;
            initialSecIdx = sIdx;
          }
        });
      }

      if (!initialLesson && data.sections[0].lessons.length > 0) {
        initialLesson = data.sections[0].lessons[0];
      }
    }

    setCourse(data);
    setCurrentLesson(initialLesson);
    setCurrentSectionIndex(initialSecIdx);
    setLoading(false);
  };

  // Load Note whenever currentLesson changes
  useEffect(() => {
    if (!user || !currentLesson) return;
    dataService.getLessonNote(user.id, currentLesson.id).then((text) => {
      setLessonNote(text);
      setNoteSavedTime(text ? 'Saved' : null);
    });
  }, [currentLesson, user]);

  // Synchronize playback time from YouTube iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        if (typeof e.data === 'string') {
          const data = JSON.parse(e.data);
          if (data.event === 'infoDelivery' && data.info && data.info.currentTime !== undefined) {
            setCurrentVideoTime(data.info.currentTime);
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleMessage);
    const interval = setInterval(() => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'getCurrentTime' }),
          '*'
        );
      }
    }, 1000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(interval);
    };
  }, []);

  const handleSeekVideo = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => {});
    } else if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'seekTo', args: [seconds, true] }),
        '*'
      );
    }
    setCurrentVideoTime(seconds);
  };

  // Handle Note Save
  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLessonNote(val);
    setNoteSaving(true);
    setNoteSavedTime('Saving...');

    if (user && currentLesson) {
      dataService.saveLessonNote(user.id, currentLesson.id, val).then(() => {
        setNoteSaving(false);
        setNoteSavedTime('All changes saved');
      });
    }
  };

  // Toggle Lesson Completion
  const handleToggleComplete = async (lessonId: string) => {
    if (!user || !course) {
      addToast('Please sign in to track your course progress.', 'info');
      return;
    }

    const updated = await dataService.toggleLessonProgress(user.id, course.id, lessonId);
    setProgress(updated);

    const isNowDone = updated.completed_lessons.includes(lessonId);
    if (isNowDone) {
      addToast('Lesson marked as completed! (+15 Points)', 'success');
    }
  };

  // Navigate to Next Lesson
  const handleNextLesson = () => {
    if (!course || !currentLesson) return;

    let allLessons: { lesson: CourseLesson; sectionIndex: number }[] = [];
    course.sections?.forEach((sec, sIdx) => {
      sec.lessons.forEach((l) => allLessons.push({ lesson: l, sectionIndex: sIdx }));
    });

    const currentIndex = allLessons.findIndex((item) => item.lesson.id === currentLesson.id);
    if (currentIndex !== -1 && currentIndex < allLessons.length - 1) {
      const next = allLessons[currentIndex + 1];
      setCurrentLesson(next.lesson);
      setCurrentSectionIndex(next.sectionIndex);
    } else {
      addToast('Congratulations! You have reached the end of the course curriculum.', 'success');
    }
  };

  // Navigate to Previous Lesson
  const handlePrevLesson = () => {
    if (!course || !currentLesson) return;

    let allLessons: { lesson: CourseLesson; sectionIndex: number }[] = [];
    course.sections?.forEach((sec, sIdx) => {
      sec.lessons.forEach((l) => allLessons.push({ lesson: l, sectionIndex: sIdx }));
    });

    const currentIndex = allLessons.findIndex((item) => item.lesson.id === currentLesson.id);
    if (currentIndex > 0) {
      const prev = allLessons[currentIndex - 1];
      setCurrentLesson(prev.lesson);
      setCurrentSectionIndex(prev.sectionIndex);
    }
  };

  // Submit Q&A
  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    const newQa = {
      id: `qa-${Date.now()}`,
      author: user?.email?.split('@')[0] || 'You',
      text: newQuestion.trim(),
      time: 'Just now',
    };

    setQaList([newQa, ...qaList]);
    setNewQuestion('');
    addToast('Question posted to lecture Q&A!', 'success');
  };

  // Upload Resource for this course/lesson
  const handleUploadResource = async () => {
    if (!uploadTitle.trim() || (!uploadFile && !uploadUrl.trim())) {
      addToast('Please provide a title and select a file or enter a link.', 'info');
      return;
    }

    setIsUploading(true);
    let finalUrl = uploadUrl.trim();
    let size = '1.0 MB';

    if (uploadFile) {
      size = `${(uploadFile.size / (1024 * 1024)).toFixed(1)} MB`;
      const { url, error } = await dataService.uploadCourseResourceFile(uploadFile);
      if (error || !url) {
        finalUrl = URL.createObjectURL(uploadFile);
      } else {
        finalUrl = url;
      }
    }

    const { data: newRes } = await dataService.addCourseResource({
      course_id: course!.id,
      lesson_id: currentLesson?.id || null,
      title: uploadTitle.trim(),
      resource_type: uploadType,
      file_url: finalUrl,
      file_size: size,
      uploader_id: user?.id,
    });

    if (newRes && course) {
      setCourse({
        ...course,
        resources: [...(course.resources || []), newRes],
      });
      addToast('Resource uploaded and attached successfully!', 'success');
    }

    setIsUploading(false);
    setUploadModalOpen(false);
    setUploadTitle('');
    setUploadFile(null);
    setUploadUrl('');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
        <Loader2 size={40} className="animate-spin text-[var(--primary)]" />
        <p className="text-sm text-[var(--text-muted)]">Loading classroom experience...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
        <h3 className="text-lg font-bold text-[var(--text-main)]">Course Not Found</h3>
        <p className="text-sm text-[var(--text-muted)]">This course could not be loaded or you do not have permission.</p>
        <Button variant="primary" onClick={() => navigate('/courses')}>
          Return to Courses
        </Button>
      </div>
    );
  }

  // Flattened total lectures
  const allLessons = course.sections?.flatMap((s) => s.lessons) || [];
  const totalLecturesCount = allLessons.length;
  const completedCount = progress?.completed_lessons?.length || 0;
  const progressPercent = totalLecturesCount > 0 ? Math.min(100, Math.round((completedCount / totalLecturesCount) * 100)) : 0;
  const isCurrentLessonDone = currentLesson ? progress?.completed_lessons?.includes(currentLesson.id) : false;

  // Attached resources (combines course-level resources and current lesson-level resources)
  const currentResources: CourseResource[] = [
    ...(course.resources || []),
    ...(currentLesson?.resources || []),
  ];

  // Video playback source: check for local or direct MP4/WebM video stream
  const directVideoUrl =
    currentLesson?.video_url ||
    (currentLesson?.youtube_video_url &&
    (currentLesson.youtube_video_url.endsWith('.mp4') ||
      currentLesson.youtube_video_url.includes('/api/storage/files/'))
      ? currentLesson.youtube_video_url
      : null);

  // YouTube embed URL fallback
  const embedUrl = !directVideoUrl && currentLesson?.youtube_video_id
    ? getYouTubeEmbedUrl({ videoId: currentLesson.youtube_video_id, playlistId: course.youtube_playlist_id })
    : !directVideoUrl && course.youtube_playlist_id
    ? getYouTubeEmbedUrl({ playlistId: course.youtube_playlist_id })
    : null;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--background)] animate-fade-in -mx-4 -mt-6 sm:-mx-8 sm:-mt-8">
      {/* TOP UDEMY-STYLE CLASSROOM HEADER */}
      <header className="sticky top-0 z-40 bg-[var(--surface)] border-b border-[var(--border)] px-4 py-3 flex items-center justify-between gap-4 shadow-sm backdrop-blur-md bg-opacity-90">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3 overflow-hidden">
          <button
            onClick={() => navigate(`/courses/${course.id}`)}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] transition-colors shrink-0"
            title="Back to Course Overview"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-[var(--text-main)] truncate max-w-md">
              {course.title}
            </h1>
            <p className="text-xs text-[var(--text-muted)] truncate flex items-center gap-1.5">
              <span>{course.instructor_name}</span>
              <span>•</span>
              <span className="text-[var(--primary)] font-medium">
                {currentLesson?.title || 'Lecture'}
              </span>
            </p>
          </div>
        </div>

        {/* Center / Right: Progress & Controls */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          {/* Progress Indicator */}
          <div className="hidden md:flex items-center gap-3 bg-[var(--surface-hover)] px-3 py-1.5 rounded-xl border border-[var(--border)]">
            <div className="w-24 h-2 rounded-full bg-[var(--border)] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-[var(--text-main)]">
              {progressPercent}%
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">
              ({completedCount}/{totalLecturesCount})
            </span>
          </div>

          {/* Prev / Next buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevLesson}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] border border-[var(--border)] transition-colors"
              title="Previous Lesson"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={handleNextLesson}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] border border-[var(--border)] transition-colors"
              title="Next Lesson"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Toggle Sidebar */}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            icon={<Layers size={16} />}
            className="hidden sm:inline-flex"
          >
            {sidebarOpen ? 'Hide Curriculum' : 'Show Curriculum'}
          </Button>
        </div>
      </header>

      {/* CLASSROOM PLAYER BODY (STAGE + SIDEBAR) */}
      <div className="flex-1 flex flex-col lg:flex-row min-w-0">
        {/* MAIN VIDEO & CONTENT STAGE */}
        <main className="flex-1 flex flex-col min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">
          {/* VIDEO & TRANSCRIPT STAGE CONTAINER */}
          <div className={showSideTranscript && currentLesson ? "grid grid-cols-1 lg:grid-cols-3 gap-6 items-start" : ""}>
            <div className={showSideTranscript && currentLesson ? "lg:col-span-2 space-y-4" : "w-full space-y-4"}>
              <div className="relative rounded-2xl overflow-hidden border border-[var(--border)] bg-black shadow-2xl aspect-video w-full max-h-[72vh] flex items-center justify-center">
                {directVideoUrl ? (
                  <video
                    ref={videoRef}
                    key={directVideoUrl}
                    src={directVideoUrl}
                    controls
                    autoPlay
                    playsInline
                    onTimeUpdate={(e) => setCurrentVideoTime(e.currentTarget.currentTime)}
                    className="w-full h-full object-contain"
                  >
                    Your browser does not support HTML5 video streaming.
                  </video>
                ) : embedUrl ? (
                  <iframe
                    ref={iframeRef}
                    src={embedUrl}
                    title={currentLesson?.title || course.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  <div className="text-center p-8 text-gray-400 space-y-3">
                    <YoutubeIcon size={48} className="mx-auto text-red-500 opacity-80" />
                    <h3 className="text-base font-bold text-white">No Video Configured for This Lecture</h3>
                    <p className="text-xs max-w-sm mx-auto text-gray-400">
                      You can set a YouTube playlist URL or local video in the course curriculum editor.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Side-by-side Live Transcript */}
            {showSideTranscript && currentLesson && (
              <div className="lg:col-span-1 h-[420px] lg:h-[480px] animate-fade-in">
                <VideoTranscript
                  lesson={currentLesson}
                  currentTime={currentVideoTime}
                  onSeek={handleSeekVideo}
                  isAdmin={role === 'admin'}
                  isSidePanel
                  onCloseSidePanel={() => setShowSideTranscript(false)}
                  onTranscriptUpdated={(newTr) => {
                    setCurrentLesson({ ...currentLesson, transcript: newTr });
                    if (course?.sections) {
                      const updatedSections = course.sections.map((s) => ({
                        ...s,
                        lessons: s.lessons.map((l) => (l.id === currentLesson.id ? { ...l, transcript: newTr } : l)),
                      }));
                      setCourse({ ...course, sections: updatedSections });
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* LECTURE HEADER & QUICK ACTION BAR */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wider">
                Module {currentSectionIndex + 1}: {course.sections?.[currentSectionIndex]?.title || 'Fundamentals'}
              </span>
              <h2 className="text-xl font-bold text-[var(--text-main)]">
                {currentLesson?.title || 'Select a Lecture to Begin'}
              </h2>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {currentLesson && (
                <Button
                  variant={showSideTranscript ? 'primary' : 'secondary'}
                  onClick={() => setShowSideTranscript(!showSideTranscript)}
                  icon={<FileText size={16} />}
                  className="hidden md:inline-flex"
                >
                  {showSideTranscript ? 'Hide Transcript Panel' : 'Side Transcript'}
                </Button>
              )}

              {currentLesson && (
                <Button
                  variant={isCurrentLessonDone ? 'secondary' : 'primary'}
                  onClick={() => handleToggleComplete(currentLesson.id)}
                  icon={<CheckCircle2 size={18} className={isCurrentLessonDone ? 'text-emerald-500' : ''} />}
                  className="w-full sm:w-auto justify-center"
                >
                  {isCurrentLessonDone ? 'Completed' : 'Mark as Complete'}
                </Button>
              )}

              <Button
                variant="secondary"
                onClick={handleNextLesson}
                icon={<ChevronRight size={18} />}
                className="hidden sm:inline-flex"
              >
                Next Lecture
              </Button>
            </div>
          </div>

          {/* UDEMY-STYLE TABBED PANELS UNDER PLAYER */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
            {/* Tabs */}
            <div className="flex items-center border-b border-[var(--border)] bg-[var(--surface-hover)] px-4 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveTab('resources')}
                className={`py-3.5 px-4 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'resources'
                    ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--surface)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <BookOpen size={16} />
                <span>Books & PDFs ({currentResources.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('transcript')}
                className={`py-3.5 px-4 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'transcript'
                    ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--surface)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <FileText size={16} />
                <span>Interactive Transcript</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                className={`py-3.5 px-4 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'notes'
                    ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--surface)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <FileText size={16} />
                <span>My Notes</span>
                {noteSavedTime && (
                  <span className="text-[10px] font-mono opacity-60">({noteSavedTime})</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`py-3.5 px-4 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--surface)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <Sparkles size={16} />
                <span>Course Overview</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('qa')}
                className={`py-3.5 px-4 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'qa'
                    ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--surface)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <MessageSquare size={16} />
                <span>Q&A ({qaList.length})</span>
              </button>
            </div>

            {/* TAB CONTENT */}
            <div className="p-6">
              {/* TAB 1: RESOURCES & BOOKS */}
              {activeTab === 'resources' && (
                <div className="space-y-5 animate-fade-in">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-[var(--text-main)]">
                        Course Textbooks, PDFs & Study Materials
                      </h3>
                      <p className="text-xs text-[var(--text-muted)]">
                        Download lecture notes, reference textbooks, cheatsheets, and slides prepared for this course.
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setUploadModalOpen(true)}
                      icon={<Plus size={16} />}
                    >
                      Attach Resource
                    </Button>
                  </div>

                  {currentResources.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-[var(--border)] rounded-xl space-y-2">
                      <BookOpen size={36} className="mx-auto text-[var(--text-muted)] opacity-50" />
                      <p className="text-sm font-medium text-[var(--text-main)]">No resources attached yet.</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        Upload a textbook PDF or cheat sheet using the button above.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentResources.map((res) => (
                        <div
                          key={res.id}
                          className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] hover:border-[var(--primary)] transition-all flex items-start justify-between gap-4 group"
                        >
                          <div className="flex items-start gap-3 overflow-hidden">
                            <div className="p-2.5 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] shrink-0 mt-0.5">
                              {res.resource_type === 'book' ? <BookOpen size={20} /> : <FileText size={20} />}
                            </div>
                            <div className="overflow-hidden space-y-1">
                              <span className="text-sm font-bold text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors block truncate">
                                {res.title}
                              </span>
                              {res.description && (
                                <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                                  {res.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 pt-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]">
                                  {res.resource_type}
                                </span>
                                <span className="text-xs font-mono text-[var(--text-muted)]">
                                  {res.file_size || 'Downloadable'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <a
                            href={res.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary text-xs px-3 py-2 shrink-0 flex items-center gap-1.5 shadow-sm"
                            title="Download / View"
                          >
                            <Download size={14} />
                            <span>Download</span>
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: INTERACTIVE TRANSCRIPT */}
              {activeTab === 'transcript' && currentLesson && (
                <div className="animate-fade-in">
                  <VideoTranscript
                    lesson={currentLesson}
                    currentTime={currentVideoTime}
                    onSeek={handleSeekVideo}
                    isAdmin={role === 'admin'}
                    onTranscriptUpdated={(newTr) => {
                      setCurrentLesson({ ...currentLesson, transcript: newTr });
                      if (course?.sections) {
                        const updatedSections = course.sections.map((s) => ({
                          ...s,
                          lessons: s.lessons.map((l) => (l.id === currentLesson.id ? { ...l, transcript: newTr } : l)),
                        }));
                        setCourse({ ...course, sections: updatedSections });
                      }
                    }}
                  />
                </div>
              )}

              {/* TAB 2: MY NOTES */}
              {activeTab === 'notes' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-[var(--text-main)]">Personal Lecture Notes</h3>
                      <p className="text-xs text-[var(--text-muted)]">
                        Your notes automatically save as you type and stay synced to this lecture.
                      </p>
                    </div>
                    {noteSaving && (
                      <span className="text-xs font-mono text-[var(--primary)] flex items-center gap-1">
                        <Loader2 size={12} className="animate-spin" />
                        Saving...
                      </span>
                    )}
                  </div>

                  <textarea
                    rows={8}
                    value={lessonNote}
                    onChange={handleNoteChange}
                    placeholder="Capture key concepts, questions, code snippets, or thoughts from this lecture..."
                    className="input font-mono text-sm leading-relaxed p-4 resize-y w-full"
                  />
                </div>
              )}

              {/* TAB 3: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-[var(--text-main)]">About This Course</h3>
                    <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                      {course.description}
                    </p>
                  </div>

                  {/* Instructor Bio */}
                  <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] flex items-center gap-4">
                    {course.instructor_avatar ? (
                      <img
                        src={course.instructor_avatar}
                        alt={course.instructor_name}
                        className="w-14 h-14 rounded-full object-cover border-2 border-[var(--primary)] shadow-md"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-[var(--primary)] text-white text-lg font-bold flex items-center justify-center">
                        {course.instructor_name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-base text-[var(--text-main)]">{course.instructor_name}</h4>
                      <p className="text-xs text-[var(--text-muted)]">{course.instructor_title || 'Lead Educator'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Q&A */}
              {activeTab === 'qa' && (
                <div className="space-y-6 animate-fade-in">
                  {/* Post Question */}
                  <form onSubmit={handleAddQuestion} className="space-y-3">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Ask a Question About This Lecture
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        placeholder="Have a doubt or need clarification? Ask here..."
                        className="input text-sm flex-1"
                      />
                      <Button type="submit" icon={<Send size={16} />}>
                        Ask
                      </Button>
                    </div>
                  </form>

                  {/* Q&A Thread */}
                  <div className="space-y-3 divide-y divide-[var(--border)]">
                    {qaList.map((item) => (
                      <div key={item.id} className="pt-3 first:pt-0 space-y-1">
                        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                          <span className="font-semibold text-[var(--text-main)]">{item.author}</span>
                          <span>{item.time}</span>
                        </div>
                        <p className="text-sm text-[var(--text-main)]">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* RIGHT CURRICULUM ACCORDION SIDEBAR */}
        {sidebarOpen && (
          <aside className="w-full lg:w-96 border-l border-[var(--border)] bg-[var(--surface)] flex flex-col shrink-0 h-auto lg:h-[calc(100vh-60px)] lg:sticky lg:top-[60px]">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-hover)]">
              <div>
                <h3 className="font-bold text-sm text-[var(--text-main)]">Course Curriculum</h3>
                <p className="text-xs text-[var(--text-muted)]">
                  {completedCount} / {totalLecturesCount} completed • {course.duration}
                </p>
              </div>
            </div>

            {/* Sections Accordion */}
            <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
              {course.sections?.map((section, sIdx) => {
                const isCollapsed = collapsedSections[section.id] || false;
                const sectionCompletedCount = section.lessons.filter((l) =>
                  progress?.completed_lessons?.includes(l.id)
                ).length;

                return (
                  <div key={section.id} className="bg-[var(--surface)]">
                    {/* Section Header */}
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsedSections({
                          ...collapsedSections,
                          [section.id]: !isCollapsed,
                        })
                      }
                      className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      <div className="space-y-0.5 overflow-hidden">
                        <h4 className="text-xs font-bold text-[var(--text-main)] truncate">
                          Module {sIdx + 1}: {section.title}
                        </h4>
                        <span className="text-[11px] text-[var(--text-muted)]">
                          {sectionCompletedCount}/{section.lessons.length} lectures completed
                        </span>
                      </div>
                      <ChevronDown
                        size={16}
                        className={`text-[var(--text-muted)] transform transition-transform ${
                          isCollapsed ? '-rotate-90' : ''
                        }`}
                      />
                    </button>

                    {/* Lessons list */}
                    {!isCollapsed && (
                      <div className="divide-y divide-[var(--border)] bg-[var(--surface)]">
                        {section.lessons.map((lesson) => {
                          const isCurrent = currentLesson?.id === lesson.id;
                          const isDone = progress?.completed_lessons?.includes(lesson.id);
                          const hasLessonResources = (lesson.resources?.length || 0) > 0;

                          return (
                            <div
                              key={lesson.id}
                              onClick={() => {
                                setCurrentLesson(lesson);
                                setCurrentSectionIndex(sIdx);
                              }}
                              className={`p-3.5 pl-4 cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                                isCurrent
                                  ? 'bg-[var(--primary)]/10 border-l-4 border-[var(--primary)] text-[var(--primary)]'
                                  : 'hover:bg-[var(--surface-hover)] text-[var(--text-main)]'
                              }`}
                            >
                              <div className="flex items-center gap-3 overflow-hidden flex-1">
                                {/* Completion Checkbox */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleComplete(lesson.id);
                                  }}
                                  className="text-[var(--text-muted)] hover:text-emerald-500 transition-colors shrink-0"
                                >
                                  {isDone ? (
                                    <CheckCircle2 size={18} className="text-emerald-500 fill-emerald-500/10" />
                                  ) : (
                                    <Circle size={18} />
                                  )}
                                </button>

                                <div className="overflow-hidden space-y-0.5">
                                  <span
                                    className={`text-xs block truncate ${
                                      isCurrent ? 'font-bold text-[var(--primary)]' : 'font-medium'
                                    }`}
                                  >
                                    {lesson.title}
                                  </span>
                                  <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                                    <span className="flex items-center gap-1">
                                      <Clock size={10} />
                                      {formatDuration(lesson.duration_seconds)}
                                    </span>
                                    {hasLessonResources && (
                                      <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                                        <BookOpen size={10} />
                                        Resource
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {isCurrent && (
                                <span className="w-2 h-2 rounded-full bg-[var(--primary)] shrink-0 animate-ping" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>
        )}
      </div>

      {/* QUICK RESOURCE UPLOAD MODAL */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-[var(--text-main)]">Attach PDF or Book Resource</h3>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Resource Title
              </label>
              <input
                type="text"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="e.g. Lecture Notes PDF / Textbook"
                className="input text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Resource Type
              </label>
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value as any)}
                className="input text-sm"
              >
                <option value="book">📕 Book / E-Book</option>
                <option value="pdf">📄 PDF Notes</option>
                <option value="document">📑 Document / Slides</option>
                <option value="code">💻 Source Code</option>
                <option value="link">🔗 External Link</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Upload File (PDF / Book)
              </label>
              <input
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="input text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Or External Link URL
              </label>
              <input
                type="url"
                value={uploadUrl}
                onChange={(e) => setUploadUrl(e.target.value)}
                placeholder="https://..."
                className="input text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <Button variant="ghost" onClick={() => setUploadModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleUploadResource}
                disabled={isUploading}
                icon={isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              >
                {isUploading ? 'Uploading...' : 'Save & Attach'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
