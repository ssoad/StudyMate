import { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody } from '../components/Card';
import { Button } from '../components/Button';
import { BookOpen, Target, Trophy, Clock, ArrowRight, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { dataService } from '../lib/dataService';
import { useAuthStore } from '../store/authStore';

export function Dashboard() {
  const { user } = useAuthStore();
  const [points, setPoints] = useState(0);
  const [recentDiscussions, setRecentDiscussions] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState({ totalTopics: 0, pendingExams: 0 });
  const [nextTopic, setNextTopic] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) return;
      
      const { data: profile } = await dataService.getUserPoints(user.id);
      if (profile) {
        setPoints(profile.points);
      }

      const { data: discussions } = await dataService.getDiscussions();
      if (discussions) {
        setRecentDiscussions(discussions.slice(0, 2));
      }

      const stats = await dataService.getDashboardStats(user.id);
      setDashboardStats(stats);

      const { data: studyDays } = await dataService.getStudyDays();
      if (studyDays && studyDays.length > 0) {
        setNextTopic(studyDays[0]);
      }

      setLoading(false);
    }
    
    fetchDashboardData();
  }, [user]);

  const userEmail = user?.email || 'Student';
  const userName = userEmail.split('@')[0];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          Welcome back, {userName}! 👋
        </h1>
        <p className="text-muted" style={{ fontSize: '1rem' }}>
          Here is your dashboard overview. Keep solving quizzes to increase your score!
        </p>
      </div>

      {/* STATS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1.5rem' }}>
        <Card glass>
          <CardBody className="flex flex-col gap-3">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-sm font-semibold text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Score</span>
              <div style={{ background: 'rgba(79, 70, 229, 0.1)', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}>
                <Trophy size={20} color="var(--primary)" />
              </div>
            </div>
            {loading ? (
              <div className="skeleton" style={{ height: '36px', width: '80px' }} />
            ) : (
              <h2 style={{ fontSize: '2.25rem', fontWeight: 800, margin: 0 }}>{points} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>pts</span></h2>
            )}
            <p className="text-muted text-xs">Points are synced with global leaderboard</p>
          </CardBody>
        </Card>
        
        <Card glass>
          <CardBody className="flex flex-col gap-3">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-sm font-semibold text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Study Progress</span>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}>
                <BookOpen size={20} color="var(--secondary)" />
              </div>
            </div>
            {loading ? (
              <div className="skeleton" style={{ height: '36px', width: '120px' }} />
            ) : (
              <h2 style={{ fontSize: '2.25rem', fontWeight: 800, margin: 0 }}>
                0 <span style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ {dashboardStats.totalTopics} Topics</span>
              </h2>
            )}
            <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--surface-hover)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: '0%', height: '100%', backgroundColor: 'var(--secondary)' }} />
            </div>
          </CardBody>
        </Card>

        <Card glass>
          <CardBody className="flex flex-col gap-3">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-sm font-semibold text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Tasks</span>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}>
                <Clock size={20} color="var(--error)" />
              </div>
            </div>
            {loading ? (
              <div className="skeleton" style={{ height: '36px', width: '120px' }} />
            ) : (
              <h2 style={{ fontSize: '2.25rem', fontWeight: 800, margin: 0 }}>{dashboardStats.pendingExams} <span style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-muted)' }}>Pending</span></h2>
            )}
            <p className="text-muted text-xs">Exams scheduled</p>
          </CardBody>
        </Card>
      </div>

      {/* SECTIONS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '1.5rem' }} className="mt-4">
        {/* CONTINUE STUDYING */}
        <Card>
          <CardHeader>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Continue Learning</h3>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            {loading ? (
              <div className="skeleton" style={{ height: '80px', width: '100%' }} />
            ) : nextTopic ? (
              <div className="flex justify-between items-center p-4 border border-[var(--border)] rounded-md hover:bg-[var(--surface-hover)] transition-all" style={{ border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-4">
                  <div style={{ background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: '50%', display: 'flex' }}>
                    <Target size={24} color="var(--primary)" />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>Week {nextTopic.week}: {nextTopic.subject}</h4>
                    <p className="text-muted text-sm m-0 line-clamp-1">{nextTopic.module}</p>
                  </div>
                </div>
                <Link to="/study-plan">
                  <Button size="sm" style={{ padding: '0.5rem 1rem' }}>
                    Resume <ArrowRight size={14} style={{ marginLeft: '0.25rem' }} />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center p-4 text-muted text-sm border border-[var(--border)] rounded-md">
                No active study plans found.
              </div>
            )}
          </CardBody>
        </Card>

        {/* RECENT DISCUSSIONS */}
        <Card>
          <CardHeader>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Forum Activities</h3>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            {loading ? (
              <div className="flex flex-col gap-4">
                <div className="skeleton" style={{ height: '40px', width: '100%' }} />
                <div className="skeleton" style={{ height: '40px', width: '100%' }} />
              </div>
            ) : recentDiscussions.length === 0 ? (
              <div className="text-center p-4 text-muted text-sm">
                No recent discussions. Join the board to start!
              </div>
            ) : (
              recentDiscussions.map((d) => (
                <div key={d.id} className="flex flex-col gap-1 pb-4 border-b border-[var(--border)] last:border-0 last:pb-0" style={{ borderBottom: '1px solid var(--border)' }}>
                  <Link to="/discussion" style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '0.95rem' }} className="hover:text-[var(--primary)]">
                    {d.title}
                  </Link>
                  <div className="flex justify-between items-center text-muted" style={{ fontSize: '0.8rem' }}>
                    <span className="flex items-center gap-1">
                      <MessageSquare size={12} /> Community Board
                    </span>
                    <span>{new Date(d.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
