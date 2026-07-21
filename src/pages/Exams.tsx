import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody } from '../components/Card';
import { Button } from '../components/Button';
import { Clock, HelpCircle, Calendar, GraduationCap } from 'lucide-react';
import { dataService } from '../lib/dataService';

interface Exam {
  id: string;
  title: string;
  type: string;
  duration: number;
  questions: number;
  due_date: string | null;
}

export function Exams() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchExams() {
      const { data, error } = await dataService.getExams();
      if (!error && data) {
        setExams(data);
      }
      setLoading(false);
    }
    fetchExams();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.25rem' }}>Exams & Quizzes</h1>
        <p className="text-muted" style={{ fontSize: '1rem' }}>Test your skills, practice mock tests, and climb leaderboard rankings.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1.5rem' }}>
        {loading ? (
          // SKELETON CARDS
          [1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="skeleton" style={{ height: '24px', width: '200px', borderRadius: '4px' }} />
              </CardHeader>
              <CardBody className="flex flex-col gap-4">
                <div className="skeleton" style={{ height: '16px', width: '120px', borderRadius: '4px' }} />
                <div className="skeleton" style={{ height: '16px', width: '150px', borderRadius: '4px' }} />
                <div className="skeleton" style={{ height: '38px', width: '100%', borderRadius: '6px' }} />
              </CardBody>
            </Card>
          ))
        ) : exams.length === 0 ? (
          <Card glass style={{ gridColumn: '1 / -1', borderStyle: 'dashed', borderColor: 'var(--border)' }}>
            <CardBody className="text-center flex flex-col items-center justify-center p-8 gap-3">
              <div style={{ background: 'var(--surface-hover)', padding: '1rem', borderRadius: '50%', color: 'var(--text-muted)' }}>
                <GraduationCap size={36} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>No exams scheduled</h3>
              <p className="text-muted text-sm m-0" style={{ maxWidth: '360px' }}>
                There are no quizzes or examinations currently active. Check back later or ask your moderator/admin.
              </p>
            </CardBody>
          </Card>
        ) : (
          exams.map((exam) => {
            // Difficulty color logic
            const isMock = exam.type.toLowerCase().includes('mock');
            const typeBgColor = isMock ? 'rgba(79, 70, 229, 0.1)' : 'rgba(16, 185, 129, 0.1)';
            const typeColor = isMock ? 'var(--primary)' : 'var(--secondary)';

            return (
              <Card key={exam.id} style={{ display: 'flex', flexDirection: 'column' }}>
                <CardHeader style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>{exam.title}</h3>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      padding: '0.25rem 0.65rem', 
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: typeBgColor,
                      color: typeColor,
                      fontWeight: 600,
                      whiteSpace: 'nowrap'
                    }}>
                      {exam.type}
                    </span>
                  </div>
                </CardHeader>
                <CardBody className="flex flex-col gap-4" style={{ flex: 1, padding: '1.25rem 1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      <Clock size={16} />
                      <span>{exam.duration} mins</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      <HelpCircle size={16} />
                      <span>{exam.questions} Questions</span>
                    </div>
                  </div>
                  
                  {exam.due_date && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                      <Calendar size={16} />
                      <span>Due: {new Date(exam.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  )}
                  
                  <Button className="w-full mt-auto" onClick={() => navigate(`/exams/${exam.id}`)}>Start Quiz</Button>
                </CardBody>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
