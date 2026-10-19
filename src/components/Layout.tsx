import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { ToastContainer } from './Toast';
import { useSidebarStore } from '../store/sidebarStore';

export function Layout() {
  const { isCollapsed } = useSidebarStore();
  const location = useLocation();
  const isPlayerPage = location.pathname.includes('/learn');

  return (
    <div className={`sidebar-shell ${isCollapsed ? 'sidebar-collapsed' : ''} ${isPlayerPage ? 'player-mode' : ''}`}>
      <Navbar />
      <main className={`main-content animate-fade-in ${isPlayerPage ? 'player-main' : ''}`}>
        <Outlet />
      </main>
      <ToastContainer />
    </div>
  );
}

