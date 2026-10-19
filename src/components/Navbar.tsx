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
  LogIn,
  PanelLeftClose,
  PanelLeftOpen,
  Share2,
  Check
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useAuthStore } from '../store/authStore';
import { useSidebarStore } from '../store/sidebarStore';
import { supabase } from '../lib/supabase';
import { dataService, type UserProfile } from '../lib/dataService';
import { playNotificationChime } from '../lib/notificationSound';
import { useToastStore } from '../store/toastStore';

export function Navbar() {
  const { user, role } = useAuthStore();
  const { isCollapsed, toggleCollapsed } = useSidebarStore();
  const { addToast } = useToastStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pendingEnrollmentsCount, setPendingEnrollmentsCount] = useState<number>(0);
  const [copiedUrl, setCopiedUrl] = useState(false);

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

  // Copy current URL to clipboard
  const handleCopyCurrentUrl = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopiedUrl(true);
      addToast('Page URL copied to clipboard!', 'success');
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      addToast('Failed to copy URL.', 'error');
    }
  };

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
      <aside className={`desktop-sidebar glass-panel ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-logo">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="logo-icon shrink-0">
              <GraduationCap size={22} />
            </div>
            {!isCollapsed && (
              <h2 className="text-base font-bold text-[var(--text-main)] font-[var(--font-heading)] truncate">
                StudyMate AI
              </h2>
            )}
          </div>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] border border-transparent hover:border-[var(--border)] transition-colors shrink-0"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link-item ${isActive ? 'active' : ''}`}
              end={item.path === '/'}
              title={item.name}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="nav-text flex-1 truncate">{item.name}</span>
            </NavLink>
          ))}

          {isAdmin && (
            <>
              {!isCollapsed ? (
                <div className="sidebar-admin-title" style={{ marginTop: '0.85rem', padding: '0 0.85rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Admin
                </div>
              ) : (
                <div className="w-8 h-px bg-[var(--border)] mx-auto my-2 shrink-0" />
              )}
              {adminItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `nav-link-item ${isActive ? 'active' : ''}`}
                  end={item.path === '/admin'}
                  title={item.name}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="nav-text flex-1 truncate">{item.name}</span>
                  {item.badge && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse shadow-sm ${isCollapsed ? 'absolute -top-1 -right-1 px-1.5 text-[9px]' : 'ml-auto'}`}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          {/* Quick Share / URL Copy button */}
          <button
            type="button"
            onClick={handleCopyCurrentUrl}
            className={`w-full py-2 px-2.5 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--surface-hover)] border border-[var(--border)] hover:border-[var(--primary)] transition-all flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}
            title="Copy current page URL"
          >
            <div className="flex items-center gap-2">
              {copiedUrl ? <Check size={16} className="text-emerald-500" /> : <Share2 size={16} />}
              {!isCollapsed && <span>{copiedUrl ? 'Copied URL!' : 'Share Page'}</span>}
            </div>
            {!isCollapsed && <span className="text-[10px] font-mono opacity-60">URL</span>}
          </button>

          {user ? (
            <>
              <div 
                className="user-profile-widget cursor-pointer hover:bg-[var(--surface-hover)] transition-colors rounded-xl p-2" 
                onClick={() => navigate('/profile')}
                title="Go to Profile"
              >
                <div className="avatar shrink-0">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    userInitials
                  )}
                </div>
                {!isCollapsed && (
                  <div className="user-info overflow-hidden">
                    <span className="email truncate max-w-[120px] font-semibold block text-xs">{displayName}</span>
                    <span className="role text-[10px] text-[var(--text-muted)] block uppercase tracking-wider">{role === 'admin' ? 'Admin' : 'Student'}</span>
                  </div>
                )}
              </div>
              
              <div className={`footer-actions flex items-center ${isCollapsed ? 'flex-col gap-2' : 'justify-between'}`}>
                <ThemeToggle />
                <button className="signout-btn p-2 rounded-xl text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors" onClick={handleSignOut} title="Sign Out">
                  <LogOut size={18} />
                </button>
              </div>
            </>
          ) : (
            <div className={`w-full flex items-center gap-2 pt-2 ${isCollapsed ? 'flex-col' : 'justify-between'}`}>
              <Link to="/login" className="flex-1 w-full">
                <button className={`w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all ${isCollapsed ? 'p-2' : ''}`}>
                  <LogIn size={16} /> {!isCollapsed && 'Sign In'}
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
          <h3 className="font-bold text-sm">StudyMate AI</h3>
        </div>
        <div className="mobile-header-actions flex items-center gap-1.5">
          {/* Mobile Copy Page Link Button */}
          <button
            type="button"
            onClick={handleCopyCurrentUrl}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] transition-colors"
            title="Share page URL"
          >
            {copiedUrl ? <Check size={17} className="text-emerald-500" /> : <Share2 size={17} />}
          </button>

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
            <button className="signout-btn-mobile p-2 text-[var(--text-muted)] hover:text-red-500" onClick={handleSignOut} title="Sign Out">
              <LogOut size={18} />
            </button>
          ) : (
            <Link to="/login">
              <button className="p-2 rounded-xl bg-indigo-600 text-white font-bold text-xs">
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
