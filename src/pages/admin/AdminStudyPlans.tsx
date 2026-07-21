import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardHeader, CardBody } from '../../components/Card';
import { Button } from '../../components/Button';
import { PlusCircle, Edit, Trash2, UploadCloud, X, Calendar } from 'lucide-react';
import { useToastStore } from '../../store/toastStore';
import { dataService, type StudyDay } from '../../lib/dataService';
import * as XLSX from 'xlsx';

export function AdminStudyPlans() {
  const [studyDays, setStudyDays] = useState<StudyDay[]>([]);
  const [loading, setLoading] = useState(true);
  const addToast = useToastStore(state => state.addToast);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<Partial<StudyDay>>({
    week: 1, day: 1, phase: '', subject: '', module: '', detailed_topics: '', 
    hours: 2, mcq_target: 0, written_target: 0, pyq_target: 0, practice_checklist: '', 
    daily_deliverable: '', status: 'Pending', notes: '', source: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStudyDays();
  }, []);

  const fetchStudyDays = async () => {
    setLoading(true);
    const { data, error } = await dataService.getStudyDays();
    if (error) {
      addToast('Failed to fetch study days', 'error');
    } else if (data) {
      setStudyDays(data as StudyDay[]);
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    if (editingDay.id) {
      const { error } = await dataService.updateStudyDay(editingDay.id, editingDay);
      if (error) addToast('Error updating day', 'error');
      else addToast('Study day updated', 'success');
    } else {
      const { error } = await dataService.addStudyDay(editingDay as Omit<StudyDay, 'id'>);
      if (error) addToast('Error creating day', 'error');
      else addToast('Study day created', 'success');
    }
    
    setSaving(false);
    setIsModalOpen(false);
    fetchStudyDays();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this study day?')) return;
    const { error } = await dataService.deleteStudyDay(id);
    if (error) addToast('Error deleting day', 'error');
    else {
      addToast('Study day deleted', 'success');
      fetchStudyDays();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Parse as 2D array
      const parsed = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
      
      const importedDays: Omit<StudyDay, 'id'>[] = [];
      
      for (let i = 1; i < parsed.length; i++) {
        const cols = parsed[i];
        if (!cols || cols.length === 0) continue;
        
        // Skip header/empty/Phase rows just like before
        const firstCol = String(cols[0] || '').trim();
        if (!firstCol || firstCol.startsWith('Phase')) continue;
        
        importedDays.push({
          week: Number(cols[0]) || 1,
          day: Number(cols[1]) || 1,
          phase: String(cols[2] || '').trim(),
          subject: String(cols[3] || '').trim(),
          module: String(cols[4] || '').trim(),
          detailed_topics: String(cols[5] || '').trim(),
          hours: Number(cols[6]) || 0,
          mcq_target: Number(cols[7]) || 0,
          written_target: Number(cols[8]) || 0,
          pyq_target: Number(cols[9]) || 0,
          practice_checklist: String(cols[10] || '').trim(),
          daily_deliverable: String(cols[11] || '').trim(),
          status: String(cols[12] || 'Pending').trim(),
          notes: String(cols[13] || '').trim(),
          source: String(cols[14] || '').trim()
        });
      }
      
      if (importedDays.length === 0) {
        addToast('No valid rows found in file', 'error');
        setLoading(false);
        return;
      }

      const { error } = await dataService.importStudyDays(importedDays);
      if (error) {
        addToast('Failed to import data: ' + error, 'error');
      } else {
        addToast(`Successfully imported ${importedDays.length} study days!`, 'success');
        fetchStudyDays();
      }
    } catch (err) {
      addToast('Error parsing file', 'error');
    }
    
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center flex-wrap gap-4" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.25rem' }}>Manage Study Plans</h1>
          <p className="text-muted" style={{ fontSize: '1rem' }}>Manage the detailed day-by-day exam curriculum.</p>
        </div>
        
        <div className="flex gap-2">
          <input 
            type="file" 
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2" style={{ borderColor: 'var(--secondary)', color: 'var(--secondary)' }}>
            <UploadCloud size={16} /> Import Plan (CSV/XLSX)
          </Button>
          <Button onClick={() => { 
            setEditingDay({ 
              week: studyDays.length > 0 ? Math.max(...studyDays.map(t => t.week)) : 1, 
              day: studyDays.length > 0 ? Math.max(...studyDays.map(t => t.day)) + 1 : 1,
              phase: '', subject: '', module: '', detailed_topics: '', 
              hours: 2, mcq_target: 0, written_target: 0, pyq_target: 0, practice_checklist: '', 
              daily_deliverable: '', status: 'Pending', notes: '', source: ''
            }); 
            setIsModalOpen(true); 
          }} className="flex items-center gap-2">
            <PlusCircle size={16} /> Add Day
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          <div className="skeleton min-h-[80px] rounded-md"></div>
          <div className="skeleton min-h-[80px] rounded-md"></div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {studyDays.map(day => (
            <div key={day.id} className="card p-3 flex flex-row items-center gap-3 md:gap-4 transition-all group hover:border-[var(--primary)] hover:shadow-md">
              
              {/* 1. Day / Week Column */}
              <div className="flex flex-col items-center justify-center min-w-[50px] shrink-0">
                <span className="text-[9px] text-muted font-bold uppercase tracking-widest mb-1 bg-[var(--surface-hover)] px-2 py-0.5 rounded-full">Week {day.week}</span>
                <div className="flex items-baseline gap-1 text-[var(--primary)]">
                  <span className="text-[10px] font-bold uppercase opacity-70 hidden sm:inline-block">Day</span>
                  <span className="text-xl font-black leading-none">{day.day}</span>
                </div>
              </div>

              {/* Vertical Divider */}
              <div className="hidden md:block w-[1px] h-8 bg-[var(--border)] mx-1 shrink-0"></div>
              
              {/* 2. Core Info Column */}
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] text-[var(--secondary)] font-bold uppercase tracking-wider truncate">{day.subject}</span>
                </div>
                <h3 className="font-bold text-sm md:text-[15px] m-0 text-main truncate leading-tight">
                  {day.module || day.subject || 'Study Session'}
                </h3>
                <p className="text-[11px] text-muted mt-0.5 truncate m-0 hidden sm:block">
                  {day.detailed_topics || 'No topics specified'}
                </p>
              </div>
              
              {/* 3. Targets Column */}
              <div className="flex items-center gap-2 md:gap-3 bg-[var(--surface-hover)] px-2 md:px-3 py-1 md:py-1.5 rounded-full border border-[var(--border)] shrink-0">
                <span className="text-xs font-semibold flex items-center gap-1" title="MCQ Target">
                  <span className="text-main">{day.mcq_target || 0}</span> <span className="text-muted text-[9px] uppercase font-bold hidden sm:inline-block">MCQ</span>
                </span>
                <div className="w-[3px] h-[3px] rounded-full bg-muted opacity-50"></div>
                <span className="text-xs font-semibold flex items-center gap-1" title="Written Target">
                  <span className="text-main">{day.written_target || 0}</span> <span className="text-muted text-[9px] uppercase font-bold hidden sm:inline-block">WR</span>
                </span>
              </div>

              {/* 4. Actions */}
              <div className="flex gap-2 shrink-0 ml-auto opacity-100 md:opacity-40 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => { setEditingDay(day); setIsModalOpen(true); }} 
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--surface-hover)] border border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary)] hover:text-white text-muted transition-all cursor-pointer"
                  title="Edit Day"
                >
                  <Edit size={14} />
                </button>
                <button 
                  onClick={() => handleDelete(day.id!)} 
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--surface-hover)] border border-[var(--border)] hover:border-error hover:bg-error hover:text-white text-muted transition-all cursor-pointer"
                  title="Delete Day"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {studyDays.length === 0 && (
            <div className="text-center p-12 border border-dashed border-[var(--border)] rounded-lg text-muted">
              <Calendar size={48} className="mx-auto mb-4 opacity-50" />
              <h3>No Study Days</h3>
              <p>Click "Import Plan" to load the curriculum from CSV or Excel.</p>
            </div>
          )}
        </div>
      )}

      {/* EDIT MODAL */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <CardHeader className="flex justify-between items-center bg-[var(--surface)] border-b border-[var(--border)]">
              <h3 className="font-bold text-lg">{editingDay.id ? `Edit Day ${editingDay.day}` : 'Create Study Day'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-main cursor-pointer"><X size={20} /></button>
            </CardHeader>
            <CardBody className="overflow-y-auto flex-1 p-6">
              <form id="day-form" onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                
                {/* Meta details */}
                <div className="col-span-1 md:col-span-2 text-sm font-bold border-b border-[var(--border)] pb-2 mb-2 text-muted">Schedule & Meta</div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-muted uppercase">Phase</label>
                  <input type="text" className="input" value={editingDay.phase || ''} onChange={e => setEditingDay({...editingDay, phase: e.target.value})} placeholder="e.g. Phase 1 — CS Core" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-muted uppercase">Week</label>
                    <input type="number" className="input" value={editingDay.week || ''} onChange={e => setEditingDay({...editingDay, week: Number(e.target.value)})} min={1} required />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-muted uppercase">Day</label>
                    <input type="number" className="input" value={editingDay.day || ''} onChange={e => setEditingDay({...editingDay, day: Number(e.target.value)})} min={1} required />
                  </div>
                </div>

                {/* Content details */}
                <div className="col-span-1 md:col-span-2 text-sm font-bold border-b border-[var(--border)] pb-2 mb-2 mt-2 text-muted">Topic Content</div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-muted uppercase">Subject</label>
                  <input type="text" className="input" value={editingDay.subject || ''} onChange={e => setEditingDay({...editingDay, subject: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-muted uppercase">Module / Chapter</label>
                  <input type="text" className="input" value={editingDay.module || ''} onChange={e => setEditingDay({...editingDay, module: e.target.value})} />
                </div>
                <div className="col-span-1 md:col-span-2 flex flex-col gap-1">
                  <label className="text-xs font-semibold text-muted uppercase">Detailed Topics / Focus</label>
                  <textarea className="input resize-y min-h-[60px]" value={editingDay.detailed_topics || ''} onChange={e => setEditingDay({...editingDay, detailed_topics: e.target.value})} />
                </div>

                {/* Targets */}
                <div className="col-span-1 md:col-span-2 text-sm font-bold border-b border-[var(--border)] pb-2 mb-2 mt-2 text-muted">Targets & Checklist</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 col-span-1 md:col-span-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-muted uppercase">Hours</label>
                    <input type="number" step="0.5" className="input" value={editingDay.hours || 0} onChange={e => setEditingDay({...editingDay, hours: Number(e.target.value)})} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-muted uppercase">MCQ</label>
                    <input type="number" className="input" value={editingDay.mcq_target || 0} onChange={e => setEditingDay({...editingDay, mcq_target: Number(e.target.value)})} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-muted uppercase">Written</label>
                    <input type="number" className="input" value={editingDay.written_target || 0} onChange={e => setEditingDay({...editingDay, written_target: Number(e.target.value)})} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-muted uppercase">PYQ</label>
                    <input type="number" className="input" value={editingDay.pyq_target || 0} onChange={e => setEditingDay({...editingDay, pyq_target: Number(e.target.value)})} />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-muted uppercase">Practice Checklist</label>
                  <textarea className="input resize-y min-h-[80px]" value={editingDay.practice_checklist || ''} onChange={e => setEditingDay({...editingDay, practice_checklist: e.target.value})} placeholder="• Item 1&#10;• Item 2" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-muted uppercase">Daily Deliverable</label>
                  <textarea className="input resize-y min-h-[80px]" value={editingDay.daily_deliverable || ''} onChange={e => setEditingDay({...editingDay, daily_deliverable: e.target.value})} />
                </div>

              </form>
            </CardBody>
            <div className="p-4 bg-[var(--surface-hover)] border-t border-[var(--border)] flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" form="day-form" disabled={saving}>{saving ? 'Saving...' : 'Save Study Day'}</Button>
            </div>
          </Card>
        </div>,
        document.body
      )}
    </div>
  );
}
