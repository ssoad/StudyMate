import { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody } from '../../components/Card';
import { Button } from '../../components/Button';
import { PlusCircle, Edit, Trash2, Calendar, Clock, FileQuestion, X, Brain } from 'lucide-react';
import { useToastStore } from '../../store/toastStore';
import { dataService, type Exam } from '../../lib/dataService';
import { parseFileForLLM } from '../../lib/fileParser';
import { generateExamFromDocument } from '../../lib/llm';

export function AdminExams() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const addToast = useToastStore(state => state.addToast);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Partial<Exam>>({ title: '', type: 'Weekly', duration: 30, questions: 10, due_date: '' });
  const [saving, setSaving] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);

  useEffect(() => {
    fetchExams();
  }, []);

  const handleAiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setGeneratingAi(true);
    addToast('Extracting text from document...', 'info');

    try {
      const parsedFile = await parseFileForLLM(file);
      addToast('Generating exam questions via AI...', 'info');
      
      const fileName = file.name.split('.')[0];
      const questions = await generateExamFromDocument(parsedFile, fileName);
      
      // Auto-fill exam details and attach generated questions
      setEditingExam({
        ...editingExam,
        title: `Generated: ${fileName}`,
        questions: questions.length,
        _generatedQuestions: questions
      } as any);
      
      addToast(`Successfully generated ${questions.length} questions!`, 'success');
    } catch (error: any) {
      addToast(error.message, 'error');
    } finally {
      setGeneratingAi(false);
      // Reset input
      e.target.value = '';
    }
  };

  const fetchExams = async () => {
    setLoading(true);
    const { data, error } = await dataService.getExams();
    if (error) {
      addToast('Failed to fetch exams', 'error');
    } else if (data) {
      setExams(data as Exam[]);
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const payload = {
      ...editingExam,
      due_date: editingExam.due_date ? new Date(editingExam.due_date).toISOString() : null
    };

    if (editingExam.id) {
      const { error } = await dataService.updateExam(editingExam.id, payload);
      if (error) addToast('Error updating exam', 'error');
      else addToast('Exam updated', 'success');
    } else {
      const { _generatedQuestions, ...examData } = payload as any;
      const { data, error } = await dataService.addExam(examData);
      
      if (error) {
        addToast('Error creating exam', 'error');
      } else {
        if (_generatedQuestions && data) {
          // Format questions with the new exam ID
          const qsToInsert = _generatedQuestions.map((q: any) => ({
            ...q,
            exam_id: data.id
          }));
          const { error: qError } = await dataService.addExamQuestions(qsToInsert);
          if (qError) {
             console.error(qError);
             addToast('Exam created but failed to save questions', 'error');
          } else {
             addToast('Exam and questions created', 'success');
          }
        } else {
          addToast('Exam created', 'success');
        }
      }
    }
    
    setSaving(false);
    setIsModalOpen(false);
    fetchExams();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this exam?')) return;
    const { error } = await dataService.deleteExam(id);
    if (error) {
      console.error(error);
      addToast(`Error deleting exam: ${error.message}`, 'error');
    } else {
      addToast('Exam deleted', 'success');
      fetchExams();
    }
  };

  const formatDateForInput = (isoDate: string | null | undefined) => {
    if (!isoDate) return '';
    return new Date(isoDate).toISOString().split('T')[0];
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center flex-wrap gap-4" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.25rem' }}>Manage Exams</h1>
          <p className="text-muted" style={{ fontSize: '1rem' }}>Create and schedule tests and quizzes.</p>
        </div>
        
        <Button onClick={() => { setEditingExam({ title: '', type: 'Weekly', duration: 30, questions: 10, due_date: '' }); setIsModalOpen(true); }} className="flex items-center gap-2">
          <PlusCircle size={16} /> Create Exam
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="skeleton min-h-[120px] rounded-md"></div>
          <div className="skeleton min-h-[120px] rounded-md"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map(exam => (
            <Card key={exam.id} className="h-full flex flex-col">
              <CardBody className="flex flex-col gap-3 flex-1">
                <div className="flex justify-between items-start">
                  <div className="badge badge-secondary">{exam.type}</div>
                  <div className="flex gap-2">
                    <button 
                      onClick={async () => {
                        const { data, error } = await dataService.queueExamEvaluations(exam.id);
                        if (error) {
                          addToast(`Error: ${error.message}`, 'error');
                        } else if (data && data.length > 0) {
                          addToast(`Queued ${data.length} submissions for background AI evaluation.`, 'success');
                        } else {
                          addToast('No new submissions to evaluate.', 'info');
                        }
                      }} 
                      title="Start AI Evaluation for all submissions"
                      className="text-muted hover:text-green-500 transition-colors p-1"
                    >
                      <Brain size={16} />
                    </button>
                    <button onClick={() => { setEditingExam({...exam, due_date: formatDateForInput(exam.due_date)}); setIsModalOpen(true); }} className="text-muted hover:text-primary transition-colors p-1"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(exam.id)} className="text-muted hover:text-error transition-colors p-1"><Trash2 size={16} /></button>
                  </div>
                </div>
                <h3 className="font-semibold" style={{ fontSize: '1.15rem' }}>{exam.title}</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-2 mt-2 text-sm text-muted">
                  <div className="flex items-center gap-2">
                    <Clock size={16} /> {exam.duration} mins
                  </div>
                  <div className="flex items-center gap-2">
                    <FileQuestion size={16} /> {exam.questions} Qs
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    <Calendar size={16} /> {exam.due_date ? new Date(exam.due_date).toLocaleDateString() : 'No Due Date'}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex justify-between items-center bg-[var(--surface)]">
              <h3 className="font-bold text-lg">{editingExam.id ? 'Edit Exam' : 'Create Exam'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-main"><X size={20} /></button>
            </CardHeader>
            <CardBody className="p-6">
              {!editingExam.id && (
                <div className="mb-6 p-4 border border-dashed border-[var(--primary)] bg-[var(--primary)]/5 rounded-lg flex flex-col items-center justify-center gap-3">
                  <div className="text-center">
                    <h4 className="font-semibold text-[var(--primary)] flex items-center justify-center gap-2">
                      ✨ Generate with AI
                    </h4>
                    <p className="text-xs text-muted mt-1">Upload a PDF, Word, Excel, or Image containing questions to instantly generate an interactive exam.</p>
                  </div>
                  <input 
                    type="file" 
                    accept=".pdf,.txt,.md,.docx,.xlsx,.png,.jpg,.jpeg"
                    className="hidden"
                    id="ai-upload"
                    onChange={handleAiUpload}
                  />
                  <Button 
                    variant="secondary" 
                    className="w-full border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white"
                    disabled={generatingAi}
                    onClick={() => document.getElementById('ai-upload')?.click()}
                  >
                    {generatingAi ? 'Generating Exam...' : 'Upload Document'}
                  </Button>
                </div>
              )}

              <form id="exam-form" onSubmit={handleSave} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-muted uppercase tracking-wider">Exam Title</label>
                  <input type="text" className="input" value={editingExam.title || ''} onChange={e => setEditingExam({...editingExam, title: e.target.value})} required />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-muted uppercase tracking-wider">Type</label>
                    <select className="input" value={editingExam.type || 'Weekly'} onChange={e => setEditingExam({...editingExam, type: e.target.value})}>
                      <option value="Weekly">Weekly</option>
                      <option value="Topic-wise">Topic-wise</option>
                      <option value="Mock Test">Mock Test</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-muted uppercase tracking-wider">Due Date</label>
                    <input type="date" className="input" value={editingExam.due_date || ''} onChange={e => setEditingExam({...editingExam, due_date: e.target.value})} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-muted uppercase tracking-wider">Duration (mins)</label>
                    <input type="number" className="input" value={editingExam.duration || 30} onChange={e => setEditingExam({...editingExam, duration: Number(e.target.value)})} required min={5} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-muted uppercase tracking-wider">Questions</label>
                    <input type="number" className="input" value={editingExam.questions || 10} onChange={e => setEditingExam({...editingExam, questions: Number(e.target.value)})} required min={1} />
                  </div>
                </div>

                {(editingExam as any)._generatedQuestions && (
                  <div className="mt-4 border-t border-[var(--border)] pt-4">
                    <h4 className="text-sm font-bold mb-3">Review Generated Questions</h4>
                    <div className="flex flex-col gap-4 max-h-[40vh] overflow-y-auto pr-2">
                      {(editingExam as any)._generatedQuestions.map((q: any, qIndex: number) => (
                        <div key={qIndex} className="p-3 bg-[var(--surface-hover)] rounded-md border border-[var(--border)]">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                            <span className="font-semibold text-sm">Q{qIndex + 1}. {q.question_text}</span>
                            <span className="text-xs px-2 py-1 bg-[var(--border)] rounded-full self-start shrink-0">{q.type === 'mcq' ? 'MCQ' : 'Written'} - {q.points} pts</span>
                          </div>
                          
                          {q.type === 'mcq' && q.options && (
                            <div className="flex flex-col gap-2 mt-3">
                              <span className="text-xs text-muted mb-1">Select the correct answer:</span>
                              {q.options.map((opt: string, optIndex: number) => (
                                <label 
                                  key={optIndex}
                                  className={`flex items-center gap-3 p-2 rounded-md border cursor-pointer transition-colors text-sm ${q.correct_option === optIndex ? 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400' : 'border-[var(--border)] hover:bg-[var(--surface)]'}`}
                                >
                                  <input 
                                    type="radio" 
                                    name={`q-${qIndex}-correct`}
                                    checked={q.correct_option === optIndex}
                                    onChange={() => {
                                      const newQs = [...(editingExam as any)._generatedQuestions];
                                      newQs[qIndex] = { ...newQs[qIndex], correct_option: optIndex };
                                      setEditingExam({ ...editingExam, _generatedQuestions: newQs } as any);
                                    }}
                                    className="accent-green-500 w-4 h-4 shrink-0"
                                  />
                                  <span className="flex-1 break-words leading-tight">{opt}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </form>
            </CardBody>
            <div className="p-4 bg-[var(--surface-hover)] border-t border-[var(--border)] flex justify-end gap-3 rounded-b-lg">
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" form="exam-form" disabled={saving || generatingAi}>{saving ? 'Saving...' : 'Save Exam'}</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
