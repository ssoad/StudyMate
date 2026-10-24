import { useState, useEffect } from 'react';
import { Trophy, Medal, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
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
      setLoading(true);
      const { data, error } = await dataService.getLeaderboard();
      if (!error && data) {
        setUsers(data);
      }
      setLoading(false);
    }
    fetchLeaderboard();
  }, []);

  const topThree = users.slice(0, 3);

  // Podium order: [2nd, 1st, 3rd]
  const podiumOrder = [];
  if (topThree[1]) podiumOrder.push({ ...topThree[1], rank: 2 });
  if (topThree[0]) podiumOrder.push({ ...topThree[0], rank: 1 });
  if (topThree[2]) podiumOrder.push({ ...topThree[2], rank: 3 });

  return (
    <div className="flex flex-col gap-6 sm:gap-8 animate-fade-in pb-12 max-w-5xl mx-auto">
      {/* HEADER BANNER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 sm:p-7 rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] via-[var(--surface)] to-[var(--surface-hover)] shadow-sm">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Trophy size={14} />
            <span>Hall of Fame</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] font-[var(--font-heading)] tracking-tight">
            Community Leaderboard
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-xl">
            Earn points by completing course lectures (+15 XP), taking quizzes, and participating in forum discussions.
          </p>
        </div>

        <Link
          to="/exams"
          className="btn btn-secondary text-xs sm:text-sm px-4 py-2 rounded-xl flex items-center gap-1.5"
        >
          <span>Earn XP</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {loading ? (
        <div className="p-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] h-72 animate-pulse" />
      ) : users.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-[var(--border)] rounded-3xl bg-[var(--surface)] space-y-3">
          <Trophy size={44} className="mx-auto text-[var(--text-muted)] opacity-40" />
          <h3 className="text-base font-bold text-[var(--text-main)]">Leaderboard is empty</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            No scores recorded yet. Be the first to complete a lecture or exam and take the #1 spot!
          </p>
        </div>
      ) : (
        <>
          {/* PODIUM DISPLAY FOR TOP 3 */}
          {podiumOrder.length > 0 && (
            <div className="flex items-end justify-center gap-3 sm:gap-6 pt-4 pb-6 px-2 overflow-x-auto">
              {podiumOrder.map((user) => {
                const isFirst = user.rank === 1;
                const isSecond = user.rank === 2;

                return (
                  <div
                    key={user.id}
                    className={`flex flex-col items-center flex-1 max-w-[160px] sm:max-w-[200px] text-center transition-transform hover:-translate-y-1 ${
                      isFirst ? 'order-2 scale-105 z-10' : isSecond ? 'order-1' : 'order-3'
                    }`}
                  >
                    {/* Crown / Trophy icon for #1 */}
                    {isFirst && (
                      <span className="text-xl sm:text-2xl animate-bounce mb-1">👑</span>
                    )}

                    {/* Avatar circle with rank badge */}
                    <div className="relative mb-2">
                      <div
                        className={`w-14 h-14 sm:w-18 sm:h-18 rounded-2xl flex items-center justify-center font-extrabold text-base sm:text-xl shadow-md border-2 ${
                          isFirst
                            ? 'bg-amber-500/20 text-amber-500 border-amber-400'
                            : isSecond
                            ? 'bg-slate-400/20 text-slate-400 border-slate-300'
                            : 'bg-amber-700/20 text-amber-700 border-amber-700/40'
                        }`}
                      >
                        {user.email.substring(0, 2).toUpperCase()}
                      </div>
                      <span
                        className={`absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shadow ${
                          isFirst
                            ? 'bg-amber-400 text-amber-950'
                            : isSecond
                            ? 'bg-slate-300 text-slate-900'
                            : 'bg-amber-700 text-amber-100'
                        }`}
                      >
                        {user.rank}
                      </span>
                    </div>

                    <span className="text-xs sm:text-sm font-bold text-[var(--text-main)] truncate max-w-[130px] block">
                      {user.email.split('@')[0]}
                    </span>
                    <span className="text-xs font-bold text-[var(--primary)] mb-3">
                      {user.points.toLocaleString()} XP
                    </span>

                    {/* Podium pedestal block */}
                    <div
                      className={`w-full rounded-2xl border flex items-center justify-center font-extrabold shadow-xs transition-all ${
                        isFirst
                          ? 'h-28 sm:h-36 bg-gradient-to-t from-amber-500/20 to-amber-500/5 border-amber-400/40 text-amber-500 text-lg sm:text-2xl'
                          : isSecond
                          ? 'h-20 sm:h-28 bg-gradient-to-t from-slate-400/20 to-slate-400/5 border-slate-400/30 text-slate-400 text-base sm:text-xl'
                          : 'h-16 sm:h-20 bg-gradient-to-t from-amber-700/20 to-amber-700/5 border-amber-700/30 text-amber-700 text-sm sm:text-lg'
                      }`}
                    >
                      <span>#{user.rank}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* GLOBAL RANKINGS LIST */}
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-hover)]/40">
              <div className="flex items-center gap-2">
                <Medal size={18} className="text-[var(--primary)]" />
                <h3 className="font-bold text-sm sm:text-base text-[var(--text-main)] font-[var(--font-heading)]">
                  All Member Standings
                </h3>
              </div>
              <span className="text-xs text-[var(--text-muted)] font-semibold">
                {users.length} Total Learners
              </span>
            </div>

            <div className="divide-y divide-[var(--border)]">
              {users.map((user, idx) => {
                const rank = idx + 1;

                return (
                  <div
                    key={user.id}
                    className="p-3.5 sm:p-4 px-4 sm:px-6 flex items-center justify-between gap-3 hover:bg-[var(--surface-hover)] transition-colors group"
                  >
                    <div className="flex items-center gap-3.5 overflow-hidden">
                      <span
                        className={`w-7 text-center text-xs font-black shrink-0 ${
                          rank === 1
                            ? 'text-amber-500'
                            : rank === 2
                            ? 'text-slate-400'
                            : rank === 3
                            ? 'text-amber-700'
                            : 'text-[var(--text-muted)]'
                        }`}
                      >
                        #{rank}
                      </span>

                      <div className="w-8 h-8 rounded-full bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center font-bold text-xs text-[var(--text-main)] shrink-0 group-hover:scale-105 transition-transform">
                        {user.email.substring(0, 2).toUpperCase()}
                      </div>

                      <div className="overflow-hidden">
                        <span className="text-xs sm:text-sm font-semibold text-[var(--text-main)] truncate block">
                          {user.email.split('@')[0]}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] block">
                          Learner
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs sm:text-sm font-extrabold text-[var(--text-main)] font-mono">
                        {user.points.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        XP
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
