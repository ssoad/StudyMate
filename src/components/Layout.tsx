import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { ToastContainer } from './Toast';
import { useSidebarStore } from '../store/sidebarStore';
import { useAppModalStore } from '../store/appModalStore';
import { OfflineIndicator } from './OfflineIndicator';
import { QuickSearchModal } from './QuickSearchModal';
import { InstallAppModal } from './InstallAppModal';

export function Layout() {
  const { isCollapsed } = useSidebarStore();
  const { isSearchOpen, isInstallOpen, closeSearch, closeInstall, toggleSearch } = useAppModalStore();
  const location = useLocation();
  const isPlayerPage = location.pathname.includes('/learn');

  // Global Cmd+K / Ctrl+K keyboard shortcut for Spotlight Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSearch]);

  return (
    <div className={`sidebar-shell ${isCollapsed ? 'sidebar-collapsed' : ''} ${isPlayerPage ? 'player-mode' : ''}`}>
      <Navbar />
      <main className={`main-content animate-fade-in ${isPlayerPage ? 'player-main' : ''}`}>
        <Outlet />
      </main>
      <ToastContainer />
      <OfflineIndicator />
      <QuickSearchModal isOpen={isSearchOpen} onClose={closeSearch} />
      <InstallAppModal isOpen={isInstallOpen} onClose={closeInstall} />
    </div>
  );
}
