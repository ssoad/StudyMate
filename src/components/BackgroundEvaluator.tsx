import React, { useEffect, useState, useRef } from 'react';
import { dataService } from '../lib/dataService';
import { evaluateAnswer } from '../lib/evaluator';
import { useAuthStore } from '../store/authStore';
import { Loader2 } from 'lucide-react';

export default function BackgroundEvaluator() {
  const { user } = useAuthStore();
  const [evaluatingTarget, setEvaluatingTarget] = useState<string | null>(null);
  const [progress, setProgress] = useState({ total: 0, completed: 0 });
  const isProcessing = useRef(false);

  useEffect(() => {
    // Only run for admins
    if (!user?.email?.includes('admin')) return;

    const interval = setInterval(() => {
      checkQueue();
    }, 10000); // Check every 10 seconds

    // Initial check
    checkQueue();

    return () => clearInterval(interval);
  }, [user]);

  const checkQueue = async () => {
    if (isProcessing.current) return;
    
    try {
      const { data: pending, error } = await dataService.getPendingEvaluations();
      if (error || !pending || pending.length === 0) return;

      isProcessing.current = true;

      for (const submission of pending) {
        setEvaluatingTarget(`Evaluating Exam ID: ${submission.exam_id.substring(0,8)}...`);
        
        // Fetch answers for this submission
        const { data: answersData, error: answersError } = await dataService.getSubmissionAnswers(submission.id);
        
        if (answersError || !answersData) continue;

        const answers = answersData as any[]; // Type assertion for joined data
        setProgress({ total: answers.length, completed: 0 });

        let totalScore = 0;
        let completedCount = 0;

        for (const answer of answers) {
          // Skip if already evaluated
          if (answer.is_correct !== null && answer.points_awarded !== null && answer.is_correct !== undefined) {
            totalScore += (answer.points_awarded || 0);
            completedCount++;
            setProgress(prev => ({ ...prev, completed: completedCount }));
            continue;
          }

          const question = answer.exam_questions;
          if (!question) continue;

          // Process evaluation
          const result = await evaluateAnswer(question, answer);
          
          // Save result
          await dataService.updateExamAnswer(answer.id, {
            is_correct: result.is_correct,
            points_awarded: result.points_awarded,
            feedback: result.feedback
          });

          totalScore += result.points_awarded;
          completedCount++;
          setProgress(prev => ({ ...prev, completed: completedCount }));
        }

        // Finish submission
        await dataService.updateSubmissionStatus(submission.id, 'graded', totalScore);
        setEvaluatingTarget(null);
      }
    } catch (e) {
      console.error('Background Evaluator Error:', e);
    } finally {
      isProcessing.current = false;
      setEvaluatingTarget(null);
    }
  };

  if (!evaluatingTarget) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-[var(--surface)] border border-[var(--border)] shadow-lg rounded-lg p-4 w-72 z-[9999] animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <Loader2 size={18} className="animate-spin text-[var(--primary)]" />
        <h4 className="font-bold text-sm text-[var(--text)]">Background AI Evaluator</h4>
      </div>
      <p className="text-xs text-muted mb-3 truncate">{evaluatingTarget}</p>
      
      <div className="w-full bg-[var(--surface-hover)] rounded-full h-2 mb-1 overflow-hidden">
        <div 
          className="bg-[var(--primary)] h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` }}
        ></div>
      </div>
      <p className="text-[10px] text-right text-muted font-medium">
        {progress.completed} / {progress.total} Answers Graded
      </p>
    </div>
  );
}
