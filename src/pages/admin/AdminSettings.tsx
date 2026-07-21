import { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody } from '../../components/Card';
import { Button } from '../../components/Button';
import { Settings, Save, Cpu, Key, Database, LayoutTemplate, Activity, ChevronDown, Globe, Code } from 'lucide-react';
import { dataService, type SystemSetting } from '../../lib/dataService';
import { useToastStore } from '../../store/toastStore';

export function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, any>>({
    llm_provider: 'openai',
    llm_api_key: '',
    llm_model: 'gpt-4o',
    llm_base_url: '',
    study_plan_prompt: 'You are an AI study planner. Generate a highly structured daily plan.'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const addToast = useToastStore(state => state.addToast);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await dataService.getSystemSettings();
    if (error) {
      addToast('Failed to load settings', 'error');
    } else if (data) {
      const settingsMap: Record<string, any> = {
        llm_provider: 'custom',
        llm_api_base_url: 'https://api.armorclub.org/v1',
        llm_model: 'claude-3-5-sonnet-latest'
      };
      data.forEach((s: SystemSetting) => {
        if (s.value) settingsMap[s.key] = s.value;
      });
      setSettings(prev => ({ ...prev, ...settingsMap }));
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const keys = Object.keys(settings);
      for (const key of keys) {
        await dataService.updateSystemSetting(key, settings[key]);
      }
      addToast('Settings saved successfully', 'success');
    } catch (err) {
      addToast('Error saving settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1 mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="text-[var(--primary)]" /> System Settings
        </h1>
        <p className="text-muted text-sm">Configure global application preferences and AI integrations.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="skeleton min-h-[300px] rounded-lg"></div>
          <div className="skeleton min-h-[300px] rounded-lg"></div>
        </div>
      ) : (
        <form id="settings-form" onSubmit={handleSave} className="flex flex-col gap-8">
          
          {/* AI / LLM Configuration */}
          <Card className="flex flex-col overflow-hidden">
            <CardHeader className="border-b border-[var(--border)] bg-[var(--surface)] px-6 py-5">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2 text-main">
                  <Cpu size={18} className="text-[var(--primary)]" /> AI Provider Configuration
                </h3>
                <p className="text-sm text-muted mt-1">Manage your active LLM provider and authentication keys.</p>
              </div>
            </CardHeader>
            <div className="flex flex-col divide-y divide-[var(--border)]">
              
              {/* Provider Row */}
              <div className="flex flex-col md:flex-row gap-4 md:gap-12 p-6 md:p-8 items-start hover:bg-[var(--surface-hover)] transition-colors">
                <div className="md:w-1/3 flex flex-col gap-1">
                  <label className="text-sm font-semibold text-main">Provider Engine</label>
                  <p className="text-xs text-muted">Select the AI model family to use for generating study plans.</p>
                </div>
                <div className="md:w-2/3 w-full relative flex items-center">
                  <Cpu size={16} className="absolute left-3 text-muted pointer-events-none" />
                  <select 
                    className="input appearance-none w-full bg-[var(--surface)] pl-9 pr-9"
                    value={settings.llm_provider || 'openai'}
                    onChange={e => setSettings({...settings, llm_provider: e.target.value})}
                  >
                    <option value="openai">OpenAI (ChatGPT)</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="custom">Custom Provider (Ollama, LM Studio)</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-3 text-muted pointer-events-none" />
                </div>
              </div>

              {/* Custom Base URL Row (Conditional) */}
              {settings.llm_provider === 'custom' && (
                <div className="flex flex-col md:flex-row gap-4 md:gap-12 p-6 md:p-8 items-start hover:bg-[var(--surface-hover)] transition-colors bg-blue-50/30 dark:bg-blue-900/10">
                  <div className="md:w-1/3 flex flex-col gap-1">
                    <label className="text-sm font-semibold text-main">Custom Base URL</label>
                    <p className="text-xs text-muted">The API endpoint for your custom provider (must be OpenAI compatible).</p>
                  </div>
                  <div className="md:w-2/3 w-full relative flex items-center">
                    <Globe size={16} className="absolute left-3 text-muted pointer-events-none" />
                    <input 
                      type="url" 
                      className="input w-full pl-9" 
                      placeholder="http://localhost:11434/v1" 
                      value={settings.llm_base_url || ''}
                      onChange={e => setSettings({...settings, llm_base_url: e.target.value})}
                    />
                  </div>
                </div>
              )}

              {/* API Key Row */}
              <div className="flex flex-col md:flex-row gap-4 md:gap-12 p-6 md:p-8 items-start hover:bg-[var(--surface-hover)] transition-colors">
                <div className="md:w-1/3 flex flex-col gap-1">
                  <label className="text-sm font-semibold text-main">API Key</label>
                  <p className="text-xs text-[var(--secondary)]">Keys are securely stored via Supabase Row Level Security.</p>
                </div>
                <div className="md:w-2/3 w-full relative flex items-center">
                  <Key size={16} className="absolute left-3 text-muted pointer-events-none" />
                  <input 
                    type="password" 
                    className="input w-full pl-9 font-mono" 
                    placeholder="sk-..." 
                    value={settings.llm_api_key || ''}
                    onChange={e => setSettings({...settings, llm_api_key: e.target.value})}
                  />
                </div>
              </div>

              {/* Model Name Row */}
              <div className="flex flex-col md:flex-row gap-4 md:gap-12 p-6 md:p-8 items-start hover:bg-[var(--surface-hover)] transition-colors">
                <div className="md:w-1/3 flex flex-col gap-1">
                  <label className="text-sm font-semibold text-main">Model Name</label>
                  <p className="text-xs text-muted">Specify the exact model version to target.</p>
                </div>
                <div className="md:w-2/3 w-full relative flex items-center">
                  <Code size={16} className="absolute left-3 text-muted pointer-events-none" />
                  <input 
                    type="text" 
                    className="input w-full pl-9 font-mono text-sm" 
                    placeholder="e.g. gpt-4o" 
                    value={settings.llm_model || ''}
                    onChange={e => setSettings({...settings, llm_model: e.target.value})}
                  />
                </div>
              </div>

            </div>
          </Card>

          {/* AI Prompts & Generation */}
          <Card className="flex flex-col overflow-hidden">
            <CardHeader className="border-b border-[var(--border)] bg-[var(--surface)] px-6 py-5">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2 text-main">
                  <LayoutTemplate size={18} className="text-[var(--primary)]" /> AI Prompt Templates
                </h3>
                <p className="text-sm text-muted mt-1">Configure the instructions given to the AI during plan generation.</p>
              </div>
            </CardHeader>
            <CardBody className="p-6">
              <div className="flex flex-col gap-3">
                <h4 className="text-sm font-semibold text-main">Study Plan Generator System Prompt</h4>
                <textarea 
                  className="input resize-y w-full min-h-[150px] font-mono text-xs leading-relaxed p-4 bg-[var(--surface-hover)] border-[var(--border)]" 
                  value={settings.study_plan_prompt || ''}
                  onChange={e => setSettings({...settings, study_plan_prompt: e.target.value})}
                  placeholder="Enter the system prompt instructions for the AI..."
                />
                <p className="text-xs text-muted">This prompt acts as the root identity of the AI when users request to generate a new study plan from a syllabus.</p>
              </div>
            </CardBody>
          </Card>

          {/* Application Status */}
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-[var(--border)] bg-[var(--surface)] px-6 py-5">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2 text-main">
                  <Activity size={18} className="text-[var(--secondary)]" /> System Diagnostics
                </h3>
                <p className="text-sm text-muted mt-1">Real-time status of your configuration and database.</p>
              </div>
            </CardHeader>
            <CardBody className="p-6 flex flex-col sm:flex-row gap-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Database size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold">Database Connection</div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Connected
                  </div>
                </div>
              </div>
              <div className="hidden sm:block w-[1px] h-10 bg-[var(--border)]"></div>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${settings.llm_api_key ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'}`}>
                  <Cpu size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold">LLM Integration</div>
                  {settings.llm_api_key ? (
                     <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                       <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Configured ({settings.llm_provider})
                     </div>
                  ) : (
                     <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                       <span className="w-2 h-2 rounded-full bg-amber-500"></span> Missing API Key
                     </div>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>

          <div className="flex justify-end mt-4">
            <Button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 min-w-[150px] shadow-lg hover:shadow-xl transition-all">
              <Save size={18} /> {saving ? 'Saving Changes...' : 'Save All Settings'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
