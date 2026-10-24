import { useState } from 'react';
import { Card, CardHeader, CardBody } from '../components/Card';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import { useToastStore } from '../store/toastStore';
import { GraduationCap, Mail, Lock } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const addToast = useToastStore((state) => state.addToast);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setLoading(true);
    const targetEmail = email.trim().toLowerCase();

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email: targetEmail, password });
        if (error) throw error;
        addToast('Account created! Welcome to StudyMate.', 'success');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: targetEmail, password });
        if (error) throw error;
        addToast('Successfully signed in!', 'success');
      }
    } catch (err: any) {
      addToast(err.message || 'Authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] px-4 py-8">
      <Card className="w-full max-w-md glass-panel border border-[var(--border)] shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="text-center p-6 border-b border-[var(--border)] bg-[var(--surface-hover)]/30">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <GraduationCap size={28} />
            </div>
          </div>
          <h2 className="text-2xl font-bold font-[var(--font-heading)] text-[var(--text-main)]">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-[var(--text-muted)] text-sm mt-1.5">
            {mode === 'login'
              ? 'Log in to continue your learning journey'
              : 'Start tracking your study plan and courses'}
          </p>
        </CardHeader>
        <CardBody className="p-6">
          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  type="email"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  type="password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" variant="primary" className="w-full mt-2 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20" disabled={loading}>
              {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm border-t border-[var(--border)] pt-5">
            {mode === 'login' ? (
              <p className="text-[var(--text-muted)]">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-[var(--primary)] hover:underline font-semibold ml-1 cursor-pointer"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p className="text-[var(--text-muted)]">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-[var(--primary)] hover:underline font-semibold ml-1 cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
