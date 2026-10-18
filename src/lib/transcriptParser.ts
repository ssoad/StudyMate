export interface TranscriptCue {
  id: string;
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
}

export interface TranscriptLanguage {
  code: string;
  name: string;
  isAsr?: boolean;
}

export interface TranscriptMetadata {
  isMachineGenerated: boolean;
  engine?: 'youtube-asr' | 'studymate-asr' | 'manual' | string;
  detectedLanguage: string; // e.g. 'bn', 'en'
  languageName: string;     // e.g. 'বাংলা (Bengali)', 'English'
  availableLanguages?: TranscriptLanguage[];
  confidence?: number;
  generatedAt?: string;
}

export interface ParsedTranscriptResult {
  cues: TranscriptCue[];
  metadata: TranscriptMetadata;
}

/**
 * Automatically detects language based on character code ranges and script heuristics.
 */
export function detectTextLanguage(text: string): { code: string; name: string } {
  if (!text) return { code: 'en', name: 'English' };

  // Bengali Unicode range: 0980-09FF
  if (/[\u0980-\u09FF]/.test(text)) {
    return { code: 'bn', name: 'বাংলা (Bengali)' };
  }

  // Hindi / Devanagari range: 0900-097F
  if (/[\u0900-\u097F]/.test(text)) {
    return { code: 'hi', name: 'हिन्दी (Hindi)' };
  }

  // Arabic range: 0600-06FF
  if (/[\u0600-\u06FF]/.test(text)) {
    return { code: 'ar', name: 'العربية (Arabic)' };
  }

  // Default to English
  return { code: 'en', name: 'English' };
}

/**
 * Parses timestamp string (e.g. "01:23", "00:01:23.456", "1:23:45,678") to seconds.
 */
export function parseTimestampToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const cleaned = timeStr.trim().replace(',', '.');
  const parts = cleaned.split(':').map((p) => parseFloat(p));

  if (parts.length === 3) {
    const [h, m, s] = parts;
    return Math.max(0, (h || 0) * 3600 + (m || 0) * 60 + (s || 0));
  } else if (parts.length === 2) {
    const [m, s] = parts;
    return Math.max(0, (m || 0) * 60 + (s || 0));
  } else if (parts.length === 1) {
    return Math.max(0, parts[0] || 0);
  }
  return 0;
}

/**
 * Formats seconds into human-readable timestamp (e.g. 02:45 or 01:15:30).
 */
export function formatSecondsToTimestamp(totalSeconds: number, includeHours = false): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0 || includeHours) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Parses transcript text and extracts full machine-generation and language metadata.
 */
export function parseTranscriptWithMetadata(rawText: string, defaultDuration = 600): ParsedTranscriptResult {
  if (!rawText || !rawText.trim()) {
    return {
      cues: [],
      metadata: {
        isMachineGenerated: false,
        engine: 'manual',
        detectedLanguage: 'en',
        languageName: 'English',
      },
    };
  }

  const text = rawText.trim();

  // 1. Try parsing JSON format
  if (text.startsWith('[') || text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text);

      // Check if structured payload with metadata
      if (!Array.isArray(parsed) && (parsed.cues || parsed.events || parsed.isMachineGenerated !== undefined)) {
        const cuesList = parsed.cues || parsed.events || [];
        const cues = parseRawCuesArray(cuesList, defaultDuration);
        
        const detected = parsed.detectedLanguage 
          ? { code: parsed.detectedLanguage, name: parsed.languageName || (parsed.detectedLanguage === 'bn' ? 'বাংলা (Bengali)' : 'English') }
          : detectTextLanguage(cues.map((c) => c.text).join(' '));

        return {
          cues,
          metadata: {
            isMachineGenerated: parsed.isMachineGenerated ?? true,
            engine: parsed.engine || 'studymate-asr',
            detectedLanguage: detected.code,
            languageName: detected.name,
            availableLanguages: parsed.availableLanguages || [
              { code: detected.code, name: detected.name, isAsr: true },
            ],
            confidence: parsed.confidence,
            generatedAt: parsed.generatedAt,
          },
        };
      }

      // If plain array of cues
      if (Array.isArray(parsed)) {
        const cues = parseRawCuesArray(parsed, defaultDuration);
        const detected = detectTextLanguage(cues.map((c) => c.text).join(' '));
        return {
          cues,
          metadata: {
            isMachineGenerated: true,
            engine: 'studymate-asr',
            detectedLanguage: detected.code,
            languageName: detected.name,
          },
        };
      }
    } catch {
      // Fall through to text parsers
    }
  }

  // 2. Check for WebVTT or SRT format
  const vttTimeRegex = /(?:(\d{1,2}:)?\d{2}:\d{2}[.,]\d{3})\s*-->\s*(?:(\d{1,2}:)?\d{2}:\d{2}[.,]\d{3})/;
  if (vttTimeRegex.test(text)) {
    const cues = parseVttOrSrt(text);
    const detected = detectTextLanguage(cues.map((c) => c.text).join(' '));
    return {
      cues,
      metadata: {
        isMachineGenerated: false,
        engine: 'manual',
        detectedLanguage: detected.code,
        languageName: detected.name,
      },
    };
  }

  // 3. Check for Timestamped notes lines
  const timestampLineRegex = /^(?:\[|\()?(\d{1,2}:\d{2}(?::\d{2})?)(?:\]|\))?\s*[-:]?\s*(.+)$/m;
  if (timestampLineRegex.test(text)) {
    const cues = parseTimestampedLines(text, defaultDuration);
    const detected = detectTextLanguage(cues.map((c) => c.text).join(' '));
    return {
      cues,
      metadata: {
        isMachineGenerated: false,
        engine: 'manual',
        detectedLanguage: detected.code,
        languageName: detected.name,
      },
    };
  }

  // 4. Fallback: Parse plain text paragraphs into cues
  const cues = parsePlainTextParagraphs(text, defaultDuration);
  const detected = detectTextLanguage(cues.map((c) => c.text).join(' '));
  return {
    cues,
    metadata: {
      isMachineGenerated: false,
      engine: 'manual',
      detectedLanguage: detected.code,
      languageName: detected.name,
    },
  };
}

/**
 * Universal cues extractor for raw JSON cue arrays
 */
function parseRawCuesArray(items: any[], _defaultDuration?: number): TranscriptCue[] {
  const cues: TranscriptCue[] = [];

  items.forEach((item: any, idx: number) => {
    if (!item) return;

    // YouTube events format
    if (item.tStartMs !== undefined && item.segs) {
      const start = item.tStartMs / 1000;
      const dur = (item.dDurationMs || 3000) / 1000;
      const cueText = item.segs.map((s: any) => s.utf8 || '').join('').trim();
      if (cueText) {
        cues.push({
          id: `cue-${idx}`,
          start,
          end: start + dur,
          text: cueText,
        });
      }
      return;
    }

    // Standard cue format { start, end, text }
    if (typeof item.start === 'number' || typeof item.start === 'string') {
      const start = typeof item.start === 'number' ? item.start : parseTimestampToSeconds(item.start);
      const end = typeof item.end === 'number' ? item.end : item.end ? parseTimestampToSeconds(item.end) : start + 5;
      const cueText = (item.text || item.content || '').trim();
      if (cueText) {
        cues.push({
          id: `cue-${idx}`,
          start,
          end: Math.max(start + 1, end),
          text: cueText,
        });
      }
    }
  });

  return cues.sort((a, b) => a.start - b.start);
}

/**
 * Comprehensive parser that accepts JSON, WebVTT, SubRip (SRT),
 * timestamped notes, or plain paragraph text.
 */
export function parseTranscript(rawText: string, defaultDuration = 600): TranscriptCue[] {
  return parseTranscriptWithMetadata(rawText, defaultDuration).cues;
}

/**
 * Parses WebVTT or SubRip (.srt) subtitle blocks.
 */
function parseVttOrSrt(content: string): TranscriptCue[] {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const cues: TranscriptCue[] = [];

  let currentStart = 0;
  let currentEnd = 0;
  let textBuffer: string[] = [];
  let cueIndex = 0;

  const flushCue = () => {
    if (textBuffer.length > 0 && currentEnd > currentStart) {
      const cueText = textBuffer.join(' ').replace(/<[^>]*>/g, '').trim();
      if (cueText) {
        cues.push({
          id: `cue-${cueIndex++}`,
          start: currentStart,
          end: currentEnd,
          text: cueText,
        });
      }
    }
    textBuffer = [];
  };

  const timingRegex = /((?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{3})\s*-->\s*((?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{3})/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === 'WEBVTT' || /^\d+$/.test(trimmed)) {
      if (!trimmed) {
        flushCue();
      }
      continue;
    }

    const timingMatch = trimmed.match(timingRegex);
    if (timingMatch) {
      flushCue();
      currentStart = parseTimestampToSeconds(timingMatch[1]);
      currentEnd = parseTimestampToSeconds(timingMatch[2]);
    } else if (currentEnd > 0) {
      textBuffer.push(trimmed);
    }
  }

  flushCue();
  return cues.sort((a, b) => a.start - b.start);
}

/**
 * Parses lines beginning with timestamps like "00:00 Welcome" or "[02:30] Next topic".
 */
function parseTimestampedLines(content: string, totalDuration: number): TranscriptCue[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const tempItems: Array<{ start: number; text: string }> = [];

  const lineRegex = /^(?:\[|\()?(\d{1,2}:)?(\d{2}:\d{2})(?:\]|\))?\s*[-:]?\s*(.+)$/;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const match = trimmed.match(lineRegex);
    if (match) {
      const timePart = (match[1] || '') + match[2];
      const start = parseTimestampToSeconds(timePart);
      const text = match[3].trim();
      if (text) {
        tempItems.push({ start, text });
      }
    } else if (tempItems.length > 0) {
      tempItems[tempItems.length - 1].text += ' ' + trimmed;
    }
  });

  if (tempItems.length === 0) return [];
  tempItems.sort((a, b) => a.start - b.start);

  const cues: TranscriptCue[] = [];
  for (let i = 0; i < tempItems.length; i++) {
    const curr = tempItems[i];
    const nextStart = i < tempItems.length - 1 ? tempItems[i + 1].start : Math.max(curr.start + 10, totalDuration);
    cues.push({
      id: `cue-${i}`,
      start: curr.start,
      end: Math.max(curr.start + 2, nextStart),
      text: curr.text,
    });
  }

  return cues;
}

/**
 * Parses plain text by splitting into sentences and distributing them across video duration.
 */
function parsePlainTextParagraphs(content: string, totalDuration: number): TranscriptCue[] {
  const cleaned = content.replace(/\r\n/g, '\n').trim();
  const rawSentences = cleaned
    .split(/(?<=[.?!।])\s+|\n{2,}/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  if (rawSentences.length === 0) return [];

  const interval = Math.max(3, Math.min(25, totalDuration / rawSentences.length));
  return rawSentences.map((text, idx) => {
    const start = Math.round(idx * interval);
    const end = Math.min(totalDuration, Math.round((idx + 1) * interval));
    return {
      id: `cue-${idx}`,
      start,
      end: Math.max(start + 2, end),
      text,
    };
  });
}

/**
 * Export helpers
 */
export function cuesToWebVTT(cues: TranscriptCue[], title?: string): string {
  let vtt = 'WEBVTT\n';
  if (title) vtt += `NOTE ${title}\n\n`;
  else vtt += '\n';

  cues.forEach((cue, i) => {
    const start = formatSecondsToTimestamp(cue.start, true).replace('.', ',') + '.000';
    const end = formatSecondsToTimestamp(cue.end, true).replace('.', ',') + '.000';
    vtt += `${i + 1}\n${start} --> ${end}\n${cue.text}\n\n`;
  });

  return vtt.trim() + '\n';
}

export function cuesToPlainText(cues: TranscriptCue[], includeTimestamps = false): string {
  if (includeTimestamps) {
    return cues
      .map((c) => `[${formatSecondsToTimestamp(c.start)}] ${c.text}`)
      .join('\n');
  }
  return cues.map((c) => c.text).join('\n\n');
}
