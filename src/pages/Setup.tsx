import { useState } from 'react';
import { Card, CardHeader, CardBody } from '../components/Card';
import { Button } from '../components/Button';
import { Database, ShieldAlert } from 'lucide-react';
import { setSupabaseKeys } from '../lib/supabase';
import { useToastStore } from '../store/toastStore';

export function Setup() {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const addToast = useToastStore((state) => state.addToast);

  const handleSave = () => {
    if (!url || !key) {
      addToast('Please enter both Supabase URL and Anon Key', 'error');
      return;
    }
    setSupabaseKeys(url, key);
    addToast('Supabase successfully configured! Reloading...', 'success');
    setTimeout(() => window.location.reload(), 800);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md glass-panel" style={{ border: '1px solid var(--glass-border)' }}>
        <CardHeader className="text-center" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-[var(--primary)] text-white rounded-full flex items-center justify-center" style={{ width: '64px', height: '64px' }}>
              <Database size={28} />
            </div>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Connect Database</h2>
          <p className="text-muted text-sm mt-2">
            Let's configure Supabase. Paste your project URL and Anon Key below to proceed.
          </p>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Supabase URL</label>
            <input 
              type="text" 
              className="input" 
              placeholder="https://your-project.supabase.co" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Anon Key</label>
            <input 
              type="password" 
              className="input" 
              placeholder="eyJhbG..." 
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 mt-2">
            <Button onClick={handleSave} disabled={!url || !key}>
              Save & Connect
            </Button>
          </div>
          
          <div className="flex gap-2 items-center p-3 bg-[var(--surface-hover)] rounded-md text-xs text-muted mt-2" style={{ border: '1px solid var(--border)' }}>
            <ShieldAlert size={16} color="var(--text-muted)" />
            <span>These credentials are stored locally on your device.</span>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
