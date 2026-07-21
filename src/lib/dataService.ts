import { supabase } from './supabase';

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
  startExamSubmission: async (examId: string, userId) => {
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
  }
};
