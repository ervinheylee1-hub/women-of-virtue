# Women of Virtue · Visual CMS & Elementor-Style Page Builder

A modern, block-based visual front-end editor and authenticated CMS for **Women of Virtue**.

---

## Quick Start

### 1-Click Launcher (Windows)
Double-click:
```cmd
start-server.bat
```
This automatically launches `node server.js` and opens the Visual Admin Editor in Google Chrome.

### Manual Command Line
Open a terminal in `women-of-virtue-main` and run:
```bash
node server.js
```
or
```bash
npm start
```

Once running:
- **Public Website**: Visit `http://127.0.0.1:5173/`
- **Visual Admin Editor**: Visit `http://127.0.0.1:5173/admin`

---

## Security & Authentication Architecture

The admin panel is protected with enterprise-grade cryptographic authentication:

- **Username & Password Authentication**: On first visit, you are prompted to create an administrator **Username** (3–32 characters) and a strong **Password** (min 12 characters).
- **Salted Cryptographic Hashing**: Passwords are encrypted using PBKDF2-SHA256 with a unique 32-byte cryptographically secure random salt and 210,000 iterations.
- **Timing-Attack Resistance**: Authentication verifies credentials using constant-time comparison buffer loops (`crypto.timingSafeEqual`).
- **Brute-Force Rate Limiting**: The server tracks failed sign-in attempts per IP and temporarily locks out requests after 5 consecutive failures.
- **Session Security**: Authenticated sessions use cryptographically generated 256-bit random tokens, stored server-side with rolling 30-minute expiration, and sent via `HttpOnly`, `SameSite=Strict`, `Path=/` cookies.
- **CSRF Defense**: All state-changing mutations (`PUT`, `POST`, `DELETE`) require a synchronized `X-CSRF-Token` header.
- **Public Lockdown**: On public static hosting (e.g. GitHub Pages), unauthenticated public access to the admin dashboard is strictly denied. The admin interface is available only through your private backend server.

---

## Elementor-Style Visual Front-End Editor

The admin panel provides a live, interactive block builder inspired by Elementor:

### 1. Interactive Live Canvas
- **Visual Outlines**: Hovering over any block on the page highlights its boundaries.
- **Block Action Bar**: Each block features an action bar with:
  - **Block Tag Badge**: Identifies widget type (e.g., `HERO`, `HEADING`, `QUOTE`, `GALLERY`).
  - **Move Up (▲) / Move Down (▼)**: Smoothly reorders blocks on the page.
  - **Duplicate (⎘)**: Clones the block with all its contents and styling.
  - **Delete (✕)**: Removes the block from the page layout.
- **Between-Block `+` Inserters**: Hovering between any two sections reveals a `+` inserter bar to insert widgets directly into that spot.
- **Direct Selection**: Clicking any block highlights it and immediately opens its settings in the Inspector.

### 2. Comprehensive Widget Library
- **Basic Widgets**:
  - `Heading`: Multi-level headings (`H1`–`H6`) with font, size, and alignment options.
  - `Text Editor`: Rich text paragraphs for storytelling, reflections, and teachings.
  - `Button`: Call-to-action buttons with `Primary (Filled)`, `Outline`, and `Pill` styles.
  - `Image`: Single photos with HTTPS URL, alt text, and captions.
  - `Scripture Quote`: Scripture quotes with decorative quotation marks and scripture citations.
  - `Spacer & Line`: Adjustable vertical spacing with optional decorative divider line.
- **Layout & Structure**:
  - `2 Columns (50/50)`: Equal side-by-side layout.
  - `3 Columns (33/33/33)`: Three-column layout.
  - `2 Columns (67/33)`: Asymmetrical wide/narrow column layout.
- **Specialty & Creative**:
  - `Hero Section`: Full-width banner with eyebrow, headlines, description, CTA button, and background image overlay.
  - `Image Gallery`: Multi-column responsive photo grid (2, 3, or 4 columns).
  - `Accordion FAQ`: Collapsible details/summary items for Q&As.
  - `Contact Form`: Form layout for inquiries, bible study sign-ups, and prayer requests.
  - `Marquee Ticker`: Smooth scrolling marquee banner.

### 3. Elementor 3-Tab Inspector
- **Content Tab**: Edit widget-specific text, URLs, headings, accordion items, and buttons.
- **Style Tab**:
  - **Typography**: Select font families (`Bitter`, `DM Sans`, `Shrikhand`), font size slider (12px–96px), and font weights (Regular, Medium, Semi-Bold, Bold).
  - **Alignment**: Quick alignment buttons (Left, Center, Right, Justify).
  - **Colors**: Real-time color pickers and hex inputs for Text, Background, and Accent colors.
  - **Spacing & Borders**: Box-model padding, margins, and border radius.
- **Advanced Tab**:
  - Custom CSS classes and block ID.
  - One-click Duplicate and Delete buttons.

### 4. Top Utility Bar & Tools
- **Device Switcher**: Test your site across **Desktop** (100%), **Tablet** (768px), and **Mobile** (375px) viewports with realistic device bezels.
- **Page Selector**: Switch seamlessly between `Home`, `About`, `Contact`, `Devotionals`, and individual lessons.
- **History (Undo/Redo)**: Full snapshot history stack with `Ctrl+Z` (Undo) and `Ctrl+Y` (Redo).
- **Structure Navigator**: Slide-out hierarchical tree of all blocks on the current page for quick selection and reordering.
- **Clean Preview Mode**: Toggle the Eye icon to hide all editor handles and preview the live page as end-users see it.
- **Save & Publish**: Instant save with `Ctrl+S` or the "Save Changes" button, with a live status indicator.

---

## Data Persistence & Publishing

- When running the backend server, edits persist automatically to `cms-data/content.json` and sync with root `content.json`.
- The admin credentials hash is kept securely in `cms-data/admin.json` (ignored by Git).
- Use **Download content.json** / **Import content.json** under Site Settings for manual backup or cross-environment migration.