import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { BookOpen, Sparkles, ShieldCheck, ArrowRight, Brain, Zap } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

export function Landing() {
  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] font-sans selection:bg-[var(--primary)] selection:text-white">
      {/* PUBLIC NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-[var(--border)] px-6 py-4 flex items-center justify-between transition-all duration-300 backdrop-blur-xl bg-[var(--bg-main)]/70">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
            <Brain size={24} className="text-white" />
          </div>
          <span className="text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
            StudyMate AI
          </span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link to="/login">
            <Button variant="secondary" className="hidden sm:flex border-[var(--border)] hover:bg-[var(--surface-hover)]">
              Sign In
            </Button>
          </Link>
          <Link to="/login">
            <Button className="bg-[var(--primary)] hover:opacity-90 shadow-lg shadow-[var(--primary)]/20 text-white font-semibold">
              Get Started
            </Button>
          </Link>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6 sm:px-12 max-w-7xl mx-auto flex flex-col items-center">
        {/* HERO SECTION */}
        <div className="flex flex-col items-center text-center max-w-4xl animate-fade-in mt-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold text-sm mb-8 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)] backdrop-blur-md">
            <Sparkles size={16} />
            <span>The Next Generation of AI Learning</span>
          </div>
          
          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
            Master your syllabus with <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-gradient-x">
              Superhuman Intelligence.
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-[var(--text-muted)] max-w-2xl mb-10 leading-relaxed font-medium">
            StudyMate AI instantly generates comprehensive study plans, interactive quizzes, and grades your submissions automatically. Your ultimate learning companion.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link to="/login">
              <Button size="lg" className="bg-[var(--primary)] text-white shadow-xl shadow-indigo-500/25 px-8 text-lg font-bold rounded-2xl h-14 hover:scale-[1.02] transition-transform">
                Start Learning Free <ArrowRight className="ml-2" size={20} />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="secondary" className="border-2 border-[var(--border)] hover:bg-[var(--surface-hover)] px-8 text-lg font-bold rounded-2xl h-14 backdrop-blur-sm">
                Admin Demo
              </Button>
            </Link>
          </div>
        </div>

        {/* GLOWING DIVIDER */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-[var(--primary)]/30 to-transparent my-24 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[var(--primary)]/10 blur-[50px] rounded-full"></div>
        </div>

        {/* FEATURES GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          <div className="glass-panel p-8 rounded-3xl border border-[var(--border)] hover:border-[var(--primary)]/50 transition-all duration-300 hover:shadow-2xl hover:shadow-[var(--primary)]/10 group relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all"></div>
            <div className="bg-blue-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20 text-blue-500">
              <BookOpen size={28} />
            </div>
            <h3 className="text-xl font-bold mb-3">AI Syllabus Mapping</h3>
            <p className="text-[var(--text-muted)] leading-relaxed">
              Upload any PDF or document, and StudyMate automatically extracts topics to build a structured, day-by-day learning curriculum.
            </p>
          </div>

          <div className="glass-panel p-8 rounded-3xl border border-[var(--border)] hover:border-[var(--primary)]/50 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 group relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all"></div>
            <div className="bg-purple-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border border-purple-500/20 text-purple-500">
              <Zap size={28} />
            </div>
            <h3 className="text-xl font-bold mb-3">Instant Exam Generation</h3>
            <p className="text-[var(--text-muted)] leading-relaxed">
              Generate multiple-choice or written exams instantly using cutting-edge LLMs based specifically on your course material.
            </p>
          </div>

          <div className="glass-panel p-8 rounded-3xl border border-[var(--border)] hover:border-[var(--primary)]/50 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/10 group relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all"></div>
            <div className="bg-emerald-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border border-emerald-500/20 text-emerald-500">
              <ShieldCheck size={28} />
            </div>
            <h3 className="text-xl font-bold mb-3">Automated Grading</h3>
            <p className="text-[var(--text-muted)] leading-relaxed">
              Our background AI evaluator tirelessly grades student submissions, assigning points and leaving constructive feedback 24/7.
            </p>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full border-t border-[var(--border)] py-8 text-center text-sm text-[var(--text-muted)]">
        <p>&copy; {new Date().getFullYear()} StudyMate AI. Built with ❤️ for superhuman learning.</p>
      </footer>
    </div>
  );
}
