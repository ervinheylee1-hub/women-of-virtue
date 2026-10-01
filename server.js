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
const EMAIL_SETTINGS_FILE = path.join(DATA_DIR, 'email-settings.json');
const TARGET_EMAIL = 'heylee@absolutionuecna.org';
const ITERATIONS = 210000;

// Load optional .env file if present
function loadEnvFile() {
  const envPath = path.join(ROOT_DIR, '.env');
  if (!fs.existsSync(envPath)) return;
  try {
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const rawLine of raw.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) continue;
      const k = line.slice(0, eqIdx).trim();
      let v = line.slice(eqIdx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (process.env[k] === undefined) {
        process.env[k] = v;
      }
    }
  } catch (err) {
    console.warn('[ENV] Warning reading .env:', err.message);
  }
}
loadEnvFile();

function readEmailSettings() {
  let fileSettings = {};
  if (fs.existsSync(EMAIL_SETTINGS_FILE)) {
    try {
      fileSettings = JSON.parse(fs.readFileSync(EMAIL_SETTINGS_FILE, 'utf8'));
    } catch {}
  }
  return {
    resendApiKey: process.env.RESEND_API_KEY || fileSettings.resendApiKey || '',
    targetEmail: process.env.TARGET_EMAIL || process.env.RESEND_TO_EMAIL || fileSettings.targetEmail || TARGET_EMAIL,
    resendFromEmail: process.env.RESEND_FROM_EMAIL || fileSettings.resendFromEmail || 'Women of Virtue <onboarding@resend.dev>'
  };
}

function saveEmailSettings(settings) {
  const current = readEmailSettings();
  let apiKeyToSave = current.resendApiKey;
  if (typeof settings.resendApiKey === 'string') {
    const trimmed = settings.resendApiKey.trim();
    if (!trimmed.includes('••••')) {
      apiKeyToSave = trimmed;
    }
  }
  const updated = {
    resendApiKey: apiKeyToSave,
    targetEmail: typeof settings.targetEmail === 'string' && settings.targetEmail.trim() !== '' ? settings.targetEmail.trim() : current.targetEmail,
    resendFromEmail: typeof settings.resendFromEmail === 'string' && settings.resendFromEmail.trim() !== '' ? settings.resendFromEmail.trim() : current.resendFromEmail,
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(EMAIL_SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf8');
  return updated;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function sendResendEmail({ apiKey, to, from, replyTo, subject, text, html }) {
  if (!apiKey) {
    throw new Error('Resend API key is not configured.');
  }

  const payload = {
    from: from || 'Women of Virtue <onboarding@resend.dev>',
    to: Array.isArray(to) ? to : [to],
    subject: subject || 'New Form Submission',
    text: text || '',
    html: html || `<p>${escapeHtml(text)}</p>`
  };
  if (replyTo) {
    payload.reply_to = replyTo;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.message || data.error?.message || data.error || `HTTP ${response.status} from Resend`;
    throw new Error(errorMsg);
  }
  return data;
}

function buildEmailHtml({ senderName, senderEmail, phone, formType, message, createdAt }) {
  const isProject = formType === 'project';
  const typeLabel = isProject ? 'Start a Project Inquiry' : 'General Contact Inquiry';
  const formattedDate = new Date(createdAt || Date.now()).toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short'
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Website Inquiry - Women of Virtue</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f3ed; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #252b29; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f3ed; padding: 36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(37,43,41,0.08); border: 1px solid rgba(37,43,41,0.1);">
          <tr>
            <td style="background-color: #26352f; padding: 28px 36px; text-align: center;">
              <h1 style="margin: 0; color: #fffefa; font-family: Georgia, 'Times New Roman', serif; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">Women of Virtue</h1>
              <p style="margin: 6px 0 0; color: #d4967d; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">${escapeHtml(typeLabel)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 36px 24px;">
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #303636;">
                You received a new message from the <strong>Women of Virtue</strong> website on <em>${escapeHtml(formattedDate)}</em>.
              </p>
              <table role="presentation" width="100%" style="background-color: #faf8f5; border: 1px solid #e8e4da; border-radius: 6px; padding: 16px 20px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #777c75; width: 90px; vertical-align: top;"><strong>From:</strong></td>
                  <td style="padding: 6px 0; font-size: 14px; color: #252b29; font-weight: 600;">${escapeHtml(senderName)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #777c75; vertical-align: top;"><strong>Email:</strong></td>
                  <td style="padding: 6px 0; font-size: 14px; color: #252b29;"><a href="mailto:${escapeHtml(senderEmail)}" style="color: #c9755b; text-decoration: none; font-weight: 600;">${escapeHtml(senderEmail)}</a></td>
                </tr>
                ${phone ? `
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #777c75; vertical-align: top;"><strong>Phone:</strong></td>
                  <td style="padding: 6px 0; font-size: 14px; color: #252b29;">${escapeHtml(phone)}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #777c75; vertical-align: top;"><strong>Type:</strong></td>
                  <td style="padding: 6px 0; font-size: 14px; color: #252b29;">${escapeHtml(typeLabel)}</td>
                </tr>
              </table>
              <h3 style="margin: 0 0 10px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #777c75;">Message:</h3>
              <div style="background-color: #f0ede4; border-left: 4px solid #c9755b; border-radius: 4px; padding: 18px 20px; font-size: 15px; line-height: 1.6; color: #252b29; white-space: pre-wrap;">${escapeHtml(message)}</div>
              <div style="margin-top: 30px; text-align: center;">
                <a href="mailto:${escapeHtml(senderEmail)}?subject=Re:%20Women%20of%20Virtue%20Inquiry" style="display: inline-block; background-color: #c9755b; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 300px; box-shadow: 0 2px 6px rgba(201,117,91,0.3);">Reply to ${escapeHtml(senderName)}</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f7f5f0; padding: 18px 36px; border-top: 1px solid rgba(37,43,41,0.08); text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #777c75; line-height: 1.5;">
                Sent via Women of Virtue CMS engine and Resend.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

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
    linkOverrides: {},
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
      linkOverrides: parsed.linkOverrides && typeof parsed.linkOverrides === 'object' ? parsed.linkOverrides : {},
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
        linkOverrides: {},
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

      if (body.linkOverrides && typeof body.linkOverrides === 'object') {
        for (const [k, v] of Object.entries(body.linkOverrides)) {
          if (typeof k === 'string' && k.length <= 240) {
            updated.linkOverrides[k] = String(v || '').trim().slice(0, 2048);
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

      const emailSettings = readEmailSettings();
      const effectiveRecipient = emailSettings.targetEmail || TARGET_EMAIL;

      const submission = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
        recipient: effectiveRecipient,
        senderName: `${fname} ${lname}`.trim() || 'Website Visitor',
        senderEmail: email,
        phone,
        formType,
        message: message || '(No message content provided)',
        ip: remoteIp,
        status: 'saved_locally'
      };

      const messages = readMessagesStore();
      messages.unshift(submission);
      if (messages.length > 500) messages.pop();
      saveMessagesStore(messages);

      let resendDispatched = false;
      let resendId = null;
      let resendError = null;

      if (emailSettings.resendApiKey) {
        try {
          const subject = `[Women of Virtue] New ${formType === 'project' ? 'Project' : 'Contact'} Inquiry from ${submission.senderName}`;
          const html = buildEmailHtml(submission);
          const text = `New inquiry from ${submission.senderName} (${submission.senderEmail}):\nPhone: ${phone || 'N/A'}\nType: ${formType}\n\nMessage:\n${submission.message}\n\nSent: ${submission.createdAt}`;

          const resendResult = await sendResendEmail({
            apiKey: emailSettings.resendApiKey,
            to: effectiveRecipient,
            from: emailSettings.resendFromEmail,
            replyTo: `${submission.senderName} <${submission.senderEmail}>`,
            subject,
            text,
            html
          });

          resendDispatched = true;
          resendId = resendResult?.id;
          submission.status = 'delivered_via_resend';
          submission.resendId = resendId;
          saveMessagesStore(messages);
          console.log(`[RESEND SUCCESS] Dispatched to ${effectiveRecipient} (Resend ID: ${resendId})`);
        } catch (err) {
          resendError = err.message;
          submission.status = 'resend_error';
          submission.error = resendError;
          saveMessagesStore(messages);
          console.error(`[RESEND ERROR] Failed to send email via Resend:`, err.message);
        }
      } else {
        console.log(`[RESEND SKIPPED] No RESEND_API_KEY configured. Inquiry saved locally.`);
      }

      console.log(`\n======================================================`);
      console.log(`[EMAIL DISPATCH] Sent to: ${effectiveRecipient}`);
      console.log(`[EMAIL DISPATCH] From: "${submission.senderName}" <${email}>`);
      console.log(`[EMAIL DISPATCH] Type: ${formType} | Phone: ${phone || 'N/A'}`);
      console.log(`[EMAIL DISPATCH] Resend Status: ${resendDispatched ? `Sent (${resendId})` : (resendError ? `Error (${resendError})` : 'Saved locally (API Key not set)')}`);
      console.log(`======================================================\n`);

      return sendJson(res, {
        ok: true,
        recipient: effectiveRecipient,
        resendSent: resendDispatched,
        resendId,
        message: `Thank you, ${fname || 'friend'}! Your message has been received and sent to our team at ${effectiveRecipient}.`
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

    // 13. GET /api/admin/email-settings - View Resend configuration
    if (pathname === '/api/admin/email-settings' && method === 'GET') {
      const session = requireSession(req, res);
      if (!session) return;
      const settings = readEmailSettings();
      const maskedKey = settings.resendApiKey ? `${settings.resendApiKey.slice(0, 5)}••••••••${settings.resendApiKey.slice(-4)}` : '';
      return sendJson(res, {
        configured: Boolean(settings.resendApiKey),
        hasKey: Boolean(settings.resendApiKey),
        resendApiKeyMasked: maskedKey,
        targetEmail: settings.targetEmail,
        resendFromEmail: settings.resendFromEmail
      });
    }

    // 14. POST /api/admin/email-settings - Update Resend configuration
    if (pathname === '/api/admin/email-settings' && method === 'POST') {
      const session = requireSession(req, res);
      if (!session) return;
      if (!requireCsrf(req, res, session)) return;
      const body = await readJsonBody(req);
      const saved = saveEmailSettings(body);
      const maskedKey = saved.resendApiKey ? `${saved.resendApiKey.slice(0, 5)}••••••••${saved.resendApiKey.slice(-4)}` : '';
      return sendJson(res, {
        ok: true,
        message: 'Email settings saved successfully.',
        configured: Boolean(saved.resendApiKey),
        resendApiKeyMasked: maskedKey,
        targetEmail: saved.targetEmail,
        resendFromEmail: saved.resendFromEmail
      });
    }

    // 15. POST /api/admin/email-test - Dispatch a real test email via Resend
    if (pathname === '/api/admin/email-test' && method === 'POST') {
      const session = requireSession(req, res);
      if (!session) return;
      if (!requireCsrf(req, res, session)) return;
      const settings = readEmailSettings();
      if (!settings.resendApiKey) {
        return sendJson(res, { error: 'Please enter and save your Resend API key before sending a test email.' }, 400);
      }
      try {
        const testResult = await sendResendEmail({
          apiKey: settings.resendApiKey,
          to: settings.targetEmail,
          from: settings.resendFromEmail,
          subject: '[Women of Virtue] Resend Test Email',
          text: `Success! Your Resend email integration is working properly.\nRecipient: ${settings.targetEmail}\nSender: ${settings.resendFromEmail}\nSent at: ${new Date().toISOString()}`,
          html: `
            <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e3dc; border-radius: 8px; padding: 32px 36px; color: #252b29;">
              <h2 style="color: #26352f; margin-top: 0; font-size: 22px;">Women of Virtue · Resend Test</h2>
              <p style="font-family: sans-serif; font-size: 14px; line-height: 1.6; color: #303636;">
                Congratulations! Your Resend integration is connected and functioning properly.
              </p>
              <div style="background: #f0ede4; border-left: 4px solid #c9755b; padding: 12px 16px; font-family: monospace; font-size: 13px; margin: 16px 0;">
                Delivered to: <strong>${escapeHtml(settings.targetEmail)}</strong><br>
                From: <strong>${escapeHtml(settings.resendFromEmail)}</strong>
              </div>
              <p style="font-family: sans-serif; font-size: 13px; color: #777c75; margin-bottom: 0;">
                All website visitor inquiries submitted via the Contact and Start a Project forms will now arrive directly in this inbox.
              </p>
            </div>
          `
        });
        return sendJson(res, {
          ok: true,
          id: testResult?.id,
          recipient: settings.targetEmail,
          message: `Test email successfully sent to ${settings.targetEmail}!`
        });
      } catch (err) {
        return sendJson(res, { error: `Resend dispatch failed: ${err.message}` }, 400);
      }
    }

    // 16. 404 for unknown /api/ routes
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
