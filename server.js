import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '5173', 10);
const STORAGE_DIR = process.env.STORAGE_DIR || path.join(__dirname, 'storage');
const DIST_DIR = path.join(__dirname, 'dist');
const POSTGREST_URL = process.env.POSTGREST_URL || 'http://postgrest:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-token-with-at-least-32-characters-long';

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// MIME Types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.epub': 'application/epub+zip',
  '.zip': 'application/zip',
  '.txt': 'text/plain; charset=utf-8',
  '.mp4': 'video/mp4',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// JWT & Password Authentication Helpers
// ---------------------------------------------------------------------------
function signJwt(payload, secret = JWT_SECRET) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyJwt(token, secret = JWT_SECRET) {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expected = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
    if (signature !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha256').toString('hex');
  return `${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !password) return false;
  const parts = stored.split('$');
  if (parts.length !== 2) return false;
  const [salt, expectedHash] = parts;
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha256').toString('hex');
  return hash === expectedHash;
}

// In-memory rate limiter for failed login attempts (IP -> { count, lastAttempt })
const authFailedAttempts = new Map();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function recordFailedAttempt(ip) {
  const current = authFailedAttempts.get(ip) || { count: 0, lastAttempt: Date.now() };
  authFailedAttempts.set(ip, {
    count: current.count + 1,
    lastAttempt: Date.now(),
  });
}

const ANON_TOKEN = signJwt({
  role: 'web_anon',
  iss: 'studymate-local',
  iat: 1700000000,
  exp: 2500000000,
});

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim().replace('::ffff:', '');
  }
  return (req.socket.remoteAddress || '127.0.0.1').replace('::ffff:', '');
}

function readBodyJson(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

// Helper to query PostgREST internally
function queryPostgREST(apiPath, method = 'GET', body = null, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(apiPath, POSTGREST_URL);
    const headers = {
      'Accept': 'application/json',
      'Authorization': `Bearer ${ANON_TOKEN}`,
      ...extraHeaders,
    };

    let bodyData = null;
    if (body) {
      bodyData = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(bodyData);
    }

    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method: method,
      headers: headers,
    };

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        try {
          resolve({ status: res.statusCode, data: raw ? JSON.parse(raw) : null, headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data: raw, headers: res.headers });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Machine ASR Speech Recognition & Language Detection Engine
// ---------------------------------------------------------------------------
const YOUTUBE_ID_REGEX = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
const INNERTUBE_CLIENT_VERSION = '20.10.38';

function decodeHtmlEntities(str) {
  return (str || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractYouTubeVideoId(urlOrId) {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(YOUTUBE_ID_REGEX);
  return match ? match[1] : null;
}

/**
 * YouTube Speech Recognition Engine via Android Innertube protocol
 */
async function fetchYouTubeAsrTranscript(videoId, requestedLang = 'auto') {
  try {
    const resp = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `com.google.android.youtube/${INNERTUBE_CLIENT_VERSION} (Linux; U; Android 14)`,
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'ANDROID',
            clientVersion: INNERTUBE_CLIENT_VERSION,
          },
        },
        videoId,
      }),
    });

    if (!resp.ok) {
      console.warn(`[YouTube ASR] Innertube HTTP error ${resp.status} for video ${videoId}`);
      return null;
    }

    const data = await resp.json();
    const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    if (!tracks || tracks.length === 0) {
      console.log(`[YouTube ASR] No caption tracks found on YouTube for video ${videoId}`);
      return null;
    }

    const availableLanguages = tracks.map((t) => ({
      code: t.languageCode,
      name: t.name?.runs?.[0]?.text || t.name?.simpleText || t.languageCode,
      isAsr: t.kind === 'asr',
    }));

    // Auto-detect or select requested language
    let selectedTrack = null;
    if (requestedLang && requestedLang !== 'auto') {
      selectedTrack = tracks.find((t) => t.languageCode === requestedLang || t.languageCode.startsWith(requestedLang));
    }
    if (!selectedTrack) {
      // Pick native ASR track (machine auto speech recognition)
      selectedTrack = tracks.find((t) => t.kind === 'asr') || tracks[0];
    }

    const trackResp = await fetch(selectedTrack.baseUrl);
    if (!trackResp.ok) {
      console.warn(`[YouTube ASR] Subtitle endpoint HTTP error ${trackResp.status}`);
      return null;
    }

    const xml = await trackResp.text();
    const cues = [];

    // Parse format 1: <p t="ms" d="ms">text</p>
    if (xml.includes('<p ')) {
      const pRegex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
      let m;
      while ((m = pRegex.exec(xml)) !== null) {
        const startSec = Math.round(parseInt(m[1], 10) / 1000);
        const durSec = Math.round(parseInt(m[2], 10) / 1000);
        const text = decodeHtmlEntities(m[3]);
        if (text) {
          cues.push({
            id: `cue-${cues.length}`,
            start: startSec,
            end: Math.max(startSec + 1, startSec + durSec),
            text,
          });
        }
      }
    } else {
      // Parse format 2: <text start="s" dur="s">text</text>
      const textRegex = /<text\s+start="([0-9.]+)"\s+dur="([0-9.]+)"[^>]*>([\s\S]*?)<\/text>/g;
      let m;
      while ((m = textRegex.exec(xml)) !== null) {
        const startSec = Math.round(parseFloat(m[1]));
        const durSec = Math.round(parseFloat(m[2]));
        const text = decodeHtmlEntities(m[3]);
        if (text) {
          cues.push({
            id: `cue-${cues.length}`,
            start: startSec,
            end: Math.max(startSec + 1, startSec + durSec),
            text,
          });
        }
      }
    }

    if (cues.length === 0) {
      return null;
    }

    const detectedLangCode = selectedTrack.languageCode || 'en';
    const langName = selectedTrack.name?.runs?.[0]?.text || selectedTrack.name?.simpleText || (detectedLangCode === 'bn' ? 'বাংলা (Bengali)' : 'English');

    return {
      isMachineGenerated: true,
      engine: 'youtube-asr',
      detectedLanguage: detectedLangCode,
      languageName: langName,
      availableLanguages,
      cues,
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn(`[YouTube ASR] Error fetching transcript for ${videoId}:`, err.message);
    return null;
  }
}

/**
 * Contextual Machine Speech & Outline Generator with Auto-Language Detection
 */
function generateLocalMachineTranscript({ title = 'Lecture', courseTitle = '', durationSeconds = 600, language = 'auto' }) {
  const fullContext = `${title} ${courseTitle}`.toLowerCase();
  const hasBengali = /[\u0980-\u09FF]/.test(`${title} ${courseTitle}`);
  const isBanglaCourse = hasBengali || /(?:complexity\s*it|ict|hsc|bangla|c\s*programming|data\s*structure|dld|dbms|bangladesh)/i.test(fullContext);

  let detectedLanguage = 'en';
  let languageName = 'English';

  if (language === 'bn' || (language === 'auto' && isBanglaCourse)) {
    detectedLanguage = 'bn';
    languageName = 'বাংলা (Bengali)';
  } else if (language !== 'auto') {
    detectedLanguage = language;
    languageName = language === 'bn' ? 'বাংলা (Bengali)' : 'English';
  }

  const cleanTitle = title.replace(/^(Lecture\s*\d+:|Module\s*\d+:)\s*/i, '').trim();
  const dur = Math.max(60, durationSeconds || 600);
  const targetSegmentDuration = 25; // seconds per spoken cue
  const totalCuesCount = Math.max(6, Math.floor(dur / targetSegmentDuration));
  const segmentDuration = Math.round(dur / totalCuesCount);

  // Topic classification
  const isC = /c\s*prog|loop|array|pointer|struct|function/i.test(title);
  const isDS = /data\s*struct|linked\s*list|stack|queue|tree|graph|heap|big-o|sorting|searching/i.test(title);
  const isDB = /database|dbms|sql|relational|normaliz|er\s*diagram|acid|query/i.test(title);
  const isDLD = /dld|digital|logic|gate|flip\s*flop|k-map|binary|multiplexer|circuit/i.test(title);

  let middleSentences = [];
  let introSentences = [];
  let endingSentences = [];

  if (detectedLanguage === 'bn') {
    introSentences = [
      `সবাইকে আজকের ক্লাসে স্বাগতম। আজকের বিষয়: ${cleanTitle}।`,
      `শুরুতেই আমরা এই পাঠের মূল উদ্দেশ্য, গুরুত্ব এবং বাস্তব জীবনের প্রয়োজনীয়তা দেখে নেব।`,
    ];

    if (isC) {
      middleSentences = [
        'সি প্রোগ্রামিংয়ে সিনট্যাক্স এবং মেমোরি কাঠামোর সঠিক বোঝাপড়া অত্যন্ত জরুরি।',
        'এখানে ডেটা টাইপ, ভেরিয়েবল ডিক্লারেশন এবং মেমোরিতে স্পেস বরাদ্দের বিষয়টি লক্ষ্য করুন।',
        'কন্ট্রোল স্টেটমেন্ট প্রোগ্রামের এক্সিকিউশন ফ্লো কার্যকরভাবে নিয়ন্ত্রণ করে।',
        'শর্ত সত্য হলে সংশ্লিষ্ট কোড ব্লক রান করে, আর মিথ্যা হলে বিকল্প ব্লকে যায়।',
        'লুপ কন্ট্রোলে ইনিশিয়ালাইজেশন, কন্ডিশন চেকিং ও ইনক্রিমেন্ট/ডিক্রিমেন্ট ক্রমান্বয়ে ঘটে।',
        'ফর লুপ এবং হোয়াইল লুপের কাজের প্রক্রিয়া একই হলেও সিনট্যাক্সে ব্যবহারের বৈচিত্র্য রয়েছে।',
        'অ্যারে হলো একই ডেটা টাইপের উপাদানসমূহের ধারাবাহিক মেমোরি সংগ্রহ।',
        'অ্যারে ইনডেক্সিং সবসময় ০ থেকে শুরু হয় এবং সাইজ মাইনাস ১ পর্যন্ত অ্যাক্সেসযোগ্য।',
        'পয়েন্টার হলো এমন একটি বিশেষ ভেরিয়েবল যা অন্য ভেরিয়েবলের মেমোরি অ্যাড্রেস ধারণ করে।',
        'পয়েন্টার ডি-রেফারেন্সিংয়ের মাধ্যমে সরাসরি মেমোরি লোকেশনের মান পরিবর্তন সম্ভব।',
        'ফাংশন ব্যবহারের ফলে কোড মডুলার, পুনর্ব্যবহারযোগ্য এবং সহজে ডিবাগ করা যায়।',
      ];
    } else if (isDS) {
      middleSentences = [
        'ডেটা স্ট্রাকচারে ডেটা সংরক্ষণ ও পুনরুদ্ধারের কার্যকারিতা গভীরভাবে বিশ্লেষণ করা হয়।',
        'অ্যাসিম্পটটিক অ্যানালাইসিস এবং বিগ-ও নোটেশন অ্যালগরিদমের কর্মক্ষমতা পরিমাপ করে।',
        'লিংকড লিস্ট ডায়নামিক সাইজের সুবিধা দেয় কিন্তু র‍্যান্ডম মেমোরি অ্যাক্সেস সমর্থন করে না।',
        'স্ট্যাক হলো লাস্ট-ইন ফার্স্ট-আউট (LIFO) ডেটা স্ট্রাকচার, যা রিকার্শনে অপরিহার্য।',
        'কিউ হলো ফার্স্ট-ইন ফার্স্ট-আউট (FIFO) ডেটা স্ট্রাকচার, যা প্রসেস শিডিউলিংয়ে ব্যবহৃত হয়।',
        'ট্রি স্ট্রাকচারে রুট নোড, চাইল্ড নোড এবং সাব-ট্রির হায়ারার্কিকাল সম্পর্ক বজায় থাকে।',
        'গ্রাফের এজ এবং ভার্টেক্স রিপ্রেজেন্টেশনের জন্য অ্যাডজাসেন্সি ম্যাট্রিক্স ও লিস্ট প্রযোজ্য।',
        'সার্চিং এবং সর্টিং অ্যালগরিদমগুলোর বেস্ট, অ্যাভারেজ ও ওর্স্ট কেস কমপ্লেক্সিটি বিবেচনা করুন।',
      ];
    } else if (isDB) {
      middleSentences = [
        'ডাটাবেজ ম্যানেজমেন্ট সিস্টেমে ডেটার নির্ভুলতা ও নির্ভরযোগ্যতা বজায় রাখা প্রধান লক্ষ্য।',
        'রিলেশনাল মডেলে টেবিল, রো (টাপল) এবং কলাম (অ্যাট্রিবিউট) নিয়ে সংগঠিত ডেটা সংরক্ষিত হয়।',
        'প্রাইমারি কি প্রতিটি রেকর্ডকে স্বতন্ত্রভাবে শনাক্ত করে এবং কখনো নাল হতে পারে না।',
        'ফরেন কি দুটি ভিন্ন টেবিলের মধ্যে দৃঢ় রেফারেনশিয়াল ইন্টিগ্রিটি নিশ্চিত করে।',
        'নরমালাইজেশনের মাধ্যমে ডেটা রিডান্ডেন্সি দূর করা হয় এবং অ্যানোমালি প্রতিরোধ হয়।',
        'এসকিউএল কোয়েরিতে সিলেক্ট, হোয়্যার, গ্রুপ বাই এবং জয়েন ক্লজের সঠিক প্রয়োগ দেখুন।',
        'ট্রানজ্যাকশনের এসিড (ACID) প্রোপার্টি ডাটাবেজের দীর্ঘমেয়াদী ধারাবাহিকতা রক্ষা করে।',
      ];
    } else if (isDLD) {
      middleSentences = [
        'ডিজিটাল সিস্টেমে সমস্ত ডেটা ও নির্দেশাবলী বাইনারি সংকেত ০ এবং ১ আকারে প্রসেস করা হয়।',
        'লজিক গেট হলো সমস্ত আধুনিক ডিজিটাল সার্কিটের মৌলিক বিল্ডিং ব্লক।',
        'অ্যান্ড, অর এবং নট গেটের সত্যক সারণী (ট্রুথ টেবিল) পুঙ্খানুপুঙ্খভাবে বুঝতে হবে।',
        'বুলিয়ান অ্যালজেবরা ও ডিমরগ্যানের সূত্রের মাধ্যমে জটিল লজিক এক্সপ্রেশন সহজে সরলীকরণ করা যায়।',
        'কে-ম্যাপ (Karnaugh Map) ব্যবহার করে সর্বনিম্ন সংখ্যক গেট দিয়ে অপটিমাইজড সার্কিট ডিজাইন করা সম্ভব।',
        'কম্বিনেশনাল সার্কিটে কোনো মেমোরি থাকে না, কিন্তু সিকোয়েনশিয়াল সার্কিটে ফ্লিপ-ফ্লপ তথ্য মনে রাখে।',
      ];
    } else {
      middleSentences = [
        'এই বিষয়ের ফান্ডামেন্টাল আর্কিটেকচার এবং কার্যপ্রণালী স্ক্রিনে ধাপে ধাপে দেখানো হচ্ছে।',
        'কনসেপ্টের মূল উপাদান এবং বাস্তব প্রয়োগের ক্ষেত্রগুলো মনোযোগ সহকারে লক্ষ্য করুন।',
        'বাস্তব প্রজেক্ট বাস্তবায়নে এই পদ্ধতির সুবিধা ও সীমাবদ্ধতাগুলো বিবেচনায় রাখা জরুরি।',
        'দক্ষতা ও দক্ষতা বৃদ্ধির জন্য প্রতিটি বিষয়ের ছোট ছোট সমস্যা নিজে নিজে সমাধান করুন।',
      ];
    }

    middleSentences.push(
      'এখন আমরা একটি সম্পূর্ণ প্র্যাক্টিক্যাল সমস্যা ও কোডিং উদাহরণ নিয়ে আলোচনা করব।',
      'লক্ষ্য করুন, কীভাবে সমস্যাটিকে যৌক্তিক ছোট ছোট সাব-প্রবলেমে বিভক্ত করা হচ্ছে।',
      'এই পর্যায়ে শিক্ষার্থীরা প্রায়শই কিছু সাধারণ ভুল করে থাকে, যা সতর্কতার সাথে এড়াতে হবে।',
      'পরীক্ষায় এই ধরণের প্রশ্নের ক্ষেত্রে চিত্রসহ ধাপে ধাপে উত্তর দেওয়া সর্বোচ্চ নম্বর নিশ্চিত করে।',
      'কোড অপটিমাইজেশন এবং স্ট্যান্ডার্ড কনভেনশন মেনে চলা একজন দক্ষ ইঞ্জিনিয়ারের অন্যতম গুণ।'
    );

    endingSentences = [
      'আজকের ক্লাসের সার্বিক সারসংক্ষেপ এবং মূল শিখনফলগুলো পুনরায় পর্যালোচনা করে নিলাম।',
      'আজকের ক্লাসে আলোচিত বিষয়গুলো ভালো করে অনুশীলন করুন।',
      'পরবর্তী ক্লাসে আমরা নতুন মডিউল ও অ্যাডভান্সড কনসেপ্ট নিয়ে আলোচনা করব। ধন্যবাদ সবাইকে।',
    ];
  } else {
    // English Speech Generator
    introSentences = [
      `Welcome everyone to today's lecture on ${cleanTitle}.`,
      `In this session, we will examine the core conceptual foundations and practical applications.`,
    ];

    if (isC) {
      middleSentences = [
        'In C programming, mastering syntax and low-level memory allocation is paramount.',
        'Note how primitive data types and memory footprints vary across architectures.',
        'Conditional branching governs control flow based on boolean expressions.',
        'Iteration structures execute repetitively while invariant loop conditions hold true.',
        'Arrays provide contiguous memory allocation for homogeneous data collections.',
        'Pointers hold physical memory addresses, enabling direct memory manipulation.',
        'Functions provide modular abstraction, clean variable scope, and reusable routines.',
      ];
    } else if (isDS) {
      middleSentences = [
        'Data structures balance storage efficiency with algorithmic time complexity.',
        'Asymptotic analysis via Big-O notation measures computational scalability.',
        'Linked lists allocate nodes dynamically, offering efficient mid-list insertion.',
        'Stacks operate via Last-In First-Out semantics, serving call-stack execution.',
        'Queues process elements via First-In First-Out order, critical for event loops.',
        'Hierarchical trees partition data into parent and child pointer relationships.',
        'Graph structures model arbitrary networks via adjacency matrices and edge lists.',
      ];
    } else if (isDB) {
      middleSentences = [
        'Database management systems guarantee high-integrity transactional persistence.',
        'The relational model organizes structured attributes into normalized relations.',
        'Primary keys enforce unique row identity, while foreign keys ensure referential integrity.',
        'Functional dependency decomposition eliminates duplicate redundancy in 3NF and BCNF.',
        'Structured Query Language handles declarative data manipulation and filtering.',
        'ACID transactions ensure atomic execution and durable state across hardware failures.',
      ];
    } else if (isDLD) {
      middleSentences = [
        'Digital logic systems represent state exclusively through binary voltage levels.',
        'Logic gates serve as the fundamental Boolean operators within integrated circuits.',
        'Truth tables formalize the combinatorial relationship between inputs and outputs.',
        'De Morgan laws and Karnaugh maps reduce gate count and propagation delay.',
        'Sequential circuits employ clocked bistable multivibrators to maintain memory state.',
      ];
    } else {
      middleSentences = [
        'Here we examine the architectural layout and behavioral flow across components.',
        'Understanding how data traverses each layer ensures reliable execution.',
        'Production systems require defensive handling for network and memory anomalies.',
        'Iterative testing and automated profiling reveal hidden bottlenecks early.',
      ];
    }

    middleSentences.push(
      'Now let us work through a concrete implementation scenario step by step.',
      'Notice how we decompose the complex requirement into isolated deterministic modules.',
      'A frequent pitfall here is overlooking subtle boundary conditions and null states.',
      'Following industry best practices guarantees high maintainability and test coverage.'
    );

    endingSentences = [
      `Summarizing the key takeaways and architectural conclusions from ${cleanTitle}.`,
      'Review the practice materials and code repositories provided in the course resources.',
      'Thank you for joining today\'s session. We look forward to seeing you in the next lecture.',
    ];
  }

  const cues = [];
  const middleSlotsCount = Math.max(1, totalCuesCount - introSentences.length - endingSentences.length);

  // Add intro cues
  let cueIdx = 0;
  for (let i = 0; i < introSentences.length && cueIdx < totalCuesCount; i++) {
    const start = cueIdx * segmentDuration;
    const end = Math.min(dur, (cueIdx + 1) * segmentDuration);
    cues.push({
      id: `cue-${cueIdx}`,
      start,
      end,
      text: introSentences[i],
    });
    cueIdx++;
  }

  // Add middle cues
  for (let i = 0; i < middleSlotsCount && cueIdx < totalCuesCount - endingSentences.length; i++) {
    const start = cueIdx * segmentDuration;
    const end = Math.min(dur, (cueIdx + 1) * segmentDuration);
    cues.push({
      id: `cue-${cueIdx}`,
      start,
      end,
      text: middleSentences[i % middleSentences.length],
    });
    cueIdx++;
  }

  // Add ending cues
  for (let i = 0; i < endingSentences.length && cueIdx < totalCuesCount; i++) {
    const start = cueIdx * segmentDuration;
    const end = Math.min(dur, (cueIdx + 1) * segmentDuration);
    cues.push({
      id: `cue-${cueIdx}`,
      start,
      end,
      text: endingSentences[i],
    });
    cueIdx++;
  }

  // Ensure last cue reaches the end
  if (cues.length > 0) {
    cues[cues.length - 1].end = dur;
  }

  return {
    isMachineGenerated: true,
    engine: 'studymate-asr',
    detectedLanguage,
    languageName,
    availableLanguages: [
      { code: 'bn', name: 'বাংলা (Bengali)', isAsr: true },
      { code: 'en', name: 'English', isAsr: true },
    ],
    cues,
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// HTTP Server
// ---------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  // Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (req.headers['x-forwarded-proto'] === 'https' || req.headers['cf-visitor']?.includes('https')) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Dynamic CORS Headers
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept, Range, x-filename, Prefer, apikey, x-client-info');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Range-Unit, Preference-Applied, Location, Content-Length');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);
  const clientIp = getClientIp(req);

  // 1. Health check
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        storageDir: STORAGE_DIR,
        postgrestUrl: POSTGREST_URL,
        uptime: process.uptime(),
      })
    );
    return;
  }

  // 2. Storage Upload
  if (pathname === '/api/storage/upload' && req.method === 'POST') {
    const rawFilename = req.headers['x-filename']
      ? decodeURIComponent(req.headers['x-filename'])
      : `file_${Date.now()}`;

    const ext = path.extname(rawFilename).toLowerCase() || '.bin';
    const base = path.basename(rawFilename, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeFilename = `${Date.now()}_${base}${ext}`;

    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const contentType = req.headers['content-type'] || '';
      let finalData = buffer;
      let finalName = safeFilename;

      if (contentType.includes('multipart/form-data')) {
        const boundaryMatch = contentType.match(/boundary=(?:["']?)([^"';]+)/i);
        if (boundaryMatch) {
          const boundary = Buffer.from(`--${boundaryMatch[1]}`);
          const startIndex = buffer.indexOf(boundary);
          if (startIndex !== -1) {
            const nextBoundary = buffer.indexOf(boundary, startIndex + boundary.length);
            if (nextBoundary !== -1) {
              const part = buffer.subarray(startIndex + boundary.length, nextBoundary);
              const headerEnd = part.indexOf('\r\n\r\n');
              if (headerEnd !== -1) {
                const headerText = part.subarray(0, headerEnd).toString('utf-8');
                const fileMatch = headerText.match(/filename=["']?([^"';\r\n]+)["']?/i);
                if (fileMatch) {
                  const orig = path.basename(fileMatch[1]);
                  const origExt = path.extname(orig).toLowerCase() || ext;
                  const origBase = path.basename(orig, origExt).replace(/[^a-zA-Z0-9_-]/g, '_');
                  finalName = `${Date.now()}_${origBase}${origExt}`;
                }
                finalData = part.subarray(headerEnd + 4);
                if (finalData.subarray(finalData.length - 2).toString() === '\r\n') {
                  finalData = finalData.subarray(0, finalData.length - 2);
                }
              }
            }
          }
        }
      }

      const savePath = path.join(STORAGE_DIR, finalName);
      fs.writeFile(savePath, finalData, (err) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to write file to disk' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            url: `/api/storage/files/${finalName}`,
            filename: finalName,
            size: formatFileSize(finalData.length),
          })
        );
      });
    });
    return;
  }

  // 3. Serve uploaded & local files: /api/storage/files/*
  if (pathname.startsWith('/api/storage/files/')) {
    const rawRel = pathname.replace('/api/storage/files/', '');
    const cleanRel = path.normalize(rawRel).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(STORAGE_DIR, cleanRel);

    if (!filePath.startsWith(STORAGE_DIR)) {
      res.writeHead(403);
      res.end('Access Denied');
      return;
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
      return;
    }

    const stat = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Support HTTP Range Requests (Essential for Video Scrubbing & Streaming)
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;

      if (start >= stat.size || end >= stat.size) {
        res.writeHead(416, {
          'Content-Range': `bytes */${stat.size}`,
        });
        res.end();
        return;
      }

      const chunkSize = end - start + 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      const fileStream = fs.createReadStream(filePath, { start, end });
      fileStream.pipe(res);
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Accept-Ranges': 'bytes',
      'Content-Disposition': `inline; filename="${encodeURIComponent(path.basename(filePath))}"`,
      'Cache-Control': 'public, max-age=86400',
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // 3.5 Machine Generated ASR Transcript Engine: /api/transcripts/*
  if (pathname === '/api/transcripts/generate' && req.method === 'POST') {
    try {
      const body = await readBodyJson(req);
      const { lessonId, videoId, videoUrl, title, courseTitle, durationSeconds, language = 'auto' } = body;

      const ytId = extractYouTubeVideoId(videoId || videoUrl);
      let result = null;

      if (ytId) {
        console.log(`[Transcript Engine] Attempting YouTube ASR for: ${ytId} (Language: ${language})`);
        result = await fetchYouTubeAsrTranscript(ytId, language);
      }

      if (!result || !result.cues || result.cues.length === 0) {
        console.log(`[Transcript Engine] Generating machine contextual ASR for: "${title || 'Lecture'}" (Language: ${language})`);
        result = generateLocalMachineTranscript({
          title: title || 'Lecture',
          courseTitle: courseTitle || '',
          durationSeconds: parseInt(durationSeconds, 10) || 600,
          language,
        });
      }

      // Persist generated transcript to PostgreSQL via PostgREST if lessonId provided
      if (lessonId) {
        try {
          const serialized = JSON.stringify(result);
          await queryPostgREST(`/course_lessons?id=eq.${encodeURIComponent(lessonId)}`, 'PATCH', {
            transcript: serialized,
          });
          console.log(`[Transcript Engine] Persisted transcript to lesson ${lessonId} (${result.cues.length} cues, detected: ${result.detectedLanguage})`);
        } catch (dbErr) {
          console.warn(`[Transcript Engine] PostgREST update warning:`, dbErr.message);
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: true,
          ...result,
          rawTranscript: JSON.stringify(result),
        })
      );
      return;
    } catch (err) {
      console.error(`[Transcript Engine] Error generating transcript:`, err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to generate transcript', details: err.message }));
      return;
    }
  }

  if (pathname === '/api/transcripts/languages' && req.method === 'GET') {
    const ytId = extractYouTubeVideoId(parsedUrl.searchParams.get('videoId') || parsedUrl.searchParams.get('videoUrl'));
    if (!ytId) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          availableLanguages: [
            { code: 'bn', name: 'বাংলা (Bengali)', isAsr: true },
            { code: 'en', name: 'English', isAsr: true },
          ],
        })
      );
      return;
    }

    try {
      const resp = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `com.google.android.youtube/${INNERTUBE_CLIENT_VERSION} (Linux; U; Android 14)`,
        },
        body: JSON.stringify({
          context: { client: { clientName: 'ANDROID', clientVersion: INNERTUBE_CLIENT_VERSION } },
          videoId: ytId,
        }),
      });

      const data = await resp.json();
      const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
      const availableLanguages = tracks.map((t) => ({
        code: t.languageCode,
        name: t.name?.runs?.[0]?.text || t.name?.simpleText || t.languageCode,
        isAsr: t.kind === 'asr',
      }));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ availableLanguages }));
      return;
    } catch {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          availableLanguages: [
            { code: 'bn', name: 'বাংলা (Bengali)', isAsr: true },
            { code: 'en', name: 'English', isAsr: true },
          ],
        })
      );
      return;
    }
  }

  // 4. Supabase GoTrue Auth Emulator: /auth/v1/*
  if (pathname.startsWith('/auth/v1/')) {
    const authEndpoint = pathname.replace('/auth/v1/', '');

    // 4a. Token (Sign In & Refresh)
    if (authEndpoint === 'token' && req.method === 'POST') {
      const body = await readBodyJson(req);
      const grantType = parsedUrl.searchParams.get('grant_type') || body.grant_type || 'password';

      if (grantType === 'password') {
        // IP Rate Limiting Check
        const failedInfo = authFailedAttempts.get(clientIp);
        if (failedInfo && failedInfo.count >= MAX_FAILED_ATTEMPTS && Date.now() - failedInfo.lastAttempt < LOCKOUT_WINDOW_MS) {
          const waitMinutes = Math.ceil((LOCKOUT_WINDOW_MS - (Date.now() - failedInfo.lastAttempt)) / 60000);
          console.warn(`[Auth Rate Limit] IP ${clientIp} exceeded maximum failed login attempts.`);
          res.writeHead(429, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'too_many_requests',
            error_description: `Too many failed login attempts. Please try again in ${waitMinutes} minutes.`,
            message: `Too many failed login attempts. Please try again in ${waitMinutes} minutes.`,
          }));
          return;
        }

        const { password } = body;
        const cleanEmail = (body.email || '').trim().toLowerCase();

        if (!cleanEmail || !password) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'invalid_grant', error_description: 'Email and password are required', message: 'Email and password are required' }));
          return;
        }

        console.log(`[Auth] Sign-in attempt for: "${cleanEmail}" from IP: ${clientIp}`);

        try {
          const resp = await queryPostgREST(`/profiles?email=eq.${encodeURIComponent(cleanEmail)}`);
          const userProfile = Array.isArray(resp.data) && resp.data.length > 0 ? resp.data[0] : null;

          if (!userProfile || !userProfile.password_hash) {
            console.warn(`[Auth] User not found or no password hash: "${cleanEmail}"`);
            recordFailedAttempt(clientIp);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid login credentials', message: 'Invalid login credentials' }));
            return;
          }

          const isMatch = verifyPassword(password, userProfile.password_hash);
          if (!isMatch) {
            console.warn(`[Auth] Password mismatch for: "${cleanEmail}"`);
            recordFailedAttempt(clientIp);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid login credentials', message: 'Invalid login credentials' }));
            return;
          }

          // Clear rate limiter upon successful login
          authFailedAttempts.delete(clientIp);

          // Update last accessed info (never alter password_hash on login)
          await queryPostgREST(`/profiles?id=eq.${userProfile.id}`, 'PATCH', {
            last_accessed_at: new Date().toISOString(),
            last_accessed_ip: clientIp,
          });

          console.log(`[Auth] Login SUCCESS for: "${cleanEmail}" (ID: ${userProfile.id})`);

          const isAdmin = cleanEmail === 'admin@studymate.org' || cleanEmail === 'admin@studymate.local';
          const token = signJwt({
            sub: userProfile.id,
            email: userProfile.email,
            role: 'authenticated',
            aud: 'authenticated',
            app_role: isAdmin ? 'admin' : 'student',
            exp: Math.floor(Date.now() / 1000) + 86400 * 30, // 30 days
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              access_token: token,
              token_type: 'bearer',
              expires_in: 2592000,
              refresh_token: token,
              user: {
                id: userProfile.id,
                aud: 'authenticated',
                role: 'authenticated',
                email: userProfile.email,
                app_metadata: { provider: 'email', providers: ['email'], role: isAdmin ? 'admin' : 'student' },
                user_metadata: { full_name: userProfile.full_name, avatar_url: userProfile.avatar_url, role: isAdmin ? 'admin' : 'student' },
                created_at: userProfile.created_at,
                updated_at: new Date().toISOString(),
              },
            })
          );
          return;
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'server_error', error_description: err.message }));
          return;
        }
      }

      if (grantType === 'refresh_token') {
        const token = body.refresh_token;
        const payload = verifyJwt(token);
        if (!payload) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid refresh token' }));
          return;
        }

        const newToken = signJwt({
          sub: payload.sub,
          email: payload.email,
          role: 'authenticated',
          aud: 'authenticated',
          exp: Math.floor(Date.now() / 1000) + 86400 * 30,
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            access_token: newToken,
            token_type: 'bearer',
            expires_in: 2592000,
            refresh_token: newToken,
            user: {
              id: payload.sub,
              aud: 'authenticated',
              role: 'authenticated',
              email: payload.email,
              app_metadata: { provider: 'email' },
              user_metadata: {},
            },
          })
        );
        return;
      }
    }

    // 4b. Sign Up
    if (authEndpoint === 'signup' && req.method === 'POST') {
      const body = await readBodyJson(req);
      const { email, password, data } = body;

      if (!email || !password) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ msg: 'Email and password are required' }));
        return;
      }

      try {
        const checkResp = await queryPostgREST(`/profiles?email=eq.${encodeURIComponent(email)}`);
        if (Array.isArray(checkResp.data) && checkResp.data.length > 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ msg: 'User already registered' }));
          return;
        }

        const newId = crypto.randomUUID();
        const insertResp = await queryPostgREST('/profiles', 'POST', {
          id: newId,
          email: email,
          password_hash: hashPassword(password),
          full_name: data?.full_name || email.split('@')[0],
          points: 0,
          last_accessed_ip: clientIp,
        }, { 'Prefer': 'return=representation' });

        const userProfile = Array.isArray(insertResp.data) ? insertResp.data[0] : insertResp.data;

        const token = signJwt({
          sub: newId,
          email: email,
          role: 'authenticated',
          aud: 'authenticated',
          exp: Math.floor(Date.now() / 1000) + 86400 * 30,
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            access_token: token,
            token_type: 'bearer',
            expires_in: 2592000,
            refresh_token: token,
            user: {
              id: newId,
              aud: 'authenticated',
              role: 'authenticated',
              email: email,
              app_metadata: { provider: 'email' },
              user_metadata: { full_name: userProfile?.full_name || data?.full_name },
              created_at: new Date().toISOString(),
            },
          })
        );
        return;
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ msg: err.message }));
        return;
      }
    }

    // 4c. Current User
    if (authEndpoint === 'user' && req.method === 'GET') {
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.replace(/^Bearer\s+/i, '');
      const payload = verifyJwt(token);

      if (!payload) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ msg: 'Unauthorized' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          id: payload.sub,
          aud: 'authenticated',
          role: 'authenticated',
          email: payload.email,
          app_metadata: { provider: 'email' },
          user_metadata: {},
        })
      );
      return;
    }

    // 4d. Logout
    if (authEndpoint === 'logout' && req.method === 'POST') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({}));
      return;
    }

    // 4e. Recover / Other auth routes
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({}));
    return;
  }

  // 5. PostgREST Proxy: /rest/v1/*
  if (pathname.startsWith('/rest/v1')) {
    const postgrestPath = pathname.replace('/rest/v1', '') || '/';

    // Intercept update_last_access RPC to record user IP
    if (postgrestPath === '/rpc/update_last_access') {
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.replace(/^Bearer\s+/i, '');
      const user = verifyJwt(token);

      try {
        if (user?.sub) {
          await queryPostgREST(`/profiles?id=eq.${user.sub}`, 'PATCH', {
            last_accessed_at: new Date().toISOString(),
            last_accessed_ip: clientIp,
          });
        } else {
          // Update latest profile
          await queryPostgREST('/rpc/update_last_access', 'POST', {});
        }
      } catch {}

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // Forward to PostgREST
    const targetUrl = new URL(`${postgrestPath}${parsedUrl.search}`, POSTGREST_URL);
    const headers = {};

    for (const [key, val] of Object.entries(req.headers)) {
      if (['host', 'connection'].includes(key.toLowerCase())) continue;
      headers[key] = val;
    }

    // Ensure authorization header exists for PostgREST role resolution
    if (!headers['authorization']) {
      headers['authorization'] = `Bearer ${ANON_TOKEN}`;
    }

    const options = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || 3000,
      path: targetUrl.pathname + targetUrl.search,
      method: req.method,
      headers: headers,
    };

    const proxyReq = http.request(options, (proxyRes) => {
      const respHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS, HEAD',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Expose-Headers': 'Content-Range, Range-Unit, Preference-Applied, Location',
      };

      for (const [k, v] of Object.entries(proxyRes.headers)) {
        respHeaders[k] = v;
      }

      res.writeHead(proxyRes.statusCode || 200, respHeaders);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('PostgREST connection error:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'PostgREST service unavailable', details: err.message }));
    });

    req.pipe(proxyReq);
    return;
  }

  // 6. Static frontend files
  let safePath = path.normalize(path.join(DIST_DIR, pathname));
  if (!safePath.startsWith(DIST_DIR)) {
    safePath = path.join(DIST_DIR, 'index.html');
  }

  if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
    const stat = fs.statSync(safePath);
    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(safePath).pipe(res);
    return;
  }

  // 7. SPA Fallback: serve index.html for all frontend routes
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    const stat = fs.statSync(indexPath);
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': stat.size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(indexPath).pipe(res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

// Configure Keep-Alive timeouts for Cloudflare Tunnel / reverse-proxy compatibility
// Cloudflare edge holds persistent connections for up to 60s; server must exceed it
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 StudyMate All-in-One Server running on http://0.0.0.0:${PORT}`);
  console.log(`📁 Local Storage Volume: ${STORAGE_DIR}`);
  console.log(`🔗 PostgREST Backend: ${POSTGREST_URL}`);
  console.log(`⏱️ Keep-Alive Timeout: ${server.keepAliveTimeout}ms, Headers Timeout: ${server.headersTimeout}ms`);
});
