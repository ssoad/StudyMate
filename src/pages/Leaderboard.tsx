import { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody } from '../components/Card';
import { Trophy, Award } from 'lucide-react';
import { dataService } from '../lib/dataService';

interface UserProfile {
  id: string;
  email: string;
  points: number;
}

export function Leaderboard() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      const { data, error } = await dataService.getLeaderboard();
      if (!error && data) {
        setUsers(data);
      }
      setLoading(false);
    }
    fetchLeaderboard();
  }, []);

  // Split top 3 from list
  const topThree = users.slice(0, 3);
  const remainingUsers = users.slice(3);

  // Re-order top 3 for classic podium visual: [2nd, 1st, 3rd]
  const podiumOrder = [];
  if (topThree[1]) podiumOrder.push({ ...topThree[1], rank: 2 });
  if (topThree[0]) podiumOrder.push({ ...topThree[0], rank: 1 });
  if (topThree[2]) podiumOrder.push({ ...topThree[2], rank: 3 });

  const podiumColors = {
    1: '#fbbf24', // Gold
    2: '#94a3b8', // Silver
    3: '#b45309', // Bronze
  };

  const podiumHeights = {
    1: '140px',
    2: '110px',
    3: '90px',
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.25rem' }}>Community Standings</h1>
        <p className="text-muted" style={{ fontSize: '1rem' }}>Earn points by doing weekly practice tests and helping in discussion forums.</p>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: '300px', width: '100%', borderRadius: '12px' }} />
      ) : users.length === 0 ? (
        <Card glass style={{ borderStyle: 'dashed', borderColor: 'var(--border)' }}>
          <CardBody className="text-center flex flex-col items-center justify-center p-8 gap-3">
            <div style={{ background: 'var(--surface-hover)', padding: '1rem', borderRadius: '50%', color: 'var(--text-muted)' }}>
              <Trophy size={36} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Leaderboard is empty</h3>
            <p className="text-muted text-sm m-0" style={{ maxWidth: '360px' }}>
              No scores recorded yet. Be the first to take a quiz and claim the podium!
            </p>
          </CardBody>
        </Card>
      ) : (
        <>
          {/* PODIUM DISPLAY (Only show if we have users) */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'flex-end', 
            gap: '1.5rem', 
            padding: '2rem 1rem', 
            borderBottom: '1px solid var(--border)',
            marginBottom: '1rem',
            overflowX: 'auto',
          }}>
            {podiumOrder.map((user) => (
              <div key={user.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '100px' }}>
                <div style={{ 
                  width: '50px', 
                  height: '50px', 
                  borderRadius: '50%', 
                  background: 'var(--surface-hover)',
                  border: `2px solid ${podiumColors[user.rank as 1 | 2 | 3]}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.25rem',
                  color: 'var(--text-main)',
                  boxShadow: 'var(--shadow-sm)',
                  marginBottom: '0.75rem',
                }}>
                  {user.rank}
                </div>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                  {user.email.split('@')[0]}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '0.75rem' }}>
                  {user.points} pts
                </span>
                {/* Podium pillar */}
                <div style={{ 
                  width: '80px', 
                  height: podiumHeights[user.rank as 1 | 2 | 3], 
                  background: `linear-gradient(180deg, ${podiumColors[user.rank as 1 | 2 | 3]}22 0%, ${podiumColors[user.rank as 1 | 2 | 3]}05 100%)`,
                  borderTop: `3px solid ${podiumColors[user.rank as 1 | 2 | 3]}`,
                  borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                  boxShadow: 'var(--shadow-sm)'
                }} />
              </div>
            ))}
          </div>

          {/* LEADERBOARD TABLE */}
          <Card>
            <CardHeader style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={18} color="var(--primary)" />
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Global Rankings</h3>
            </CardHeader>
            <CardBody style={{ padding: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {remainingUsers.map((user, index) => (
                  <div 
                    key={user.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '1rem 1.5rem',
                      borderBottom: '1px solid var(--border)',
                      transition: 'background-color var(--transition-fast)'
                    }}
                    className="hover:bg-[var(--surface-hover)]"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ 
                        width: '28px', 
                        fontSize: '0.85rem', 
                        fontWeight: 600, 
                        color: 'var(--text-muted)',
                        textAlign: 'center'
                      }}>
                        #{index + 4}
                      </span>
                      <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>{user.email.split('@')[0]}</span>
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.95rem' }}>
                      {user.points} pts
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
