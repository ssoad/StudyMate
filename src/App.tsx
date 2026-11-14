import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Landing } from './pages/Landing';

// Pages load on demand so the first visit only downloads what it shows.
const named = <T extends string>(loader: () => Promise<Record<T, React.ComponentType>>, name: T) =>
  lazy(() => loader().then((m) => ({ default: m[name] })));

const Dashboard = named(() => import('./pages/Dashboard'), 'Dashboard');
const StudyPlans = named(() => import('./pages/StudyPlans'), 'StudyPlans');
const StudyPlanDetail = named(() => import('./pages/StudyPlanDetail'), 'StudyPlanDetail');
const StudyPlanEditor = named(() => import('./pages/StudyPlanEditor'), 'StudyPlanEditor');
const StudyPlanJoin = named(() => import('./pages/StudyPlanJoin'), 'StudyPlanJoin');
const Exams = named(() => import('./pages/Exams'), 'Exams');
const TakeExam = named(() => import('./pages/TakeExam'), 'TakeExam');
const Leaderboard = named(() => import('./pages/Leaderboard'), 'Leaderboard');
const Discussion = named(() => import('./pages/Discussion'), 'Discussion');
const Login = named(() => import('./pages/Login'), 'Login');
const Profile = named(() => import('./pages/Profile'), 'Profile');
const Resources = named(() => import('./pages/Resources'), 'Resources');
const Courses = named(() => import('./pages/Courses'), 'Courses');
const CourseOverview = named(() => import('./pages/CourseOverview'), 'CourseOverview');
const CoursePlayer = named(() => import('./pages/CoursePlayer'), 'CoursePlayer');
const AdminDashboard = named(() => import('./pages/AdminDashboard'), 'AdminDashboard');
const AdminEnrollments = named(() => import('./pages/admin/AdminEnrollments'), 'AdminEnrollments');
const AdminStudyPlans = named(() => import('./pages/admin/AdminStudyPlans'), 'AdminStudyPlans');
const AdminExams = named(() => import('./pages/admin/AdminExams'), 'AdminExams');
const AdminSettings = named(() => import('./pages/admin/AdminSettings'), 'AdminSettings');
const AdminResources = named(() => import('./pages/admin/AdminResources'), 'AdminResources');
const AdminUsers = named(() => import('./pages/admin/AdminUsers'), 'AdminUsers');
const AdminCourses = named(() => import('./pages/admin/AdminCourses'), 'AdminCourses');
const AdminPayments = named(() => import('./pages/admin/AdminPayments'), 'AdminPayments');
const BackgroundEvaluator = lazy(() => import('./components/BackgroundEvaluator'));

import { hasSupabaseKeys, supabase } from './lib/supabase';
import { useAuthStore, roleFor } from './store/authStore';
import { useThemeStore } from './store/themeStore';

function LoginRedirect() {
  const [searchParams] = useSearchParams();
  const raw = searchParams.get('redirect') || '/';
  // Only same-site paths; "//host" or "https://..." would leave the app.
  const dest = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
  return <Navigate to={dest} replace />;
}

function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-label="Loading">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
    </div>
  );
}

/** Waits for the stored session before deciding, then sends signed-out users to login and back. */
function RequireAuth({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, role, ready } = useAuthStore();
  const location = useLocation();
  if (!ready) return <PageLoader />;
  if (!user) {
    const back = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${back}`} replace />;
  }
  if (admin && role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function App() {
  const { user, ready, setAuth } = useAuthStore();
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
      setAuth(session?.user ?? null, roleFor(session?.user));
      if (session?.user) {
        // Verify the stored token with the server; a rejected token (e.g. after the
        // signing secret was rotated) signs the user out instead of failing silently.
        supabase!.auth.getUser().then(({ error }) => {
          if (error && (error as { status?: number }).status === 401) {
            supabase!.auth.signOut();
            return;
          }
          supabase!.rpc('update_last_access').then(() => {});
        });
      }
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuth(session?.user ?? null, roleFor(session?.user));
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
      {user && (
        <Suspense fallback={null}>
          <BackgroundEvaluator />
        </Suspense>
      )}
      {!ready ? (
        <PageLoader />
      ) : (
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={user ? <LoginRedirect /> : <Login />} />

            <Route path="/" element={user ? <Layout /> : <Landing />}>
              {user && <Route index element={<Dashboard />} />}
            </Route>

            <Route element={<Layout />}>
              {/* Public */}
              <Route path="/courses" element={<Courses />} />
              <Route path="/courses/:id" element={<CourseOverview />} />
              {/* The player gates individual lessons itself (free preview vs enrolled). */}
              <Route path="/courses/:id/learn" element={<CoursePlayer />} />

              {/* Signed-in students */}
              {/* Study plans: browsing, public plans and share links work signed out. */}
              <Route path="/study-plan" element={<StudyPlans />} />
              <Route path="/study-plan/new" element={<RequireAuth><StudyPlanEditor /></RequireAuth>} />
              <Route path="/study-plan/join/:code" element={<StudyPlanJoin />} />
              <Route path="/study-plan/:id" element={<StudyPlanDetail />} />
              <Route path="/study-plan/:id/edit" element={<RequireAuth><StudyPlanEditor /></RequireAuth>} />
              <Route path="/exams" element={<RequireAuth><Exams /></RequireAuth>} />
              <Route path="/exams/:id" element={<RequireAuth><TakeExam /></RequireAuth>} />
              <Route path="/leaderboard" element={<RequireAuth><Leaderboard /></RequireAuth>} />
              <Route path="/discussion" element={<RequireAuth><Discussion /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
              <Route path="/resources" element={<RequireAuth><Resources /></RequireAuth>} />

              {/* Admins */}
              <Route path="/admin" element={<RequireAuth admin><AdminDashboard /></RequireAuth>} />
              <Route path="/admin/enrollments" element={<RequireAuth admin><AdminEnrollments /></RequireAuth>} />
              <Route path="/admin/courses" element={<RequireAuth admin><AdminCourses /></RequireAuth>} />
              <Route path="/admin/study-plans" element={<RequireAuth admin><AdminStudyPlans /></RequireAuth>} />
              <Route path="/admin/exams" element={<RequireAuth admin><AdminExams /></RequireAuth>} />
              <Route path="/admin/settings" element={<RequireAuth admin><AdminSettings /></RequireAuth>} />
              <Route path="/admin/resources" element={<RequireAuth admin><AdminResources /></RequireAuth>} />
              <Route path="/admin/users" element={<RequireAuth admin><AdminUsers /></RequireAuth>} />
              <Route path="/admin/payments" element={<RequireAuth admin><AdminPayments /></RequireAuth>} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      )}
    </BrowserRouter>
  );
}

export default App;
