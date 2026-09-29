# Women of Virtue Local CMS

## Start the site

Open PowerShell in this folder and run:

```powershell
.\server.ps1 -Port 5173
```

Then visit `http://127.0.0.1:5173/`. The admin panel is at `http://127.0.0.1:5173/admin`.

In VS Code, open **Run and Debug** and start **Women of Virtue (local)** to start the local server and open the site in Microsoft Edge. The site is served from the repository root, matching the relative paths used on GitHub Pages.

If PowerShell blocks the local script, inspect `server.ps1` and use the normal user-scoped policy for local scripts:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Restart PowerShell and start the server. The application does not change or bypass the machine's execution policy. Managed policy may require an administrator.

## Admin access

On first visit, create an administrator password of at least 12 characters. Passwords are stored as salted PBKDF2-SHA256 hashes. The server binds only to `127.0.0.1`, uses HttpOnly/SameSite session cookies and CSRF tokens, and rate-limits failed sign-ins.

Select page text in the preview to edit it. Drag outlined blocks to reorder same-level homepage sections, gallery photos, header/navigation items, page columns, course sections, lesson rows, and lesson-page regions. Order is saved in the local CMS or browser storage and included in downloaded `content.json` files. The formatting toolbar supports serif, sans-serif, and script fonts; font size and color; bold, italic, underline; paragraph and heading styles; blockquotes; and text alignment. Theme controls update the header pink, devotional-heading pink, and body text color. Homepage hero headlines, supporting copy, and button text have direct dashboard fields. Site image fields accept public HTTPS URLs for the hero, course banner, galleries, page photography, and built-in lesson images; these overrides are included in downloaded `content.json` files.

New devotionals support a publication date, title and introduction subheading, multiple named rich-text sections, resources, and HTTPS image URLs with alt text. Section text keeps paragraphs, emphasis, headings, lists, and blockquotes and uses the site lesson typography. You can also edit page subheadings and button labels by selecting them in the preview.

With the local PowerShell server running, content persists in `cms-data/content.json`; the password hash is kept separately in `cms-data/admin.json`. Both files are ignored by Git. The CMS APIs are available only through this localhost server.

## GitHub Pages mode

The `main` branch is deployed to GitHub Pages by the GitHub Actions workflow. In the repository's **Settings > Pages**, set **Build and deployment > Source** to **GitHub Actions**. The site files, including `content.json`, use relative paths and work from both the local server root and the repository's `/women-of-virtue/` Pages path.

Open `https://ervinheylee1-hub.github.io/women-of-virtue/admin/` (or `/admin`) to use browser mode. Edits persist in that browser's `localStorage`; use **Download content.json** and import/replace the repository's `content.json` with that download to publish changes for all visitors. Use **Import content.json** to load a committed copy into the current browser.

To publish from VS Code, open **Source Control**, review the changed files, stage the files to publish (including `content.json` for content edits), enter a commit message, select **Commit**, then select **Sync Changes** or **Push**. Each push to `main` starts a fresh Pages deployment; check the **Actions** tab for its status. From a terminal, the equivalent is `git add .`, `git commit -m "Describe the change"`, and `git push origin main`.

GitHub Pages is static hosting: browser-mode editing has no server-side authentication, and localStorage is per browser/device. Do not store secrets or rely on it for private admin access. Use the localhost PowerShell mode when authenticated server-side editing is required.

Opening `index.html` directly keeps the built-in site content. Browsers generally restrict local-file fetches, so use GitHub Pages or the local server for JSON persistence and the preview-based editor.git --version