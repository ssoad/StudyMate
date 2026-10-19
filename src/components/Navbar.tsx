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
  Check,
  Menu,
  X,
  ChevronRight
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Suppress mobile top and bottom navigation bars on course player page (/courses/:id/learn)
  const isPlayerPage = location.pathname.includes('/learn');

  // Automatically close mobile menu drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

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

  // Mobile Bottom Bar Primary Tabs (4 items + "More" drawer)
  const mobilePrimaryItems = user
    ? [
        { name: 'Home', path: '/', icon: <LayoutDashboard size={19} /> },
        { name: 'Courses', path: '/courses', icon: <PlayCircle size={19} /> },
        { name: 'Study Plan', path: '/study-plan', icon: <BookOpen size={19} /> },
        { name: 'Resources', path: '/resources', icon: <FileText size={19} /> },
      ]
    : [
        { name: 'Home', path: '/', icon: <LayoutDashboard size={19} /> },
        { name: 'Courses', path: '/courses', icon: <PlayCircle size={19} /> },
        { name: 'Sign In', path: '/login', icon: <LogIn size={19} /> },
      ];

  const adminItems = [
    { name: 'Admin Dashboard', path: '/admin', icon: <ShieldCheck size={18} /> },
    { 
      name: 'Course Enrollments', 
      path: '/admin/enrollments', 
      icon: <CreditCard size={18} />,
      badge: pendingEnrollmentsCount > 0 ? pendingEnrollmentsCount : null,
    },
    { name: 'Manage Courses', path: '/admin/courses', icon: <PlayCircle size={18} /> },
    { name: 'Manage Study Plans', path: '/admin/study-plans', icon: <FileText size={18} /> },
    { name: 'Review Resources', path: '/admin/resources', icon: <CheckSquare size={18} /> },
    { name: 'Manage Exams', path: '/admin/exams', icon: <CheckSquare size={18} /> },
    { name: 'Manage Users', path: '/admin/users', icon: <Users size={18} /> },
    { name: 'System Settings', path: '/admin/settings', icon: <Settings size={18} /> },
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

      {/* MOBILE TOP HEADER (Suppressed inside classroom player) */}
      {!isPlayerPage && (
        <header className="mobile-header glass-panel">
          <div className="mobile-logo">
            <GraduationCap size={22} />
            <h3 className="font-bold text-sm font-[var(--font-heading)]">StudyMate AI</h3>
          </div>
          <div className="mobile-header-actions flex items-center gap-1.5">
            {/* Quick Share Page Link Button */}
            <button
              type="button"
              onClick={handleCopyCurrentUrl}
              className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] transition-colors"
              title="Copy page URL"
            >
              {copiedUrl ? <Check size={16} className="text-emerald-500" /> : <Share2 size={16} />}
            </button>

            {isAdmin && pendingEnrollmentsCount > 0 && (
              <Link
                to="/admin/enrollments"
                className="px-2 py-1 rounded-full bg-amber-500 text-white font-bold text-[10px] flex items-center gap-1 animate-pulse shadow-sm"
                title={`${pendingEnrollmentsCount} Pending Enrollments`}
              >
                <CreditCard size={12} />
                <span>{pendingEnrollmentsCount}</span>
              </Link>
            )}

            <ThemeToggle />

            {user ? (
              <button 
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-sm ml-0.5 ring-2 ring-[var(--border)]"
                title="Open Navigation Menu"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  userInitials
                )}
              </button>
            ) : (
              <Link to="/login">
                <button className="py-1 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm">
                  <LogIn size={13} /> <span>Sign In</span>
                </button>
              </Link>
            )}
          </div>
        </header>
      )}

      {/* MOBILE BOTTOM NAVIGATION (Suppressed inside classroom player) */}
      {!isPlayerPage && (
        <nav className="mobile-bottom-nav glass-panel">
          {mobilePrimaryItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
              end={item.path === '/'}
            >
              {item.icon}
              <span className="truncate">{item.name}</span>
            </NavLink>
          ))}

          {/* 5th Tab: More Button / Drawer Trigger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className={`mobile-nav-item relative ${mobileMenuOpen ? 'active' : ''}`}
            title="More Options & Navigation"
          >
            <Menu size={19} />
            <span>More</span>
            {isAdmin && pendingEnrollmentsCount > 0 && (
              <span className="absolute top-1.5 right-3 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </button>
        </nav>
      )}

      {/* MOBILE "MORE" SLIDE-UP DRAWER / BOTTOM SHEET */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          {/* Backdrop click dismiss */}
          <div className="absolute inset-0" onClick={() => setMobileMenuOpen(false)} />

          <div className="relative w-full max-w-lg bg-[var(--surface)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[88vh] flex flex-col overflow-hidden animate-slide-up z-10">
            {/* Drag handle pill on mobile */}
            <div className="w-12 h-1.5 rounded-full bg-[var(--border)] mx-auto mt-3 mb-1 shrink-0" />

            {/* Drawer Header */}
            <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)]">
              <div className="flex items-center gap-2">
                <GraduationCap size={20} className="text-[var(--primary)]" />
                <h3 className="font-bold text-base text-[var(--text-main)] font-[var(--font-heading)]">Menu & Navigation</h3>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-full hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                title="Close Menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Profile Card if user */}
              {user ? (
                <div className="p-3.5 rounded-2xl bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-between gap-3 shadow-sm">
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 overflow-hidden flex-1 group"
                  >
                    <div className="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center shrink-0 shadow-sm">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        userInitials
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <span className="font-bold text-sm text-[var(--text-main)] group-hover:text-[var(--primary)] transition-colors truncate block">
                        {displayName}
                      </span>
                      <span className="text-xs text-[var(--text-muted)] truncate block">
                        {user.email}
                      </span>
                    </div>
                  </Link>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] uppercase tracking-wider shrink-0">
                    {role === 'admin' ? 'Admin' : 'Student'}
                  </span>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 text-center space-y-2">
                  <h4 className="font-bold text-sm text-[var(--text-main)]">Sign in to StudyMate AI</h4>
                  <p className="text-xs text-[var(--text-muted)]">Access your personalized courses, study plan, and progress.</p>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="inline-block mt-2">
                    <button className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md">
                      <LogIn size={15} /> Sign In / Register
                    </button>
                  </Link>
                </div>
              )}

              {/* Secondary Study Links */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider px-1">
                  Explore & Practice
                </h4>
                <div className="grid grid-cols-1 gap-1.5">
                  <NavLink
                    to="/exams"
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) => `flex items-center justify-between p-3 rounded-xl transition-all border ${
                      isActive 
                        ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/30 font-semibold' 
                        : 'bg-[var(--surface)] text-[var(--text-main)] border-[var(--border)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                        <GraduationCap size={18} />
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-semibold block">Exams & Quizzes</span>
                        <span className="text-[11px] text-[var(--text-muted)]">Practice exam questions & tests</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-[var(--text-muted)]" />
                  </NavLink>

                  <NavLink
                    to="/leaderboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) => `flex items-center justify-between p-3 rounded-xl transition-all border ${
                      isActive 
                        ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/30 font-semibold' 
                        : 'bg-[var(--surface)] text-[var(--text-main)] border-[var(--border)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                        <Trophy size={18} />
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-semibold block">Global Leaderboard</span>
                        <span className="text-[11px] text-[var(--text-muted)]">Check student ranks & points</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-[var(--text-muted)]" />
                  </NavLink>

                  <NavLink
                    to="/discussion"
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) => `flex items-center justify-between p-3 rounded-xl transition-all border ${
                      isActive 
                        ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/30 font-semibold' 
                        : 'bg-[var(--surface)] text-[var(--text-main)] border-[var(--border)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                        <MessageSquare size={18} />
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-semibold block">Community Discussion</span>
                        <span className="text-[11px] text-[var(--text-muted)]">Ask questions & share insights</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-[var(--text-muted)]" />
                  </NavLink>
                </div>
              </div>

              {/* Admin Verification & Management Portal */}
              {isAdmin && (
                <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck size={14} /> Admin Verification Portal
                    </h4>
                    {pendingEnrollmentsCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                        {pendingEnrollmentsCount} Pending
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {adminItems.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) => `flex items-center justify-between p-2.5 rounded-xl transition-all border text-xs ${
                          isActive 
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/30 font-semibold' 
                            : 'bg-[var(--surface)] text-[var(--text-main)] border-[var(--border)] hover:bg-[var(--surface-hover)]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <span className="shrink-0 text-[var(--text-muted)]">{item.icon}</span>
                          <span className="truncate font-medium">{item.name}</span>
                        </div>
                        {item.badge && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shrink-0 ml-1">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Tools & Settings */}
              <div className="pt-2 border-t border-[var(--border)] space-y-3">
                <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider px-1">
                  Quick Tools
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyCurrentUrl}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-main)] flex items-center justify-center gap-2 hover:border-[var(--primary)] transition-colors"
                  >
                    {copiedUrl ? <Check size={16} className="text-emerald-500" /> : <Share2 size={16} />}
                    <span>{copiedUrl ? 'Copied Page URL!' : 'Copy Page Link'}</span>
                  </button>
                  <div className="p-1 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]">
                    <ThemeToggle />
                  </div>
                </div>

                {user && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSignOut();
                    }}
                    className="w-full py-2.5 px-3 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <LogOut size={16} /> Sign Out of Account
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
