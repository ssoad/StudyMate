import { supabase } from './supabase';
import { INITIAL_DEMO_COURSES } from './demoCourses';

export interface StudyResource {
  id: string;
  title: string;
  description?: string;
  type: 'file' | 'link';
  url: string;
  uploader_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at?: string;
  uploader?: { full_name?: string; email: string }; // For joins
}
export interface CourseResource {
  id: string;
  course_id: string;
  lesson_id?: string | null;
  title: string;
  description?: string;
  resource_type: 'pdf' | 'book' | 'document' | 'link' | 'code' | 'zip';
  file_url: string;
  file_size?: string;
  uploader_id?: string;
  created_at?: string;
}

export interface CourseLesson {
  id: string;
  section_id: string;
  course_id: string;
  title: string;
  description?: string;
  youtube_video_id?: string;
  youtube_video_url?: string;
  duration_seconds?: number;
  order_index: number;
  is_preview?: boolean;
  created_at?: string;
  resources?: CourseResource[];
}

export interface CourseSection {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  created_at?: string;
  lessons: CourseLesson[];
}

export interface Course {
  id: string;
  title: string;
  slug?: string;
  description: string;
  instructor_name: string;
  instructor_title?: string;
  instructor_avatar?: string;
  thumbnail_url: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'all_levels';
  youtube_playlist_url?: string;
  youtube_playlist_id?: string;
  duration: string;
  rating: number;
  enrolled_count: number;
  is_published: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  sections?: CourseSection[];
  resources?: CourseResource[];
}

export interface UserCourseProgress {
  id?: string;
  user_id: string;
  course_id: string;
  completed_lessons: string[];
  last_lesson_id?: string;
  is_completed?: boolean;
  updated_at?: string;
}

export interface StudyDay {
  id: string;
  week: number;
  day: number;
  phase: string;
  subject: string;
  module: string;
  detailed_topics: string;
  hours: number;
  mcq_target: number;
  written_target: number;
  pyq_target: number;
  practice_checklist: string;
  daily_deliverable: string;
  status: string;
  notes: string;
  source: string;
}

export interface Exam {
  id: string;
  title: string;
  type: string;
  duration: number;
  questions: number;
  due_date: string | null;
}

export interface ExamQuestion {
  id: string;
  exam_id: string;
  type: 'mcq' | 'written';
  question_text: string;
  options?: string[];
  correct_option?: number;
  points: number;
  created_at?: string;
}

export interface ExamSubmission {
  id: string;
  exam_id: string;
  user_id: string;
  status: 'started' | 'submitted' | 'evaluating' | 'graded';
  score?: number;
  created_at?: string;
  
  // Joins
  user?: { full_name: string; email: string };
}

export interface ExamAnswer {
  id?: string;
  submission_id: string;
  question_id: string;
  selected_option?: number; // for mcq
  answer_file_url?: string; // for written
  is_correct?: boolean;
  points_awarded?: number;
  feedback?: string;
  created_at?: string;
}

export interface DiscussionPost {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author_id: string;
}

export interface UserProfile {
  id: string;
  email: string;
  points: number;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  last_accessed_at?: string;
  last_accessed_ip?: string;
}

export interface SystemSetting {
  key: string;
  value: any;
  updated_at?: string;
}

export const dataService = {
  // Stats
  getStats: async () => {
    const [
      { count: usersCount },
      { count: topicsCount },
      { count: discussionsCount }
    ] = await Promise.all([
      supabase!.from('profiles').select('*', { count: 'exact', head: true }),
      supabase!.from('study_days').select('*', { count: 'exact', head: true }),
      supabase!.from('discussions').select('*', { count: 'exact', head: true }),
    ]);
    return {
      users: usersCount || 0,
      topics: topicsCount || 0,
      discussions: discussionsCount || 0
    };
  },

  getDashboardStats: async () => {
    const [
      { count: topicsCount },
      { count: pendingExamsCount }
    ] = await Promise.all([
      supabase!.from('study_days').select('*', { count: 'exact', head: true }),
      supabase!.from('exams').select('*', { count: 'exact', head: true }),
      // For a real app, pending exams would join with submissions where user_id = userId
    ]);
    return {
      totalTopics: topicsCount || 0,
      pendingExams: pendingExamsCount || 0
    };
  },

  // Study Days (replaces Topics)
  getStudyDays: async () => {
    return await supabase!.from('study_days').select('*').order('day', { ascending: true });
  },
  addStudyDay: async (studyDay: Omit<StudyDay, 'id'>) => {
    return await supabase!.from('study_days').insert(studyDay);
  },
  updateStudyDay: async (id: string, updates: Partial<StudyDay>) => {
    return await supabase!.from('study_days').update(updates).eq('id', id);
  },
  deleteStudyDay: async (id: string) => {
    return await supabase!.from('study_days').delete().eq('id', id);
  },
  importStudyDays: async (studyDays: Omit<StudyDay, 'id'>[]) => {
    return await supabase!.from('study_days').insert(studyDays);
  },

  // Exams
  getExams: async () => {
    return await supabase!.from('exams').select('*').order('due_date', { ascending: true });
  },
  addExam: async (exam: { title: string; type: string; duration: number; questions: number; due_date: string | null }) => {
    return await supabase!.from('exams').insert(exam).select().single();
  },
  updateExam: async (id: string, updates: Partial<Exam>) => {
    return await supabase!.from('exams').update(updates).eq('id', id);
  },
  deleteExam: async (id: string) => {
    return await supabase!.from('exams').delete().eq('id', id);
  },

  // Discussions
  getDiscussions: async () => {
    return await supabase!.from('discussions').select('*').order('created_at', { ascending: false });
  },
  addDiscussion: async (discussion: { title: string; content: string; author_id: string }) => {
    return await supabase!.from('discussions').insert(discussion);
  },

  // Leaderboard / User Profile
  getLeaderboard: async () => {
    return await supabase!.from('profiles').select('id, email, points, full_name, avatar_url').order('points', { ascending: false }).limit(10);
  },
  getUserPoints: async (userId: string) => {
    return await supabase!.from('profiles').select('points').eq('id', userId).maybeSingle();
  },
  getAllUsers: async () => {
    return await supabase!.from('profiles').select('*').order('last_accessed_at', { ascending: false, nullsFirst: false });
  },
  getUserProfile: async (userId: string) => {
    return await supabase!.from('profiles').select('*').eq('id', userId).maybeSingle();
  },
  updateProfile: async (userId: string, updates: Partial<UserProfile>) => {
    return await supabase!.from('profiles').update(updates).eq('id', userId);
  },
  uploadAvatar: async (userId: string, file: File) => {
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase!.storage.from('avatars').upload(filePath, file, { upsert: true });
    if (uploadError) return { url: null, error: uploadError };
    const { data } = supabase!.storage.from('avatars').getPublicUrl(filePath);
    return { url: data.publicUrl, error: null };
  },

  // System Settings
  async getSystemSettings() {
    try {
      const { data, error } = await supabase!.from('system_settings').select('*');
      if (error) {
        console.warn('Settings load error:', error);
        return { data: [], error };
      }
      return { data: data || [], error: null };
    } catch (e) {
      console.warn('Settings exception:', e);
      return { data: [], error: e };
    }
  },

  async updateSystemSetting(key: string, value: any) {
    return await supabase!.from('system_settings').upsert({ key, value, updated_at: new Date().toISOString() });
  },

  // Exam Questions
  getExamQuestions: async (examId: string) => {
    return await supabase!.from('exam_questions').select('*').eq('exam_id', examId).order('created_at', { ascending: true });
  },
  addExamQuestions: async (questions: Omit<ExamQuestion, 'id' | 'created_at'>[]) => {
    return await supabase!.from('exam_questions').insert(questions);
  },

  // Exam Submissions
  startExamSubmission: async (examId: string, userId: string) => {
    return await supabase!.from('exam_submissions').insert({ exam_id: examId, user_id: userId, status: 'started' }).select().single();
  },
  submitExamSubmission: async (submissionId: string, score: number) => {
    return await supabase!.from('exam_submissions').update({ status: 'submitted', score }).eq('id', submissionId);
  },
  updateSubmissionStatus: async (submissionId: string, status: 'evaluating' | 'graded', score?: number) => {
    const updates: any = { status };
    if (score !== undefined) updates.score = score;
    return await supabase!.from('exam_submissions').update(updates).eq('id', submissionId);
  },
  queueExamEvaluations: async (examId: string) => {
    return await supabase!.from('exam_submissions').update({ status: 'evaluating' }).eq('exam_id', examId).eq('status', 'submitted').select();
  },
  getPendingEvaluations: async () => {
    return await supabase!.from('exam_submissions').select('*, exams(title, type)').eq('status', 'evaluating');
  },

  // Exam Answers
  saveExamAnswer: async (answer: Omit<ExamAnswer, 'id' | 'created_at'>) => {
    return await supabase!.from('exam_answers').insert(answer);
  },
  updateExamAnswer: async (id: string, updates: Partial<ExamAnswer>) => {
    return await supabase!.from('exam_answers').update(updates).eq('id', id);
  },
  getSubmissionAnswers: async (submissionId: string) => {
    return await supabase!.from('exam_answers').select('*, exam_questions(*)').eq('submission_id', submissionId);
  },
  uploadAnswerFile: async (file: File, submissionId: string, questionId: string) => {
    const fileExt = file.name.split('.').pop();
    const filePath = `${submissionId}/${questionId}_${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase!.storage.from('exam-files').upload(filePath, file);
    if (uploadError) return { url: null, error: uploadError };
    const { data } = supabase!.storage.from('exam-files').getPublicUrl(filePath);
    return { url: data.publicUrl, error: null };
  },
  
  // Study Resources
  getApprovedResources: async () => {
    return await supabase!.from('study_resources').select('*, uploader:profiles(full_name, email)').eq('status', 'approved').order('created_at', { ascending: false });
  },
  
  getPendingResources: async () => {
    return await supabase!.from('study_resources').select('*, uploader:profiles(full_name, email)').eq('status', 'pending').order('created_at', { ascending: true });
  },
  
  getAllResources: async () => {
    return await supabase!.from('study_resources').select('*, uploader:profiles(full_name, email)').order('created_at', { ascending: false });
  },
  
  uploadStudyResourceFile: async (file: File) => {
    // Try local self-hosted storage endpoint first
    try {
      const res = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: { 'x-filename': encodeURIComponent(file.name) },
        body: file,
      });
      if (res.ok) {
        const json = await res.json();
        if (json.url) return { url: json.url, error: null };
      }
    } catch {}

    const fileExt = file.name.split('.').pop();
    const filePath = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error: uploadError } = await supabase!.storage.from('study-resources').upload(filePath, file);
    if (uploadError) return { url: null, error: uploadError };
    const { data } = supabase!.storage.from('study-resources').getPublicUrl(filePath);
    return { url: data.publicUrl, error: null };
  },
  
  submitStudyResource: async (resource: Omit<StudyResource, 'id' | 'created_at' | 'status' | 'uploader'>) => {
    return await supabase!.from('study_resources').insert(resource);
  },
  
  updateResourceStatus: async (id: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase!.from('study_resources').update({ status }).eq('id', id);
    if (error) return { error };
    
    // Reward points for approval
    if (status === 'approved') {
      const { data: resource } = await supabase!.from('study_resources').select('uploader_id').eq('id', id).single();
      if (resource?.uploader_id) {
        const { data: profile } = await supabase!.from('profiles').select('points').eq('id', resource.uploader_id).single();
        if (profile) {
          await supabase!.from('profiles').update({ points: (profile.points || 0) + 50 }).eq('id', resource.uploader_id);
        }
      }
    }
    return { error: null };
  },

  // Courses Module
  getLocalCourses: (): Course[] => {
    try {
      const stored = localStorage.getItem('study_mate_custom_courses');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  saveLocalCourses: (courses: Course[]) => {
    try {
      localStorage.setItem('study_mate_custom_courses', JSON.stringify(courses));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  },

  getCourses: async (): Promise<Course[]> => {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('courses')
          .select('*, sections:course_sections(*, lessons:course_lessons(*, resources:course_resources(*))), resources:course_resources(*)')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const formatted = data.map((course: any) => ({
            ...course,
            sections: (course.sections || []).sort((a: any, b: any) => a.order_index - b.order_index).map((s: any) => ({
              ...s,
              lessons: (s.lessons || []).sort((la: any, lb: any) => la.order_index - lb.order_index)
            }))
          }));
          return formatted;
        }
      }
    } catch (e) {
      console.warn('Supabase courses query failed, falling back:', e);
    }

    const custom = dataService.getLocalCourses();
    return [...custom, ...INITIAL_DEMO_COURSES];
  },

  getCourseById: async (id: string): Promise<Course | null> => {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('courses')
          .select('*, sections:course_sections(*, lessons:course_lessons(*, resources:course_resources(*))), resources:course_resources(*)')
          .eq('id', id)
          .maybeSingle();

        if (!error && data) {
          const sortedSections = (data.sections || []).sort((a: any, b: any) => a.order_index - b.order_index).map((s: any) => ({
            ...s,
            lessons: (s.lessons || []).sort((la: any, lb: any) => la.order_index - lb.order_index)
          }));
          return { ...data, sections: sortedSections };
        }
      }
    } catch (e) {
      console.warn('Failed to load course from Supabase:', e);
    }

    const all = [...dataService.getLocalCourses(), ...INITIAL_DEMO_COURSES];
    return all.find((c) => c.id === id) || null;
  },

  createCourse: async (courseData: Partial<Course>): Promise<{ data: Course | null; error: any }> => {
    const courseId = courseData.id || `course-${Date.now()}`;
    const newCourse: Course = {
      id: courseId,
      title: courseData.title || 'Untitled Course',
      slug: courseData.slug || (courseData.title ? courseData.title.toLowerCase().replace(/\s+/g, '-') : 'course'),
      description: courseData.description || '',
      instructor_name: courseData.instructor_name || 'Instructor',
      instructor_title: courseData.instructor_title || 'Lead Educator',
      instructor_avatar: courseData.instructor_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      thumbnail_url: courseData.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
      category: courseData.category || 'General',
      level: courseData.level || 'all_levels',
      youtube_playlist_url: courseData.youtube_playlist_url,
      youtube_playlist_id: courseData.youtube_playlist_id,
      duration: courseData.duration || '3 hours',
      rating: 5.0,
      enrolled_count: 1,
      is_published: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sections: courseData.sections || [],
      resources: courseData.resources || []
    };

    const local = dataService.getLocalCourses();
    dataService.saveLocalCourses([newCourse, ...local]);

    try {
      if (supabase) {
        const { error: courseError } = await supabase.from('courses').insert({
          id: newCourse.id,
          title: newCourse.title,
          slug: newCourse.slug,
          description: newCourse.description,
          instructor_name: newCourse.instructor_name,
          instructor_title: newCourse.instructor_title,
          instructor_avatar: newCourse.instructor_avatar,
          thumbnail_url: newCourse.thumbnail_url,
          category: newCourse.category,
          level: newCourse.level,
          youtube_playlist_url: newCourse.youtube_playlist_url,
          youtube_playlist_id: newCourse.youtube_playlist_id,
          duration: newCourse.duration,
          is_published: true,
        });

        if (!courseError && newCourse.sections && newCourse.sections.length > 0) {
          for (const sec of newCourse.sections) {
            await supabase.from('course_sections').insert({
              id: sec.id,
              course_id: newCourse.id,
              title: sec.title,
              order_index: sec.order_index,
            });
            if (sec.lessons && sec.lessons.length > 0) {
              for (const les of sec.lessons) {
                await supabase.from('course_lessons').insert({
                  id: les.id,
                  section_id: sec.id,
                  course_id: newCourse.id,
                  title: les.title,
                  description: les.description,
                  youtube_video_id: les.youtube_video_id,
                  youtube_video_url: les.youtube_video_url,
                  duration_seconds: les.duration_seconds,
                  order_index: les.order_index,
                  is_preview: les.is_preview,
                });
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('Supabase course persistence note:', e);
    }

    return { data: newCourse, error: null };
  },

  deleteCourse: async (courseId: string) => {
    const local = dataService.getLocalCourses();
    dataService.saveLocalCourses(local.filter((c) => c.id !== courseId));

    try {
      if (supabase) {
        await supabase.from('courses').delete().eq('id', courseId);
      }
    } catch (e) {
      console.warn('Supabase delete error:', e);
    }
    return { error: null };
  },

  uploadCourseResourceFile: async (file: File) => {
    // Try local self-hosted storage endpoint first
    try {
      const res = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: { 'x-filename': encodeURIComponent(file.name) },
        body: file,
      });
      if (res.ok) {
        const json = await res.json();
        if (json.url) return { url: json.url, error: null };
      }
    } catch {}

    const fileExt = file.name.split('.').pop();
    const filePath = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    try {
      const { error } = await supabase!.storage.from('course-resources').upload(filePath, file);
      if (error) {
        const res = await supabase!.storage.from('study-resources').upload(filePath, file);
        if (res.error) return { url: null, error: res.error };
        const pub = supabase!.storage.from('study-resources').getPublicUrl(filePath);
        return { url: pub.data.publicUrl, error: null };
      }
      const pub = supabase!.storage.from('course-resources').getPublicUrl(filePath);
      return { url: pub.data.publicUrl, error: null };
    } catch (e) {
      return { url: null, error: e };
    }
  },

  addCourseResource: async (resource: Omit<CourseResource, 'id' | 'created_at'>): Promise<{ data: CourseResource | null; error: any }> => {
    const newRes: CourseResource = {
      ...resource,
      id: `res-${Date.now()}`,
      created_at: new Date().toISOString()
    };

    // Update in local courses if found
    const local = dataService.getLocalCourses();
    const updated = local.map(c => {
      if (c.id === resource.course_id) {
        return {
          ...c,
          resources: [...(c.resources || []), newRes]
        };
      }
      return c;
    });
    dataService.saveLocalCourses(updated);

    try {
      if (supabase) {
        await supabase.from('course_resources').insert({
          id: newRes.id,
          course_id: newRes.course_id,
          lesson_id: newRes.lesson_id,
          title: newRes.title,
          description: newRes.description,
          resource_type: newRes.resource_type,
          file_url: newRes.file_url,
          file_size: newRes.file_size,
          uploader_id: newRes.uploader_id
        });
      }
    } catch (e) {
      console.warn('Supabase course_resource insert warning:', e);
    }

    return { data: newRes, error: null };
  },

  getUserCourseProgress: async (userId: string, courseId: string): Promise<UserCourseProgress | null> => {
    const localKey = `study_mate_progress_${userId}_${courseId}`;
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('course_user_progress')
          .select('*')
          .eq('user_id', userId)
          .eq('course_id', courseId)
          .maybeSingle();

        if (!error && data) {
          return {
            ...data,
            completed_lessons: Array.isArray(data.completed_lessons) ? data.completed_lessons : [],
          };
        }
      }
    } catch (e) {
      console.warn('Progress fetch warning:', e);
    }

    try {
      const stored = localStorage.getItem(localKey);
      return stored ? JSON.parse(stored) : { user_id: userId, course_id: courseId, completed_lessons: [] };
    } catch {
      return { user_id: userId, course_id: courseId, completed_lessons: [] };
    }
  },

  toggleLessonProgress: async (userId: string, courseId: string, lessonId: string): Promise<UserCourseProgress> => {
    const current = (await dataService.getUserCourseProgress(userId, courseId)) || {
      user_id: userId,
      course_id: courseId,
      completed_lessons: [],
    };

    const isDone = current.completed_lessons.includes(lessonId);
    const updatedLessons = isDone
      ? current.completed_lessons.filter((id) => id !== lessonId)
      : [...current.completed_lessons, lessonId];

    const updated: UserCourseProgress = {
      ...current,
      user_id: userId,
      course_id: courseId,
      completed_lessons: updatedLessons,
      last_lesson_id: lessonId,
      updated_at: new Date().toISOString(),
    };

    const localKey = `study_mate_progress_${userId}_${courseId}`;
    try {
      localStorage.setItem(localKey, JSON.stringify(updated));
    } catch {}

    if (!isDone) {
      try {
        const { data: profile } = await supabase!.from('profiles').select('points').eq('id', userId).single();
        if (profile) {
          await supabase!.from('profiles').update({ points: (profile.points || 0) + 15 }).eq('id', userId);
        }
      } catch {}
    }

    try {
      if (supabase) {
        await supabase.from('course_user_progress').upsert({
          user_id: userId,
          course_id: courseId,
          completed_lessons: updatedLessons,
          last_lesson_id: lessonId,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,course_id' });
      }
    } catch (e) {
      console.warn('Supabase progress upsert warning:', e);
    }

    return updated;
  },

  getLessonNote: async (userId: string, lessonId: string): Promise<string> => {
    const localKey = `study_mate_note_${userId}_${lessonId}`;
    try {
      if (supabase) {
        const { data } = await supabase
          .from('course_lesson_notes')
          .select('note_text')
          .eq('user_id', userId)
          .eq('lesson_id', lessonId)
          .maybeSingle();
        if (data?.note_text) return data.note_text;
      }
    } catch {}

    return localStorage.getItem(localKey) || '';
  },

  saveLessonNote: async (userId: string, lessonId: string, noteText: string): Promise<void> => {
    const localKey = `study_mate_note_${userId}_${lessonId}`;
    try {
      localStorage.setItem(localKey, noteText);
    } catch {}

    try {
      if (supabase) {
        await supabase.from('course_lesson_notes').upsert({
          user_id: userId,
          lesson_id: lessonId,
          note_text: noteText,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,lesson_id' });
      }
    } catch {}
  }
};
