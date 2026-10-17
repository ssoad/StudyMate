import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '5173', 10);
const STORAGE_DIR = process.env.STORAGE_DIR || path.join(__dirname, 'storage');
const DIST_DIR = path.join(__dirname, 'dist');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

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

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-filename');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // 1. Health check
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', storageDir: STORAGE_DIR, uptime: process.uptime() }));
    return;
  }

  // 2. Upload endpoint
  if (pathname === '/api/storage/upload' && req.method === 'POST') {
    const rawFilename = req.headers['x-filename']
      ? decodeURIComponent(req.headers['x-filename'])
      : `file_${Date.now()}`;

    const ext = path.extname(rawFilename).toLowerCase() || '.bin';
    const base = path.basename(rawFilename, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeFilename = `${Date.now()}_${base}${ext}`;
    const targetPath = path.join(STORAGE_DIR, safeFilename);

    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);

      // Check if it's multipart form data with boundary
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

  // 3. Serve uploaded files: /api/storage/files/:filename
  if (pathname.startsWith('/api/storage/files/')) {
    const filename = path.basename(pathname.replace('/api/storage/files/', ''));
    const filePath = path.join(STORAGE_DIR, filename);

    // Prevent directory traversal
    if (!filePath.startsWith(STORAGE_DIR)) {
      res.writeHead(403);
      res.end('Access Denied');
      return;
    }

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
      return;
    }

    const stat = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
      'Cache-Control': 'public, max-age=86400',
    });

    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // 4. Static frontend files
  let safePath = path.normalize(path.join(DIST_DIR, pathname));
  if (!safePath.startsWith(DIST_DIR)) {
    safePath = path.join(DIST_DIR, 'index.html');
  }

  if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    fs.createReadStream(safePath).pipe(res);
    return;
  }

  // 5. SPA Fallback: serve index.html for all non-file frontend routes
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(indexPath).pipe(res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 StudyMate Server running on http://0.0.0.0:${PORT}`);
  console.log(`📁 Local Storage Volume: ${STORAGE_DIR}`);
});
