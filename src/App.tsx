import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { StudyPlan } from './pages/StudyPlan';
import { Exams } from './pages/Exams';
import { TakeExam } from './pages/TakeExam';
import { Leaderboard } from './pages/Leaderboard';
import { Discussion } from './pages/Discussion';
import { Setup } from './pages/Setup';
import { Login } from './pages/Login';
import { Landing } from './pages/Landing';
import { Profile } from './pages/Profile';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminStudyPlans } from './pages/admin/AdminStudyPlans';
import { AdminExams } from './pages/admin/AdminExams';
import { AdminSettings } from './pages/admin/AdminSettings';
import { Resources } from './pages/Resources';
import { AdminResources } from './pages/admin/AdminResources';
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
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const role = session?.user.email?.includes('admin') ? 'admin' : 'user';
      setAuth(session?.user ?? null, session?.user ? role : null);
    });

    return () => subscription.unsubscribe();
  }, [setAuth]);

  if (!isConfigured) {
    return <Setup />;
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
