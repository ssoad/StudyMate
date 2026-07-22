import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { StudyPlan } from './pages/StudyPlan';
import { Exams } from './pages/Exams';
import { TakeExam } from './pages/TakeExam';
import { Leaderboard } from './pages/Leaderboard';
import { Discussion } from './pages/Discussion';

import { Login } from './pages/Login';
import { Landing } from './pages/Landing';
import { Profile } from './pages/Profile';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminStudyPlans } from './pages/admin/AdminStudyPlans';
import { AdminExams } from './pages/admin/AdminExams';
import { AdminSettings } from './pages/admin/AdminSettings';
import { Resources } from './pages/Resources';
import { AdminResources } from './pages/admin/AdminResources';
import { AdminUsers } from './pages/admin/AdminUsers';
import { hasSupabaseKeys, supabase } from './lib/supabase';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import BackgroundEvaluator from './components/BackgroundEvaluator';

function App() {
  const { user, setAuth } = useAuthStore();
  const { isDark } = useThemeStore();
  const isConfigured = hasSupabaseKeys();

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {

    if (!supabase) return;
    
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      const role = session?.user.email?.includes('admin') ? 'admin' : 'user';
      setAuth(session?.user ?? null, session?.user ? role : null);
      if (session?.user) {
        supabase!.rpc('update_last_access').then(() => {});
      }
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const role = session?.user.email?.includes('admin') ? 'admin' : 'user';
      setAuth(session?.user ?? null, session?.user ? role : null);
      if (session?.user) {
        supabase!.rpc('update_last_access').then(() => {});
      }
    });

    return () => subscription.unsubscribe();
  }, [setAuth]);

  if (!isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-red-200 dark:border-red-900">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Environment Configuration Missing</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            The application cannot start because the Supabase environment variables are missing.
          </p>
          <div className="bg-gray-100 dark:bg-gray-950 p-4 rounded-md font-mono text-sm overflow-x-auto text-gray-800 dark:text-gray-200">
            VITE_SUPABASE_URL<br />
            VITE_SUPABASE_ANON_KEY
          </div>
          <p className="text-gray-600 dark:text-gray-300 mt-4">
            Please add these variables to your Vercel project settings and trigger a redeployment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {user && <BackgroundEvaluator />}
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        
        <Route path="/" element={user ? <Layout /> : <Landing />}>
          {user && (
            <>
              <Route index element={<Dashboard />} />
              <Route path="study-plan" element={<StudyPlan />} />
              <Route path="exams" element={<Exams />} />
              <Route path="exams/:id" element={<TakeExam />} />
              <Route path="leaderboard" element={<Leaderboard />} />
              <Route path="discussion" element={<Discussion />} />
              <Route path="profile" element={<Profile />} />
              <Route path="resources" element={<Resources />} />
              <Route path="admin" element={<AdminDashboard />} />
              <Route path="admin/study-plans" element={<AdminStudyPlans />} />
              <Route path="admin/exams" element={<AdminExams />} />
              <Route path="admin/settings" element={<AdminSettings />} />
              <Route path="admin/resources" element={<AdminResources />} />
              <Route path="admin/users" element={<AdminUsers />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Route>
        
        {!user && <Route path="*" element={<Navigate to="/login" replace />} />}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
