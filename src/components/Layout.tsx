import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { ToastContainer } from './Toast';

export function Layout() {
  return (
    <div className="sidebar-shell">
      <Navbar />
      <main className="main-content animate-fade-in">
        <Outlet />
      </main>
      <ToastContainer />
    </div>
  );
}
