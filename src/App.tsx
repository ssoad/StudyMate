import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
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
import { AdminEnrollments } from './pages/admin/AdminEnrollments';
import { AdminStudyPlans } from './pages/admin/AdminStudyPlans';
import { AdminExams } from './pages/admin/AdminExams';
import { AdminSettings } from './pages/admin/AdminSettings';
import { Resources } from './pages/Resources';
import { AdminResources } from './pages/admin/AdminResources';
import { AdminUsers } from './pages/admin/AdminUsers';
import { Courses } from './pages/Courses';
import { CourseOverview } from './pages/CourseOverview';
import { CoursePlayer } from './pages/CoursePlayer';
import { AdminCourses } from './pages/admin/AdminCourses';
import { hasSupabaseKeys, supabase } from './lib/supabase';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import BackgroundEvaluator from './components/BackgroundEvaluator';

function LoginRedirect() {
  const [searchParams] = useSearchParams();
  const dest = searchParams.get('redirect') || '/';
  return <Navigate to={dest} replace />;
}

function App() {
  const { user, role, setAuth } = useAuthStore();
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
      const isAdmin = session?.user.email === 'admin@studymate.org' || session?.user.email === 'admin@studymate.local' || session?.user.app_metadata?.role === 'admin';
      const authRole = isAdmin ? 'admin' : 'user';
      setAuth(session?.user ?? null, session?.user ? authRole : null);
      if (session?.user) {
        supabase!.rpc('update_last_access').then(() => {});
      }
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const isAdmin = session?.user.email === 'admin@studymate.org' || session?.user.email === 'admin@studymate.local' || session?.user.app_metadata?.role === 'admin';
      const authRole = isAdmin ? 'admin' : 'user';
      setAuth(session?.user ?? null, session?.user ? authRole : null);
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
        {/* LOGIN ROUTE */}
        <Route path="/login" element={user ? <LoginRedirect /> : <Login />} />
        
        {/* ROOT / LANDING / DASHBOARD */}
        <Route path="/" element={user ? <Layout /> : <Landing />}>
          {user && <Route index element={<Dashboard />} />}
        </Route>

        {/* APPLICATION ROUTES (WITH SHELL LAYOUT) */}
        <Route element={<Layout />}>
          {/* Public Courses Routes (Accessible to everyone) */}
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:id" element={<CourseOverview />} />

          {/* Classroom Player - Restricted to approved students & admins */}
          <Route
            path="/courses/:id/learn"
            element={user ? <CoursePlayer /> : <Navigate to="/courses" replace />}
          />

          {/* Protected Student Routes */}
          <Route path="/study-plan" element={user ? <StudyPlan /> : <Navigate to="/login?redirect=/study-plan" replace />} />
          <Route path="/exams" element={user ? <Exams /> : <Navigate to="/login?redirect=/exams" replace />} />
          <Route path="/exams/:id" element={user ? <TakeExam /> : <Navigate to="/login" replace />} />
          <Route path="/leaderboard" element={user ? <Leaderboard /> : <Navigate to="/login" replace />} />
          <Route path="/discussion" element={user ? <Discussion /> : <Navigate to="/login" replace />} />
          <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" replace />} />
          <Route path="/resources" element={user ? <Resources /> : <Navigate to="/login?redirect=/resources" replace />} />

          {/* Protected Admin Routes */}
          <Route path="/admin" element={user && role === 'admin' ? <AdminDashboard /> : <Navigate to="/" replace />} />
          <Route path="/admin/enrollments" element={user && role === 'admin' ? <AdminEnrollments /> : <Navigate to="/" replace />} />
          <Route path="/admin/courses" element={user && role === 'admin' ? <AdminCourses /> : <Navigate to="/" replace />} />
          <Route path="/admin/study-plans" element={user && role === 'admin' ? <AdminStudyPlans /> : <Navigate to="/" replace />} />
          <Route path="/admin/exams" element={user && role === 'admin' ? <AdminExams /> : <Navigate to="/" replace />} />
          <Route path="/admin/settings" element={user && role === 'admin' ? <AdminSettings /> : <Navigate to="/" replace />} />
          <Route path="/admin/resources" element={user && role === 'admin' ? <AdminResources /> : <Navigate to="/" replace />} />
          <Route path="/admin/users" element={user && role === 'admin' ? <AdminUsers /> : <Navigate to="/" replace />} />
        </Route>

        {/* CATCH-ALL */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
