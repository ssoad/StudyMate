import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Search, 
  Play, 
  Copy, 
  Check, 
  Download, 
  Edit3, 
  Plus, 
  Trash2, 
  Save, 
  X, 
  Upload, 
  Sliders, 
  Volume2,
  Clock,
  Video
} from 'lucide-react';
import { Button } from './Button';
import { 
  type TranscriptCue, 
  type TranscriptMetadata,
  parseTranscriptWithMetadata, 
  formatSecondsToTimestamp, 
  cuesToWebVTT, 
  cuesToPlainText,
  detectTextLanguage 
} from '../lib/transcriptParser';
import { dataService, type CourseLesson } from '../lib/dataService';
import { useToastStore } from '../store/toastStore';

interface VideoTranscriptProps {
  lesson: CourseLesson;
  currentTime: number; // in seconds
  onSeek: (seconds: number) => void;
  isAdmin?: boolean;
  onTranscriptUpdated?: (newTranscript: string) => void;
  className?: string;
  isSidePanel?: boolean;
  onCloseSidePanel?: () => void;
  autoGenerateIfEmpty?: boolean;
}

export function VideoTranscript({
  lesson,
  currentTime,
  onSeek,
  isAdmin = false,
  onTranscriptUpdated,
  className = '',
  isSidePanel = false,
  onCloseSidePanel,
}: VideoTranscriptProps) {
  const { addToast } = useToastStore();

  const [cues, setCues] = useState<TranscriptCue[]>([]);
  const [metadata, setMetadata] = useState<TranscriptMetadata>({
    isMachineGenerated: false,
    detectedLanguage: 'en',
    languageName: 'English',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [activeCueId, setActiveCueId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTab, setEditTab] = useState<'visual' | 'raw' | 'upload'>('visual');
  const [editableCues, setEditableCues] = useState<TranscriptCue[]>([]);
  const [rawText, setRawText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingOnline, setIsCheckingOnline] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeCueRef = useRef<HTMLDivElement>(null);

  // Load and parse transcript whenever lesson changes
  useEffect(() => {
    const raw = lesson.transcript || '';
    if (raw.trim()) {
      const parsedResult = parseTranscriptWithMetadata(raw, lesson.duration_seconds || 600);
      setCues(parsedResult.cues);
      setEditableCues(parsedResult.cues);
      setMetadata(parsedResult.metadata);
      setRawText(raw);
      setIsEditing(false);
    } else {
      setCues([]);
      setEditableCues([]);
      setMetadata({
        isMachineGenerated: false,
        detectedLanguage: 'auto',
        languageName: 'Manual Transcript',
      });
      setRawText('');
      setIsEditing(false);
    }
  }, [lesson.id, lesson.transcript]);

  // Determine active cue based on video currentTime
  useEffect(() => {
    if (cues.length === 0) {
      setActiveCueId(null);
      return;
    }

    const current = cues.find((c) => currentTime >= c.start && currentTime < c.end);
    if (current) {
      setActiveCueId(current.id);
    } else {
      const prevCues = cues.filter((c) => c.start <= currentTime);
      if (prevCues.length > 0) {
        setActiveCueId(prevCues[prevCues.length - 1].id);
      } else {
        setActiveCueId(cues[0]?.id || null);
      }
    }
  }, [currentTime, cues]);

  // Auto-scroll to active cue
  useEffect(() => {
    if (!autoScroll || !activeCueRef.current || isEditing) return;

    activeCueRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }, [activeCueId, autoScroll, isEditing]);

  // Filter cues based on search query
  const filteredCues = cues.filter((c) =>
    c.text.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  // Copy full transcript to clipboard
  const handleCopyTranscript = (withTimestamps = false) => {
    if (cues.length === 0) return;
    const text = cuesToPlainText(cues, withTimestamps);
    navigator.clipboard.writeText(text);
    setCopied(true);
    addToast('Transcript copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  // Download as WebVTT or plain text file
  const handleDownload = (format: 'vtt' | 'txt') => {
    if (cues.length === 0) return;
    const filename = `${lesson.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_transcript.${format}`;
    const content = format === 'vtt' ? cuesToWebVTT(cues, lesson.title) : cuesToPlainText(cues, true);
    const blob = new Blob([content], { type: format === 'vtt' ? 'text/vtt' : 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast(`Downloaded ${filename}`, 'success');
  };

  // Add a new cue at the current video playback position
  const handleAddCueAtCurrentTime = () => {
    const cur = Math.max(0, Math.floor(currentTime));
    const newCue: TranscriptCue = {
      id: `cue-${Date.now()}`,
      start: cur,
      end: cur + 15,
      text: '',
    };

    // Insert cue sorted by start time
    const updated = [...editableCues, newCue].sort((a, b) => a.start - b.start);
    setEditableCues(updated);
    addToast(`Added new cue at ${formatSecondsToTimestamp(cur)}`, 'info');
  };

  // Add empty cue at the end
  const handleAddCueAtEnd = () => {
    const lastEnd = editableCues.length > 0 ? editableCues[editableCues.length - 1].end : 0;
    const newCue: TranscriptCue = {
      id: `cue-${Date.now()}`,
      start: lastEnd,
      end: lastEnd + 15,
      text: '',
    };
    setEditableCues([...editableCues, newCue]);
  };

  // Parse Raw Text to Visual Cues
  const handleConvertRawToCues = () => {
    if (!rawText.trim()) {
      addToast('Please enter or paste transcript text first.', 'error');
      return;
    }

    const parsed = parseTranscriptWithMetadata(rawText, lesson.duration_seconds || 600);
    if (parsed.cues.length > 0) {
      setEditableCues(parsed.cues);
      setMetadata(parsed.metadata);
      setEditTab('visual');
      addToast(`Parsed ${parsed.cues.length} cues successfully! Review them in the visual editor.`, 'success');
    } else {
      addToast('Could not detect cues. Paste lines with timestamps (e.g. 01:23 Introduction) or WebVTT/SRT format.', 'error');
    }
  };

  // Check online YouTube captions if this is a YouTube video
  const handleCheckYouTubeCaptions = async () => {
    const ytId = lesson.youtube_video_id;
    const videoUrl = lesson.video_url || lesson.youtube_video_url;

    if (!ytId && (!videoUrl || !videoUrl.includes('youtube.com') && !videoUrl.includes('youtu.be'))) {
      addToast('This lecture video is a local file, not a YouTube link. Please enter or upload transcripts manually.', 'info');
      return;
    }

    setIsCheckingOnline(true);
    try {
      const result = await dataService.autoGenerateTranscript({
        lessonId: lesson.id,
        videoId: ytId,
        videoUrl: videoUrl,
        title: lesson.title,
        durationSeconds: lesson.duration_seconds || 600,
        language: 'auto',
      });

      if (result.success && result.cues.length > 0) {
        setCues(result.cues);
        setEditableCues(result.cues);
        setMetadata(result.metadata);
        setRawText(result.rawTranscript);
        if (onTranscriptUpdated) {
          onTranscriptUpdated(result.rawTranscript);
        }
        addToast(`Found online captions with ${result.cues.length} cues!`, 'success');
        setIsEditing(false);
      } else {
        addToast(result.error || 'No online captions found for this video. You can create or upload them manually.', 'info');
      }
    } catch (err: any) {
      addToast(err.message || 'Error checking online captions', 'error');
    } finally {
      setIsCheckingOnline(false);
    }
  };

  // Handle file upload (.vtt, .srt, .txt, .json)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const parsed = parseTranscriptWithMetadata(content, lesson.duration_seconds || 600);
        if (parsed.cues.length > 0) {
          setEditableCues(parsed.cues);
          setRawText(content);
          setMetadata(parsed.metadata);
          setEditTab('visual');
          addToast(`Loaded ${parsed.cues.length} cues from ${file.name}!`, 'success');
        } else {
          addToast('Could not parse cues from file. Supported formats: .srt, .vtt, .json, or timestamped .txt', 'error');
        }
      }
    };
    reader.readAsText(file);
  };

  // Save manual transcript directly to PostgreSQL
  const handleSaveTranscript = async () => {
    setIsSaving(true);
    let finalPayload = '';

    if (editTab === 'raw') {
      finalPayload = rawText.trim();
    } else {
      // Clean and sort cues
      const sorted = [...editableCues]
        .filter((c) => c.text.trim().length > 0)
        .sort((a, b) => a.start - b.start);

      if (sorted.length === 0) {
        addToast('Please enter at least one cue text before saving.', 'error');
        setIsSaving(false);
        return;
      }

      // Detect language from text
      const sampleText = sorted.slice(0, 5).map((c) => c.text).join(' ');
      const detected = detectTextLanguage(sampleText);

      finalPayload = JSON.stringify({
        isMachineGenerated: false,
        engine: 'manual',
        detectedLanguage: detected.code,
        languageName: detected.name,
        cues: sorted.map((c, i) => ({
          id: `cue-${i}`,
          start: c.start,
          end: Math.max(c.start + 1, c.end),
          text: c.text.trim(),
        })),
        updatedAt: new Date().toISOString(),
      });
    }

    const { error } = await dataService.updateLessonTranscript(lesson.id, finalPayload);
    setIsSaving(false);

    if (error) {
      addToast('Failed to save transcript to database.', 'error');
      return;
    }

    const newParsed = parseTranscriptWithMetadata(finalPayload, lesson.duration_seconds || 600);
    setCues(newParsed.cues);
    setEditableCues(newParsed.cues);
    setMetadata(newParsed.metadata);
    setIsEditing(false);

    if (onTranscriptUpdated) {
      onTranscriptUpdated(finalPayload);
    }
    addToast('Transcript saved to database successfully!', 'success');
  };

  // Delete transcript from database
  const handleDeleteTranscript = async () => {
    if (!window.confirm('Are you sure you want to delete this transcript? This will remove it from the database.')) {
      return;
    }

    setIsSaving(true);
    const { error } = await dataService.deleteLessonTranscript(lesson.id);
    setIsSaving(false);

    if (error) {
      addToast('Failed to delete transcript.', 'error');
      return;
    }

    setCues([]);
    setEditableCues([]);
    setRawText('');
    setMetadata({
      isMachineGenerated: false,
      detectedLanguage: 'en',
      languageName: 'Manual Transcript',
    });
    setIsEditing(false);

    if (onTranscriptUpdated) {
      onTranscriptUpdated('');
    }
    addToast('Transcript removed from database.', 'success');
  };

  return (
    <div className={`flex flex-col h-full bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm ${className}`}>
      {/* HEADER / TOOLBAR */}
      <div className="p-4 border-b border-[var(--border)] bg-[var(--surface-hover)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
            <FileText size={18} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-[var(--text-main)]">
                Video Transcript
              </h3>

              {cues.length > 0 ? (
                <>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--surface)] text-[var(--text-main)] border border-[var(--border)] shadow-xs">
                    <span>{metadata.languageName || 'Verified Transcript'}</span>
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)]">
                    {cues.length} cues
                  </span>
                </>
              ) : (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
                  No transcript
                </span>
              )}
            </div>

            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              {cues.length > 0 
                ? 'Click any timestamp to seek video • Real-time playback synchronization' 
                : 'Verified course lecture transcript'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {cues.length > 0 && (
            <>
              {/* Auto-scroll toggle */}
              <button
                type="button"
                onClick={() => setAutoScroll(!autoScroll)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
                  autoScroll
                    ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/30'
                    : 'bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)]'
                }`}
                title="Auto-scroll to current speaking cue"
              >
                <Sliders size={13} />
                <span className="hidden sm:inline">Auto-scroll</span>
              </button>

              {/* Copy button */}
              <button
                type="button"
                onClick={() => handleCopyTranscript(false)}
                className="p-2 rounded-lg bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border)] transition-colors"
                title="Copy Transcript Text"
              >
                {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
              </button>

              {/* Download VTT */}
              <button
                type="button"
                onClick={() => handleDownload('vtt')}
                className="p-2 rounded-lg bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border)] transition-colors"
                title="Download WebVTT Subtitles (.vtt)"
              >
                <Download size={15} />
              </button>
            </>
          )}

          {/* Admin / Edit toggle */}
          {isAdmin && (
            <Button
              size="sm"
              variant={isEditing ? 'secondary' : 'primary'}
              onClick={() => {
                if (!isEditing && cues.length === 0) {
                  setEditTab('visual');
                }
                setIsEditing(!isEditing);
              }}
              icon={isEditing ? <X size={14} /> : <Edit3 size={14} />}
            >
              {isEditing ? 'Close Editor' : cues.length > 0 ? 'Edit' : 'Add Transcript'}
            </Button>
          )}

          {/* Close side panel button */}
          {isSidePanel && onCloseSidePanel && (
            <button
              type="button"
              onClick={onCloseSidePanel}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface)] transition-colors"
              title="Close Transcript Panel"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* SEARCH BAR (WHEN NOT EDITING AND HAS CUES) */}
      {!isEditing && cues.length > 0 && (
        <div className="p-3 border-b border-[var(--border)] bg-[var(--surface)] flex items-center gap-2">
          <Search size={15} className="text-[var(--text-muted)] shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transcript text, keywords or topics..."
            className="w-full bg-transparent text-xs text-[var(--text-main)] focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] px-1"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* MAIN BODY: VIEW MODE OR EDIT MODE */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[500px] min-h-[260px] scrollbar-thin">
        {isEditing ? (
          /* EDIT MODE DRAWER */
          <div className="space-y-4 animate-fade-in">
            {/* Edit Mode Tabs */}
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditTab('visual')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    editTab === 'visual'
                      ? 'bg-[var(--primary)] text-white shadow-xs'
                      : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  Visual Cues ({editableCues.length})
                </button>
                <button
                  type="button"
                  onClick={() => setEditTab('raw')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    editTab === 'raw'
                      ? 'bg-[var(--primary)] text-white shadow-xs'
                      : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  Paste Text / VTT
                </button>
                <button
                  type="button"
                  onClick={() => setEditTab('upload')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    editTab === 'upload'
                      ? 'bg-[var(--primary)] text-white shadow-xs'
                      : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  <Upload size={13} />
                  <span>Upload File</span>
                </button>
              </div>

              {editableCues.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteTranscript}
                  disabled={isSaving}
                  className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 font-medium transition-colors"
                  title="Delete transcript from database"
                >
                  <Trash2 size={13} />
                  <span className="hidden sm:inline">Delete from DB</span>
                </button>
              )}
            </div>

            {/* TAB 1: VISUAL CUES EDITOR */}
            {editTab === 'visual' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)]">
                  <div className="text-xs text-[var(--text-muted)]">
                    Current Video Time:{' '}
                    <span className="font-mono font-bold text-[var(--primary)]">
                      {formatSecondsToTimestamp(currentTime)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      icon={<Clock size={14} />}
                      onClick={handleAddCueAtCurrentTime}
                    >
                      Add Cue at {formatSecondsToTimestamp(currentTime)}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<Plus size={14} />}
                      onClick={handleAddCueAtEnd}
                    >
                      Add at End
                    </Button>
                  </div>
                </div>

                {editableCues.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-[var(--border)] rounded-xl space-y-2">
                    <p className="text-xs text-[var(--text-muted)]">
                      No cues added yet. Click <strong>"Add Cue at {formatSecondsToTimestamp(currentTime)}"</strong> to start transcribing while listening to the video.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                    {editableCues.map((cue, idx) => (
                      <div
                        key={cue.id}
                        className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/40 transition-colors flex items-start gap-3"
                      >
                        {/* Start/End Time Inputs */}
                        <div className="flex flex-col gap-1 shrink-0 w-32">
                          <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex items-center justify-between">
                            <span>Start - End</span>
                            <button
                              type="button"
                              onClick={() => onSeek(cue.start)}
                              className="text-[var(--primary)] hover:underline flex items-center gap-0.5"
                              title="Play from this cue"
                            >
                              <Play size={9} />
                              <span>Play</span>
                            </button>
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={formatSecondsToTimestamp(cue.start)}
                              onChange={(e) => {
                                const updated = [...editableCues];
                                const parts = e.target.value.split(':').map(Number);
                                const newSec = parts.length === 2 ? parts[0] * 60 + parts[1] : cue.start;
                                if (!isNaN(newSec)) {
                                  updated[idx].start = newSec;
                                  setEditableCues(updated);
                                }
                              }}
                              className="input text-xs font-mono py-1 px-1.5 text-center w-14"
                              placeholder="00:00"
                            />
                            <span className="text-xs text-[var(--text-muted)]">-</span>
                            <input
                              type="text"
                              value={formatSecondsToTimestamp(cue.end)}
                              onChange={(e) => {
                                const updated = [...editableCues];
                                const parts = e.target.value.split(':').map(Number);
                                const newSec = parts.length === 2 ? parts[0] * 60 + parts[1] : cue.end;
                                if (!isNaN(newSec)) {
                                  updated[idx].end = newSec;
                                  setEditableCues(updated);
                                }
                              }}
                              className="input text-xs font-mono py-1 px-1.5 text-center w-14"
                              placeholder="00:15"
                            />
                          </div>
                        </div>

                        {/* Cue text input */}
                        <div className="flex-1">
                          <label className="text-[10px] uppercase font-bold text-[var(--text-muted)]">
                            Spoken Words / Lecture Note
                          </label>
                          <textarea
                            rows={2}
                            value={cue.text}
                            onChange={(e) => {
                              const updated = [...editableCues];
                              updated[idx].text = e.target.value;
                              setEditableCues(updated);
                            }}
                            className="input text-xs py-1.5 w-full resize-none mt-1 leading-relaxed"
                            placeholder="Enter the words spoken in this segment..."
                          />
                        </div>

                        {/* Delete cue */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditableCues(editableCues.filter((_, i) => i !== idx));
                          }}
                          className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg mt-5 transition-colors shrink-0"
                          title="Delete Cue"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: RAW TEXT / VTT */}
            {editTab === 'raw' && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-xs text-[var(--text-muted)] leading-relaxed">
                  Paste timestamped text, WebVTT, or SRT subtitles. StudyMate will automatically parse timestamps and speech segments:
                  <div className="font-mono text-[11px] text-[var(--text-main)] mt-1.5 bg-[var(--surface)] p-2 rounded-lg border border-[var(--border)]">
                    00:00 Welcome to today's lecture<br />
                    01:15 Overview of variables and data types<br />
                    03:40 Working through a practical coding example
                  </div>
                </div>

                <textarea
                  rows={8}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste timestamped transcript, SRT or WebVTT content here..."
                  className="input font-mono text-xs w-full resize-y p-3"
                />

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleConvertRawToCues}
                  >
                    Convert & Preview in Visual Editor
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 3: FILE UPLOAD */}
            {editTab === 'upload' && (
              <div className="space-y-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                    <Upload size={15} className="text-[var(--primary)]" />
                    <span>Upload Subtitle or Transcript File</span>
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Upload an existing <code>.srt</code>, <code>.vtt</code>, <code>.txt</code>, or <code>.json</code> file from your computer. Cues will be parsed automatically.
                  </p>
                </div>

                <label className="border-2 border-dashed border-[var(--border)] hover:border-[var(--primary)] rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-[var(--surface-hover)]">
                  <div className="p-3 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                    <Upload size={24} />
                  </div>
                  <span className="text-xs font-semibold text-[var(--text-main)]">
                    Click to select .srt / .vtt / .txt / .json file
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    Standard WebVTT, SubRip (SRT), or timestamped text
                  </span>
                  <input
                    type="file"
                    accept=".vtt,.srt,.txt,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* SAVE BUTTON BAR */}
            <div className="pt-3 border-t border-[var(--border)] flex items-center justify-end gap-2.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveTranscript}
                disabled={isSaving}
                icon={<Save size={15} />}
              >
                {isSaving ? 'Saving to DB...' : 'Save to Database'}
              </Button>
            </div>
          </div>
        ) : cues.length === 0 ? (
          /* CLEAN, HONEST EMPTY STATE */
          <div className="text-center py-12 px-4 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--surface-hover)] text-[var(--text-muted)] flex items-center justify-center mx-auto border border-[var(--border)] shadow-xs">
              <FileText size={26} className="opacity-70" />
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-bold text-[var(--text-main)]">
                No Verified Transcript Available
              </h4>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto leading-relaxed">
                {isAdmin
                  ? 'This lecture currently does not have a verified transcript in the database. You can add one manually or import subtitles.'
                  : 'A transcript has not yet been added for this lecture. Verified notes and transcripts will appear here once published.'}
              </p>
            </div>

            {isAdmin && (
              <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setIsEditing(true);
                    setEditTab('visual');
                    if (editableCues.length === 0) {
                      handleAddCueAtCurrentTime();
                    }
                  }}
                  icon={<Edit3 size={14} />}
                >
                  Create Transcript Manually
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setIsEditing(true);
                    setEditTab('upload');
                  }}
                  icon={<Upload size={14} />}
                >
                  Upload Subtitles (.vtt / .srt)
                </Button>

                {lesson.youtube_video_id && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleCheckYouTubeCaptions}
                    disabled={isCheckingOnline}
                    icon={<Video size={14} className="text-red-500" />}
                  >
                    {isCheckingOnline ? 'Checking YouTube...' : 'Check YouTube CC'}
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : filteredCues.length === 0 ? (
          /* SEARCH NO MATCHES */
          <div className="text-center py-8 space-y-2">
            <Search size={28} className="mx-auto text-[var(--text-muted)] opacity-50" />
            <p className="text-xs font-semibold text-[var(--text-main)]">
              No transcript matches found for "{searchQuery}"
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">
              Try searching for different keywords or clear the search query.
            </p>
          </div>
        ) : (
          /* CUES LIST (INTERACTIVE PLAYBACK SYNC) */
          filteredCues.map((cue) => {
            const isActive = cue.id === activeCueId;
            return (
              <div
                key={cue.id}
                ref={isActive ? activeCueRef : null}
                onClick={() => onSeek(cue.start)}
                className={`group p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                  isActive
                    ? 'border-[var(--primary)] bg-[var(--primary)]/10 shadow-xs ring-1 ring-[var(--primary)]/30'
                    : 'border-transparent hover:border-[var(--border)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                {/* Timestamp Pill */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeek(cue.start);
                  }}
                  className={`px-2 py-1 rounded-md text-[11px] font-mono font-bold shrink-0 transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[var(--primary)] text-white shadow-xs'
                      : 'bg-[var(--surface-hover)] text-[var(--primary)] group-hover:bg-[var(--primary)] group-hover:text-white'
                  }`}
                  title={`Seek to ${formatSecondsToTimestamp(cue.start)}`}
                >
                  <Play size={10} className={isActive ? 'fill-current animate-pulse' : ''} />
                  <span>{formatSecondsToTimestamp(cue.start)}</span>
                </button>

                {/* Spoken Text */}
                <div className="flex-1">
                  <p
                    className={`text-xs leading-relaxed transition-colors ${
                      isActive
                        ? 'font-medium text-[var(--text-main)]'
                        : 'text-[var(--text-muted)] group-hover:text-[var(--text-main)]'
                    }`}
                  >
                    {highlightMatches(cue.text, searchQuery)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FOOTER STATS */}
      {!isEditing && cues.length > 0 && (
        <div className="px-4 py-2.5 border-t border-[var(--border)] bg-[var(--surface-hover)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <Volume2 size={13} className="text-[var(--primary)]" />
            <span>
              {activeCueId
                ? `Current: ${formatSecondsToTimestamp(currentTime)}`
                : 'Ready for playback'}
            </span>
            <span className="hidden sm:inline opacity-50">•</span>
            <span className="hidden sm:inline font-medium text-[var(--text-main)]">
              {metadata.languageName || 'Verified Transcript'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleCopyTranscript(true)}
              className="hover:text-[var(--text-main)] transition-colors underline decoration-dotted"
            >
              Copy with Timestamps
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => handleDownload('txt')}
              className="hover:text-[var(--text-main)] transition-colors underline decoration-dotted"
              title="Download plain text transcript"
            >
              Download Text
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Highlights search matches within text
 */
function highlightMatches(text: string, query: string) {
  if (!query || !query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-300 dark:bg-yellow-500/40 text-[var(--text-main)] px-0.5 rounded font-bold">
        {part}
      </mark>
    ) : (
      part
    )
  );
}
