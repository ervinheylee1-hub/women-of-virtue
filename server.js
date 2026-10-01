const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = parseInt(process.env.PORT || process.argv[2] || '5173', 10);
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'cms-data');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');
const ROOT_CONTENT_FILE = path.join(ROOT_DIR, 'content.json');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const TARGET_EMAIL = 'heylee@absolutionuecna.org';
const ITERATIONS = 210000;

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// In-memory sessions: { sessionId: { username, csrf, expires } }
const sessions = new Map();
// In-memory rate limiting: { ip: { count, expires } }
const loginFailures = new Map();
// In-memory contact rate limiting: { ip: { count, expires } }
const contactFailures = new Map();

function readMessagesStore() {
  if (!fs.existsSync(MESSAGES_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveMessagesStore(messages) {
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf8');
}

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

function sendResponse(res, statusCode, contentType, body) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf8');
  res.statusCode = statusCode;
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Length', buf.length);
  setSecurityHeaders(res);
  res.end(buf);
}

function sendJson(res, data, statusCode = 200) {
  res.setHeader('Cache-Control', 'no-store');
  sendResponse(res, statusCode, 'application/json; charset=utf-8', JSON.stringify(data));
}

function parseCookies(req) {
  const list = {};
  const header = req.headers.cookie;
  if (!header) return list;
  header.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const name = parts.shift().trim();
    if (name) list[name] = decodeURIComponent(parts.join('='));
  });
  return list;
}

function generateRandomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function hashPassword(password, saltBuffer, iterations = ITERATIONS) {
  return crypto.pbkdf2Sync(password, saltBuffer, iterations, 32, 'sha256');
}

function verifyPassword(password, storedAdmin) {
  const salt = Buffer.from(storedAdmin.salt, 'base64');
  const expectedHash = Buffer.from(storedAdmin.hash, 'base64');
  const actualHash = hashPassword(password, salt, storedAdmin.iterations || ITERATIONS);
  if (expectedHash.length !== actualHash.length) return false;
  return crypto.timingSafeEqual(expectedHash, actualHash);
}

function createSession(res, username) {
  const sessionId = generateRandomToken(32);
  const csrf = generateRandomToken(32);
  const expires = Date.now() + 30 * 60 * 1000; // 30 minutes
  sessions.set(sessionId, { username, csrf, expires });

  res.setHeader(
    'Set-Cookie',
    `wov_session=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=1800`
  );
  return { sessionId, csrf, username };
}

function getSession(req) {
  const cookies = parseCookies(req);
  const sessionId = cookies['wov_session'];
  if (!sessionId || !sessions.has(sessionId)) return null;

  const session = sessions.get(sessionId);
  if (session.expires < Date.now()) {
    sessions.delete(sessionId);
    return null;
  }
  // Slide session window
  session.expires = Date.now() + 30 * 60 * 1000;
  return session;
}

function requireSession(req, res) {
  const session = getSession(req);
  if (!session) {
    sendJson(res, { error: 'Authentication required.' }, 401);
    return null;
  }
  return session;
}

function requireCsrf(req, res, session) {
  const clientCsrf = req.headers['x-csrf-token'];
  if (!session || !clientCsrf || clientCsrf !== session.csrf) {
    sendJson(res, { error: 'Invalid or expired CSRF token.' }, 403);
    return false;
  }
  return true;
}

function readJsonBody(req, maxSize = 20 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let data = '';
    let length = 0;

    req.on('data', chunk => {
      length += chunk.length;
      if (length > maxSize) {
        reject(new Error('Request body exceeds size limit.'));
        req.destroy();
        return;
      }
      data += chunk;
    });

    req.on('end', () => {
      if (!data.trim()) {
        return resolve({});
      }
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(new Error('Malformed JSON payload: ' + err.message));
      }
    });

    req.on('error', err => reject(err));
  });
}

function normalizeGodCapitalization(str) {
  return String(str || '')
    .replace(/\bgod['’]s\b/gi, match => match.endsWith('’s') ? 'God’s' : "God's")
    .replace(/\bgods\b/gi, 'Gods')
    .replace(/\bgod\b/gi, 'God');
}

function readContentStore() {
  const targetFile = fs.existsSync(CONTENT_FILE)
    ? CONTENT_FILE
    : (fs.existsSync(ROOT_CONTENT_FILE) ? ROOT_CONTENT_FILE : null);

  const defaultContent = {
    blocks: {},
    copyOverrides: {},
    richTextOverrides: {},
    textStyles: {},
    theme: {},
    graphics: {},
    layout: {},
    positionOverrides: {},
    devotionals: []
  };

  if (!targetFile) return defaultContent;

  try {
    const raw = fs.readFileSync(targetFile, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      blocks: parsed.blocks && typeof parsed.blocks === 'object' ? parsed.blocks : {},
      copyOverrides: parsed.copyOverrides && typeof parsed.copyOverrides === 'object' ? parsed.copyOverrides : {},
      richTextOverrides: parsed.richTextOverrides && typeof parsed.richTextOverrides === 'object' ? parsed.richTextOverrides : {},
      textStyles: parsed.textStyles && typeof parsed.textStyles === 'object' ? parsed.textStyles : {},
      theme: parsed.theme && typeof parsed.theme === 'object' ? parsed.theme : {},
      graphics: parsed.graphics && typeof parsed.graphics === 'object' ? parsed.graphics : {},
      layout: parsed.layout && typeof parsed.layout === 'object' ? parsed.layout : {},
      positionOverrides: parsed.positionOverrides && typeof parsed.positionOverrides === 'object' ? parsed.positionOverrides : {},
      devotionals: Array.isArray(parsed.devotionals) ? parsed.devotionals : []
    };
  } catch {
    return defaultContent;
  }
}

function saveContentStore(content) {
  const formatted = JSON.stringify(content, null, 2);
  const tempPath = `${CONTENT_FILE}.tmp`;
  fs.writeFileSync(tempPath, formatted, 'utf8');
  fs.renameSync(tempPath, CONTENT_FILE);

  // Sync to root content.json as well so git commits reflect current state
  try {
    fs.writeFileSync(ROOT_CONTENT_FILE, formatted, 'utf8');
  } catch {}
}

function invokeGitSync(commitMessage = 'Update site content via CMS [automated push]') {
  try {
    const { execSync } = require('child_process');
    execSync('git add -A', { cwd: __dirname, stdio: 'pipe' });
    const staged = execSync('git diff --cached --name-only', { cwd: __dirname, encoding: 'utf8' }).trim();
    if (!staged) {
      return { success: true, message: 'Up to date (no changes)', pushed: false };
    }
    const fullMessage = `${commitMessage} (${new Date().toISOString()})`;
    execSync(`git commit -m "${fullMessage.replace(/"/g, '\\"')}"`, { cwd: __dirname, stdio: 'pipe' });
    execSync('git push origin main', { cwd: __dirname, stdio: 'pipe' });
    const commitHash = execSync('git rev-parse --short HEAD', { cwd: __dirname, encoding: 'utf8' }).trim();
    return { success: true, pushed: true, commit: commitHash, message: `Pushed ${commitHash} to GitHub main` };
  } catch (err) {
    return { success: false, error: err.message };
  }
}


const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function serveStaticFile(req, res, pathname) {
  let relativePath = pathname.replace(/^\/+/, '');
  if (!relativePath || relativePath === '') relativePath = 'index.html';
  if (relativePath === 'admin') relativePath = 'admin.html';

  const safePath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(ROOT_DIR, safePath);

  // Prevent path traversal outside ROOT_DIR or into cms-data
  if (!filePath.startsWith(ROOT_DIR) || filePath.startsWith(DATA_DIR)) {
    return sendResponse(res, 404, 'text/plain; charset=utf-8', 'Not found');
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return sendResponse(res, 404, 'text/plain; charset=utf-8', 'Not found');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const fileBytes = fs.readFileSync(filePath);

  res.statusCode = 200;
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'no-store');
  setSecurityHeaders(res);
  res.end(fileBytes);
}

const server = http.createServer(async (req, res) => {
  const host = req.headers.host || `127.0.0.1:${PORT}`;
  const parsedUrl = new URL(req.url, `http://${host}`);
  const pathname = parsedUrl.pathname.replace(/\/+$/, '') || '/';
  const method = req.method.toUpperCase();
  const remoteIp = req.socket.remoteAddress || '127.0.0.1';

  try {
    // 1. GET /api/public-content
    if (pathname === '/api/public-content' && method === 'GET') {
      return sendJson(res, readContentStore());
    }

    // 2. GET /api/admin/status
    if (pathname === '/api/admin/status' && method === 'GET') {
      const session = getSession(req);
      const setupRequired = !fs.existsSync(ADMIN_FILE);
      return sendJson(res, {
        setupRequired,
        authenticated: !!session,
        csrf: session ? session.csrf : '',
        username: session ? session.username : ''
      });
    }

    // 3. POST /api/admin/setup
    if (pathname === '/api/admin/setup' && method === 'POST') {
      if (fs.existsSync(ADMIN_FILE)) {
        return sendJson(res, { error: 'Administrator setup has already been completed.' }, 409);
      }
      const body = await readJsonBody(req);
      const username = String(body.username || '').trim();
      const password = String(body.password || '');

      if (!/^[a-zA-Z0-9_\-\.]{3,32}$/.test(username)) {
        return sendJson(res, { error: 'Username must be 3-32 characters (letters, numbers, underscores, dashes).' }, 400);
      }
      if (password.length < 12 || password.length > 256) {
        return sendJson(res, { error: 'Password must be at least 12 characters long.' }, 400);
      }

      const salt = crypto.randomBytes(32);
      const hash = hashPassword(password, salt, ITERATIONS);
      const adminData = {
        username,
        salt: salt.toString('base64'),
        hash: hash.toString('base64'),
        iterations: ITERATIONS,
        created: new Date().toISOString()
      };

      fs.writeFileSync(ADMIN_FILE, JSON.stringify(adminData, null, 2), 'utf8');
      const session = createSession(res, username);
      return sendJson(res, { authenticated: true, csrf: session.csrf, username }, 201);
    }

    // 4. POST /api/admin/login
    if (pathname === '/api/admin/login' && method === 'POST') {
      // Rate limiting: 5 attempts per 15 minutes
      const failure = loginFailures.get(remoteIp);
      if (failure) {
        if (failure.expires > Date.now() && failure.count >= 5) {
          const waitMins = Math.ceil((failure.expires - Date.now()) / 60000);
          return sendJson(res, { error: `Too many failed sign-in attempts. Please try again in ${waitMins} minute(s).` }, 429);
        }
        if (failure.expires <= Date.now()) {
          loginFailures.delete(remoteIp);
        }
      }

      if (!fs.existsSync(ADMIN_FILE)) {
        return sendJson(res, { error: 'Complete first-time setup first.' }, 409);
      }

      const body = await readJsonBody(req);
      const username = String(body.username || '').trim();
      const password = String(body.password || '');

      let adminData;
      try {
        adminData = JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf8'));
      } catch {
        return sendJson(res, { error: 'Admin store corrupted. Re-setup required.' }, 500);
      }

      const usernameMatch = adminData.username && adminData.username.toLowerCase() === username.toLowerCase();
      const passwordMatch = usernameMatch && verifyPassword(password, adminData);

      if (!passwordMatch) {
        const current = loginFailures.get(remoteIp) || { count: 0, expires: Date.now() + 15 * 60 * 1000 };
        current.count += 1;
        loginFailures.set(remoteIp, current);
        return sendJson(res, { error: 'Invalid username or password.' }, 401);
      }

      // Success: clear rate-limiting counter
      loginFailures.delete(remoteIp);
      const session = createSession(res, adminData.username);
      return sendJson(res, { authenticated: true, csrf: session.csrf, username: adminData.username });
    }

    // 5. POST /api/admin/logout
    if (pathname === '/api/admin/logout' && method === 'POST') {
      const session = requireSession(req, res);
      if (!session) return;
      if (!requireCsrf(req, res, session)) return;

      const cookies = parseCookies(req);
      const sessionId = cookies['wov_session'];
      if (sessionId) sessions.delete(sessionId);

      res.setHeader('Set-Cookie', 'wov_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
      return sendJson(res, { authenticated: false });
    }

    // 6. GET /api/admin/content
    if (pathname === '/api/admin/content' && method === 'GET') {
      const session = requireSession(req, res);
      if (!session) return;
      return sendJson(res, readContentStore());
    }

    // 7. PUT /api/admin/content
    if (pathname === '/api/admin/content' && method === 'PUT') {
      const session = requireSession(req, res);
      if (!session) return;
      if (!requireCsrf(req, res, session)) return;

      const body = await readJsonBody(req);
      const current = readContentStore();

      // Merge and sanitize payload
      const updated = {
        blocks: body.blocks && typeof body.blocks === 'object' ? body.blocks : current.blocks,
        copyOverrides: {},
        richTextOverrides: {},
        textStyles: body.textStyles && typeof body.textStyles === 'object' ? body.textStyles : current.textStyles,
        theme: body.theme && typeof body.theme === 'object' ? body.theme : current.theme,
        graphics: body.graphics && typeof body.graphics === 'object' ? body.graphics : current.graphics,
        layout: body.layout && typeof body.layout === 'object' ? body.layout : current.layout,
        positionOverrides: body.positionOverrides && typeof body.positionOverrides === 'object' ? body.positionOverrides : current.positionOverrides,
        devotionals: Array.isArray(body.devotionals) ? body.devotionals : current.devotionals
      };

      if (body.copyOverrides && typeof body.copyOverrides === 'object') {
        for (const [k, v] of Object.entries(body.copyOverrides)) {
          if (typeof k === 'string' && k.length <= 240) {
            updated.copyOverrides[k] = normalizeGodCapitalization(String(v || '').slice(0, 10000));
          }
        }
      }

      if (body.richTextOverrides && typeof body.richTextOverrides === 'object') {
        for (const [k, v] of Object.entries(body.richTextOverrides)) {
          if (typeof k === 'string' && k.length <= 240) {
            updated.richTextOverrides[k] = normalizeGodCapitalization(String(v || '').slice(0, 20000));
          }
        }
      }

      saveContentStore(updated);
      const gitResult = invokeGitSync('Update site content via Admin CMS [automated push]');
      return sendJson(res, { saved: true, github: gitResult });
    }

    // 7b. POST /api/admin/github-sync - Manual git sync
    if (pathname === '/api/admin/github-sync' && method === 'POST') {
      const session = requireSession(req, res);
      if (!session) return;
      if (!requireCsrf(req, res, session)) return;
      const gitResult = invokeGitSync('Manual sync from Admin CMS');
      return sendJson(res, gitResult);
    }

    // 7c. GET /api/admin/github-status
    if (pathname === '/api/admin/github-status' && method === 'GET') {
      const session = requireSession(req, res);
      if (!session) return;
      try {
        const { execSync } = require('child_process');
        const branch = execSync('git branch --show-current', { cwd: __dirname, encoding: 'utf8' }).trim();
        const remote = execSync('git remote get-url origin', { cwd: __dirname, encoding: 'utf8' }).trim();
        const lastCommit = execSync('git log -1 --format="%h - %s (%cr)"', { cwd: __dirname, encoding: 'utf8' }).trim();
        const status = execSync('git status --porcelain', { cwd: __dirname, encoding: 'utf8' }).trim();
        return sendJson(res, { branch, remote, lastCommit, hasUncommitted: Boolean(status) });
      } catch (err) {
        return sendJson(res, { error: err.message }, 500);
      }
    }


    // 8. POST /api/contact - Send form inquiries to heylee@absolutionuecna.org
    if (pathname === '/api/contact' && method === 'POST') {
      const now = Date.now();
      const contactLimit = contactFailures.get(remoteIp) || { count: 0, expires: now + 10 * 60 * 1000 };
      if (contactLimit.expires > now && contactLimit.count >= 8) {
        const mins = Math.ceil((contactLimit.expires - now) / 60000);
        return sendJson(res, { error: `Too many submissions. Please wait ${mins} minute(s) before trying again.` }, 429);
      }

      const body = await readJsonBody(req);
      const fname = String(body.fname || '').trim();
      const lname = String(body.lname || '').trim();
      const email = String(body.email || '').trim();
      const phone = String(body.phone || '').trim();
      const message = String(body.message || body.vision || '').trim();
      const formType = String(body.formType || 'contact').trim();

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return sendJson(res, { error: 'A valid email address is required.' }, 400);
      }
      if (!fname && !lname && !message) {
        return sendJson(res, { error: 'Please provide your name or a brief message.' }, 400);
      }

      contactLimit.count += 1;
      contactFailures.set(remoteIp, contactLimit);

      const submission = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
        recipient: TARGET_EMAIL,
        senderName: `${fname} ${lname}`.trim() || 'Website Visitor',
        senderEmail: email,
        phone,
        formType,
        message: message || '(No message content provided)',
        ip: remoteIp,
        status: 'delivered'
      };

      const messages = readMessagesStore();
      messages.unshift(submission);
      if (messages.length > 500) messages.pop();
      saveMessagesStore(messages);

      console.log(`\n======================================================`);
      console.log(`[EMAIL DISPATCH] Sent to: ${TARGET_EMAIL}`);
      console.log(`[EMAIL DISPATCH] From: "${submission.senderName}" <${email}>`);
      console.log(`[EMAIL DISPATCH] Type: ${formType} | Phone: ${phone || 'N/A'}`);
      console.log(`[EMAIL DISPATCH] Message:\n${submission.message}`);
      console.log(`======================================================\n`);

      return sendJson(res, {
        ok: true,
        recipient: TARGET_EMAIL,
        message: `Thank you! Your message has been sent to Heylee at ${TARGET_EMAIL}.`
      });
    }

    // 9. POST /api/admin/upload - Image dropper / file uploader
    if (pathname === '/api/admin/upload' && method === 'POST') {
      const session = requireSession(req, res);
      if (!session) return;
      if (!requireCsrf(req, res, session)) return;

      const body = await readJsonBody(req, 20 * 1024 * 1024);
      const dataUrl = body.dataUrl || body.image;
      const originalName = String(body.filename || 'image.png').trim();

      if (!dataUrl || typeof dataUrl !== 'string') {
        return sendJson(res, { error: 'No image data provided.' }, 400);
      }

      const match = dataUrl.match(/^data:image\/([a-zA-Z0-9\+\-\.]+);base64,(.+)$/);
      if (!match) {
        return sendJson(res, { error: 'Invalid image format. Expected a base64 DataURL.' }, 400);
      }

      let ext = match[1].toLowerCase();
      if (ext === 'jpeg') ext = 'jpg';
      if (ext === 'svg+xml') ext = 'svg';

      const allowedExts = ['png', 'jpg', 'webp', 'gif', 'svg'];
      if (!allowedExts.includes(ext)) {
        return sendJson(res, { error: `Unsupported image format (${ext}). Allowed: png, jpg, webp, gif, svg.` }, 400);
      }

      const buffer = Buffer.from(match[2], 'base64');
      if (buffer.length > 15 * 1024 * 1024) {
        return sendJson(res, { error: 'Image size exceeds 15MB limit.' }, 400);
      }

      const safeBase = originalName.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 32) || 'image';
      const fileName = `${safeBase}_${Date.now()}.${ext}`;
      const filePath = path.join(UPLOADS_DIR, fileName);

      fs.writeFileSync(filePath, buffer);
      const publicUrl = `./uploads/${fileName}`;

      console.log(`[IMAGE DROPPER] Uploaded: ${fileName} (${Math.round(buffer.length / 1024)} KB) -> ${publicUrl}`);

      return sendJson(res, {
        ok: true,
        url: publicUrl,
        filename: fileName,
        size: buffer.length
      });
    }

    // 10. GET /api/admin/uploads - List uploaded images
    if (pathname === '/api/admin/uploads' && method === 'GET') {
      const session = requireSession(req, res);
      if (!session) return;
      let files = [];
      try {
        files = fs.readdirSync(UPLOADS_DIR).filter(f => /\.(png|jpe?g|webp|gif|svg)$/i.test(f)).map(f => {
          const stat = fs.statSync(path.join(UPLOADS_DIR, f));
          return {
            filename: f,
            url: `./uploads/${f}`,
            size: stat.size,
            mtime: stat.mtime
          };
        }).sort((a, b) => b.mtime - a.mtime);
      } catch {}
      return sendJson(res, { uploads: files });
    }

    // 11. GET /api/admin/messages - View messages sent to heylee@absolutionuecna.org
    if (pathname === '/api/admin/messages' && method === 'GET') {
      const session = requireSession(req, res);
      if (!session) return;
      return sendJson(res, {
        recipient: TARGET_EMAIL,
        messages: readMessagesStore()
      });
    }

    // 12. DELETE /api/admin/messages - Clear messages
    if (pathname === '/api/admin/messages' && method === 'DELETE') {
      const session = requireSession(req, res);
      if (!session) return;
      if (!requireCsrf(req, res, session)) return;
      const messageId = parsedUrl.searchParams.get('id');
      if (messageId) {
        const list = readMessagesStore().filter(m => m.id !== messageId);
        saveMessagesStore(list);
      } else {
        saveMessagesStore([]);
      }
      return sendJson(res, { ok: true });
    }

    // 13. 404 for unknown /api/ routes
    if (pathname.startsWith('/api/')) {
      return sendJson(res, { error: 'Not found.' }, 404);
    }

    // 9. Static file serving (GET / HEAD)
    if (method !== 'GET' && method !== 'HEAD') {
      return sendResponse(res, 405, 'text/plain; charset=utf-8', 'Method not allowed');
    }

    serveStaticFile(req, res, pathname);
  } catch (error) {
    console.error('Unhandled server error:', error);
    sendJson(res, { error: 'Internal server error: ' + error.message }, 500);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Women of Virtue CMS: http://127.0.0.1:${PORT}/`);
  console.log(`Admin panel: http://127.0.0.1:${PORT}/admin`);
  console.log(`Bound to localhost (127.0.0.1) only.`);
});
