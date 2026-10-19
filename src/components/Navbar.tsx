import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  BookOpen, 
  GraduationCap, 
  Trophy, 
  MessageSquare, 
  LayoutDashboard, 
  ShieldCheck, 
  LogOut, 
  FileText, 
  CheckSquare, 
  Settings, 
  Users, 
  PlayCircle,
  CreditCard,
  LogIn
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { dataService, type UserProfile } from '../lib/dataService';
import { playNotificationChime } from '../lib/notificationSound';
import { useToastStore } from '../store/toastStore';

export function Navbar() {
  const { user, role } = useAuthStore();
  const { addToast } = useToastStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pendingEnrollmentsCount, setPendingEnrollmentsCount] = useState<number>(0);

  const isAdmin =
    role === 'admin' ||
    user?.email === 'admin@studymate.org' ||
    user?.email === 'admin@studymate.local' ||
    (user as any)?.app_metadata?.role === 'admin';

  useEffect(() => {
    async function loadProfile() {
      if (user) {
        const { data } = await dataService.getUserProfile(user.id);
        if (data) setProfile(data);
      }
    }
    loadProfile();
  }, [user]);

  // Real-time polling for pending enrollments (every 8 seconds for admins)
  useEffect(() => {
    if (!isAdmin) return;

    let isInitialCheck = true;
    let previousCount = 0;

    const checkPending = async () => {
      const count = await dataService.getPendingEnrollmentCount();
      setPendingEnrollmentsCount(count);

      // If new enrollment arrived after initial load, chime & toast
      if (!isInitialCheck && count > previousCount) {
        playNotificationChime();
        addToast(`🔔 New course enrollment submitted! (${count} pending)`, 'info');
      }
      previousCount = count;
      isInitialCheck = false;
    };

    checkPending();
    const interval = setInterval(checkPending, 8000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  const navItems = user
    ? [
        { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
        { name: 'Courses', path: '/courses', icon: <PlayCircle size={20} /> },
        { name: 'Study Plan', path: '/study-plan', icon: <BookOpen size={20} /> },
        { name: 'Resources', path: '/resources', icon: <FileText size={20} /> },
        { name: 'Exams', path: '/exams', icon: <GraduationCap size={20} /> },
        { name: 'Leaderboard', path: '/leaderboard', icon: <Trophy size={20} /> },
        { name: 'Discussion', path: '/discussion', icon: <MessageSquare size={20} /> },
      ]
    : [
        { name: 'Home', path: '/', icon: <LayoutDashboard size={20} /> },
        { name: 'Courses', path: '/courses', icon: <PlayCircle size={20} /> },
      ];

  const adminItems = [
    { name: 'Admin Dashboard', path: '/admin', icon: <ShieldCheck size={20} /> },
    { 
      name: 'Course Enrollments', 
      path: '/admin/enrollments', 
      icon: <CreditCard size={20} />,
      badge: pendingEnrollmentsCount > 0 ? pendingEnrollmentsCount : null,
    },
    { name: 'Manage Courses', path: '/admin/courses', icon: <PlayCircle size={20} /> },
    { name: 'Manage Study Plans', path: '/admin/study-plans', icon: <FileText size={20} /> },
    { name: 'Review Resources', path: '/admin/resources', icon: <CheckSquare size={20} /> },
    { name: 'Manage Exams', path: '/admin/exams', icon: <CheckSquare size={20} /> },
    { name: 'Manage Users', path: '/admin/users', icon: <Users size={20} /> },
    { name: 'System Settings', path: '/admin/settings', icon: <Settings size={20} /> },
  ];

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
  };

  const userEmail = user?.email || 'student@example.com';
  const displayName = profile?.full_name || userEmail.split('@')[0];
  const userInitials = displayName.substring(0, 2).toUpperCase();

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="desktop-sidebar glass-panel">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <GraduationCap size={26} />
          </div>
          <h2>StudyMate AI</h2>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link-item ${isActive ? 'active' : ''}`}
              end={item.path === '/'}
            >
              {item.icon}
              <span>{item.name}</span>
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div style={{ marginTop: '1rem', padding: '0 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Admin
              </div>
              {adminItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `nav-link-item ${isActive ? 'active' : ''}`}
                  end={item.path === '/admin'}
                >
                  {item.icon}
                  <span className="flex-1">{item.name}</span>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse shadow-sm ml-auto">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          {user ? (
            <>
              <div 
                className="user-profile-widget cursor-pointer hover:bg-[var(--surface-hover)] transition-colors rounded-lg p-2 -ml-2" 
                onClick={() => navigate('/profile')}
                title="Go to Profile"
              >
                <div className="avatar">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    userInitials
                  )}
                </div>
                <div className="user-info">
                  <span className="email truncate max-w-[120px]">{displayName}</span>
                  <span className="role">{role === 'admin' ? 'Admin' : 'Student'}</span>
                </div>
              </div>
              
              <div className="footer-actions">
                <ThemeToggle />
                <button className="signout-btn" onClick={handleSignOut} title="Sign Out">
                  <LogOut size={20} />
                </button>
              </div>
            </>
          ) : (
            <div className="w-full flex items-center justify-between gap-2 pt-2">
              <Link to="/login" className="flex-1">
                <button className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all">
                  <LogIn size={16} /> Sign In
                </button>
              </Link>
              <ThemeToggle />
            </div>
          )}
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <header className="mobile-header glass-panel">
        <div className="mobile-logo">
          <GraduationCap size={22} />
          <h3>StudyMate AI</h3>
        </div>
        <div className="mobile-header-actions flex items-center gap-2">
          {isAdmin && pendingEnrollmentsCount > 0 && (
            <Link
              to="/admin/enrollments"
              className="px-2.5 py-1 rounded-full bg-amber-500 text-white font-bold text-[11px] flex items-center gap-1 animate-pulse shadow-sm"
              title={`${pendingEnrollmentsCount} Pending Enrollments`}
            >
              <CreditCard size={12} />
              <span>{pendingEnrollmentsCount}</span>
            </Link>
          )}
          <ThemeToggle />
          {user ? (
            <button className="signout-btn-mobile" onClick={handleSignOut} title="Sign Out">
              <LogOut size={18} />
            </button>
          ) : (
            <Link to="/login">
              <button className="p-2 rounded-lg bg-indigo-600 text-white font-bold text-xs">
                <LogIn size={16} />
              </button>
            </Link>
          )}
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="mobile-bottom-nav glass-panel">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
            end={item.path === '/'}
          >
            {item.icon}
            <span style={{ fontSize: '0.65rem', marginTop: '0.2rem' }}>{item.name}</span>
          </NavLink>
        ))}
        {!user && (
          <NavLink
            to="/login"
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <LogIn size={20} />
            <span style={{ fontSize: '0.65rem', marginTop: '0.2rem' }}>Sign In</span>
          </NavLink>
        )}
        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) => `mobile-nav-item relative ${isActive || location.pathname.startsWith('/admin') ? 'active' : ''}`}
          >
            <ShieldCheck size={20} />
            <span style={{ fontSize: '0.65rem', marginTop: '0.2rem' }}>Admin</span>
            {pendingEnrollmentsCount > 0 && (
              <span className="absolute top-1 right-4 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </NavLink>
        )}
      </nav>
    </>
  );
}
