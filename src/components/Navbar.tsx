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
  ChevronRight,
  Search,
  Download,
  Moon,
  Sun
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useThemeStore } from '../store/themeStore';
import { useAuthStore } from '../store/authStore';
import { useSidebarStore } from '../store/sidebarStore';
import { useAppModalStore } from '../store/appModalStore';
import { usePWA } from '../lib/pwa';
import { supabase } from '../lib/supabase';
import { dataService, type UserProfile } from '../lib/dataService';
import { playNotificationChime } from '../lib/notificationSound';
import { useToastStore } from '../store/toastStore';

export function Navbar() {
  const { user, role } = useAuthStore();
  const { isCollapsed, toggleCollapsed } = useSidebarStore();
  const { openSearch, openInstall } = useAppModalStore();
  const { isInstalled } = usePWA();
  const { addToast } = useToastStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pendingEnrollmentsCount, setPendingEnrollmentsCount] = useState<number>(0);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isDark, toggleTheme } = useThemeStore();

  // Menu sheet: close on Escape and on navigation, and keep the page behind it from scrolling.
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMobileMenuOpen(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [mobileMenuOpen]);

  // Suppress mobile top and bottom navigation bars on course player page (/courses/:id/learn)
  const isPlayerPage = location.pathname.includes('/learn');

  // Automatically close mobile menu drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const isAdmin =
    role === 'admin';

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
        { name: 'Home', path: '/', icon: <LayoutDashboard size={22} /> },
        { name: 'Courses', path: '/courses', icon: <PlayCircle size={22} /> },
        { name: 'Plan', path: '/study-plan', icon: <BookOpen size={22} /> },
        { name: 'Resources', path: '/resources', icon: <FileText size={22} /> },
      ]
    : [
        { name: 'Home', path: '/', icon: <LayoutDashboard size={22} /> },
        { name: 'Courses', path: '/courses', icon: <PlayCircle size={22} /> },
        { name: 'Sign in', path: '/login', icon: <LogIn size={22} /> },
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
      {/* DESKTOP & TABLET SIDEBAR */}
      <aside className={`desktop-sidebar glass-panel ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-logo">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="logo-icon shrink-0 shadow-md shadow-indigo-500/20">
              <GraduationCap size={22} />
            </div>
            {!isCollapsed && (
              <h2 className="text-base font-bold text-[var(--text-main)] font-[var(--font-heading)] truncate">
                StudyMate
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

        {/* Global Spotlight Search trigger button */}
        <button
          type="button"
          onClick={openSearch}
          className={`w-full py-2 px-2.5 mb-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] bg-[var(--surface-hover)] border border-[var(--border)] hover:border-[var(--primary)] transition-all flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} shadow-sm`}
          title="Search App (⌘K)"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Search size={16} className="shrink-0 text-[var(--primary)]" />
            {!isCollapsed && <span className="truncate">Quick Search</span>}
          </div>
          {!isCollapsed && <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] opacity-60">⌘K</kbd>}
        </button>

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
                <div className="sidebar-admin-title mt-3.5 px-3.5 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
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
          {/* Install App CTA (if browser supports install) */}
          {!isInstalled && (
            <button
              type="button"
              onClick={openInstall}
              className={`w-full py-2 px-2.5 mb-1.5 rounded-[var(--radius-md)] text-xs font-semibold border border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--surface-hover)] transition-colors flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'}`}
              title="Get the StudyMate app"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <Download size={15} className="shrink-0" />
                {!isCollapsed && <span className="truncate">Get the app</span>}
              </div>
            </button>
          )}

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
        <header className="mobile-header">
          <Link to="/" className="mobile-logo" aria-label="StudyMate home">
            <span className="mobile-logo-mark">S</span>
            <span className="mobile-logo-text">StudyMate</span>
          </Link>
          <div className="mobile-header-actions">
            <button type="button" onClick={openSearch} className="mobile-icon-btn" aria-label="Search">
              <Search size={20} />
            </button>

            {isAdmin && pendingEnrollmentsCount > 0 && (
              <Link
                to="/admin/enrollments"
                className="mobile-icon-btn relative"
                aria-label={`${pendingEnrollmentsCount} pending enrollments`}
              >
                <CreditCard size={20} />
                <span className="mobile-badge">{pendingEnrollmentsCount}</span>
              </Link>
            )}

            {user ? (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="mobile-avatar"
                aria-label="Open menu"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  userInitials
                )}
              </button>
            ) : (
              <Link to="/login" className="btn btn-primary btn-sm whitespace-nowrap">
                Sign in
              </Link>
            )}
          </div>
        </header>
      )}

      {/* MOBILE BOTTOM NAVIGATION (Suppressed inside classroom player) */}
      {!isPlayerPage && (
        <nav className="mobile-bottom-nav" aria-label="Main">
          {mobilePrimaryItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
              end={item.path === '/'}
            >
              <span className="mobile-nav-icon">{item.icon}</span>
              <span className="mobile-nav-label">{item.name}</span>
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className={`mobile-nav-item ${mobileMenuOpen ? 'active' : ''}`}
            aria-label="More"
          >
            <span className="mobile-nav-icon relative">
              <Menu size={22} />
              {isAdmin && pendingEnrollmentsCount > 0 && <span className="mobile-dot" />}
            </span>
            <span className="mobile-nav-label">More</span>
          </button>
        </nav>
      )}

      {/* MOBILE "MORE" BOTTOM SHEET */}
      {mobileMenuOpen && (
        <div className="menu-sheet-backdrop" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="menu-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="menu-sheet-handle" />
            <div className="flex items-center justify-between px-5 pb-2 pt-1">
              <h3 className="text-lg font-semibold">Menu</h3>
              <button type="button" onClick={() => setMobileMenuOpen(false)} className="mobile-icon-btn" aria-label="Close menu">
                <X size={20} />
              </button>
            </div>

            <div className="menu-sheet-body">
              {user ? (
                <div className="menu-group">
                  <MenuRow
                    to="/profile"
                    onNavigate={() => setMobileMenuOpen(false)}
                    leading={
                      <span className="mobile-avatar !m-0 !h-10 !w-10">
                        {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : userInitials}
                      </span>
                    }
                    title={displayName}
                    subtitle={user.email ?? undefined}
                    value={role === 'admin' ? 'Admin' : undefined}
                  />
                </div>
              ) : (
                <div className="menu-group p-4 text-center">
                  <p className="text-sm font-medium">Sign in to save your progress</p>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">Your courses, notes and study plan on every device.</p>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="btn btn-primary mt-3 w-full">
                    Sign in
                  </Link>
                </div>
              )}

              {user && (
                <>
                  <p className="menu-group-title">Practice</p>
                  <div className="menu-group">
                    <MenuRow to="/exams" onNavigate={() => setMobileMenuOpen(false)} icon={<GraduationCap size={18} />} title="Exams" />
                    <MenuRow to="/leaderboard" onNavigate={() => setMobileMenuOpen(false)} icon={<Trophy size={18} />} title="Leaderboard" />
                    <MenuRow to="/discussion" onNavigate={() => setMobileMenuOpen(false)} icon={<MessageSquare size={18} />} title="Discussion" />
                  </div>
                </>
              )}

              {isAdmin && (
                <>
                  <p className="menu-group-title">Admin</p>
                  <div className="menu-group">
                    {adminItems.map((item) => (
                      <MenuRow
                        key={item.path}
                        to={item.path}
                        onNavigate={() => setMobileMenuOpen(false)}
                        icon={item.icon}
                        title={item.name}
                        value={item.badge ? String(item.badge) : undefined}
                      />
                    ))}
                  </div>
                </>
              )}

              <p className="menu-group-title">App</p>
              <div className="menu-group">
                {!isInstalled && (
                  <MenuRow
                    icon={<Download size={18} />}
                    title="Get the app"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openInstall();
                    }}
                  />
                )}
                <MenuRow
                  icon={<Search size={18} />}
                  title="Search"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openSearch();
                  }}
                />
                <MenuRow
                  icon={copiedUrl ? <Check size={18} /> : <Share2 size={18} />}
                  title={copiedUrl ? 'Link copied' : 'Copy page link'}
                  onClick={handleCopyCurrentUrl}
                />
                <MenuRow
                  icon={isDark ? <Moon size={18} /> : <Sun size={18} />}
                  title="Dark mode"
                  onClick={toggleTheme}
                  trailing={<span className={`menu-switch ${isDark ? 'on' : ''}`} aria-hidden="true" />}
                  ariaPressed={isDark}
                />
              </div>

              {user && (
                <div className="menu-group mt-5">
                  <MenuRow
                    icon={<LogOut size={18} />}
                    title="Sign out"
                    destructive
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSignOut();
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface MenuRowProps {
  title: string;
  subtitle?: string;
  value?: string;
  icon?: React.ReactNode;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  destructive?: boolean;
  ariaPressed?: boolean;
  to?: string;
  onNavigate?: () => void;
  onClick?: () => void;
}

/** One row of the mobile menu sheet: icon tile, label, optional value, chevron for links. */
function MenuRow({ title, subtitle, value, icon, leading, trailing, destructive, ariaPressed, to, onNavigate, onClick }: MenuRowProps) {
  const content = (
    <>
      {leading ?? (icon && <span className={`menu-row-icon ${destructive ? 'danger' : ''}`}>{icon}</span>)}
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[0.95rem] ${destructive ? 'text-[var(--error)]' : 'text-[var(--text-main)]'}`}>{title}</span>
        {subtitle && <span className="block truncate text-xs text-[var(--text-muted)]">{subtitle}</span>}
      </span>
      {value && <span className="shrink-0 text-sm text-[var(--text-muted)]">{value}</span>}
      {trailing}
      {to && <ChevronRight size={18} className="shrink-0 text-[var(--text-muted)]" />}
    </>
  );
  if (to) {
    return (
      <NavLink to={to} onClick={onNavigate} className={({ isActive }) => `menu-row ${isActive ? 'active' : ''}`}>
        {content}
      </NavLink>
    );
  }
  return (
    <button type="button" onClick={onClick} className="menu-row" aria-pressed={ariaPressed}>
      {content}
    </button>
  );
}
