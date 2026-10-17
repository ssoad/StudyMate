import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  BookOpen, 
  Plus, 
  Trash2, 
  Sparkles, 
  CheckCircle2, 
  Loader2, 
  ExternalLink,
  Layers
} from 'lucide-react';
import { YoutubeIcon } from './YoutubeIcon';
import { Button } from './Button';
import { dataService, type Course, type CourseSection, type CourseLesson, type CourseResource } from '../lib/dataService';
import { extractPlaylistId, extractVideoId } from '../lib/youtube';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';

interface CourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (course: Course) => void;
  initialCourse?: Course | null;
}

export function CourseModal({ isOpen, onClose, onSuccess, initialCourse }: CourseModalProps) {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();

  const [activeTab, setActiveTab] = useState<'details' | 'curriculum' | 'resources'>('details');

  // Course Details
  const [title, setTitle] = useState(initialCourse?.title || '');
  const [description, setDescription] = useState(initialCourse?.description || '');
  const [category, setCategory] = useState(initialCourse?.category || 'Web Development');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced' | 'all_levels'>(initialCourse?.level || 'all_levels');
  const [instructorName, setInstructorName] = useState(initialCourse?.instructor_name || user?.email?.split('@')[0] || 'Instructor');
  const [instructorTitle, setInstructorTitle] = useState(initialCourse?.instructor_title || 'Lead Educator');
  const [thumbnailUrl, setThumbnailUrl] = useState(initialCourse?.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80');
  const [youtubePlaylistUrl, setYoutubePlaylistUrl] = useState(initialCourse?.youtube_playlist_url || '');

  // Curriculum State
  const [sections, setSections] = useState<CourseSection[]>(
    initialCourse?.sections || [
      {
        id: `sec-${Date.now()}`,
        course_id: initialCourse?.id || '',
        title: 'Module 1: Introduction & Fundamentals',
        order_index: 0,
        lessons: [
          {
            id: `les-${Date.now()}-1`,
            section_id: `sec-${Date.now()}`,
            course_id: initialCourse?.id || '',
            title: '01. Welcome & Curriculum Overview',
            description: 'Course introduction and what you will learn.',
            youtube_video_url: '',
            youtube_video_id: '',
            duration_seconds: 600,
            order_index: 0,
            is_preview: true,
          },
        ],
      },
    ]
  );

  // Resources State
  const [resources, setResources] = useState<CourseResource[]>(initialCourse?.resources || []);
  const [newResourceTitle, setNewResourceTitle] = useState('');
  const [newResourceType, setNewResourceType] = useState<'pdf' | 'book' | 'document' | 'link' | 'code'>('book');
  const [newResourceFile, setNewResourceFile] = useState<File | null>(null);
  const [newResourceUrl, setNewResourceUrl] = useState('');
  const [uploadingResource, setUploadingResource] = useState(false);

  // Quick Playlist Import state
  const [playlistPreviewId, setPlaylistPreviewId] = useState<string | null>(
    extractPlaylistId(initialCourse?.youtube_playlist_url || '')
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Handle YouTube playlist URL changes
  const handlePlaylistChange = (url: string) => {
    setYoutubePlaylistUrl(url);
    const parsedId = extractPlaylistId(url);
    setPlaylistPreviewId(parsedId);
  };

  // Add Section
  const handleAddSection = () => {
    const newSecId = `sec-${Date.now()}`;
    setSections([
      ...sections,
      {
        id: newSecId,
        course_id: initialCourse?.id || '',
        title: `Module ${sections.length + 1}: Next Topic`,
        order_index: sections.length,
        lessons: [
          {
            id: `les-${Date.now()}`,
            section_id: newSecId,
            course_id: initialCourse?.id || '',
            title: `01. Lecture Title`,
            description: '',
            youtube_video_url: '',
            youtube_video_id: '',
            duration_seconds: 600,
            order_index: 0,
            is_preview: false,
          },
        ],
      },
    ]);
  };

  // Remove Section
  const handleRemoveSection = (sectionIndex: number) => {
    if (sections.length <= 1) {
      addToast('A course must have at least one module.', 'info');
      return;
    }
    setSections(sections.filter((_, idx) => idx !== sectionIndex));
  };

  // Add Lesson
  const handleAddLesson = (sectionIndex: number) => {
    const updated = [...sections];
    const targetSection = updated[sectionIndex];
    const lessonOrder = targetSection.lessons.length;
    targetSection.lessons.push({
      id: `les-${Date.now()}-${lessonOrder}`,
      section_id: targetSection.id,
      course_id: initialCourse?.id || '',
      title: `${lessonOrder + 1 < 10 ? '0' : ''}${lessonOrder + 1}. New Lecture`,
      description: '',
      youtube_video_url: '',
      youtube_video_id: '',
      duration_seconds: 600,
      order_index: lessonOrder,
      is_preview: false,
    });
    setSections(updated);
  };

  // Remove Lesson
  const handleRemoveLesson = (sectionIndex: number, lessonIndex: number) => {
    const updated = [...sections];
    if (updated[sectionIndex].lessons.length <= 1) {
      addToast('A section must have at least one lesson.', 'info');
      return;
    }
    updated[sectionIndex].lessons = updated[sectionIndex].lessons.filter((_, idx) => idx !== lessonIndex);
    setSections(updated);
  };

  // Update Lesson
  const handleUpdateLesson = (sectionIndex: number, lessonIndex: number, field: keyof CourseLesson, value: any) => {
    const updated = [...sections];
    const lesson = updated[sectionIndex].lessons[lessonIndex];

    if (field === 'youtube_video_url') {
      const vId = extractVideoId(value);
      lesson.youtube_video_url = value;
      lesson.youtube_video_id = vId || '';
    } else {
      (lesson as any)[field] = value;
    }

    setSections(updated);
  };

  // Upload or Add Resource
  const handleAddResource = async () => {
    if (!newResourceTitle.trim()) {
      addToast('Please provide a title for the resource.', 'info');
      return;
    }

    if (!newResourceFile && !newResourceUrl.trim()) {
      addToast('Please select a file to upload or enter a link URL.', 'info');
      return;
    }

    setUploadingResource(true);
    let finalUrl = newResourceUrl.trim();
    let fileSize = '1.0 MB';

    if (newResourceFile) {
      fileSize = `${(newResourceFile.size / (1024 * 1024)).toFixed(1)} MB`;
      const { url, error } = await dataService.uploadCourseResourceFile(newResourceFile);
      if (error || !url) {
        addToast('File upload failed. Defaulting to local file attachment.', 'error');
        finalUrl = URL.createObjectURL(newResourceFile);
      } else {
        finalUrl = url;
      }
    }

    const newRes: CourseResource = {
      id: `res-${Date.now()}`,
      course_id: initialCourse?.id || 'course-temp',
      title: newResourceTitle.trim(),
      resource_type: newResourceType,
      file_url: finalUrl,
      file_size: fileSize,
      created_at: new Date().toISOString(),
    };

    setResources([...resources, newRes]);
    setNewResourceTitle('');
    setNewResourceFile(null);
    setNewResourceUrl('');
    setUploadingResource(false);
    addToast('Resource attached successfully!', 'success');
  };

  // Submit Course
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      addToast('Please enter a course title.', 'info');
      return;
    }

    setIsSubmitting(true);

    const playlistId = extractPlaylistId(youtubePlaylistUrl) || undefined;

    // Estimate duration
    const totalLessons = sections.reduce((acc, s) => acc + s.lessons.length, 0);
    const estimatedHours = Math.max(1, Math.round((totalLessons * 15) / 60));

    const coursePayload: Partial<Course> = {
      id: initialCourse?.id,
      title: title.trim(),
      description: description.trim(),
      category,
      level,
      instructor_name: instructorName.trim(),
      instructor_title: instructorTitle.trim(),
      thumbnail_url: thumbnailUrl.trim(),
      youtube_playlist_url: youtubePlaylistUrl.trim() || undefined,
      youtube_playlist_id: playlistId,
      duration: `${estimatedHours} hours`,
      sections,
      resources,
    };

    const { data: created, error } = await dataService.createCourse(coursePayload);

    setIsSubmitting(false);

    if (error) {
      addToast('Failed to create course.', 'error');
      return;
    }

    addToast('Course created & published successfully!', 'success');
    if (created) {
      onSuccess(created);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* MODAL HEADER */}
        <div className="p-5 border-b border-[var(--border)] flex items-center justify-between bg-gradient-to-r from-[var(--surface)] to-[var(--surface-hover)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-md">
              <BookOpen size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-main)]">
                {initialCourse ? 'Edit Course' : 'Create Course Module'}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                YouTube playlist integration, curriculum planner & resource uploads
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* MODAL NAVIGATION TABS */}
        <div className="flex border-b border-[var(--border)] bg-[var(--surface)] px-6">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`py-3 px-4 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'details'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Sparkles size={16} />
            1. Course Details & Playlist
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('curriculum')}
            className={`py-3 px-4 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'curriculum'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Layers size={16} />
            2. Curriculum & Lectures ({sections.reduce((acc, s) => acc + s.lessons.length, 0)})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('resources')}
            className={`py-3 px-4 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'resources'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <FileText size={16} />
            3. Books & PDFs ({resources.length})
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: DETAILS & YOUTUBE PLAYLIST */}
          {activeTab === 'details' && (
            <div className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                    Course Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Master React & Next.js from Scratch"
                    className="input text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="input text-sm"
                  >
                    <option value="Web Development">Web Development</option>
                    <option value="Artificial Intelligence">Artificial Intelligence & LLMs</option>
                    <option value="Computer Science">Computer Science & DSA</option>
                    <option value="Mobile Development">Mobile Development</option>
                    <option value="Exam Preparation">Exam Preparation</option>
                    <option value="Mathematics">Mathematics & Sciences</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                  Course Description & Objectives
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What will students learn in this course? Key prerequisites and highlights..."
                  className="input text-sm resize-none"
                />
              </div>

              {/* YOUTUBE PLAYLIST LINK SECTION */}
              <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 dark:bg-red-500/10 space-y-3">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold text-sm">
                  <YoutubeIcon size={20} />
                  <span>YouTube Playlist Integration</span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Paste a YouTube playlist link or video URL. StudyMate will embed the playlist seamlessly into the student classroom player.
                </p>
                <div className="relative">
                  <input
                    type="url"
                    value={youtubePlaylistUrl}
                    onChange={(e) => handlePlaylistChange(e.target.value)}
                    placeholder="https://www.youtube.com/playlist?list=PL4cUxeGkcC9gUdyKqU_R64bVrqsJg_"
                    className="input text-sm font-mono pr-24"
                  />
                  {playlistPreviewId && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-md border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      ID: {playlistPreviewId.substring(0, 10)}...
                    </span>
                  )}
                </div>

                {playlistPreviewId && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-[var(--border)] aspect-video max-h-48 bg-black">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/videoseries?list=${playlistPreviewId}`}
                      title="YouTube Playlist Preview"
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                    Difficulty Level
                  </label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value as any)}
                    className="input text-sm"
                  >
                    <option value="all_levels">All Levels</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                    Instructor Name
                  </label>
                  <input
                    type="text"
                    value={instructorName}
                    onChange={(e) => setInstructorName(e.target.value)}
                    className="input text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                    Instructor Title
                  </label>
                  <input
                    type="text"
                    value={instructorTitle}
                    onChange={(e) => setInstructorTitle(e.target.value)}
                    className="input text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                  Course Thumbnail Image URL
                </label>
                <input
                  type="url"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="input text-sm"
                />
              </div>
            </div>
          )}

          {/* TAB 2: CURRICULUM & LECTURES */}
          {activeTab === 'curriculum' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[var(--text-main)]">Course Syllabus & Modules</h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Structure lectures into sections. Add YouTube video links for individual lessons.
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={handleAddSection} icon={<Plus size={16} />}>
                  Add Section
                </Button>
              </div>

              <div className="space-y-4">
                {sections.map((section, sIdx) => (
                  <div
                    key={section.id}
                    className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-xs font-mono font-bold bg-[var(--primary)] text-white px-2 py-0.5 rounded">
                          Sec {sIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => {
                            const updated = [...sections];
                            updated[sIdx].title = e.target.value;
                            setSections(updated);
                          }}
                          className="input text-sm font-semibold bg-[var(--surface)] py-1.5"
                          placeholder="Section Title"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSection(sIdx)}
                        className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete Section"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Lessons inside Section */}
                    <div className="space-y-2 pl-3 border-l-2 border-[var(--border)]">
                      {section.lessons.map((lesson, lIdx) => (
                        <div
                          key={lesson.id}
                          className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                        >
                          <div className="flex-1 w-full space-y-1">
                            <input
                              type="text"
                              value={lesson.title}
                              onChange={(e) => handleUpdateLesson(sIdx, lIdx, 'title', e.target.value)}
                              placeholder="Lecture Title"
                              className="w-full bg-transparent font-medium text-sm text-[var(--text-main)] focus:outline-none border-b border-transparent focus:border-[var(--primary)]"
                            />
                            <div className="flex items-center gap-2">
                              <YoutubeIcon size={14} className="text-red-500 shrink-0" />
                              <input
                                type="text"
                                value={lesson.youtube_video_url || ''}
                                onChange={(e) => handleUpdateLesson(sIdx, lIdx, 'youtube_video_url', e.target.value)}
                                placeholder="YouTube Video URL or ID (e.g. https://youtu.be/...)"
                                className="w-full bg-transparent text-xs text-[var(--text-muted)] font-mono focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                            <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={lesson.is_preview || false}
                                onChange={(e) => handleUpdateLesson(sIdx, lIdx, 'is_preview', e.target.checked)}
                                className="rounded text-[var(--primary)]"
                              />
                              Free Preview
                            </label>
                            <button
                              type="button"
                              onClick={() => handleRemoveLesson(sIdx, lIdx)}
                              className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                              title="Delete Lesson"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAddLesson(sIdx)}
                        className="text-xs text-[var(--primary)] mt-1"
                        icon={<Plus size={14} />}
                      >
                        Add Lecture
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: BOOKS & PDF RESOURCES */}
          {activeTab === 'resources' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-base font-bold text-[var(--text-main)]">Upload Course Materials & Books</h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Attach PDFs, e-books, cheat sheets, code repositories, or reference slides. Students can download or view them in the classroom player.
                </p>
              </div>

              {/* RESOURCE UPLOAD FORM */}
              <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                      Resource Title *
                    </label>
                    <input
                      type="text"
                      value={newResourceTitle}
                      onChange={(e) => setNewResourceTitle(e.target.value)}
                      placeholder="e.g. Comprehensive Course Handbook (PDF)"
                      className="input text-sm bg-[var(--surface)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                      Resource Type
                    </label>
                    <select
                      value={newResourceType}
                      onChange={(e) => setNewResourceType(e.target.value as any)}
                      className="input text-sm bg-[var(--surface)]"
                    >
                      <option value="book">📕 Book / E-Book</option>
                      <option value="pdf">📄 PDF Notes / Cheatsheet</option>
                      <option value="document">📑 Document / Slides</option>
                      <option value="code">💻 Source Code / Repo</option>
                      <option value="link">🔗 External Reference Link</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                      Upload File (PDF, EPUB, DOCX, ZIP)
                    </label>
                    <div className="relative border-2 border-dashed border-[var(--border)] hover:border-[var(--primary)] rounded-xl p-4 text-center cursor-pointer transition-colors bg-[var(--surface)]">
                      <input
                        type="file"
                        onChange={(e) => setNewResourceFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <Upload size={24} className="mx-auto text-[var(--text-muted)] mb-1" />
                      <span className="text-xs font-medium text-[var(--text-main)] block">
                        {newResourceFile ? newResourceFile.name : 'Click or drop PDF / Book here'}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">Max size 50MB</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                      Or External URL / Drive Link
                    </label>
                    <input
                      type="url"
                      value={newResourceUrl}
                      onChange={(e) => setNewResourceUrl(e.target.value)}
                      placeholder="https://..."
                      className="input text-sm bg-[var(--surface)]"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddResource}
                      disabled={uploadingResource}
                      className="w-full mt-3 justify-center"
                      icon={uploadingResource ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    >
                      {uploadingResource ? 'Uploading...' : 'Attach Resource'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* ATTACHED RESOURCES LIST */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Attached Resources ({resources.length})
                </h4>

                {resources.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-[var(--border)] rounded-xl text-xs text-[var(--text-muted)]">
                    No resources attached yet. Add textbook PDFs or notes above.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {resources.map((res, index) => (
                      <div
                        key={res.id || index}
                        className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-center justify-between gap-3 shadow-sm hover:border-[var(--primary)] transition-all"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="p-2 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] shrink-0">
                            {res.resource_type === 'book' ? <BookOpen size={18} /> : <FileText size={18} />}
                          </div>
                          <div className="overflow-hidden">
                            <span className="text-sm font-semibold text-[var(--text-main)] truncate block">
                              {res.title}
                            </span>
                            <span className="text-xs text-[var(--text-muted)] flex items-center gap-2">
                              <span className="uppercase text-[10px] font-bold bg-[var(--surface-hover)] px-1.5 py-0.5 rounded">
                                {res.resource_type}
                              </span>
                              {res.file_size || 'File'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {res.file_url && (
                            <a
                              href={res.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--primary)] rounded-lg transition-colors"
                              title="Preview Resource"
                            >
                              <ExternalLink size={16} />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => setResources(resources.filter((_, idx) => idx !== index))}
                            className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Remove"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-5 border-t border-[var(--border)] flex items-center justify-between bg-[var(--surface)]">
          <div className="flex items-center gap-2">
            {activeTab !== 'details' && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setActiveTab(activeTab === 'resources' ? 'curriculum' : 'details')}
              >
                Previous Step
              </Button>
            )}
            {activeTab !== 'resources' && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setActiveTab(activeTab === 'details' ? 'curriculum' : 'resources')}
              >
                Next Step
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
              icon={isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            >
              {isSubmitting ? 'Saving Course...' : initialCourse ? 'Update Course' : 'Create & Publish Course'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
