import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, GraduationCap, Trophy, MessageSquare, LayoutDashboard, ShieldCheck, LogOut, FileText, CheckSquare, Settings, Users } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { dataService, type UserProfile } from '../lib/dataService';

export function Navbar() {
  const { user, role } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function loadProfile() {
      if (user) {
        const { data } = await dataService.getUserProfile(user.id);
        if (data) setProfile(data);
      }
    }
    loadProfile();
  }, [user]);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Study Plan', path: '/study-plan', icon: <BookOpen size={20} /> },
    { name: 'Resources', path: '/resources', icon: <FileText size={20} /> },
    { name: 'Exams', path: '/exams', icon: <GraduationCap size={20} /> },
    { name: 'Leaderboard', path: '/leaderboard', icon: <Trophy size={20} /> },
    { name: 'Discussion', path: '/discussion', icon: <MessageSquare size={20} /> },
  ];

  const adminItems = [
    { name: 'Admin Dashboard', path: '/admin', icon: <ShieldCheck size={20} /> },
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

          {role === 'admin' && (
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
                  <span>{item.name}</span>
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
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
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <header className="mobile-header glass-panel">
        <div className="mobile-logo">
          <GraduationCap size={22} />
          <h3>StudyMate AI</h3>
        </div>
        <div className="mobile-header-actions">
          <ThemeToggle />
          <button className="signout-btn-mobile" onClick={handleSignOut}>
            <LogOut size={18} />
          </button>
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
        {role === 'admin' && (
          <NavLink
            to="/admin"
            className={({ isActive }) => `mobile-nav-item ${isActive || location.pathname.startsWith('/admin') ? 'active' : ''}`}
          >
            <ShieldCheck size={20} />
            <span style={{ fontSize: '0.65rem', marginTop: '0.2rem' }}>Admin</span>
          </NavLink>
        )}
      </nav>
    </>
  );
}
