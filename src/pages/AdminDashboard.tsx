import { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody } from '../components/Card';
import { Button } from '../components/Button';
import { Users, BookOpen, MessageSquare, PlusCircle, PlayCircle } from 'lucide-react';
import { dataService } from '../lib/dataService';

export function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, topics: 0, discussions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const data = await dataService.getStats();
      setStats(data);
      setLoading(false);
    }
    loadStats();
  }, []);

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-8">
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-[var(--border)] pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-[var(--font-heading)] text-[var(--text-main)] mb-1">
            Admin Dashboard
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-muted)]">
            Manage the curriculum syllabus, exams, and community parameters.
          </p>
        </div>
      </div>

      {/* OVERVIEW STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card glass>
          <CardBody className="flex flex-col gap-2">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="text-muted" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Users</h3>
              <Users size={20} color="var(--primary)" />
            </div>
            {loading ? <div className="h-8 bg-[var(--surface-hover)] rounded w-16 animate-pulse mt-1 mb-1"></div> : <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-main)]">{stats.users.toLocaleString()}</h2>}
            <p className="text-muted text-xs">Registered members</p>
          </CardBody>
        </Card>
        
        <Card glass>
          <CardBody className="flex flex-col gap-2">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="text-muted" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Study Topics</h3>
              <BookOpen size={20} color="var(--primary)" />
            </div>
            {loading ? <div className="h-8 bg-[var(--surface-hover)] rounded w-16 animate-pulse mt-1 mb-1"></div> : <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-main)]">{stats.topics.toLocaleString()}</h2>}
            <p className="text-muted text-xs">Manage syllabus curriculum</p>
          </CardBody>
        </Card>

        <Card glass>
          <CardBody className="flex flex-col gap-2">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="text-muted" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Forum Discussions</h3>
              <MessageSquare size={20} color="var(--primary)" />
            </div>
            {loading ? <div className="h-8 bg-[var(--surface-hover)] rounded w-16 animate-pulse mt-1 mb-1"></div> : <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-main)]">{stats.discussions.toLocaleString()}</h2>}
            <p className="text-muted text-xs">Monitor community boards</p>
          </CardBody>
        </Card>
      </div>

      {/* QUICK ACTIONS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.5rem' }} className="mt-4">
        <Card>
          <CardHeader style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-[var(--primary)]" />
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Study Plans</h3>
            </div>
          </CardHeader>
          <CardBody style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p className="text-sm text-muted">Create new curriculum topics, upload PDFs, attach book references, and use AI to generate complete study guides.</p>
            <Button onClick={() => window.location.href = '/admin/study-plans'} className="w-full justify-center mt-auto">
              Manage Study Plans
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <PlayCircle size={18} className="text-[var(--primary)]" />
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Video Courses</h3>
            </div>
          </CardHeader>
          <CardBody style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p className="text-sm text-muted">Create courses from YouTube playlist URLs, organize modules and lectures, and attach textbooks & PDFs for student classrooms.</p>
            <Button onClick={() => window.location.href = '/admin/courses'} className="w-full justify-center mt-auto">
              Manage Courses
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <PlusCircle size={18} className="text-[var(--primary)]" />
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Exams & Quizzes</h3>
            </div>
          </CardHeader>
          <CardBody style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p className="text-sm text-muted">Schedule new exams, set duration and question counts, and track upcoming mock tests for students.</p>
            <Button onClick={() => window.location.href = '/admin/exams'} className="w-full justify-center mt-auto">
              Manage Exams
            </Button>
          </CardBody>
        </Card>

        <Card className="border-indigo-500/20 bg-indigo-500/5">
          <CardHeader style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <PlayCircle size={18} className="text-indigo-500" />
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Course Enrollments</h3>
            </div>
          </CardHeader>
          <CardBody style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p className="text-sm text-muted">Verify student manual payment details (bKash/Nagad/Rocket/Bank TrxID & receipts) and approve access.</p>
            <Button onClick={() => window.location.href = '/admin/enrollments'} className="w-full justify-center mt-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              Review Enrollments
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
