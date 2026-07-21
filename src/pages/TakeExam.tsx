import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody } from '../components/Card';
import { Button } from '../components/Button';
import { dataService, type ExamQuestion } from '../lib/dataService';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { CheckCircle, UploadCloud } from 'lucide-react';

export function TakeExam() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const addToast = useToastStore(state => state.addToast);
  
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    
    async function initExam() {
      setLoading(true);
      // Fetch Questions
      const { data: qData, error: qError } = await dataService.getExamQuestions(id!);
      if (qError) {
        addToast(`Failed to load exam questions: ${qError.message}`, 'error');
        setLoading(false);
        return;
      }
      
      setQuestions(qData || []);
      
      // Start Submission
      const { data: sData, error: sError } = await dataService.startExamSubmission(id!, user!.id);
      if (sError) {
        addToast('Failed to start exam.', 'error');
      } else if (sData) {
        setSubmissionId(sData.id);
      }
      
      setLoading(false);
    }
    
    initExam();
  }, [id, user]);

  const handleMcqSelect = (questionId: string, optionIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: { selected_option: optionIndex } }));
  };

  const handleFileUpload = async (questionId: string, file: File) => {
    if (!submissionId) return;
    
    addToast('Uploading answer script...', 'info');
    const { url, error } = await dataService.uploadAnswerFile(file, submissionId, questionId);
    
    if (error) {
      addToast('Upload failed: ' + error.message, 'error');
    } else if (url) {
      setAnswers(prev => ({ ...prev, [questionId]: { answer_file_url: url, fileName: file.name } }));
      addToast('Upload successful!', 'success');
    }
  };

  const handleSubmit = async () => {
    if (!submissionId) return;
    if (Object.keys(answers).length < questions.length) {
      if (!window.confirm('You have unanswered questions. Are you sure you want to submit?')) return;
    }
    
    setSubmitting(true);
    let totalScore = 0;
    
    // Save answers
    for (const q of questions) {
      const answer = answers[q.id];
      if (!answer) continue;
      
      let isCorrect = false;
      let pointsAwarded = 0;
      
      if (q.type === 'mcq' && answer.selected_option !== undefined) {
        isCorrect = answer.selected_option === q.correct_option;
        pointsAwarded = isCorrect ? q.points : 0;
        totalScore += pointsAwarded;
      }
      
      await dataService.saveExamAnswer({
        submission_id: submissionId,
        question_id: q.id,
        selected_option: answer.selected_option,
        answer_file_url: answer.answer_file_url,
        is_correct: q.type === 'mcq' ? isCorrect : undefined,
        points_awarded: pointsAwarded
      });
    }
    
    await dataService.submitExamSubmission(submissionId, totalScore);
    addToast('Exam submitted successfully!', 'success');
    navigate('/exams');
  };

  if (loading) {
    return <div className="p-8 text-center text-muted animate-pulse">Loading exam...</div>;
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <h2 className="text-xl font-bold">No Questions Found</h2>
        <p className="text-muted mb-4">This exam does not have any questions yet.</p>
        <Button onClick={() => navigate('/exams')}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold mb-2">Exam</h1>
        <p className="text-muted">Answer the questions below. For written questions, upload a scanned PDF or image of your answers.</p>
      </div>

      <div className="flex flex-col gap-6">
        {questions.map((q, index) => (
          <Card key={q.id}>
            <CardHeader className="bg-[var(--surface-hover)] border-b border-[var(--border)] p-4 flex justify-between items-center">
              <span className="font-semibold text-lg">Question {index + 1}</span>
              <span className="text-xs bg-[var(--primary)]/10 text-[var(--primary)] px-2 py-1 rounded-full font-bold">
                {q.points} {q.points === 1 ? 'Point' : 'Points'}
              </span>
            </CardHeader>
            <CardBody className="p-5 flex flex-col gap-4">
              <p className="text-lg" style={{ whiteSpace: 'pre-wrap' }}>{q.question_text}</p>
              
              {q.type === 'mcq' && q.options && (
                <div className="flex flex-col gap-2 mt-2">
                  {q.options.map((opt, i) => (
                    <label 
                      key={i} 
                      className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${answers[q.id]?.selected_option === i ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--border)] hover:bg-[var(--surface-hover)]'}`}
                    >
                      <input 
                        type="radio" 
                        name={`q-${q.id}`} 
                        checked={answers[q.id]?.selected_option === i}
                        onChange={() => handleMcqSelect(q.id, i)}
                        className="accent-[var(--primary)] w-4 h-4"
                      />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
              )}
              
              {q.type === 'written' && (
                <div className="mt-2">
                  {answers[q.id]?.answer_file_url ? (
                    <div className="flex items-center gap-2 text-green-500 bg-green-500/10 p-3 rounded-md border border-green-500/20">
                      <CheckCircle size={20} />
                      <span className="font-medium text-sm">Uploaded: {answers[q.id].fileName}</span>
                      <button 
                        className="ml-auto text-xs underline opacity-80 hover:opacity-100"
                        onClick={() => document.getElementById(`upload-${q.id}`)?.click()}
                      >
                        Replace
                      </button>
                    </div>
                  ) : (
                    <div 
                      className="border-2 border-dashed border-[var(--border)] rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[var(--primary)] transition-colors hover:bg-[var(--primary)]/5"
                      onClick={() => document.getElementById(`upload-${q.id}`)?.click()}
                    >
                      <UploadCloud size={32} className="text-muted" />
                      <span className="text-sm font-medium">Click to upload your answer script</span>
                      <span className="text-xs text-muted">Supports PDF, JPG, PNG</span>
                    </div>
                  )}
                  <input 
                    type="file" 
                    id={`upload-${q.id}`} 
                    className="hidden" 
                    accept=".pdf,image/*" 
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(q.id, e.target.files[0]);
                      }
                    }} 
                  />
                </div>
              )}
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="flex justify-end pt-4 border-t border-[var(--border)]">
        <Button size="lg" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Exam'}
        </Button>
      </div>
    </div>
  );
}
