import { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody } from '../components/Card';
import { Button } from '../components/Button';
import { Users, BookOpen, MessageSquare, PlusCircle, PlayCircle, ShieldCheck } from 'lucide-react';
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
            Admin Command Center
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-muted)]">
            Manage curriculum syllabus, video courses, exams, and student enrollments.
          </p>
        </div>
      </div>

      {/* OVERVIEW STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card glass className="border border-[var(--border)]">
          <CardBody className="p-5 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Total Users</h3>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <Users size={18} />
              </div>
            </div>
            {loading ? (
              <div className="h-8 bg-[var(--surface-hover)] rounded w-16 animate-pulse my-1" />
            ) : (
              <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-main)]">
                {stats.users.toLocaleString()}
              </h2>
            )}
            <p className="text-xs text-[var(--text-muted)]">Registered student accounts</p>
          </CardBody>
        </Card>
        
        <Card glass className="border border-[var(--border)]">
          <CardBody className="p-5 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Study Topics</h3>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <BookOpen size={18} />
              </div>
            </div>
            {loading ? (
              <div className="h-8 bg-[var(--surface-hover)] rounded w-16 animate-pulse my-1" />
            ) : (
              <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-main)]">
                {stats.topics.toLocaleString()}
              </h2>
            )}
            <p className="text-xs text-[var(--text-muted)]">Curriculum syllabus modules</p>
          </CardBody>
        </Card>

        <Card glass className="border border-[var(--border)]">
          <CardBody className="p-5 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Community Posts</h3>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                <MessageSquare size={18} />
              </div>
            </div>
            {loading ? (
              <div className="h-8 bg-[var(--surface-hover)] rounded w-16 animate-pulse my-1" />
            ) : (
              <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-main)]">
                {stats.discussions.toLocaleString()}
              </h2>
            )}
            <p className="text-xs text-[var(--text-muted)]">Active forum conversations</p>
          </CardBody>
        </Card>
      </div>

      {/* QUICK ACTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-2">
        <Card className="flex flex-col border border-[var(--border)] hover:border-[var(--primary)] transition-all">
          <CardHeader className="p-5 border-b border-[var(--border)]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                <BookOpen size={18} />
              </div>
              <h3 className="text-base font-bold text-[var(--text-main)]">Study Plans</h3>
            </div>
          </CardHeader>
          <CardBody className="p-5 flex flex-col justify-between flex-1 gap-4">
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Create curriculum topics, attach books, upload PDFs, and generate complete study guides with AI.
            </p>
            <Button onClick={() => window.location.href = '/admin/study-plans'} variant="secondary" className="w-full justify-center text-xs">
              Manage Study Plans
            </Button>
          </CardBody>
        </Card>

        <Card className="flex flex-col border border-[var(--border)] hover:border-[var(--primary)] transition-all">
          <CardHeader className="p-5 border-b border-[var(--border)]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                <PlayCircle size={18} />
              </div>
              <h3 className="text-base font-bold text-[var(--text-main)]">Video Courses</h3>
            </div>
          </CardHeader>
          <CardBody className="p-5 flex flex-col justify-between flex-1 gap-4">
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Import YouTube playlists, structure modular sections, and attach downloadable textbooks & lecture notes.
            </p>
            <Button onClick={() => window.location.href = '/admin/courses'} variant="secondary" className="w-full justify-center text-xs">
              Manage Courses
            </Button>
          </CardBody>
        </Card>

        <Card className="flex flex-col border border-[var(--border)] hover:border-[var(--primary)] transition-all">
          <CardHeader className="p-5 border-b border-[var(--border)]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                <PlusCircle size={18} />
              </div>
              <h3 className="text-base font-bold text-[var(--text-main)]">Exams & Quizzes</h3>
            </div>
          </CardHeader>
          <CardBody className="p-5 flex flex-col justify-between flex-1 gap-4">
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Schedule live mock exams, configure question banks, time limits, and review real-time student submissions.
            </p>
            <Button onClick={() => window.location.href = '/admin/exams'} variant="secondary" className="w-full justify-center text-xs">
              Manage Exams
            </Button>
          </CardBody>
        </Card>

        <Card className="flex flex-col border border-indigo-500/30 bg-indigo-500/5 hover:border-indigo-500 transition-all">
          <CardHeader className="p-5 border-b border-indigo-500/20">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-500">
                <ShieldCheck size={18} />
              </div>
              <h3 className="text-base font-bold text-[var(--text-main)]">Course Enrollments</h3>
            </div>
          </CardHeader>
          <CardBody className="p-5 flex flex-col justify-between flex-1 gap-4">
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Review student manual payments (bKash/Nagad/Rocket/Bank TrxID), verify transaction receipts, and approve access.
            </p>
            <Button onClick={() => window.location.href = '/admin/enrollments'} variant="primary" className="w-full justify-center text-xs font-bold shadow-md shadow-indigo-500/20">
              Review Enrollments
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
