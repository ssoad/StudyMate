import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  Plus, 
  Trash2, 
  Edit, 
  ExternalLink, 
  Search, 
  BookOpen, 
  Clock, 
  FileText,
  Loader2
} from 'lucide-react';
import { YoutubeIcon } from '../../components/YoutubeIcon';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { CourseModal } from '../../components/CourseModal';
import { dataService, type Course } from '../../lib/dataService';
import { useToastStore } from '../../store/toastStore';

export function AdminCourses() {
  const navigate = useNavigate();
  const { addToast } = useToastStore();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    const data = await dataService.getCourses();
    setCourses(data);
    setLoading(false);
  };

  const handleDelete = async (courseId: string) => {
    if (!window.confirm('Are you sure you want to delete this course and its syllabus?')) {
      return;
    }

    await dataService.deleteCourse(courseId);
    setCourses(courses.filter((c) => c.id !== courseId));
    addToast('Course deleted successfully.', 'success');
  };

  const filtered = courses.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase()) ||
      c.instructor_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-3">
            <GraduationCap className="text-[var(--primary)]" size={28} />
            Course Curriculum Management
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Build Udemy-style courses with YouTube playlist imports, lecture modules, and attached PDF books.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            setSelectedCourse(null);
            setIsModalOpen(true);
          }}
          icon={<Plus size={18} />}
        >
          Create New Course
        </Button>
      </div>

      {/* SEARCH TOOLBAR */}
      <div className="flex items-center gap-3 bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)]">
        <Search size={18} className="text-[var(--text-muted)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter courses by title, category, or instructor..."
          className="w-full bg-transparent text-sm text-[var(--text-main)] focus:outline-none"
        />
      </div>

      {/* COURSES TABLE */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={36} className="animate-spin text-[var(--primary)]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-[var(--border)] rounded-2xl bg-[var(--surface)] space-y-3">
          <BookOpen size={40} className="mx-auto text-[var(--text-muted)] opacity-50" />
          <h3 className="text-base font-bold text-[var(--text-main)]">No courses found</h3>
          <p className="text-xs text-[var(--text-muted)]">
            Click 'Create New Course' to add your first course module.
          </p>
        </div>
      ) : (
        <Card className="overflow-hidden border-[var(--border)] bg-[var(--surface)] shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--surface-hover)] border-b border-[var(--border)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="py-3.5 px-6 font-semibold">Course</th>
                  <th className="py-3.5 px-6 font-semibold">Category & Level</th>
                  <th className="py-3.5 px-6 font-semibold">Curriculum</th>
                  <th className="py-3.5 px-6 font-semibold">YouTube Source</th>
                  <th className="py-3.5 px-6 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-sm">
                {filtered.map((course) => {
                  const lectureCount = course.sections?.reduce((acc, s) => acc + s.lessons.length, 0) || 0;
                  const resourceCount =
                    (course.resources?.length || 0) +
                    (course.sections?.reduce(
                      (acc, s) => acc + s.lessons.reduce((lacc, l) => lacc + (l.resources?.length || 0), 0),
                      0
                    ) || 0);

                  return (
                    <tr key={course.id} className="hover:bg-[var(--surface-hover)] transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <img
                            src={course.thumbnail_url}
                            alt={course.title}
                            className="w-14 h-10 object-cover rounded-lg border border-[var(--border)] shrink-0"
                          />
                          <div>
                            <span className="font-bold text-[var(--text-main)] block line-clamp-1">
                              {course.title}
                            </span>
                            <span className="text-xs text-[var(--text-muted)]">
                              By {course.instructor_name}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                            {course.category}
                          </span>
                          <span className="text-xs text-[var(--text-muted)] block capitalize">
                            {course.level.replace('_', ' ')}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1.5 text-[var(--text-main)] font-semibold">
                            <BookOpen size={13} />
                            <span>{course.sections?.length || 0} Modules • {lectureCount} Lectures</span>
                          </div>
                          <div className="flex items-center gap-2 text-[var(--text-muted)]">
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {course.duration}
                            </span>
                            {resourceCount > 0 && (
                              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                                <FileText size={12} />
                                {resourceCount} PDFs
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        {course.youtube_playlist_id ? (
                          <div className="flex items-center gap-1.5 text-xs text-red-500 font-mono">
                            <YoutubeIcon size={16} />
                            <span className="truncate max-w-[120px]">
                              {course.youtube_playlist_id}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)]">Individual Videos</span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/courses/${course.id}`)}
                            className="p-2 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors"
                            title="Preview in Student Classroom"
                          >
                            <ExternalLink size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCourse(course);
                              setIsModalOpen(true);
                            }}
                            className="p-2 text-[var(--text-muted)] hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-colors"
                            title="Edit Course"
                          >
                            <Edit size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(course.id)}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete Course"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* COURSE MODAL */}
      <CourseModal
        isOpen={isModalOpen}
        initialCourse={selectedCourse}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCourse(null);
        }}
        onSuccess={() => {
          loadCourses();
        }}
      />
    </div>
  );
}
