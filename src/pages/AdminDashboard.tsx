import { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody } from '../components/Card';
import { Button } from '../components/Button';
import { Users, BookOpen, MessageSquare, PlusCircle } from 'lucide-react';
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
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center flex-wrap gap-4" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.25rem' }}>Admin Dashboard</h1>
          <p className="text-muted" style={{ fontSize: '1rem' }}>Manage the curriculum syllabus, exams, and community parameters.</p>
        </div>
      </div>

      {/* OVERVIEW STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '1.5rem' }}>
        <Card glass>
          <CardBody className="flex flex-col gap-2">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="text-muted" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Users</h3>
              <Users size={20} color="var(--primary)" />
            </div>
            {loading ? <div className="h-8 bg-[var(--surface-hover)] rounded w-16 animate-pulse mt-1 mb-1"></div> : <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.users.toLocaleString()}</h2>}
            <p className="text-muted" style={{ fontSize: '0.8rem' }}>Registered members</p>
          </CardBody>
        </Card>
        
        <Card glass>
          <CardBody className="flex flex-col gap-2">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="text-muted" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Study Topics</h3>
              <BookOpen size={20} color="var(--primary)" />
            </div>
            {loading ? <div className="h-8 bg-[var(--surface-hover)] rounded w-16 animate-pulse mt-1 mb-1"></div> : <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.topics.toLocaleString()}</h2>}
            <p className="text-muted" style={{ fontSize: '0.8rem' }}>Manage syllabus curriculum</p>
          </CardBody>
        </Card>

        <Card glass>
          <CardBody className="flex flex-col gap-2">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="text-muted" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Forum Discussions</h3>
              <MessageSquare size={20} color="var(--primary)" />
            </div>
            {loading ? <div className="h-8 bg-[var(--surface-hover)] rounded w-16 animate-pulse mt-1 mb-1"></div> : <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.discussions.toLocaleString()}</h2>}
            <p className="text-muted" style={{ fontSize: '0.8rem' }}>Monitor community boards</p>
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
      </div>
    </div>
  );
}
