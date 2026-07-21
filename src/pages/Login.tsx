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

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        addToast('Verification email sent! Click the link to complete sign up.', 'success');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
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
    <div className="flex flex-col items-center justify-center min-h-80" style={{ padding: '2rem 1rem' }}>
      <Card className="w-full max-w-md glass-panel" style={{ border: '1px solid var(--glass-border)' }}>
        <CardHeader className="text-center" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary text-white rounded-full flex items-center justify-center" style={{ width: '56px', height: '56px' }}>
              <GraduationCap size={28} />
            </div>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-muted text-sm mt-2">
            {mode === 'login' ? 'Log in to continue your learning journey' : 'Start tracking your study plan and leaderboard ranks'}
          </p>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="email" 
                  className="input" 
                  style={{ paddingLeft: '2.75rem' }}
                  placeholder="student@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="password" 
                  className="input" 
                  style={{ paddingLeft: '2.75rem' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? 'Processing...' : (mode === 'login' ? 'Sign In' : 'Sign Up')}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm" style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
            {mode === 'login' ? (
              <p className="text-muted">
                Don't have an account?{' '}
                <button 
                  onClick={() => setMode('signup')} 
                  className="text-primary hover:underline bg-transparent border-none cursor-pointer font-semibold"
                  style={{ color: 'var(--primary)' }}
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p className="text-muted">
                Already have an account?{' '}
                <button 
                  onClick={() => setMode('login')} 
                  className="text-primary hover:underline bg-transparent border-none cursor-pointer font-semibold"
                  style={{ color: 'var(--primary)' }}
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
