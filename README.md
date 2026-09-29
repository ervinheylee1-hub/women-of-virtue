# Women of Virtue Local CMS

## Start the site

Open PowerShell in this folder and run:

```powershell
.\server.ps1 -Port 5173
```

Then visit `http://127.0.0.1:5173/`. The admin panel is at `http://127.0.0.1:5173/admin`.

If PowerShell blocks the local script, inspect `server.ps1` and use the normal user-scoped policy for local scripts:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Restart PowerShell and start the server. The application does not change or bypass the machine's execution policy. Managed policy may require an administrator.

## Admin access

On first visit, create an administrator password of at least 12 characters. Passwords are stored as salted PBKDF2-SHA256 hashes. The server binds only to `127.0.0.1`, uses HttpOnly/SameSite session cookies and CSRF tokens, and rate-limits failed sign-ins.

Select page text in the preview to edit it. The formatting toolbar supports serif, sans-serif, and script fonts; font size and color; bold, italic, underline; heading levels; and text alignment. Theme controls update the header pink, devotional-heading pink, and body text color. Added devotionals appear in the course list and have their own lesson page.

With the local PowerShell server running, content persists in `cms-data/content.json`; the password hash is kept separately in `cms-data/admin.json`. Both files are ignored by Git. The CMS APIs are available only through this localhost server.

## GitHub Pages mode

Deploy the files in this folder, including `content.json`, to GitHub Pages. Open `admin.html` on the deployed site to use browser mode. Edits persist in that browser's `localStorage`; use **Download content.json** and commit the downloaded file to publish changes for all visitors. Use **Import content.json** to load a committed copy into the current browser.

GitHub Pages is static hosting: browser-mode editing has no server-side authentication, and localStorage is per browser/device. Do not store secrets or rely on it for private admin access. Use the localhost PowerShell mode when authenticated server-side editing is required.

Opening `index.html` directly keeps the built-in site content. Browsers generally restrict local-file fetches, so use GitHub Pages or the local server for JSON persistence and the preview-based editor.git --version