import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, ClipboardCheck, Download, PlayCircle } from 'lucide-react';
import { APK_URL, detectPlatform, useAndroidRelease } from '../lib/appRelease';
import { buttonClass } from '../components/Button';
import { ThemeToggle } from '../components/ThemeToggle';

const FEATURES = [
  {
    icon: PlayCircle,
    title: 'Full video courses',
    body: 'Structured modules with HD lectures that remember where you stopped, on the web and on Android.',
  },
  {
    icon: BookOpen,
    title: 'Notes and handouts',
    body: 'Every lecture comes with its reference notes and PDFs. Read them in the app or download them.',
  },
  {
    icon: ClipboardCheck,
    title: 'Exams and progress',
    body: 'Practice exams, a personal study plan and a progress record that shows what is left to cover.',
  },
];

export function Landing() {
  const isAndroid = detectPlatform() === 'android';
  const release = useAndroidRelease();

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-main)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 text-[var(--text-main)] hover:text-[var(--text-main)]">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] text-sm font-bold text-[var(--on-primary)]">
              S
            </span>
            <span className="text-base font-semibold">StudyMate</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link to="/courses" className={buttonClass('ghost', 'sm', 'hidden sm:inline-flex')}>
              Courses
            </Link>
            <ThemeToggle />
            <Link to="/login" className={buttonClass('primary', 'sm')}>
              Sign in
            </Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="flex flex-col items-start gap-6 py-16 sm:py-24 md:max-w-2xl">
          <span className="badge badge-primary">AD (ICT) exam preparation</span>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Prepare for your exam, one lesson at a time.
          </h1>
          <p className="text-lg text-[var(--text-muted)]">
            Video lectures, notes and practice exams in one place, with your progress saved across the web and
            the Android app.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/courses" className={buttonClass('primary', 'lg')}>
              Browse courses <ArrowRight size={18} />
            </Link>
            <Link to="/login" className={buttonClass('secondary', 'lg')}>
              Sign in
            </Link>
          </div>
          {release && (
            <a
              href={APK_URL}
              download
              className={isAndroid ? buttonClass('secondary', 'lg', 'w-full sm:w-auto') : 'inline-flex items-center gap-2 text-sm'}
            >
              <Download size={isAndroid ? 18 : 15} />
              {isAndroid ? 'Download the Android app' : 'Get the Android app (APK)'}
              <span className="text-xs text-[var(--text-muted)]">v{release.versionName}</span>
            </a>
          )}
        </section>

        <section className="grid gap-4 border-t border-[var(--border)] py-12 sm:grid-cols-3 sm:py-16">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6">
              <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-hover)] text-[var(--text-muted)]">
                <Icon size={18} />
              </span>
              <h2 className="mb-1 text-base font-semibold">{title}</h2>
              <p className="text-sm text-[var(--text-muted)]">{body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-[var(--border)] py-8 text-center text-sm text-[var(--text-muted)]">
        © {new Date().getFullYear()} StudyMate
      </footer>
    </div>
  );
}
