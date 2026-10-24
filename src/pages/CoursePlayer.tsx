import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Circle, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp,
  FileText, 
  BookOpen, 
  Download, 
  Upload, 
  Plus, 
  MessageSquare, 
  Sparkles, 
  Loader2,
  Clock,
  Send,
  Eye,
  PanelRightClose,
  PanelRightOpen,
  Share2,
  Check,
  X,
  Search,
  Code2,
  ExternalLink,
  FolderOpen,
  Edit3,
  Trash2
} from 'lucide-react';
import { YoutubeIcon } from '../components/YoutubeIcon';
import { Button } from '../components/Button';
import { VideoTranscript } from '../components/VideoTranscript';
import { dataService, type Course, type CourseSection, type CourseLesson, type UserCourseProgress, type CourseResource } from '../lib/dataService';
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
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const isAdmin =
    role === 'admin' ||
    user?.email === 'admin@studymate.org' ||
    user?.email === 'admin@studymate.local' ||
    (user as any)?.app_metadata?.role === 'admin';

  // URL searchParams synchronization
  const [searchParams, setSearchParams] = useSearchParams();
  const [copiedLessonLink, setCopiedLessonLink] = useState(false);

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
  const [uploadTargetLessonId, setUploadTargetLessonId] = useState<string>('');

  // Modular Udemy-Style Resources State
  const [resourceFilter, setResourceFilter] = useState<string>('all'); // 'all' | 'current' | 'course_wide' | sectionId
  const [resourceSearch, setResourceSearch] = useState<string>('');
  const [expandedResourceSections, setExpandedResourceSections] = useState<Record<string, boolean>>({});
  const [expandedLessonResources, setExpandedLessonResources] = useState<Record<string, boolean>>({});
  const [expandedSectionEndResources, setExpandedSectionEndResources] = useState<Record<string, boolean>>({});
  const [readingResource, setReadingResource] = useState<CourseResource | null>(null);

  // Rename & Move Resource State
  const [editingResource, setEditingResource] = useState<CourseResource | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editType, setEditType] = useState<CourseResource['resource_type']>('pdf');
  const [editTarget, setEditTarget] = useState<string>('course:general');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Helper to extract clean file name for display
  const getDisplayFileName = (resource: CourseResource): string => {
    if (/\.[a-z0-9]{2,5}$/i.test(resource.title.trim())) {
      return resource.title.trim();
    }
    try {
      const urlObj = new URL(resource.file_url, window.location.origin);
      const lastSeg = urlObj.pathname.split('/').pop();
      if (lastSeg && /\.[a-z0-9]{2,5}$/i.test(lastSeg) && !lastSeg.startsWith('blob:')) {
        return decodeURIComponent(lastSeg);
      }
    } catch {}
    const ext =
      resource.resource_type === 'pdf' ? '.pdf' :
      resource.resource_type === 'book' ? '.pdf' :
      resource.resource_type === 'code' ? '.zip' :
      resource.resource_type === 'link' ? '' : '.pdf';
    const sanitized = resource.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `${sanitized}${ext}`;
  };

  const toggleLessonResources = (lessonId: string) => {
    setExpandedLessonResources((prev) => ({
      ...prev,
      [lessonId]: !prev[lessonId],
    }));
  };

  const toggleSectionEndResources = (sectionId: string) => {
    setExpandedSectionEndResources((prev) => ({
      ...prev,
      [sectionId]: prev[sectionId] === undefined ? false : !prev[sectionId],
    }));
  };

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

    // Determine initial lesson from searchParams, userProg, or first lesson
    let initialLesson: CourseLesson | null = null;
    let initialSecIdx = 0;
    const requestedLessonId = searchParams.get('lesson');
    const requestedTab = searchParams.get('tab') as any;

    if (requestedTab && ['resources', 'transcript', 'notes', 'overview', 'qa'].includes(requestedTab)) {
      setActiveTab(requestedTab);
    }

    if (data.sections && data.sections.length > 0) {
      // 1. Try URL requested lesson
      if (requestedLessonId) {
        data.sections.forEach((sec, sIdx) => {
          const match = sec.lessons.find((l) => l.id === requestedLessonId);
          if (match) {
            initialLesson = match;
            initialSecIdx = sIdx;
          }
        });
      }

      // 2. Try last active lesson from progress
      if (!initialLesson && userProg?.last_lesson_id) {
        data.sections.forEach((sec, sIdx) => {
          const match = sec.lessons.find((l) => l.id === userProg?.last_lesson_id);
          if (match) {
            initialLesson = match;
            initialSecIdx = sIdx;
          }
        });
      }

      // 3. Fallback to first lesson
      if (!initialLesson && data.sections[0].lessons.length > 0) {
        initialLesson = data.sections[0].lessons[0];
      }
    }

    // Auto-expand all modular resource sections by default
    const initialResExp: Record<string, boolean> = { course_wide: true };
    data.sections?.forEach((s) => {
      initialResExp[s.id] = true;
    });
    setExpandedResourceSections(initialResExp);

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

  // Lesson & Tab selection handlers that sync with URL
  const handleSelectLesson = (lesson: CourseLesson, sIdx: number) => {
    setCurrentLesson(lesson);
    setCurrentSectionIndex(sIdx);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('lesson', lesson.id);
        return next;
      },
      { replace: true }
    );
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const handleSelectTab = (tab: 'resources' | 'transcript' | 'notes' | 'overview' | 'qa') => {
    setActiveTab(tab);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tab);
        return next;
      },
      { replace: true }
    );
  };

  const handleCopyLessonLink = () => {
    try {
      const url = new URL(window.location.href);
      if (currentLesson) url.searchParams.set('lesson', currentLesson.id);
      url.searchParams.set('tab', activeTab);
      navigator.clipboard.writeText(url.toString());
      setCopiedLessonLink(true);
      addToast('Lesson link copied to clipboard!', 'success');
      setTimeout(() => setCopiedLessonLink(false), 2000);
    } catch {
      addToast('Failed to copy lesson link.', 'error');
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
      handleSelectLesson(next.lesson, next.sectionIndex);
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
      handleSelectLesson(prev.lesson, prev.sectionIndex);
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

    let targetSectionId: string | null = null;
    let targetLessonId: string | null = null;

    if (uploadTargetLessonId.startsWith('section:')) {
      targetSectionId = uploadTargetLessonId.replace('section:', '');
    } else if (uploadTargetLessonId.startsWith('lesson:')) {
      targetLessonId = uploadTargetLessonId.replace('lesson:', '');
    } else if (uploadTargetLessonId.trim()) {
      targetLessonId = uploadTargetLessonId.trim();
    }

    const { data: newRes } = await dataService.addCourseResource({
      course_id: course!.id,
      lesson_id: targetLessonId,
      section_id: targetSectionId,
      title: uploadTitle.trim(),
      resource_type: uploadType,
      file_url: finalUrl,
      file_size: size,
      uploader_id: user?.id,
    });

    if (newRes && course) {
      if (targetSectionId && course.sections) {
        const updatedSections = course.sections.map((sec) =>
          sec.id === targetSectionId
            ? { ...sec, resources: [...(sec.resources || []), newRes] }
            : sec
        );
        setCourse({
          ...course,
          sections: updatedSections,
          resources: [...(course.resources || []), newRes],
        });
      } else if (targetLessonId && course.sections) {
        const updatedSections = course.sections.map((sec) => ({
          ...sec,
          lessons: sec.lessons.map((les) =>
            les.id === targetLessonId
              ? { ...les, resources: [...(les.resources || []), newRes] }
              : les
          ),
        }));
        setCourse({
          ...course,
          sections: updatedSections,
        });
        if (currentLesson?.id === targetLessonId) {
          setCurrentLesson({
            ...currentLesson,
            resources: [...(currentLesson.resources || []), newRes],
          });
        }
      } else {
        setCourse({
          ...course,
          resources: [...(course.resources || []), newRes],
        });
      }
      addToast('Resource uploaded and modularly attached successfully!', 'success');
    }

    setIsUploading(false);
    setUploadModalOpen(false);
    setUploadTitle('');
    setUploadFile(null);
    setUploadUrl('');
  };

  const handleOpenEditModal = (res: CourseResource) => {
    setEditingResource(res);
    setEditTitle(res.title);
    setEditType(res.resource_type || 'pdf');
    if (res.lesson_id) {
      setEditTarget(`lesson:${res.lesson_id}`);
    } else if (res.section_id) {
      setEditTarget(`section:${res.section_id}`);
    } else {
      setEditTarget('course:general');
    }
  };

  const handleSaveEditResource = async () => {
    if (!editingResource || !course) return;
    if (!editTitle.trim()) {
      addToast('Please enter a valid title/filename for the resource.', 'info');
      return;
    }

    setIsSavingEdit(true);

    let targetSectionId: string | undefined = undefined;
    let targetLessonId: string | undefined = undefined;

    if (editTarget.startsWith('section:')) {
      targetSectionId = editTarget.replace('section:', '');
    } else if (editTarget.startsWith('lesson:')) {
      targetLessonId = editTarget.replace('lesson:', '');
      for (const s of course.sections || []) {
        if (s.lessons.some((l) => l.id === targetLessonId)) {
          targetSectionId = s.id;
          break;
        }
      }
    }

    const updates: Partial<CourseResource> = {
      title: editTitle.trim(),
      resource_type: editType,
      section_id: targetSectionId,
      lesson_id: targetLessonId,
    };

    const { data: updatedRes, error } = await dataService.updateCourseResource(
      course.id,
      editingResource.id,
      updates
    );

    if (error || !updatedRes) {
      addToast('Failed to update resource.', 'error');
      setIsSavingEdit(false);
      return;
    }

    const refreshedCourse = await dataService.getCourseById(course.id);
    if (refreshedCourse) {
      setCourse(refreshedCourse);
      if (currentLesson) {
        const foundLesson = refreshedCourse.sections
          ?.flatMap((s) => s.lessons)
          .find((l) => l.id === currentLesson.id);
        if (foundLesson) {
          setCurrentLesson(foundLesson);
        }
      }
    }

    setIsSavingEdit(false);
    setEditingResource(null);
    addToast('Resource renamed and moved to target module successfully!', 'success');
  };

  const handleDeleteResource = async () => {
    if (!editingResource || !course) return;
    if (!window.confirm(`Are you sure you want to delete "${editingResource.title}"?`)) return;

    setIsSavingEdit(true);
    const { error } = await dataService.deleteCourseResource(course.id, editingResource.id);
    if (error) {
      addToast('Failed to delete resource.', 'error');
      setIsSavingEdit(false);
      return;
    }

    const refreshedCourse = await dataService.getCourseById(course.id);
    if (refreshedCourse) {
      setCourse(refreshedCourse);
      if (currentLesson) {
        const foundLesson = refreshedCourse.sections
          ?.flatMap((s) => s.lessons)
          .find((l) => l.id === currentLesson.id);
        if (foundLesson) {
          setCurrentLesson(foundLesson);
        }
      }
    }

    setIsSavingEdit(false);
    setEditingResource(null);
    addToast('Resource deleted successfully.', 'success');
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

  // Modular Udemy-Style Resources Breakdown
  const getSectionResources = (section: CourseSection): CourseResource[] => {
    const direct = section.resources || [];
    const fromCourse = (course.resources || []).filter(
      (r) => (r as any).section_id === section.id
    );
    const map = new Map<string, CourseResource>();
    direct.forEach((r: CourseResource) => map.set(r.id, r));
    fromCourse.forEach((r: CourseResource) => map.set(r.id, r));
    return Array.from(map.values());
  };

  const getSectionTotalFilesCount = (section: CourseSection): number => {
    const secRes = getSectionResources(section);
    const lessonResCount = (section.lessons || []).reduce(
      (acc: number, l: CourseLesson) => acc + (l.resources?.length || 0),
      0
    );
    return secRes.length + lessonResCount;
  };

  const courseLevelResources = (course.resources || []).filter(
    (r) => !r.lesson_id && !(r as any).section_id
  );
  const currentLessonResources = currentLesson?.resources || [];

  const modularSections = (course.sections || [])
    .map((sec, sIdx) => {
      const secRes = getSectionResources(sec);
      const lessonsWithRes = (sec.lessons || [])
        .map((les, lIdx) => ({
          lesson: les,
          lessonIndex: lIdx,
          resources: les.resources || [],
        }))
        .filter((l) => l.resources.length > 0);

      const sectionResCount = secRes.length + lessonsWithRes.reduce((acc, l) => acc + l.resources.length, 0);

      return {
        section: sec,
        sectionIndex: sIdx,
        sectionResources: secRes,
        lessonsWithRes,
        totalResources: sectionResCount,
      };
    })
    .filter((s) => s.totalResources > 0);

  const totalModularCount =
    courseLevelResources.length +
    modularSections.reduce((acc, s) => acc + s.totalResources, 0);

  const resQuery = resourceSearch.toLowerCase().trim();

  // Filtered Course-level Resources
  const filteredCourseLevel = courseLevelResources.filter((res) => {
    const matchesScope = resourceFilter === 'all' || resourceFilter === 'course_wide';
    if (!matchesScope) return false;
    if (!resQuery) return true;
    return (
      res.title.toLowerCase().includes(resQuery) ||
      (res.description || '').toLowerCase().includes(resQuery) ||
      res.resource_type.toLowerCase().includes(resQuery)
    );
  });

  // Filtered Modular Sections & Lessons
  const filteredModularSections = modularSections
    .map((s) => {
      const matchesSectionScope =
        resourceFilter === 'all' ||
        resourceFilter === s.section.id ||
        (resourceFilter === 'current' && (s.sectionIndex === currentSectionIndex || s.lessonsWithRes.some((l) => l.lesson.id === currentLesson?.id)));

      if (!matchesSectionScope) return null;

      const filteredSecRes = s.sectionResources.filter((res) => {
        if (!resQuery) return true;
        return (
          res.title.toLowerCase().includes(resQuery) ||
          (res.description || '').toLowerCase().includes(resQuery) ||
          res.resource_type.toLowerCase().includes(resQuery) ||
          s.section.title.toLowerCase().includes(resQuery)
        );
      });

      const filteredLessons = s.lessonsWithRes
        .map((l) => {
          if (resourceFilter === 'current' && l.lesson.id !== currentLesson?.id) {
            return null;
          }

          const filteredRes = l.resources.filter((res) => {
            if (!resQuery) return true;
            return (
              res.title.toLowerCase().includes(resQuery) ||
              (res.description || '').toLowerCase().includes(resQuery) ||
              res.resource_type.toLowerCase().includes(resQuery) ||
              l.lesson.title.toLowerCase().includes(resQuery)
            );
          });

          if (filteredRes.length === 0) return null;

          return {
            ...l,
            resources: filteredRes,
          };
        })
        .filter(Boolean) as typeof s.lessonsWithRes;

      if (filteredSecRes.length === 0 && filteredLessons.length === 0) return null;

      const count = filteredSecRes.length + filteredLessons.reduce((acc, l) => acc + l.resources.length, 0);
      return {
        ...s,
        sectionResources: filteredSecRes,
        lessonsWithRes: filteredLessons,
        totalResources: count,
      };
    })
    .filter(Boolean) as typeof modularSections;

  const filteredTotalCount =
    filteredCourseLevel.length +
    filteredModularSections.reduce((acc, s) => acc + s.totalResources, 0);

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
    <div className="flex flex-col min-h-screen bg-[var(--background)] animate-fade-in w-full">
      {/* TOP UDEMY-STYLE CLASSROOM HEADER */}
      <header className="sticky top-0 z-40 bg-[var(--surface)] border-b border-[var(--border)] px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4 shadow-sm backdrop-blur-md bg-opacity-95">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
          <button
            onClick={() => navigate(`/courses/${course.id}`)}
            className="p-1.5 sm:p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] transition-colors shrink-0"
            title="Back to Course Overview"
          >
            <ArrowLeft size={19} />
          </button>

          <div className="overflow-hidden">
            <h1 className="text-xs sm:text-sm font-bold text-[var(--text-main)] truncate max-w-[130px] sm:max-w-md">
              {course.title}
            </h1>
            <p className="text-[11px] sm:text-xs text-[var(--text-muted)] truncate flex items-center gap-1.5">
              <span className="hidden sm:inline">{course.instructor_name} •</span>
              <span className="text-[var(--primary)] font-medium truncate">
                {currentLesson?.title || 'Lecture'}
              </span>
            </p>
          </div>
        </div>

        {/* Center / Right: Progress & Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Progress Indicator */}
          <div className="hidden md:flex items-center gap-3 bg-[var(--surface-hover)] px-3 py-1.5 rounded-xl border border-[var(--border)]">
            <div className="w-20 h-2 rounded-full bg-[var(--border)] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-[var(--text-main)]">
              {progressPercent}%
            </span>
          </div>

          {/* Share / Copy Lesson URL */}
          <button
            type="button"
            onClick={handleCopyLessonLink}
            className="p-1.5 sm:p-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] border border-[var(--border)] transition-colors flex items-center gap-1.5"
            title="Copy direct shareable link for this lecture"
          >
            {copiedLessonLink ? <Check size={16} className="text-emerald-500" /> : <Share2 size={16} />}
            <span className="hidden xl:inline">{copiedLessonLink ? 'Copied!' : 'Share'}</span>
          </button>

          {/* Prev / Next buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevLesson}
              className="p-1.5 sm:p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] border border-[var(--border)] transition-colors"
              title="Previous Lesson"
            >
              <ChevronLeft size={17} />
            </button>
            <button
              onClick={handleNextLesson}
              className="p-1.5 sm:p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] border border-[var(--border)] transition-colors"
              title="Next Lesson"
            >
              <ChevronRight size={17} />
            </button>
          </div>

          {/* Toggle Curriculum Sidebar (Visible on ALL devices) */}
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-1.5 sm:p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              sidebarOpen
                ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm'
                : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-main)] border-[var(--border)] hover:bg-[var(--surface-hover)]'
            }`}
            title={sidebarOpen ? 'Hide curriculum' : 'Show curriculum'}
          >
            {sidebarOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
            <span className="hidden sm:inline">{sidebarOpen ? 'Hide Curriculum' : 'Curriculum'}</span>
          </button>
        </div>
      </header>

      {/* CLASSROOM PLAYER BODY (STAGE + SIDEBAR) */}
      <div className="flex-1 flex flex-col lg:flex-row min-w-0">
        {/* MAIN VIDEO & CONTENT STAGE */}
        <main className="flex-1 flex flex-col min-w-0 p-2.5 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
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
                    controlsList="nodownload"
                    onContextMenu={(e) => e.preventDefault()}
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
                  isAdmin={isAdmin}
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
            <div className="flex items-center border-b border-[var(--border)] bg-[var(--surface-hover)] px-2 sm:px-4 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => handleSelectTab('resources')}
                className={`py-2.5 px-3 sm:py-3.5 sm:px-4 font-semibold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                  activeTab === 'resources'
                    ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--surface)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <BookOpen size={15} />
                <span>Resources & Materials ({totalModularCount})</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTab('transcript')}
                className={`py-2.5 px-3 sm:py-3.5 sm:px-4 font-semibold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                  activeTab === 'transcript'
                    ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--surface)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <FileText size={15} />
                <span>Transcript</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTab('notes')}
                className={`py-2.5 px-3 sm:py-3.5 sm:px-4 font-semibold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                  activeTab === 'notes'
                    ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--surface)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <FileText size={15} />
                <span>My Notes</span>
                {noteSavedTime && (
                  <span className="text-[10px] font-mono opacity-60">({noteSavedTime})</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSelectTab('overview')}
                className={`py-2.5 px-3 sm:py-3.5 sm:px-4 font-semibold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--surface)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <Sparkles size={15} />
                <span>Overview</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTab('qa')}
                className={`py-2.5 px-3 sm:py-3.5 sm:px-4 font-semibold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                  activeTab === 'qa'
                    ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--surface)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <MessageSquare size={15} />
                <span>Q&A ({qaList.length})</span>
              </button>
            </div>

            {/* TAB CONTENT */}
            <div className="p-3.5 sm:p-6">
              {/* TAB 1: MODULAR RESOURCES & TEXTBOOKS (UDEMY STYLE) */}
              {activeTab === 'resources' && (
                <div className="space-y-6 animate-fade-in">
                  {/* Top Bar: Title, Stats & Controls */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 font-bold text-xs uppercase tracking-wider">
                          Curriculum Materials
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          {totalModularCount} Total Resources
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-[var(--text-main)] mt-1">
                        Course Textbooks, Slides & Modular Resources
                      </h3>
                      <p className="text-xs text-[var(--text-muted)]">
                        {isAdmin
                          ? 'Review, attach, or download modular study materials attached across lectures.'
                          : 'Read lecture notes, textbooks, slides, and cheat sheets online in our interactive reader.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          const allExp: Record<string, boolean> = { course_wide: true };
                          modularSections.forEach((s) => (allExp[s.section.id] = true));
                          setExpandedResourceSections(allExp);
                        }}
                      >
                        Expand All
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setExpandedResourceSections({})}
                      >
                        Collapse All
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          setUploadTargetLessonId(currentLesson?.id || '');
                          setUploadModalOpen(true);
                        }}
                        icon={<Plus size={16} />}
                      >
                        Attach Resource
                      </Button>
                    </div>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[var(--surface)] p-3.5 rounded-2xl border border-[var(--border)] shadow-sm">
                    {/* Scope Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                      <button
                        type="button"
                        onClick={() => setResourceFilter('all')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                          resourceFilter === 'all'
                            ? 'bg-[var(--primary)] text-white shadow-sm'
                            : 'bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        All Materials ({totalModularCount})
                      </button>

                      {currentLesson && (
                        <button
                          type="button"
                          onClick={() => setResourceFilter('current')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                            resourceFilter === 'current'
                              ? 'bg-[var(--primary)] text-white shadow-sm'
                              : 'bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Current Lecture ({currentLessonResources.length})</span>
                        </button>
                      )}

                      {courseLevelResources.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setResourceFilter('course_wide')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                            resourceFilter === 'course_wide'
                              ? 'bg-[var(--primary)] text-white shadow-sm'
                              : 'bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                          }`}
                        >
                          General Textbooks ({courseLevelResources.length})
                        </button>
                      )}

                      {modularSections.map((s) => (
                        <button
                          key={s.section.id}
                          type="button"
                          onClick={() => setResourceFilter(s.section.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                            resourceFilter === s.section.id
                              ? 'bg-[var(--primary)] text-white shadow-sm'
                              : 'bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                          }`}
                        >
                          Module {s.sectionIndex + 1} ({s.totalResources})
                        </button>
                      ))}
                    </div>

                    {/* Search */}
                    <div className="relative min-w-[220px]">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        value={resourceSearch}
                        onChange={(e) => setResourceSearch(e.target.value)}
                        placeholder="Search resources, topics..."
                        className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                      />
                      {resourceSearch && (
                        <button
                          type="button"
                          onClick={() => setResourceSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)]"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* MODULAR SECTIONS LIST */}
                  {filteredTotalCount === 0 ? (
                    <div className="text-center py-16 border-2 border-dashed border-[var(--border)] rounded-2xl bg-[var(--surface)] space-y-3">
                      <BookOpen size={40} className="mx-auto text-[var(--text-muted)] opacity-40" />
                      <h4 className="text-base font-bold text-[var(--text-main)]">No resources found</h4>
                      <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                        {resourceSearch
                          ? `No resources matched "${resourceSearch}". Try a different keyword.`
                          : 'No resources have been attached to this selection yet.'}
                      </p>
                      <div className="pt-2 flex justify-center gap-2">
                        {resourceSearch && (
                          <Button size="sm" variant="secondary" onClick={() => setResourceSearch('')}>
                            Clear Search
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            setUploadTargetLessonId(currentLesson?.id || '');
                            setUploadModalOpen(true);
                          }}
                          icon={<Plus size={14} />}
                        >
                          Attach First Resource
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* 1. CURRENT ACTIVE LECTURE MATERIALS (FOCUSED HIGHLIGHT) */}
                      {currentLesson && (resourceFilter === 'all' || resourceFilter === 'current') && (
                        <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 p-4 sm:p-5 space-y-3.5 shadow-xs">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                              <h4 className="text-sm font-bold text-[var(--text-main)]">
                                Currently Playing: {currentLesson.title}
                              </h4>
                            </div>
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              {currentLessonResources.length} File{currentLessonResources.length !== 1 ? 's' : ''} Attached
                            </span>
                          </div>

                          {currentLessonResources.length === 0 ? (
                            <p className="text-xs text-[var(--text-muted)] bg-[var(--surface)] p-3 rounded-xl border border-[var(--border)]">
                              No specific files attached to this single video. You can access the module section materials and course-wide reference handbooks below.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                              {currentLessonResources.map((res) => (
                                <div
                                  key={res.id}
                                  className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] transition-all flex flex-col justify-between gap-3 group shadow-xs"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] shrink-0 mt-0.5">
                                      {res.resource_type === 'book' ? (
                                        <BookOpen size={18} />
                                      ) : res.resource_type === 'code' ? (
                                        <Code2 size={18} />
                                      ) : res.resource_type === 'link' ? (
                                        <ExternalLink size={18} />
                                      ) : (
                                        <FileText size={18} />
                                      )}
                                    </div>
                                    <div className="overflow-hidden space-y-1 flex-1">
                                      <span className="text-xs font-bold text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors block truncate" title={res.title}>
                                        {res.title}
                                      </span>
                                      {res.description && (
                                        <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                                          {res.description}
                                        </p>
                                      )}
                                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--surface-hover)] text-[var(--text-muted)] border border-[var(--border)]">
                                          {res.resource_type}
                                        </span>
                                        <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-muted)]">
                                          {getDisplayFileName(res)}
                                        </span>
                                        <span className="text-[10px] font-mono text-[var(--text-muted)]">
                                          {res.file_size || 'Lecture Material'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                                    <Button
                                      size="sm"
                                      variant="primary"
                                      onClick={() => setReadingResource(res)}
                                      className="text-xs h-7 px-3"
                                      icon={<Eye size={12} />}
                                    >
                                      Read Online
                                    </Button>
                                    {isAdmin && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditModal(res)}
                                          className="btn btn-secondary text-xs h-7 px-2.5 shrink-0 flex items-center gap-1.5 shadow-sm text-indigo-500 hover:text-indigo-600 hover:bg-indigo-500/10 border-indigo-500/20"
                                          title="Rename or Move Resource"
                                        >
                                          <Edit3 size={12} />
                                          <span>Move / Rename</span>
                                        </button>
                                        <a
                                          href={res.file_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          download
                                          className="btn btn-secondary text-xs h-7 px-2.5 shrink-0 flex items-center gap-1.5 shadow-sm"
                                          title="Download Resource (Admin Only)"
                                        >
                                          <Download size={12} />
                                          <span>Download</span>
                                        </a>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 2. COURSE-WIDE REFERENCE TEXTBOOKS & CHEATSHEETS */}
                      {filteredCourseLevel.length > 0 && (
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-sm">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedResourceSections((prev) => ({
                                ...prev,
                                course_wide: !prev.course_wide,
                              }))
                            }
                            className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-[var(--surface-hover)] transition-colors select-none"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-xs">
                                📚
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-[var(--text-main)]">
                                  Course-Wide Reference Textbooks & Materials
                                </h4>
                                <span className="text-[11px] text-[var(--text-muted)]">
                                  {filteredCourseLevel.length} master resource{filteredCourseLevel.length > 1 ? 's' : ''} available across all lectures
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-full bg-[var(--surface-hover)] text-[10px] font-bold text-[var(--text-muted)] border border-[var(--border)]">
                                {filteredCourseLevel.length} Files
                              </span>
                              {expandedResourceSections.course_wide !== false ? (
                                <ChevronUp size={18} className="text-[var(--text-muted)]" />
                              ) : (
                                <ChevronDown size={18} className="text-[var(--text-muted)]" />
                              )}
                            </div>
                          </button>

                          {expandedResourceSections.course_wide !== false && (
                            <div className="p-4 pt-0 border-t border-[var(--border)] grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-[var(--surface-hover)]/30 mt-3">
                              {filteredCourseLevel.map((res) => (
                                <div
                                  key={res.id}
                                  className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] transition-all flex flex-col justify-between gap-3 group shadow-xs"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="p-2.5 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] shrink-0 mt-0.5">
                                      {res.resource_type === 'book' ? <BookOpen size={20} /> : <FileText size={20} />}
                                    </div>
                                    <div className="overflow-hidden space-y-1 flex-1">
                                      <span className="text-sm font-bold text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors block truncate" title={res.title}>
                                        {res.title}
                                      </span>
                                      {res.description && (
                                        <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                                          {res.description}
                                        </p>
                                      )}
                                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--surface-hover)] text-[var(--text-muted)] border border-[var(--border)]">
                                          {res.resource_type}
                                        </span>
                                        <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-muted)]">
                                          {getDisplayFileName(res)}
                                        </span>
                                        <span className="text-[11px] font-mono text-[var(--text-muted)]">
                                          {res.file_size || 'Reference Document'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => setReadingResource(res)}
                                      className="text-xs h-7 px-3 hover:border-[var(--primary)]"
                                      icon={<Eye size={13} />}
                                    >
                                      Read Online
                                    </Button>
                                    {isAdmin && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditModal(res)}
                                          className="btn btn-secondary text-xs h-7 px-2.5 shrink-0 flex items-center gap-1.5 shadow-sm text-indigo-500 hover:text-indigo-600 hover:bg-indigo-500/10 border-indigo-500/20"
                                          title="Rename or Move Resource"
                                        >
                                          <Edit3 size={12} />
                                          <span>Move / Rename</span>
                                        </button>
                                        <a
                                          href={res.file_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          download
                                          className="btn btn-secondary text-xs h-7 px-3 shrink-0 flex items-center gap-1.5 shadow-sm"
                                          title="Download Resource (Admin Only)"
                                        >
                                          <Download size={13} />
                                          <span>Download</span>
                                        </a>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 3. MODULE BY MODULE BREAKDOWN (UDEMY ACCORDION) */}
                      {filteredModularSections.map((s) => {
                        const isExpanded = expandedResourceSections[s.section.id] !== false;

                        return (
                          <div
                            key={s.section.id}
                            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-sm"
                          >
                            {/* MODULE HEADER ACCORDION */}
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedResourceSections((prev) => ({
                                  ...prev,
                                  [s.section.id]: !isExpanded,
                                }))
                              }
                              className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-[var(--surface-hover)] transition-colors select-none"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold text-xs">
                                  {s.sectionIndex + 1}
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-[var(--text-main)]">
                                    Module {s.sectionIndex + 1}: {s.section.title}
                                  </h4>
                                  <span className="text-[11px] text-[var(--text-muted)]">
                                    {s.lessonsWithRes.length} lecture{s.lessonsWithRes.length > 1 ? 's' : ''} • {s.sectionResources.length} section material{s.sectionResources.length !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full bg-[var(--surface-hover)] text-[10px] font-bold text-[var(--text-muted)] border border-[var(--border)]">
                                  {s.totalResources} File{s.totalResources > 1 ? 's' : ''}
                                </span>
                                {isExpanded ? (
                                  <ChevronUp size={18} className="text-[var(--text-muted)]" />
                                ) : (
                                  <ChevronDown size={18} className="text-[var(--text-muted)]" />
                                )}
                              </div>
                            </button>

                            {/* MODULE LECTURES & SECTION RESOURCES */}
                            {isExpanded && (
                              <div className="border-t border-[var(--border)] divide-y divide-[var(--border)] bg-[var(--surface-hover)]/30">
                                {s.lessonsWithRes.map((l) => {
                                  const isCurrent = currentLesson?.id === l.lesson.id;

                                  return (
                                    <div key={l.lesson.id} className="p-4 space-y-3">
                                      {/* Lecture Sub-Header with Switch Button */}
                                      <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <div className="flex items-center gap-2">
                                          <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                          <span className="text-xs font-bold text-[var(--text-main)]">
                                            Lecture {s.sectionIndex + 1}.{l.lessonIndex + 1}: {l.lesson.title}
                                          </span>
                                          {isCurrent && (
                                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-500/20">
                                              ▶ Currently Playing
                                            </span>
                                          )}
                                        </div>

                                        {!isCurrent && (
                                          <button
                                            type="button"
                                            onClick={() => handleSelectLesson(l.lesson, s.sectionIndex)}
                                            className="text-[11px] font-semibold text-[var(--primary)] hover:underline flex items-center gap-1"
                                          >
                                            Switch to Lecture 📺
                                          </button>
                                        )}
                                      </div>

                                      {/* Lecture Resource Cards Grid */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {l.resources.map((res) => (
                                          <div
                                            key={res.id}
                                            className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] transition-all flex flex-col justify-between gap-3 group shadow-xs"
                                          >
                                            <div className="flex items-start gap-3">
                                              <div className="p-2 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] shrink-0 mt-0.5">
                                                {res.resource_type === 'book' ? (
                                                  <BookOpen size={18} />
                                                ) : res.resource_type === 'code' ? (
                                                  <Code2 size={18} />
                                                ) : res.resource_type === 'link' ? (
                                                  <ExternalLink size={18} />
                                                ) : (
                                                  <FileText size={18} />
                                                )}
                                              </div>
                                              <div className="overflow-hidden space-y-1 flex-1">
                                                <span className="text-xs font-bold text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors block truncate" title={res.title}>
                                                  {res.title}
                                                </span>
                                                {res.description && (
                                                  <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                                                    {res.description}
                                                  </p>
                                                )}
                                                <div className="flex items-center gap-2 pt-1 flex-wrap">
                                                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--surface-hover)] text-[var(--text-muted)] border border-[var(--border)]">
                                                    {res.resource_type}
                                                  </span>
                                                  <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-muted)]">
                                                    {getDisplayFileName(res)}
                                                  </span>
                                                  <span className="text-[10px] font-mono text-[var(--text-muted)]">
                                                    {res.file_size || 'Class Material'}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>

                                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                                              <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => setReadingResource(res)}
                                                className="text-xs h-7 px-3 hover:border-[var(--primary)]"
                                                icon={<Eye size={12} />}
                                              >
                                                Read Online
                                              </Button>
                                              {isAdmin && (
                                                <>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleOpenEditModal(res)}
                                                    className="btn btn-secondary text-xs h-7 px-2.5 shrink-0 flex items-center gap-1.5 shadow-sm text-indigo-500 hover:text-indigo-600 hover:bg-indigo-500/10 border-indigo-500/20"
                                                    title="Rename or Move Resource"
                                                  >
                                                    <Edit3 size={12} />
                                                    <span>Move / Rename</span>
                                                  </button>
                                                  <a
                                                    href={res.file_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    download
                                                    className="btn btn-secondary text-xs h-7 px-2.5 shrink-0 flex items-center gap-1.5 shadow-sm"
                                                    title="Download Resource (Admin Only)"
                                                  >
                                                    <Download size={12} />
                                                    <span>Download</span>
                                                  </a>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* UDEMY-STYLE END OF MODULE SECTION MATERIALS */}
                                {s.sectionResources.length > 0 && (
                                  <div className="p-4 bg-indigo-500/5 space-y-3">
                                    <div className="flex items-center gap-2">
                                      <FolderOpen size={16} className="text-indigo-500" />
                                      <h5 className="text-xs font-bold text-[var(--text-main)]">
                                        Module {s.sectionIndex + 1} Section Materials & Downloads
                                      </h5>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {s.sectionResources.map((res) => (
                                        <div
                                          key={res.id}
                                          className="p-3.5 rounded-xl border border-indigo-500/20 bg-[var(--surface)] hover:border-indigo-500 transition-all flex flex-col justify-between gap-3 group shadow-xs"
                                        >
                                          <div className="flex items-start gap-3">
                                            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 shrink-0 mt-0.5">
                                              {res.resource_type === 'book' ? (
                                                <BookOpen size={18} />
                                              ) : res.resource_type === 'code' ? (
                                                <Code2 size={18} />
                                              ) : (
                                                <FileText size={18} />
                                              )}
                                            </div>
                                            <div className="overflow-hidden space-y-1 flex-1">
                                              <span className="text-xs font-bold text-[var(--text-main)] group-hover:text-indigo-500 transition-colors block truncate" title={res.title}>
                                                {res.title}
                                              </span>
                                              {res.description && (
                                                <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                                                  {res.description}
                                                </p>
                                              )}
                                              <div className="flex items-center gap-2 pt-1 flex-wrap">
                                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--surface-hover)] text-[var(--text-muted)] border border-[var(--border)]">
                                                  {res.resource_type}
                                                </span>
                                                <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-muted)]">
                                                  {getDisplayFileName(res)}
                                                </span>
                                                <span className="text-[10px] font-mono text-[var(--text-muted)]">
                                                  {res.file_size || 'Section Material'}
                                                </span>
                                              </div>
                                            </div>
                                          </div>

                                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                                            <Button
                                              size="sm"
                                              variant="secondary"
                                              onClick={() => setReadingResource(res)}
                                              className="text-xs h-7 px-3 hover:border-indigo-500"
                                              icon={<Eye size={12} />}
                                            >
                                              Read Online
                                            </Button>
                                            {isAdmin && (
                                              <>
                                                <button
                                                  type="button"
                                                  onClick={() => handleOpenEditModal(res)}
                                                  className="btn btn-secondary text-xs h-7 px-2.5 shrink-0 flex items-center gap-1.5 shadow-sm text-indigo-500 hover:text-indigo-600 hover:bg-indigo-500/10 border-indigo-500/20"
                                                  title="Rename or Move Resource"
                                                >
                                                  <Edit3 size={12} />
                                                  <span>Move / Rename</span>
                                                </button>
                                                <a
                                                  href={res.file_url}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  download
                                                  className="btn btn-secondary text-xs h-7 px-2.5 shrink-0 flex items-center gap-1.5 shadow-sm"
                                                  title="Download Resource (Admin Only)"
                                                >
                                                  <Download size={12} />
                                                  <span>Download</span>
                                                </a>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
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
                    isAdmin={isAdmin}
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

        {/* DESKTOP CURRICULUM ACCORDION SIDEBAR */}
        {sidebarOpen && (
          <aside className="hidden lg:flex w-96 border-l border-[var(--border)] bg-[var(--surface)] flex-col shrink-0 h-[calc(100vh-60px)] sticky top-[60px] animate-fade-in shadow-sm">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-hover)]">
              <div>
                <h3 className="font-bold text-sm text-[var(--text-main)]">Course Curriculum</h3>
                <p className="text-xs text-[var(--text-muted)]">
                  {completedCount} / {totalLecturesCount} completed • {course.duration}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface)] transition-colors"
                title="Collapse curriculum (Cinema mode)"
              >
                <PanelRightClose size={16} />
              </button>
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
                        {section.lessons.map((lesson, lIdx) => {
                          const isCurrent = currentLesson?.id === lesson.id;
                          const isDone = progress?.completed_lessons?.includes(lesson.id);
                          const lessonResources = lesson.resources || [];
                          const hasLessonResources = lessonResources.length > 0;
                          const isResExpanded = !!expandedLessonResources[lesson.id];

                          return (
                            <div key={lesson.id} className="transition-colors">
                              {/* Lecture Row */}
                              <div
                                onClick={() => handleSelectLesson(lesson, sIdx)}
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

                                  <div className="overflow-hidden space-y-0.5 flex-1 min-w-0">
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

                                      {/* UDEMY-STYLE INLINE VIDEO ROW RESOURCE EXPANDER */}
                                      {hasLessonResources && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleLessonResources(lesson.id);
                                          }}
                                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all ${
                                            isResExpanded
                                              ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                          }`}
                                          title="Toggle attached files for this lecture"
                                        >
                                          <FolderOpen size={10} />
                                          <span>Resources ({lessonResources.length})</span>
                                          <ChevronDown
                                            size={10}
                                            className={`transform transition-transform ${isResExpanded ? 'rotate-180' : ''}`}
                                          />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {isCurrent && (
                                  <span className="w-2 h-2 rounded-full bg-[var(--primary)] shrink-0 animate-ping" />
                                )}
                              </div>

                              {/* INLINE RESOURCE DROPDOWN DIRECTLY UNDER THIS VIDEO ROW */}
                              {isResExpanded && hasLessonResources && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="bg-[var(--surface-hover)]/90 border-t border-b border-[var(--border)] px-4 py-2.5 space-y-2 animate-fade-in"
                                >
                                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                      <FolderOpen size={11} />
                                      Lecture {sIdx + 1}.{lIdx + 1} Attached Materials
                                    </span>
                                    <span>{lessonResources.length} file{lessonResources.length > 1 ? 's' : ''}</span>
                                  </div>

                                  <div className="space-y-1.5">
                                    {lessonResources.map((res) => (
                                      <div
                                        key={res.id}
                                        className="p-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--primary)] transition-all flex items-center justify-between gap-2 shadow-xs group"
                                      >
                                        <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                                          <div className="p-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] shrink-0">
                                            {res.resource_type === 'book' ? (
                                              <BookOpen size={13} />
                                            ) : res.resource_type === 'code' ? (
                                              <Code2 size={13} />
                                            ) : res.resource_type === 'link' ? (
                                              <ExternalLink size={13} />
                                            ) : (
                                              <FileText size={13} />
                                            )}
                                          </div>
                                          <div className="overflow-hidden min-w-0 flex-1">
                                            <span
                                              className="text-xs font-semibold text-[var(--text-main)] block truncate group-hover:text-[var(--primary)] transition-colors"
                                              title={res.title}
                                            >
                                              {res.title}
                                            </span>
                                            <div className="flex items-center gap-1.5 text-[9px] text-[var(--text-muted)] truncate">
                                              <span className="font-mono px-1 py-0.2 rounded bg-[var(--surface-hover)] border border-[var(--border)]">
                                                {getDisplayFileName(res)}
                                              </span>
                                              <span>•</span>
                                              <span>{res.file_size || 'Document'}</span>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                          <button
                                            type="button"
                                            onClick={() => setReadingResource(res)}
                                            className="px-2 py-1 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-[10px] font-semibold flex items-center gap-1 transition-colors shadow-xs"
                                            title="Read online in secure viewer"
                                          >
                                            <Eye size={11} />
                                            <span>Read</span>
                                          </button>
                                          {isAdmin && (
                                            <>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleOpenEditModal(res);
                                                }}
                                                className="p-1 rounded-lg bg-[var(--surface-hover)] hover:bg-indigo-500/10 text-[var(--text-muted)] hover:text-indigo-500 transition-colors border border-[var(--border)]"
                                                title="Rename or Move Resource"
                                              >
                                                <Edit3 size={11} />
                                              </button>
                                              <a
                                                href={res.file_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                download
                                                className="p-1 rounded-lg bg-[var(--surface-hover)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors border border-[var(--border)]"
                                                title="Download File (Admin Only)"
                                              >
                                                <Download size={12} />
                                              </a>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* UDEMY-STYLE END-OF-MODULE SECTION MATERIALS CARD */}
                        {(() => {
                          const secRes = getSectionResources(section);
                          const totalSecFiles = getSectionTotalFilesCount(section);
                          const isEndExpanded = expandedSectionEndResources[section.id] ?? false;

                          return (
                            <div className="border-t border-[var(--border)] bg-[var(--surface-hover)]/40">
                              <button
                                type="button"
                                onClick={() => toggleSectionEndResources(section.id)}
                                className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-[var(--surface-hover)] transition-colors"
                              >
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                  <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 font-bold text-xs">
                                    <FolderOpen size={13} />
                                  </div>
                                  <div className="overflow-hidden">
                                    <h5 className="text-xs font-bold text-[var(--text-main)] truncate">
                                      Module {sIdx + 1} Section Materials
                                    </h5>
                                    <p className="text-[10px] text-[var(--text-muted)]">
                                      {totalSecFiles > 0
                                        ? `${totalSecFiles} resource${totalSecFiles > 1 ? 's' : ''} in this module`
                                        : 'Module study resources'}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]">
                                    {totalSecFiles}
                                  </span>
                                  <ChevronDown
                                    size={14}
                                    className={`text-[var(--text-muted)] transform transition-transform ${
                                      isEndExpanded ? 'rotate-180' : ''
                                    }`}
                                  />
                                </div>
                              </button>

                              {isEndExpanded && (
                                <div className="px-3.5 pb-3.5 space-y-2 bg-[var(--surface-hover)]/70 animate-fade-in border-t border-[var(--border)]">
                                  {totalSecFiles === 0 ? (
                                    <div className="p-3 text-center rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-muted)]">
                                      No section materials attached yet.
                                      {isAdmin && (
                                        <div className="pt-2">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setUploadTargetLessonId(`section:${section.id}`);
                                              setUploadModalOpen(true);
                                            }}
                                            className="text-xs font-bold text-[var(--primary)] hover:underline inline-flex items-center gap-1"
                                          >
                                            <Plus size={12} />
                                            Attach Module Material
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="space-y-1.5 pt-2">
                                      {/* Direct section resources */}
                                      {secRes.map((res) => (
                                        <div
                                          key={res.id}
                                          className="p-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-indigo-500 transition-all flex items-center justify-between gap-2 shadow-xs group"
                                        >
                                          <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                                            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0">
                                              {res.resource_type === 'book' ? (
                                                <BookOpen size={13} />
                                              ) : res.resource_type === 'code' ? (
                                                <Code2 size={13} />
                                              ) : (
                                                <FileText size={13} />
                                              )}
                                            </div>
                                            <div className="overflow-hidden min-w-0 flex-1">
                                              <span className="text-xs font-semibold text-[var(--text-main)] block truncate group-hover:text-indigo-500 transition-colors" title={res.title}>
                                                {res.title}
                                              </span>
                                              <div className="flex items-center gap-1.5 text-[9px] text-[var(--text-muted)] truncate">
                                                <span className="font-mono px-1 py-0.2 rounded bg-[var(--surface-hover)] border border-[var(--border)]">
                                                  {getDisplayFileName(res)}
                                                </span>
                                                <span>•</span>
                                                <span>{res.file_size || 'Section File'}</span>
                                              </div>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-1 shrink-0">
                                            <button
                                              type="button"
                                              onClick={() => setReadingResource(res)}
                                              className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-semibold flex items-center gap-1 transition-colors shadow-xs"
                                              title="Read online in secure viewer"
                                            >
                                              <Eye size={11} />
                                              <span>Read</span>
                                            </button>
                                            {isAdmin && (
                                              <>
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenEditModal(res);
                                                  }}
                                                  className="p-1 rounded-lg bg-[var(--surface-hover)] hover:bg-indigo-500/10 text-[var(--text-muted)] hover:text-indigo-500 transition-colors border border-[var(--border)]"
                                                  title="Rename or Move Resource"
                                                >
                                                  <Edit3 size={11} />
                                                </button>
                                                <a
                                                  href={res.file_url}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  download
                                                  className="p-1 rounded-lg bg-[var(--surface-hover)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors border border-[var(--border)]"
                                                  title="Download File (Admin Only)"
                                                >
                                                  <Download size={12} />
                                                </a>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      ))}

                                      {/* Lecture resources in this section */}
                                      {section.lessons.flatMap((les, lIdx) =>
                                        (les.resources || []).map((res) => (
                                          <div
                                            key={res.id}
                                            className="p-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--primary)] transition-all flex items-center justify-between gap-2 shadow-xs group"
                                          >
                                            <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                                              <div className="p-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] shrink-0">
                                                {res.resource_type === 'book' ? (
                                                  <BookOpen size={13} />
                                                ) : res.resource_type === 'code' ? (
                                                  <Code2 size={13} />
                                                ) : (
                                                  <FileText size={13} />
                                                )}
                                              </div>
                                              <div className="overflow-hidden min-w-0 flex-1">
                                                <span className="text-xs font-semibold text-[var(--text-main)] block truncate group-hover:text-[var(--primary)] transition-colors" title={res.title}>
                                                  {res.title}
                                                </span>
                                                <div className="flex items-center gap-1.5 text-[9px] text-[var(--text-muted)] truncate">
                                                  <span className="text-emerald-500 font-semibold">
                                                    Lec {sIdx + 1}.{lIdx + 1}
                                                  </span>
                                                  <span>•</span>
                                                  <span className="font-mono px-1 py-0.2 rounded bg-[var(--surface-hover)] border border-[var(--border)]">
                                                    {getDisplayFileName(res)}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                              <button
                                                type="button"
                                                onClick={() => setReadingResource(res)}
                                                className="px-2 py-1 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-[10px] font-semibold flex items-center gap-1 transition-colors shadow-xs"
                                              >
                                                <Eye size={11} />
                                                <span>Read</span>
                                              </button>
                                              {isAdmin && (
                                                <>
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleOpenEditModal(res);
                                                      setSidebarOpen(false);
                                                    }}
                                                    className="p-1 rounded-lg bg-[var(--surface-hover)] hover:bg-indigo-500/10 text-[var(--text-muted)] hover:text-indigo-500 transition-colors border border-[var(--border)]"
                                                    title="Rename or Move Resource"
                                                  >
                                                    <Edit3 size={11} />
                                                  </button>
                                                  <a
                                                    href={res.file_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    download
                                                    className="p-1 rounded-lg bg-[var(--surface-hover)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors border border-[var(--border)]"
                                                    title="Download File (Admin Only)"
                                                  >
                                                    <Download size={12} />
                                                  </a>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>
        )}

        {/* MOBILE / TABLET SLIDE-OVER CURRICULUM DRAWER */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="absolute inset-0" onClick={() => setSidebarOpen(false)} />
            <div className="relative w-full max-w-[88vw] sm:max-w-sm h-full bg-[var(--surface)] border-l border-[var(--border)] flex flex-col shadow-2xl z-10">
              <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-hover)]">
                <div>
                  <h3 className="font-bold text-sm text-[var(--text-main)]">Course Curriculum</h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    {completedCount} / {totalLecturesCount} completed
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface)]"
                  title="Close curriculum drawer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
                {course.sections?.map((section, sIdx) => {
                  const isCollapsed = collapsedSections[section.id] || false;
                  const sectionCompletedCount = section.lessons.filter((l) =>
                    progress?.completed_lessons?.includes(l.id)
                  ).length;

                  return (
                    <div key={section.id} className="bg-[var(--surface)]">
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

                      {!isCollapsed && (
                        <div className="divide-y divide-[var(--border)] bg-[var(--surface)]">
                          {section.lessons.map((lesson, lIdx) => {
                            const isCurrent = currentLesson?.id === lesson.id;
                            const isDone = progress?.completed_lessons?.includes(lesson.id);
                            const lessonResources = lesson.resources || [];
                            const hasLessonResources = lessonResources.length > 0;
                            const isResExpanded = !!expandedLessonResources[lesson.id];

                            return (
                              <div key={lesson.id} className="transition-colors">
                                <div
                                  onClick={() => handleSelectLesson(lesson, sIdx)}
                                  className={`p-3.5 pl-4 cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                                    isCurrent
                                      ? 'bg-[var(--primary)]/10 border-l-4 border-[var(--primary)] text-[var(--primary)]'
                                      : 'hover:bg-[var(--surface-hover)] text-[var(--text-main)]'
                                  }`}
                                >
                                  <div className="flex items-center gap-3 overflow-hidden flex-1">
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

                                    <div className="overflow-hidden space-y-0.5 flex-1 min-w-0">
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
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleLessonResources(lesson.id);
                                            }}
                                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all ${
                                              isResExpanded
                                                ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                            }`}
                                            title="Toggle attached files for this lecture"
                                          >
                                            <FolderOpen size={10} />
                                            <span>Resources ({lessonResources.length})</span>
                                            <ChevronDown
                                              size={10}
                                              className={`transform transition-transform ${isResExpanded ? 'rotate-180' : ''}`}
                                            />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {isCurrent && (
                                    <span className="w-2 h-2 rounded-full bg-[var(--primary)] shrink-0 animate-ping" />
                                  )}
                                </div>

                                {/* MOBILE INLINE RESOURCE DROPDOWN DIRECTLY UNDER THIS VIDEO ROW */}
                                {isResExpanded && hasLessonResources && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-[var(--surface-hover)]/90 border-t border-b border-[var(--border)] px-4 py-2.5 space-y-2 animate-fade-in"
                                  >
                                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                      <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                        <FolderOpen size={11} />
                                        Lecture {sIdx + 1}.{lIdx + 1} Attached Materials
                                      </span>
                                      <span>{lessonResources.length} file{lessonResources.length > 1 ? 's' : ''}</span>
                                    </div>

                                    <div className="space-y-1.5">
                                      {lessonResources.map((res) => (
                                        <div
                                          key={res.id}
                                          className="p-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--primary)] transition-all flex items-center justify-between gap-2 shadow-xs group"
                                        >
                                          <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                                            <div className="p-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] shrink-0">
                                              {res.resource_type === 'book' ? (
                                                <BookOpen size={13} />
                                              ) : res.resource_type === 'code' ? (
                                                <Code2 size={13} />
                                              ) : res.resource_type === 'link' ? (
                                                <ExternalLink size={13} />
                                              ) : (
                                                <FileText size={13} />
                                              )}
                                            </div>
                                            <div className="overflow-hidden min-w-0 flex-1">
                                              <span
                                                className="text-xs font-semibold text-[var(--text-main)] block truncate group-hover:text-[var(--primary)] transition-colors"
                                                title={res.title}
                                              >
                                                {res.title}
                                              </span>
                                              <div className="flex items-center gap-1.5 text-[9px] text-[var(--text-muted)] truncate">
                                                <span className="font-mono px-1 py-0.2 rounded bg-[var(--surface-hover)] border border-[var(--border)]">
                                                  {getDisplayFileName(res)}
                                                </span>
                                                <span>•</span>
                                                <span>{res.file_size || 'Document'}</span>
                                              </div>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-1 shrink-0">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setReadingResource(res);
                                                setSidebarOpen(false);
                                              }}
                                              className="px-2 py-1 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-[10px] font-semibold flex items-center gap-1 transition-colors shadow-xs"
                                              title="Read online in secure viewer"
                                            >
                                              <Eye size={11} />
                                              <span>Read</span>
                                            </button>
                                            {isAdmin && (
                                              <>
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenEditModal(res);
                                                  }}
                                                  className="p-1 rounded-lg bg-[var(--surface-hover)] hover:bg-indigo-500/10 text-[var(--text-muted)] hover:text-indigo-500 transition-colors border border-[var(--border)]"
                                                  title="Rename or Move Resource"
                                                >
                                                  <Edit3 size={11} />
                                                </button>
                                                <a
                                                  href={res.file_url}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  download
                                                  className="p-1 rounded-lg bg-[var(--surface-hover)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors border border-[var(--border)]"
                                                  title="Download File (Admin Only)"
                                                >
                                                  <Download size={12} />
                                                </a>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* MOBILE END-OF-MODULE SECTION MATERIALS CARD */}
                          {(() => {
                            const secRes = getSectionResources(section);
                            const totalSecFiles = getSectionTotalFilesCount(section);
                            const isEndExpanded = expandedSectionEndResources[section.id] ?? false;

                            return (
                              <div className="border-t border-[var(--border)] bg-[var(--surface-hover)]/40">
                                <button
                                  type="button"
                                  onClick={() => toggleSectionEndResources(section.id)}
                                  className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-[var(--surface-hover)] transition-colors"
                                >
                                  <div className="flex items-center gap-2.5 overflow-hidden">
                                    <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 font-bold text-xs">
                                      <FolderOpen size={13} />
                                    </div>
                                    <div className="overflow-hidden">
                                      <h5 className="text-xs font-bold text-[var(--text-main)] truncate">
                                        Module {sIdx + 1} Section Materials
                                      </h5>
                                      <p className="text-[10px] text-[var(--text-muted)]">
                                        {totalSecFiles > 0
                                          ? `${totalSecFiles} resource${totalSecFiles > 1 ? 's' : ''} in this module`
                                          : 'Module study resources'}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]">
                                      {totalSecFiles}
                                    </span>
                                    <ChevronDown
                                      size={14}
                                      className={`text-[var(--text-muted)] transform transition-transform ${
                                        isEndExpanded ? 'rotate-180' : ''
                                      }`}
                                    />
                                  </div>
                                </button>

                                {isEndExpanded && (
                                  <div className="px-3.5 pb-3.5 space-y-2 bg-[var(--surface-hover)]/70 animate-fade-in border-t border-[var(--border)]">
                                    {totalSecFiles === 0 ? (
                                      <div className="p-3 text-center rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-muted)]">
                                        No section materials attached yet.
                                        {isAdmin && (
                                          <div className="pt-2">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setUploadTargetLessonId(`section:${section.id}`);
                                                setUploadModalOpen(true);
                                                setSidebarOpen(false);
                                              }}
                                              className="text-xs font-bold text-[var(--primary)] hover:underline inline-flex items-center gap-1"
                                            >
                                              <Plus size={12} />
                                              Attach Module Material
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="space-y-1.5 pt-2">
                                        {/* Direct section resources */}
                                        {secRes.map((res) => (
                                          <div
                                            key={res.id}
                                            className="p-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-indigo-500 transition-all flex items-center justify-between gap-2 shadow-xs group"
                                          >
                                            <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                                              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0">
                                                {res.resource_type === 'book' ? (
                                                  <BookOpen size={13} />
                                                ) : res.resource_type === 'code' ? (
                                                  <Code2 size={13} />
                                                ) : (
                                                  <FileText size={13} />
                                                )}
                                              </div>
                                              <div className="overflow-hidden min-w-0 flex-1">
                                                <span className="text-xs font-semibold text-[var(--text-main)] block truncate group-hover:text-indigo-500 transition-colors" title={res.title}>
                                                  {res.title}
                                                </span>
                                                <div className="flex items-center gap-1.5 text-[9px] text-[var(--text-muted)] truncate">
                                                  <span className="font-mono px-1 py-0.2 rounded bg-[var(--surface-hover)] border border-[var(--border)]">
                                                    {getDisplayFileName(res)}
                                                  </span>
                                                  <span>•</span>
                                                  <span>{res.file_size || 'Section File'}</span>
                                                </div>
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setReadingResource(res);
                                                  setSidebarOpen(false);
                                                }}
                                                className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-semibold flex items-center gap-1 transition-colors shadow-xs"
                                                title="Read online in secure viewer"
                                              >
                                                <Eye size={11} />
                                                <span>Read</span>
                                              </button>
                                              {isAdmin && (
                                                <>
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleOpenEditModal(res);
                                                      setSidebarOpen(false);
                                                    }}
                                                    className="p-1 rounded-lg bg-[var(--surface-hover)] hover:bg-indigo-500/10 text-[var(--text-muted)] hover:text-indigo-500 transition-colors border border-[var(--border)]"
                                                    title="Rename or Move Resource"
                                                  >
                                                    <Edit3 size={11} />
                                                  </button>
                                                  <a
                                                    href={res.file_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    download
                                                    className="p-1 rounded-lg bg-[var(--surface-hover)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors border border-[var(--border)]"
                                                    title="Download File (Admin Only)"
                                                  >
                                                    <Download size={12} />
                                                  </a>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        ))}

                                        {/* Lecture resources in this section */}
                                        {section.lessons.flatMap((les, lIdx) =>
                                          (les.resources || []).map((res) => (
                                            <div
                                              key={res.id}
                                              className="p-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--primary)] transition-all flex items-center justify-between gap-2 shadow-xs group"
                                            >
                                              <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                                                <div className="p-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] shrink-0">
                                                  {res.resource_type === 'book' ? (
                                                    <BookOpen size={13} />
                                                  ) : res.resource_type === 'code' ? (
                                                    <Code2 size={13} />
                                                  ) : (
                                                    <FileText size={13} />
                                                  )}
                                                </div>
                                                <div className="overflow-hidden min-w-0 flex-1">
                                                  <span className="text-xs font-semibold text-[var(--text-main)] block truncate group-hover:text-[var(--primary)] transition-colors" title={res.title}>
                                                    {res.title}
                                                  </span>
                                                  <div className="flex items-center gap-1.5 text-[9px] text-[var(--text-muted)] truncate">
                                                    <span className="text-emerald-500 font-semibold">
                                                      Lec {sIdx + 1}.{lIdx + 1}
                                                    </span>
                                                    <span>•</span>
                                                    <span className="font-mono px-1 py-0.2 rounded bg-[var(--surface-hover)] border border-[var(--border)]">
                                                      {getDisplayFileName(res)}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>

                                              <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setReadingResource(res);
                                                    setSidebarOpen(false);
                                                  }}
                                                  className="px-2 py-1 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-[10px] font-semibold flex items-center gap-1 transition-colors shadow-xs"
                                                >
                                                  <Eye size={11} />
                                                  <span>Read</span>
                                                </button>
                                                {isAdmin && (
                                                  <a
                                                    href={res.file_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    download
                                                    className="p-1 rounded-lg bg-[var(--surface-hover)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors border border-[var(--border)]"
                                                    title="Download File (Admin Only)"
                                                  >
                                                    <Download size={12} />
                                                  </a>
                                                )}
                                              </div>
                                            </div>
                                          ))
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RENAME & MOVE RESOURCE MODAL */}
      {editingResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <h3 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
                <Edit3 size={18} className="text-indigo-500" />
                <span>Rename & Move Resource</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingResource(null)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)]"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Resource File Name / Title *
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="e.g. 01-Lecture-Notes-Summary.pdf"
                className="input text-sm"
              />
              <span className="text-[11px] text-[var(--text-muted)] mt-1 block">
                Give a clear descriptive name ending in .pdf, .zip, etc.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Destination Target (Move To)
              </label>
              <select
                value={editTarget}
                onChange={(e) => setEditTarget(e.target.value)}
                className="input text-sm"
              >
                <option value="course:general">🌐 Entire Course (Course-Wide Master Reference)</option>
                {course.sections?.map((sec, sIdx) => (
                  <optgroup key={sec.id} label={`📦 Module ${sIdx + 1}: ${sec.title}`}>
                    <option value={`section:${sec.id}`}>📁 End of Module {sIdx + 1} Section Materials</option>
                    {sec.lessons.map((les, lIdx) => (
                      <option key={les.id} value={`lesson:${les.id}`}>
                        📄 Lecture {sIdx + 1}.{lIdx + 1}: {les.title}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <span className="text-[11px] text-[var(--text-muted)] mt-1 block">
                Moving here will instantly place this resource in the selected module/lecture row.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Resource Type
              </label>
              <select
                value={editType}
                onChange={(e) => setEditType(e.target.value as any)}
                className="input text-sm"
              >
                <option value="book">📕 Book / E-Book</option>
                <option value="pdf">📄 PDF Notes</option>
                <option value="document">📑 Document / Slides</option>
                <option value="code">💻 Source Code (.zip)</option>
                <option value="link">🔗 External Link</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
              <Button
                variant="ghost"
                onClick={handleDeleteResource}
                disabled={isSavingEdit}
                className="text-red-500 hover:bg-red-500/10 text-xs px-2.5"
                icon={<Trash2 size={14} />}
              >
                Delete
              </Button>

              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setEditingResource(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveEditResource}
                  disabled={isSavingEdit}
                  icon={isSavingEdit ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                >
                  {isSavingEdit ? 'Saving...' : 'Save & Move'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK RESOURCE UPLOAD MODAL */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-[var(--text-main)]">Attach PDF or Book Resource</h3>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Attach To (Module & Lecture)
              </label>
              <select
                value={uploadTargetLessonId}
                onChange={(e) => setUploadTargetLessonId(e.target.value)}
                className="input text-sm"
              >
                <option value="">🌐 Course-Wide Reference (All Modules & Lectures)</option>
                {course.sections?.map((sec, sIdx) => (
                  <optgroup key={sec.id} label={`📦 Module ${sIdx + 1}: ${sec.title}`}>
                    <option value={`section:${sec.id}`}>📁 End of Module {sIdx + 1} Section Materials</option>
                    {sec.lessons.map((les, lIdx) => (
                      <option key={les.id} value={`lesson:${les.id}`}>
                        📄 Lecture {sIdx + 1}.{lIdx + 1}: {les.title}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

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

      {/* IN-BROWSER INTERACTIVE DOCUMENT & PDF READER MODAL */}
      {readingResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-5xl bg-[var(--surface)] border border-[var(--border)] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[96vh] sm:max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-2.5 sm:p-4 border-b border-[var(--border)] flex items-center justify-between gap-2 sm:gap-4 bg-[var(--surface-hover)]/70">
              <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                  {readingResource.resource_type === 'book' ? <BookOpen size={16} /> : <FileText size={16} />}
                </div>
                <div className="overflow-hidden">
                  <h3 className="text-xs sm:text-sm font-bold text-[var(--text-main)] truncate max-w-[140px] sm:max-w-md">
                    {readingResource.title}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-[var(--text-muted)] truncate flex items-center gap-1.5 sm:gap-2">
                    <span className="uppercase font-semibold">{readingResource.resource_type}</span>
                    <span>•</span>
                    <span>{readingResource.file_size || 'Material'}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline text-emerald-500 font-medium">Interactive Online Reader</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {isAdmin && (
                  <a
                    href={readingResource.file_url}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary text-xs h-7 sm:h-8 px-2 sm:px-3 flex items-center gap-1 shadow-sm"
                    title="Download File (Admin Only)"
                  >
                    <Download size={13} />
                    <span className="hidden sm:inline">Download</span>
                  </a>
                )}
                <a
                  href={readingResource.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary text-xs h-7 sm:h-8 px-2 sm:px-3 flex items-center gap-1 shadow-sm"
                  title="Open in new browser tab"
                >
                  <ExternalLink size={13} />
                  <span className="hidden sm:inline">Open Full</span>
                </a>
                <button
                  type="button"
                  onClick={() => setReadingResource(null)}
                  className="p-1 sm:p-1.5 rounded-full hover:bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                  title="Close Reader"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-2 sm:p-4 bg-gray-950 overflow-hidden flex items-center justify-center">
              {readingResource.resource_type === 'link' ? (
                <div className="text-center p-8 space-y-4 max-w-md bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
                  <ExternalLink size={40} className="mx-auto text-[var(--primary)]" />
                  <h4 className="text-base font-bold text-[var(--text-main)]">{readingResource.title}</h4>
                  <p className="text-xs text-[var(--text-muted)]">{readingResource.description || 'External learning tool or repository.'}</p>
                  <a
                    href={readingResource.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary text-xs px-4 py-2 inline-flex items-center gap-2"
                  >
                    <span>Open External Resource</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              ) : (
                <iframe
                  src={`${readingResource.file_url}#toolbar=0`}
                  title={readingResource.title}
                  className="w-full h-[75vh] border-0 rounded-2xl bg-white shadow-inner"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
