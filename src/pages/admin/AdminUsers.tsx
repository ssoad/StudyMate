import { useState, useEffect } from 'react';
import { dataService, type UserProfile } from '../../lib/dataService';
import { Card } from '../../components/Card';
import { Users, Loader2, Globe, Clock, Hash, Mail } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    const { data } = await dataService.getAllUsers();
    if (data) {
      setUsers(data as UserProfile[]);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-[var(--surface)] to-[var(--surface-hover)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
            <Users className="text-indigo-500" size={32} />
            User Management
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Monitor active users and their latest access locations
          </p>
        </div>
        <div className="bg-[var(--surface)] px-4 py-2 rounded-lg border border-[var(--border)] shadow-inner flex items-center gap-2">
          <Hash className="text-indigo-500" size={18} />
          <span className="font-mono font-medium text-[var(--text)]">{users.length} Users</span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-indigo-500" size={40} />
        </div>
      ) : (
        <Card className="overflow-hidden border-[var(--border)] bg-[var(--surface)] shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--surface-hover)] border-b border-[var(--border)]">
                  <th className="py-4 px-6 font-semibold text-[var(--text-secondary)]">User</th>
                  <th className="py-4 px-6 font-semibold text-[var(--text-secondary)]">Email</th>
                  <th className="py-4 px-6 font-semibold text-[var(--text-secondary)]">Points</th>
                  <th className="py-4 px-6 font-semibold text-[var(--text-secondary)]">Last Accessed</th>
                  <th className="py-4 px-6 font-semibold text-[var(--text-secondary)]">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-[var(--surface-hover)] transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.full_name || user.email} className="w-10 h-10 rounded-full border border-[var(--border)] shadow-sm" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-sm">
                            {(user.full_name || user.email).substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium text-[var(--text)] group-hover:text-indigo-500 transition-colors">
                          {user.full_name || 'Anonymous User'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-[var(--text-secondary)]">
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="opacity-50" />
                        {user.email}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono text-[var(--text)] font-semibold">
                      {user.points.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-[var(--text-secondary)]">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="opacity-50" />
                        {user.last_accessed_at 
                          ? formatDistanceToNow(new Date(user.last_accessed_at), { addSuffix: true })
                          : 'Never'
                        }
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Globe size={14} className="text-emerald-500 opacity-70" />
                        <span className="font-mono text-sm text-[var(--text-secondary)] bg-[var(--surface-hover)] px-2 py-1 rounded-md border border-[var(--border)]">
                          {user.last_accessed_ip || 'Unknown'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[var(--text-secondary)]">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
