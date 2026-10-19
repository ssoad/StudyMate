import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { ToastContainer } from './Toast';
import { useSidebarStore } from '../store/sidebarStore';

export function Layout() {
  const { isCollapsed } = useSidebarStore();

  return (
    <div className={`sidebar-shell ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Navbar />
      <main className="main-content animate-fade-in">
        <Outlet />
      </main>
      <ToastContainer />
    </div>
  );
}
