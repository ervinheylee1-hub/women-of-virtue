// Women of Virtue - Elementor-Style Visual Front-End Editor & Secure Admin Engine
(function () {
  'use strict';

  // DOM Elements - Shell & Panels
  const setupPanel = document.querySelector("#setup-panel");
  const loginPanel = document.querySelector("#login-panel");
  const restrictedPanel = document.querySelector("#restricted-panel");
  const dashboard = document.querySelector("#dashboard");
  const headerPageControl = document.querySelector("#header-page-control");
  const headerCanvasControls = document.querySelector("#header-canvas-controls");
  const pageSelector = document.querySelector("#page-selector");
  const preview = document.querySelector("#site-preview");
  const deviceWrapper = document.querySelector("#device-wrapper");
  const saveStatus = document.querySelector("#save-status");
  const saveBtn = document.querySelector("#btn-save-publish");
  const logoutBtn = document.querySelector("#logout-button");
  const undoBtn = document.querySelector("#btn-undo");
  const redoBtn = document.querySelector("#btn-redo");
  const previewModeBtn = document.querySelector("#btn-preview-mode");
  const navigatorBtn = document.querySelector("#btn-toggle-navigator");
  const navigatorPanel = document.querySelector("#navigator-panel");
  const navigatorTree = document.querySelector("#navigator-tree");

  // Sidebar Views & Tabs
  const viewWidgets = document.querySelector("#view-widgets");
  const viewInspector = document.querySelector("#view-inspector");
  const viewSettings = document.querySelector("#view-settings");
  const viewDevotionals = document.querySelector("#view-devotionals");
  const tabBtnWidgets = document.querySelector("#tab-btn-widgets");
  const tabBtnSettings = document.querySelector("#tab-btn-settings");
  const tabBtnDevotionals = document.querySelector("#tab-btn-devotionals");
  const backToWidgetsBtn = document.querySelector("#btn-back-to-widgets");
  const dynamicContentFields = document.querySelector("#dynamic-content-fields");
  const inspectorElementType = document.querySelector("#inspector-element-type");
  const inspectorBlockTitle = document.querySelector("#inspector-block-title");

  // State
  let csrfToken = "";
  let authenticatedUser = "";
  let currentRoute = "home";
  let content = {
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

  let selectedBlockId = null;
  let selectedCmsKey = null;
  let selectedElement = null;
  let insertionIndex = null;
  let activeDraggedWidget = null;
  let isPaddingLinked = true;
  let isMarginLinked = true;
  let lastActiveColorTarget = "textColor"; // 'textColor' | 'backgroundColor' | 'accentColor'
  let isDirty = false;
  let historyStack = [];
  let historyIndex = -1;
  const MAX_HISTORY = 30;

  // Preset Brand Images
  const PRESET_IMAGES = [
    { name: "Brunch & Fellowship", url: "https://images.squarespace-cdn.com/content/v1/6abaae7844626360a63d6f9d/1790632930773-RF3V2JYFYIYKVQQI0EEO/unsplash-image-fKRGi5AnR3Y.jpg?format=1500w" },
    { name: "Prayer Life", url: "https://images.squarespace-cdn.com/content/v1/6abaae7844626360a63d6f9d/1790633053455-M9PKGDBGT7X31AK2HVEM/unsplash-image-w15nu-WJLNs.jpg?format=1500w" },
    { name: "Bible Study", url: "https://images.squarespace-cdn.com/content/v1/6abaae7844626360a63d6f9d/1790633299594-ZJP2LO473KCB4KZ92TRN/unsplash-image-yuqCAKrbjyE.jpg?format=1500w" },
    { name: "Letter Board", url: "https://images.squarespace-cdn.com/content/v1/6abaae7844626360a63d6f9d/1790633201979-AX91BC0BXNUUGWC7AXC8/unsplash-image-8huCshiNhro.jpg?format=1500w" },
    { name: "Veiled Woman (About)", url: "https://images.squarespace-cdn.com/content/v1/6abaae7844626360a63d6f9d/8a3db183-40c8-4b12-8aa2-19b3ad9a1ba6/unsplash-image-OjbUJBT65tk.jpg?format=1500w" },
    { name: "Hero Landscape", url: "https://images.squarespace-cdn.com/content/v1/6abaae7844626360a63d6f9d/1790629802685-Z59JDUC9LV7BDA5CMUSW/unsplash-image-WpFZu1CGBNc.jpg?format=1500w" },
    { name: "Course Banner", url: "https://images.squarespace-cdn.com/content/v1/6abaae7844626360a63d6f9d/1790620338988-PR9FRMO87HJ2YZFTA46A/unsplash-image-XqXJJhK-c08.jpg?format=1500w" },
    { name: "Contact Portrait", url: "https://images.squarespace-cdn.com/content/v1/6abaae7844626360a63d6f9d/1790619981837-7AS9A066HHXXG5JZJWRV/unsplash-image-lUjOwG-o2XM.jpg?format=1500w" }
  ];

  // Widget Factory
  const WIDGET_DEFAULTS = {
    heading: {
      type: "heading",
      content: { text: "New Heading", tag: "h2" },
      style: { textAlign: "left", fontSize: "32px", fontFamily: "'Bitter', Georgia, serif" }
    },
    text: {
      type: "text",
      content: { html: "<p>Write your text here. You can add paragraphs, biblical thoughts, or reflections.</p>" },
      style: { textAlign: "left", fontSize: "16px", color: "#303636" }
    },
    button: {
      type: "button",
      content: { text: "Learn More", link: "#/about", variant: "primary" },
      style: { textAlign: "center" }
    },
    image: {
      type: "image",
      content: {
        url: PRESET_IMAGES[2].url,
        alt: "Women of Virtue",
        caption: ""
      },
      style: { textAlign: "center", borderRadius: "4px" }
    },
    quote: {
      type: "quote",
      content: {
        quote: "Charm is deceitful, and beauty is vain, but a woman who fears the Lord is to be praised.",
        reference: "Proverbs 31:30"
      },
      style: { backgroundColor: "#f4f1ea", accentColor: "#c9755b", textAlign: "left" }
    },
    spacer: {
      type: "spacer",
      content: { showLine: true },
      style: { height: "40px" }
    },
    columns: {
      type: "columns",
      content: {
        layout: "50-50",
        columns: [
          [
            {
              id: "sub_1",
              type: "heading",
              content: { text: "Left Column", tag: "h3" },
              style: { textAlign: "left", fontSize: "24px" }
            }
          ],
          [
            {
              id: "sub_2",
              type: "text",
              content: { html: "<p>Right column content goes here.</p>" },
              style: { textAlign: "left" }
            }
          ]
        ]
      },
      style: { paddingTop: "20px", paddingBottom: "20px" }
    },
    hero: {
      type: "hero",
      content: {
        eyebrow: "Welcome to Women of Virtue",
        title1: "Reject Culture",
        title2: "Follow Christ",
        description: "Join the movement to bring back traditional Femininity.",
        buttonText: "Learn More",
        buttonLink: "#/about",
        backgroundImage: PRESET_IMAGES[5].url
      },
      style: { textAlign: "left", paddingTop: "80px", paddingBottom: "95px" }
    },
    gallery: {
      type: "gallery",
      content: {
        title: "Photo Gallery",
        columns: 4,
        images: [
          { url: PRESET_IMAGES[0].url, alt: "Fellowship" },
          { url: PRESET_IMAGES[1].url, alt: "Prayer" },
          { url: PRESET_IMAGES[2].url, alt: "Scripture" },
          { url: PRESET_IMAGES[3].url, alt: "Faith" }
        ]
      },
      style: { paddingTop: "40px", paddingBottom: "40px" }
    },
    accordion: {
      type: "accordion",
      content: {
        items: [
          { title: "What is Women of Virtue?", content: "A community growing in Christ and rediscovering biblical femininity." },
          { title: "How do I get involved?", content: "You can start by joining our weekly devotionals and community prayer calls." }
        ]
      },
      style: { paddingTop: "20px", paddingBottom: "20px" }
    },
    form: {
      type: "form",
      content: {
        title: "Connect With Us",
        subtitle: "Have questions or want to start a local study? Reach out below!",
        submitText: "Send Message"
      },
      style: { backgroundColor: "#26352f", textColor: "#ffffff", paddingTop: "60px", paddingBottom: "70px" }
    },
    marquee: {
      type: "marquee",
      content: { text: "Follow the Journey ⦁ Follow the Journey" },
      style: { paddingTop: "20px", paddingBottom: "20px" }
    },
    video: {
      type: "video",
      content: {
        url: "https://www.youtube.com/watch?v=y6120QOlsfU",
        title: "Devotional Message & Video",
        caption: "Watch this week's message on scripture, faith, and virtue."
      },
      style: { paddingTop: "20px", paddingBottom: "20px", textAlign: "center" }
    },
    callout: {
      type: "callout",
      content: {
        icon: "📖",
        title: "Weekly Reflection Focus",
        text: "Charm is deceitful, and beauty is vain, but a woman who fears the Lord is to be praised. Take time today to meditate on Proverbs 31.",
        variant: "highlight"
      },
      style: { paddingTop: "15px", paddingBottom: "15px" }
    },
    cta: {
      type: "cta",
      content: {
        title: "Grow in Faith & Virtue With Us",
        subtitle: "Join our fellowship of women seeking Christ in every season of life.",
        buttonText: "Explore Devotionals",
        buttonLink: "#/devotionals",
        variant: "brand"
      },
      style: { paddingTop: "60px", paddingBottom: "60px" }
    },
    social: {
      type: "social",
      content: {
        title: "Follow & Connect With Us",
        instagram: "https://instagram.com",
        youtube: "https://youtube.com",
        spotify: "https://spotify.com",
        email: "heylee@absolutionuecna.org"
      },
      style: { paddingTop: "30px", paddingBottom: "30px" }
    }
  };

  function createBlock(type, layout) {
    const template = WIDGET_DEFAULTS[type] || WIDGET_DEFAULTS.heading;
    const block = JSON.parse(JSON.stringify(template));
    block.id = `block_${type}_${Math.random().toString(36).slice(2, 9)}`;
    if (type === "columns" && layout) {
      block.content.layout = layout;
      const count = layout.split("-").length;
      block.content.columns = Array.from({ length: count }, (_, i) => [
        {
          id: `sub_${i + 1}_${Math.random().toString(36).slice(2, 6)}`,
          type: "text",
          content: { html: `<p>Column ${i + 1} content</p>` },
          style: { textAlign: "left" }
        }
      ]);
    }
    return block;
  }

  // API Client with CSRF handling
  async function api(path, options = {}) {
    const headers = {
      ...(options.headers || {})
    };
    if (csrfToken && options.method && options.method !== "GET") {
      headers["X-CSRF-Token"] = csrfToken;
    }
    if (options.body && typeof options.body === "object") {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(options.body);
    }
    options.headers = headers;

    const response = await fetch(path, options);
    let result = {};
    try {
      result = await response.json();
    } catch {}

    if (result.csrf) {
      csrfToken = result.csrf;
    }

    if (!response.ok) {
      throw new Error(result.error || `Request failed (${response.status})`);
    }
    return result;
  }

  // Image Dropper & Upload Helper
  async function uploadImageFile(file) {
    if (!file) throw new Error("No file selected.");
    if (!file.type.startsWith("image/")) throw new Error("Please select an image file (PNG, JPG, WEBP, GIF, SVG).");

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read image file."));
      reader.readAsDataURL(file);
    });

    try {
      const res = await api("./api/admin/upload", {
        method: "POST",
        body: { dataUrl, filename: file.name }
      });
      if (res && res.url) {
        return res.url;
      }
    } catch (err) {
      console.warn("Server upload failed, falling back to DataURL:", err.message);
    }
    return dataUrl;
  }

  // History & Undo/Redo
  function pushHistory() {
    if (historyIndex < historyStack.length - 1) {
      historyStack = historyStack.slice(0, historyIndex + 1);
    }
    historyStack.push(JSON.stringify({
      blocks: content.blocks,
      copyOverrides: content.copyOverrides,
      richTextOverrides: content.richTextOverrides,
      linkOverrides: content.linkOverrides,
      textStyles: content.textStyles,
      positionOverrides: content.positionOverrides
    }));
    if (historyStack.length > MAX_HISTORY) historyStack.shift();
    historyIndex = historyStack.length - 1;
    updateUndoRedoButtons();
    setDirty(true);
    syncDraftStorage();
  }

  function updateUndoRedoButtons() {
    undoBtn.disabled = historyIndex <= 0;
    redoBtn.disabled = historyIndex >= historyStack.length - 1;
  }

  function undo() {
    if (historyIndex > 0) {
      historyIndex--;
      const snapshot = JSON.parse(historyStack[historyIndex]);
      content.blocks = snapshot.blocks || {};
      content.copyOverrides = snapshot.copyOverrides || {};
      content.richTextOverrides = snapshot.richTextOverrides || {};
      content.linkOverrides = snapshot.linkOverrides || {};
      content.textStyles = snapshot.textStyles || {};
      content.positionOverrides = snapshot.positionOverrides || {};
      updateUndoRedoButtons();
      renderNavigator();
      updatePreviewLive();
    }
  }

  function redo() {
    if (historyIndex < historyStack.length - 1) {
      historyIndex++;
      const snapshot = JSON.parse(historyStack[historyIndex]);
      content.blocks = snapshot.blocks || {};
      content.copyOverrides = snapshot.copyOverrides || {};
      content.richTextOverrides = snapshot.richTextOverrides || {};
      content.linkOverrides = snapshot.linkOverrides || {};
      content.textStyles = snapshot.textStyles || {};
      content.positionOverrides = snapshot.positionOverrides || {};
      updateUndoRedoButtons();
      renderNavigator();
      updatePreviewLive();
    }
  }

  function setDirty(dirty) {
    isDirty = dirty;
    saveStatus.classList.toggle("is-dirty", dirty);
    saveStatus.classList.toggle("is-saved", !dirty);
    saveStatus.querySelector(".status-text").textContent = dirty ? "Unsaved Changes" : "Saved";
    saveBtn.disabled = !dirty;
  }

  function syncDraftStorage() {
    try {
      localStorage.setItem("women-of-virtue-content-v1", JSON.stringify(content));
    } catch {}
  }

  // Switch Active Sidebar Tab / View
  function showSidebarTab(tabName) {
    tabBtnWidgets.classList.toggle("is-active", tabName === "widgets");
    tabBtnSettings.classList.toggle("is-active", tabName === "site-settings");
    if (tabBtnDevotionals) tabBtnDevotionals.classList.toggle("is-active", tabName === "devotionals");

    if (tabName === "site-settings") {
      viewWidgets.hidden = true;
      viewInspector.hidden = true;
      viewSettings.hidden = false;
      if (viewDevotionals) viewDevotionals.hidden = true;
    } else if (tabName === "devotionals") {
      viewWidgets.hidden = true;
      viewInspector.hidden = true;
      viewSettings.hidden = true;
      if (viewDevotionals) {
        viewDevotionals.hidden = false;
        renderDevotionalsManager();
      }
    } else {
      viewSettings.hidden = true;
      if (viewDevotionals) viewDevotionals.hidden = true;
      if (selectedBlockId || selectedCmsKey || selectedElement) {
        viewWidgets.hidden = true;
        viewInspector.hidden = false;
      } else {
        viewWidgets.hidden = false;
        viewInspector.hidden = true;
      }
    }
  }

  function getCurrentPageBlocks() {
    if (!content.blocks) content.blocks = {};
    if (!Array.isArray(content.blocks[currentRoute])) {
      content.blocks[currentRoute] = [];
    }
    return content.blocks[currentRoute];
  }

  function findBlock(id, blocksList = getCurrentPageBlocks()) {
    if (!id) return null;
    for (const b of blocksList) {
      if (b.id === id) return b;
      if (b.type === "columns" && Array.isArray(b.content?.columns)) {
        for (const col of b.content.columns) {
          const found = findBlock(id, col);
          if (found) return found;
        }
      }
    }
    return null;
  }

  // Refresh or Live-Update Preview
  function refreshPreview() {
    if (!preview.contentWindow) return;
    const targetHash = currentRoute === "home" ? "#/" : `#/${currentRoute}`;
    const url = new URL("./index.html", window.location.href);
    url.searchParams.set("cmsPreview", "1");
    url.searchParams.set("t", Date.now());
    url.hash = targetHash;
    syncDraftStorage();
    preview.src = url.href;
  }

  function updatePreviewLive() {
    syncDraftStorage();
    if (preview.contentWindow) {
      if (typeof preview.contentWindow.setCmsContent === "function") {
        preview.contentWindow.setCmsContent(content);
        setTimeout(bindPreviewCanvas, 60);
        return;
      }
      preview.contentWindow.postMessage({ type: "WOV_UPDATE_CONTENT", content }, "*");
      setTimeout(bindPreviewCanvas, 60);
    } else {
      refreshPreview();
    }
  }

  // Drag & Drop Helper
  function getDropIndicator(doc) {
    let indicator = doc.querySelector("#wov-drop-zone-indicator");
    if (!indicator) {
      indicator = doc.createElement("div");
      indicator.id = "wov-drop-zone-indicator";
      indicator.className = "wov-drop-zone-indicator";
      indicator.innerHTML = `<span class="drop-zone-pill">+ Drop Widget Here</span>`;
    }
    return indicator;
  }

  function removeDropIndicator() {
    const doc = preview.contentDocument;
    doc?.querySelector("#wov-drop-zone-indicator")?.remove();
  }

  // Setup Sidebar Drag Sources
  let isDraggingWidgetCard = false;
  let lastWidgetCardAddedTime = 0;

  function setupSidebarDrag() {
    document.querySelectorAll(".widget-card").forEach(card => {
      card.setAttribute("draggable", "true");
      card.addEventListener("dragstart", e => {
        isDraggingWidgetCard = true;
        const type = card.dataset.widgetType;
        const layout = card.dataset.layout;
        activeDraggedWidget = { type, layout };
        card.classList.add("is-dragging");
        e.dataTransfer.effectAllowed = "copy";
        e.dataTransfer.setData("text/plain", type);
      });

      card.addEventListener("dragend", () => {
        card.classList.remove("is-dragging");
        setTimeout(() => {
          isDraggingWidgetCard = false;
          activeDraggedWidget = null;
        }, 150);
        removeDropIndicator();
      });

      // Also support single click to add block (ignore if just dragged or double-triggered)
      card.addEventListener("click", e => {
        if (isDraggingWidgetCard) return;
        const now = Date.now();
        if (now - lastWidgetCardAddedTime < 350) return;
        lastWidgetCardAddedTime = now;

        const type = card.dataset.widgetType;
        const layout = card.dataset.layout;
        const newBlock = createBlock(type, layout);
        const list = getCurrentPageBlocks();

        if (insertionIndex !== null && insertionIndex >= 0 && insertionIndex <= list.length) {
          list.splice(insertionIndex, 0, newBlock);
          insertionIndex = null;
        } else {
          list.push(newBlock);
        }

        pushHistory();
        updatePreviewLive();
        setTimeout(() => selectBlock(newBlock.id), 200);
      });
    });
  }

  // Widget search filter in sidebar
  const searchInput = document.querySelector("#widget-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", e => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll(".widget-section").forEach(sec => {
        let hasMatch = false;
        sec.querySelectorAll(".widget-card").forEach(card => {
          const text = card.textContent.toLowerCase();
          const match = text.includes(q);
          card.style.display = match ? "" : "none";
          if (match) hasMatch = true;
        });
        sec.style.display = hasMatch ? "" : "none";
      });
    });
  }

  // Bind Canvas Overlay, Drag & Drop, and Visual Click Selection
  function bindPreviewCanvas() {
    const doc = preview.contentDocument;
    if (!doc || !doc.body) return;

    doc.body.classList.toggle("is-clean-preview", document.body.classList.contains("is-preview-mode"));

    // Inject Editor Stylesheet into Iframe
    doc.querySelector("#wov-editor-injected-styles")?.remove();
    const styleEl = doc.createElement("style");
    styleEl.id = "wov-editor-injected-styles";
    styleEl.textContent = `
      /* Clean Preview Mode (Full native navigation & clean display) */
      body.is-clean-preview .wov-visual-target {
        outline: none !important;
        box-shadow: none !important;
        background: transparent !important;
        cursor: auto !important;
      }
      body.is-clean-preview #wov-transformer-box,
      body.is-clean-preview .wov-details-toggle,
      body.is-clean-preview .wov-editor-badge,
      body.is-clean-preview .wov-between-inserter,
      body.is-clean-preview .wov-element-chip {
        display: none !important;
      }

      /* Block styling */
      /* Elementor-style hovering & selection */
      .wov-block {
        position: relative !important;
        box-sizing: border-box !important;
        max-width: 100% !important;
        transition: outline 0.15s ease, box-shadow 0.15s ease !important;
      }
      .wov-block-container {
        box-sizing: border-box !important;
      }
      .wov-block-text, .wov-block-heading {
        height: auto !important;
        min-height: fit-content !important;
        overflow-wrap: break-word !important;
      }
      .wov-block h1, .wov-block h2, .wov-block h3, .wov-block h4 {
        line-height: 1.25 !important;
      }
      .wov-block:hover {
        outline: 2px dashed rgba(201, 117, 91, 0.45) !important;
        outline-offset: 2px !important;
        cursor: pointer !important;
      }
      .wov-block.wov-selected {
        outline: none !important;
        box-shadow: none !important;
      }

      /* Universal Visual Editable Element */
      .wov-visual-target {
        cursor: pointer !important;
        transition: outline 0.12s ease !important;
      }
      .wov-visual-target:hover {
        outline: 1.5px dashed rgba(201, 117, 91, 0.6) !important;
        outline-offset: 1px !important;
      }
      .wov-visual-target.wov-element-selected {
        outline: none !important;
        box-shadow: none !important;
      }
      .wov-visual-target[contenteditable="true"] {
        outline: 2px solid #c9755b !important;
        outline-offset: 2px !important;
        background: rgba(201, 117, 91, 0.06) !important;
        cursor: text !important;
      }

      /* Visual Transformer Overlay (Move & Resize) */
      .wov-transformer {
        position: absolute !important;
        pointer-events: none !important;
        border: 2px solid #c9755b !important;
        box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.9), 0 4px 14px rgba(37, 43, 41, 0.18) !important;
        border-radius: 6px !important;
        z-index: 999990 !important;
        box-sizing: border-box !important;
      }
      .wov-transformer-toolbar {
        position: absolute !important;
        top: -34px !important;
        left: 0 !important;
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        background: #26352f !important;
        color: #fff !important;
        border-radius: 16px !important;
        padding: 3px 8px !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        font-size: 11px !important;
        font-weight: 600 !important;
        box-shadow: 0 3px 10px rgba(37, 43, 41, 0.25) !important;
        pointer-events: auto !important;
        white-space: nowrap !important;
        user-select: none !important;
      }
      .wov-drag-grip {
        display: flex !important;
        align-items: center !important;
        gap: 4px !important;
        background: #c9755b !important;
        color: #fff !important;
        padding: 2px 8px !important;
        border-radius: 12px !important;
        cursor: grab !important;
        font-weight: 700 !important;
        letter-spacing: 0.03em !important;
      }
      .wov-drag-grip:active {
        cursor: grabbing !important;
        background: #b3634b !important;
      }
      .wov-drag-icon {
        font-size: 13px !important;
      }
      .wov-coords-badge {
        color: #fbeee8 !important;
        font-family: monospace !important;
        font-size: 10px !important;
        font-weight: bold !important;
      }
      .wov-size-badge {
        color: #c2c9c5 !important;
        font-family: monospace !important;
        font-size: 10px !important;
      }
      .wov-tf-btn {
        background: rgba(255,255,255,0.15) !important;
        border: 0 !important;
        color: #fff !important;
        width: 18px !important;
        height: 18px !important;
        border-radius: 50% !important;
        cursor: pointer !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 11px !important;
      }
      .wov-tf-btn:hover {
        background: #c94a4a !important;
      }
      .wov-handle {
        position: absolute !important;
        width: 10px !important;
        height: 10px !important;
        background: #fff !important;
        border: 2px solid #c9755b !important;
        border-radius: 50% !important;
        pointer-events: auto !important;
        box-shadow: 0 1px 4px rgba(37, 43, 41, 0.25) !important;
        z-index: 999995 !important;
        box-sizing: border-box !important;
      }
      .wov-handle:hover {
        background: #c9755b !important;
        border-color: #fff !important;
        transform: scale(1.25) !important;
      }
      .wov-handle-nw { top: -5px !important; left: -5px !important; cursor: nwse-resize !important; }
      .wov-handle-ne { top: -5px !important; right: -5px !important; cursor: nesw-resize !important; }
      .wov-handle-sw { bottom: -5px !important; left: -5px !important; cursor: nesw-resize !important; }
      .wov-handle-se { bottom: -5px !important; right: -5px !important; cursor: nwse-resize !important; }
      .wov-handle-e  { top: calc(50% - 5px) !important; right: -5px !important; cursor: ew-resize !important; }
      .wov-handle-s  { bottom: -5px !important; left: calc(50% - 5px) !important; cursor: ns-resize !important; }

      /* Dropdown Interactive Toggle Button */
      .wov-details-toggle {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 22px !important;
        height: 22px !important;
        border-radius: 11px !important;
        background: #fbeee8 !important;
        color: #c9755b !important;
        border: 1px solid #c9755b !important;
        font-size: 11px !important;
        font-weight: bold !important;
        cursor: pointer !important;
        margin-right: 8px !important;
        vertical-align: middle !important;
        pointer-events: auto !important;
        transition: background 0.15s ease, transform 0.15s ease !important;
      }
      .wov-details-toggle:hover {
        background: #c9755b !important;
        color: #fff !important;
        transform: scale(1.1) !important;
      }

      /* Hover Badge Tooltip */
      .wov-element-chip {
        position: absolute;
        top: -24px;
        left: 0;
        background: #26352f;
        color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 3px 9px;
        border-radius: 12px;
        pointer-events: none;
        z-index: 999999;
        white-space: nowrap;
        box-shadow: 0 2px 6px rgba(37, 43, 41, 0.2);
      }

      /* Drop Zone Indicator Bar */
      .wov-drop-zone-indicator {
        height: 4px;
        background: #c9755b;
        margin: 10px 0;
        border-radius: 4px;
        box-shadow: 0 0 10px rgba(201, 117, 91, 0.4);
        position: relative;
        pointer-events: none;
        z-index: 999999;
        animation: wov-pulse 1.2s infinite alternate;
      }
      @keyframes wov-pulse {
        from { opacity: 0.75; transform: scaleY(0.9); }
        to { opacity: 1; transform: scaleY(1.1); }
      }
      .drop-zone-pill {
        position: absolute;
        left: 50%;
        top: -12px;
        transform: translateX(-50%);
        background: #c9755b;
        color: #fff;
        font-family: sans-serif;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 14px;
        border-radius: 12px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        box-shadow: 0 2px 6px rgba(37, 43, 41, 0.15);
      }

      /* Elementor-style block action badge */
      .wov-editor-badge {
        position: absolute;
        top: 6px;
        left: 6px;
        background: #26352f;
        color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 11px;
        font-weight: 600;
        padding: 3px 8px;
        border-radius: 14px;
        display: none;
        align-items: center;
        gap: 5px;
        z-index: 99999;
        box-shadow: 0 2px 8px rgba(37, 43, 41, 0.2);
      }
      .wov-block:hover > .wov-editor-badge,
      .wov-block.wov-selected > .wov-editor-badge {
        display: inline-flex !important;
      }
      .wov-badge-btn {
        background: rgba(255,255,255,0.15);
        border: 0;
        color: #fff;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
      }
      .wov-badge-btn:hover {
        background: #c9755b;
      }

      /* Between-block inserter line */
      .wov-between-inserter {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 24px;
        margin: 4px 0;
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      .wov-between-inserter:hover {
        opacity: 1;
      }
      .wov-inserter-line {
        flex: 1;
        height: 1px;
        background: #c9755b;
        opacity: 0.5;
      }
      .wov-inserter-plus {
        background: #c9755b;
        color: #fff;
        border: 0;
        border-radius: 50%;
        width: 22px;
        height: 22px;
        cursor: pointer;
        font-size: 13px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(201, 117, 91, 0.3);
      }
    `;
    doc.head.append(styleEl);

    // ==========================================
    // 1. Cross-Iframe Drag & Drop Handlers
    // ==========================================
    doc.addEventListener("dragover", e => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";

      const indicator = getDropIndicator(doc);
      const blockEls = [...doc.querySelectorAll("[data-wov-block-id]")];

      if (blockEls.length === 0) {
        const target = doc.querySelector("#main") || doc.body;
        if (indicator.parentElement !== target) {
          target.prepend(indicator);
        }
        return;
      }

      let closestBlock = null;
      let insertBefore = false;
      const mouseY = e.clientY;

      for (const blockEl of blockEls) {
        const rect = blockEl.getBoundingClientRect();
        const midPoint = rect.top + rect.height / 2;
        if (mouseY < midPoint) {
          closestBlock = blockEl;
          insertBefore = true;
          break;
        }
        closestBlock = blockEl;
        insertBefore = false;
      }

      if (closestBlock) {
        if (insertBefore) {
          closestBlock.before(indicator);
        } else {
          closestBlock.after(indicator);
        }
      }
    });

    doc.addEventListener("dragleave", e => {
      if (!e.relatedTarget || e.relatedTarget.nodeName === "HTML") {
        removeDropIndicator();
      }
    });

    doc.addEventListener("drop", e => {
      e.preventDefault();
      e.stopPropagation();

      const indicator = doc.querySelector("#wov-drop-zone-indicator");
      const type = activeDraggedWidget?.type || e.dataTransfer?.getData("text/plain");
      const layout = activeDraggedWidget?.layout;

      if (!type || !WIDGET_DEFAULTS[type]) {
        removeDropIndicator();
        return;
      }

      const list = getCurrentPageBlocks();
      let dropIndex = list.length;

      if (indicator) {
        const nextBlockEl = indicator.nextElementSibling?.closest("[data-wov-block-id]") || (indicator.nextElementSibling?.dataset?.wovBlockId ? indicator.nextElementSibling : null);
        if (nextBlockEl) {
          const nextId = nextBlockEl.dataset.wovBlockId;
          const idx = list.findIndex(b => b.id === nextId);
          if (idx !== -1) dropIndex = idx;
        } else {
          const prevBlockEl = indicator.previousElementSibling?.closest("[data-wov-block-id]") || (indicator.previousElementSibling?.dataset?.wovBlockId ? indicator.previousElementSibling : null);
          if (prevBlockEl) {
            const prevId = prevBlockEl.dataset.wovBlockId;
            const idx = list.findIndex(b => b.id === prevId);
            if (idx !== -1) dropIndex = idx + 1;
          }
        }
        removeDropIndicator();
      }

      const newBlock = createBlock(type, layout);
      activeDraggedWidget = null;
      list.splice(dropIndex, 0, newBlock);
      pushHistory();
      updatePreviewLive();
      setTimeout(() => selectBlock(newBlock.id), 250);
    });

    // ==========================================
    // 2. Block Badges & Inserters
    // ==========================================
    const blockEls = doc.querySelectorAll("[data-wov-block-id]");
    blockEls.forEach((el, index) => {
      const id = el.dataset.wovBlockId;
      const type = el.dataset.wovBlockType || "block";

      if (id === selectedBlockId) {
        el.classList.add("wov-selected");
      }

      // Add badge
      if (!el.querySelector(".wov-editor-badge")) {
        const badge = doc.createElement("div");
        badge.className = "wov-editor-badge";
        badge.innerHTML = `
          <span>${type.toUpperCase()}</span>
          <button type="button" class="wov-badge-btn" data-action="up" title="Move Up">▲</button>
          <button type="button" class="wov-badge-btn" data-action="down" title="Move Down">▼</button>
          <button type="button" class="wov-badge-btn" data-action="dup" title="Duplicate">⎘</button>
          <button type="button" class="wov-badge-btn" data-action="del" title="Delete">✕</button>
        `;
        el.prepend(badge);

        badge.addEventListener("click", e => {
          e.stopPropagation();
          const btn = e.target.closest("button[data-action]");
          if (!btn) return;
          const action = btn.dataset.action;
          if (action === "up") moveBlock(id, -1);
          else if (action === "down") moveBlock(id, 1);
          else if (action === "dup") duplicateBlock(id);
          else if (action === "del") deleteBlock(id);
        });
      }

      // Add between-block inserter
      if (!el.nextElementSibling?.classList.contains("wov-between-inserter")) {
        const inserter = doc.createElement("div");
        inserter.className = "wov-between-inserter";
        inserter.innerHTML = `
          <div class="wov-inserter-line"></div>
          <button type="button" class="wov-inserter-plus" title="Add block here">+</button>
          <div class="wov-inserter-line"></div>
        `;
        inserter.querySelector("button").addEventListener("click", e => {
          e.stopPropagation();
          insertionIndex = index + 1;
          selectedBlockId = null;
          showSidebarTab("widgets");
          viewWidgets.querySelector("input")?.focus();
        });
        el.after(inserter);
      }
    });

    // ==========================================
    // 3. Universal Front-End Visual Element Picker & Inline Editor
    // ==========================================
    // Setup interactive dropdown buttons on all lesson sections
    doc.querySelectorAll("details.lesson-section").forEach(details => {
      const summary = details.querySelector("summary");
      if (summary && !summary.querySelector(".wov-details-toggle")) {
        const toggleBtn = doc.createElement("button");
        toggleBtn.type = "button";
        toggleBtn.className = "wov-details-toggle";
        toggleBtn.title = "Click to open/close this dropdown section";
        toggleBtn.textContent = details.open ? "▾" : "▸";
        toggleBtn.addEventListener("click", ev => {
          ev.preventDefault();
          ev.stopPropagation();
          details.open = !details.open;
          toggleBtn.textContent = details.open ? "▾" : "▸";
          setTimeout(updateTransformerPosition, 30);
        });
        summary.prepend(toggleBtn);
      }
    });

    const visualSelectors = "h1, h2, h3, h4, h5, h6, p, a, button, img, blockquote, cite, summary, .hero-copy, .project-copy, .wov-block, .cms-rich-copy, details.lesson-section, .site-header, .site-footer, .footer-partnership, .wordmark, .site-nav, .social-links, [data-cms-key]";
    const visualElements = doc.querySelectorAll(visualSelectors);

    visualElements.forEach(el => {
      // Ignore admin internal UI elements
      if (el.closest(".wov-editor-badge, .wov-between-inserter, #wov-drop-zone-indicator, #wov-transformer-box")) return;

      el.classList.add("wov-visual-target");

      // Visual Click Selection
      el.addEventListener("click", e => {
        if (doc.body.classList.contains("is-clean-preview") || document.body.classList.contains("is-preview-mode")) {
          return; // Let standard link navigation & button clicks occur in clean preview mode!
        }
        if (e.target.closest(".wov-details-toggle")) {
          return; // Handled directly by toggle button
        }
        if (e.ctrlKey || e.metaKey) {
          return; // Allow Ctrl+click to follow links or buttons natively
        }
        if (el.matches("a, button, .menu-toggle") && !el.closest(".wov-badge-btn, .wov-tf-btn, .wov-details-toggle")) {
          e.preventDefault();
        }
        if (el.tagName.toLowerCase() === "summary") {
          const det = el.closest("details");
          if (det && !det.open) {
            det.open = true;
            const btn = det.querySelector(".wov-details-toggle");
            if (btn) btn.textContent = "▾";
          }
        }
        e.stopPropagation();
        selectVisualElement(el);
      });

      // Double Click: Follow Link or Toggle Menu directly on canvas
      el.addEventListener("dblclick", e => {
        if (doc.body.classList.contains("is-clean-preview") || document.body.classList.contains("is-preview-mode")) return;
        const linkEl = el.matches("a") ? el : el.closest("a");
        if (linkEl) {
          const href = linkEl.getAttribute("href");
          if (href) {
            e.preventDefault();
            e.stopPropagation();
            if (href.startsWith("#/")) {
              preview.contentWindow.location.hash = href;
              const route = href.replace(/^#\/?/, "").replace(/\/$/, "") || "home";
              if (pageSelector) pageSelector.value = route;
              currentRoute = route;
            } else if (href.startsWith("http://") || href.startsWith("https://")) {
              window.open(href, "_blank", "noopener,noreferrer");
            }
          }
          return;
        }
        if (el.matches(".menu-toggle, .menu-toggle *")) {
          e.preventDefault();
          e.stopPropagation();
          const navEl = doc.querySelector("#site-nav");
          const toggleEl = doc.querySelector(".menu-toggle");
          if (navEl && toggleEl) {
            const isOpen = navEl.classList.toggle("is-open");
            toggleEl.setAttribute("aria-expanded", String(isOpen));
            toggleEl.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
          }
        }
      });

      // Direct file drop from OS onto canvas images and hero banners
      const isImg = el.tagName.toLowerCase() === "img";
      const isHero = el.classList.contains("wov-block-hero") || el.classList.contains("hero");

      if (isImg || isHero) {
        el.addEventListener("dragover", e => {
          if (e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files")) {
            e.preventDefault();
            e.stopPropagation();
            el.style.outline = "3px dashed #00b4d8";
            el.style.outlineOffset = "4px";
          }
        });
        el.addEventListener("dragleave", () => {
          el.style.outline = "";
          el.style.outlineOffset = "";
        });
        el.addEventListener("drop", async e => {
          if (e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files")) {
            e.preventDefault();
            e.stopPropagation();
            el.style.outline = "";
            el.style.outlineOffset = "";
            const file = e.dataTransfer.files?.[0];
            if (file && file.type.startsWith("image/")) {
              try {
                const url = await uploadImageFile(file);
                if (isImg) {
                  el.src = url;
                  const blockEl = el.closest("[data-wov-block-id]");
                  if (blockEl) {
                    const block = findBlock(blockEl.dataset.wovBlockId);
                    if (block && block.content) block.content.url = url;
                  }
                  if (el.dataset.cmsLayoutKey) {
                    content.graphics[el.dataset.cmsLayoutKey] = url;
                  }
                } else if (isHero) {
                  el.style.backgroundImage = `url('${url}')`;
                  const blockEl = el.closest("[data-wov-block-id]");
                  if (blockEl) {
                    const block = findBlock(blockEl.dataset.wovBlockId);
                    if (block && block.content) block.content.backgroundImage = url;
                  }
                }
                setDirty(true);
                syncDraftStorage();
                selectVisualElement(el);
              } catch (err) {
                alert("Upload failed: " + err.message);
              }
            }
          }
        });
      }
    });

    renderNavigator();

    // Wire scroll, resize, toggle, and nudge events for iframe
    doc.removeEventListener("scroll", updateTransformerPosition);
    doc.addEventListener("scroll", updateTransformerPosition, { passive: true });
    preview.contentWindow?.removeEventListener("resize", updateTransformerPosition);
    preview.contentWindow?.addEventListener("resize", updateTransformerPosition, { passive: true });
    doc.removeEventListener("toggle", onDocDetailsToggle, true);
    doc.addEventListener("toggle", onDocDetailsToggle, true);
    doc.removeEventListener("keydown", handleElementNudge);
    doc.addEventListener("keydown", handleElementNudge);
  }

  function onDocDetailsToggle() {
    setTimeout(updateTransformerPosition, 30);
  }

  let activeTransformer = null;

  function getElementKey(el) {
    if (!el) return "";
    if (el.dataset.wovBlockId) return el.dataset.wovBlockId;
    if (el.dataset.cmsKey) return el.dataset.cmsKey;
    if (el.dataset.cmsLayoutKey) return el.dataset.cmsLayoutKey;
    if (el.id) return el.id;
    const doc = el.ownerDocument;
    const isShared = Boolean(el.closest("header, footer, .site-header, .site-footer"));
    const path = isShared ? "shared" : ((preview.contentWindow?.location?.hash || "#/").replace(/^#\/?/, "").replace(/\/$/, "") || "home");
    const tag = el.tagName.toLowerCase();
    const className = (el.className || "").replace(/wov-[^\s]+/g, "").trim().replace(/\s+/g, "-").slice(0, 30) || "el";
    const allMatches = [...doc.querySelectorAll(`${tag}.${className.replace(/-/g, ".")}`)];
    const idx = allMatches.indexOf(el);
    const key = `pos:${path}:${tag}:${className}:${idx >= 0 ? idx : 0}`;
    el.dataset.cmsKey = key;
    return key;
  }

  function attachTransformer(el) {
    const doc = preview.contentDocument;
    if (!doc || !doc.body || !el) return;

    let transformer = doc.querySelector("#wov-transformer-box");
    if (!transformer) {
      transformer = doc.createElement("div");
      transformer.id = "wov-transformer-box";
      transformer.className = "wov-transformer";
      transformer.innerHTML = `
        <div class="wov-transformer-toolbar">
          <div class="wov-drag-grip" title="Drag to move element (Squarespace-style)">
            <span class="wov-drag-icon">⠿</span> Move
          </div>
          <span class="wov-coords-badge" style="display:none;"></span>
          <span class="wov-size-badge"></span>
          <button type="button" class="wov-tf-btn wov-tf-up" title="Move Block Up (▲)">▲</button>
          <button type="button" class="wov-tf-btn wov-tf-down" title="Move Block Down (▼)">▼</button>
          <button type="button" class="wov-tf-btn wov-tf-dup" title="Duplicate Block (⎘)">⎘</button>
          <button type="button" class="wov-tf-btn wov-tf-reset" title="Reset Position & Size (↺)">↺</button>
          <button type="button" class="wov-tf-btn wov-tf-del" title="Delete Block or Element (✕)">✕</button>
        </div>
        <div class="wov-handle wov-handle-nw" data-handle="nw" title="Resize Top-Left"></div>
        <div class="wov-handle wov-handle-ne" data-handle="ne" title="Resize Top-Right"></div>
        <div class="wov-handle wov-handle-sw" data-handle="sw" title="Resize Bottom-Left"></div>
        <div class="wov-handle wov-handle-se" data-handle="se" title="Resize Bottom-Right"></div>
        <div class="wov-handle wov-handle-e" data-handle="e" title="Resize Width"></div>
        <div class="wov-handle wov-handle-s" data-handle="s" title="Resize Height"></div>
      `;
      doc.body.appendChild(transformer);
      bindTransformerControls(transformer, doc);
    }
    activeTransformer = transformer;
    updateTransformerPosition();
  }

  function updateTransformerPosition() {
    if (!selectedElement || !selectedElement.isConnected) {
      const doc = preview.contentDocument;
      const tf = doc?.querySelector("#wov-transformer-box");
      if (tf) tf.style.display = "none";
      return;
    }
    const doc = selectedElement.ownerDocument;
    const transformer = doc.querySelector("#wov-transformer-box");
    if (!transformer) return;

    const rect = selectedElement.getBoundingClientRect();
    const scrollX = doc.defaultView?.pageXOffset || doc.documentElement.scrollLeft || doc.body.scrollLeft || 0;
    const scrollY = doc.defaultView?.pageYOffset || doc.documentElement.scrollTop || doc.body.scrollTop || 0;

    transformer.style.display = "block";
    transformer.style.left = `${rect.left + scrollX}px`;
    transformer.style.top = `${rect.top + scrollY}px`;
    transformer.style.width = `${rect.width}px`;
    transformer.style.height = `${rect.height}px`;

    const sizeBadge = transformer.querySelector(".wov-size-badge");
    if (sizeBadge) {
      sizeBadge.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)} px`;
    }

    const coordsBadge = transformer.querySelector(".wov-coords-badge");
    if (coordsBadge) {
      const curX = Math.round(parseFloat(selectedElement.style.left) || 0);
      const curY = Math.round(parseFloat(selectedElement.style.top) || 0);
      if (curX !== 0 || curY !== 0) {
        coordsBadge.textContent = `📍 ${curX > 0 ? "+" : ""}${curX}, ${curY > 0 ? "+" : ""}${curY}`;
        coordsBadge.style.display = "inline";
      } else {
        coordsBadge.style.display = "none";
      }
    }

    // Toggle block-level quick actions based on block context
    const hasBlock = Boolean(selectedBlockId || selectedElement?.closest("[data-wov-block-id]"));
    const upBtn = transformer.querySelector(".wov-tf-up");
    const downBtn = transformer.querySelector(".wov-tf-down");
    const dupBtn = transformer.querySelector(".wov-tf-dup");
    if (upBtn) upBtn.style.display = hasBlock ? "inline-flex" : "none";
    if (downBtn) downBtn.style.display = hasBlock ? "inline-flex" : "none";
    if (dupBtn) dupBtn.style.display = hasBlock ? "inline-flex" : "none";

    // Also update Inspector fields if active
    const posXInput = document.querySelector("#style-pos-x");
    const posYInput = document.querySelector("#style-pos-y");
    const customWInput = document.querySelector("#style-custom-width");
    const customHInput = document.querySelector("#style-custom-height");
    if (posXInput && document.activeElement !== posXInput) posXInput.value = Math.round(parseFloat(selectedElement.style.left) || 0) || "";
    if (posYInput && document.activeElement !== posYInput) posYInput.value = Math.round(parseFloat(selectedElement.style.top) || 0) || "";
    if (customWInput && document.activeElement !== customWInput) customWInput.value = Math.round(rect.width) || "";
    if (customHInput && document.activeElement !== customHInput) customHInput.value = Math.round(rect.height) || "";
  }

  function bindTransformerControls(transformer, doc) {
    const grip = transformer.querySelector(".wov-drag-grip");
    const resetBtn = transformer.querySelector(".wov-tf-reset");
    const handles = transformer.querySelectorAll(".wov-handle");

    // 1. Move element by dragging grip
    grip.addEventListener("mousedown", e => {
      if (!selectedElement) return;
      e.preventDefault();
      e.stopPropagation();

      const startMouseX = e.clientX;
      const startMouseY = e.clientY;
      const startLeft = parseFloat(selectedElement.style.left) || 0;
      const startTop = parseFloat(selectedElement.style.top) || 0;
      selectedElement.style.position = "relative";

      let lastX = startLeft;
      let lastY = startTop;

      const onMouseMove = ev => {
        const dx = ev.clientX - startMouseX;
        const dy = ev.clientY - startMouseY;
        lastX = Math.round(startLeft + dx);
        lastY = Math.round(startTop + dy);
        selectedElement.style.left = `${lastX}px`;
        selectedElement.style.top = `${lastY}px`;
        updateTransformerPosition();
      };

      const onMouseUp = () => {
        doc.removeEventListener("mousemove", onMouseMove);
        doc.removeEventListener("mouseup", onMouseUp);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);

        const key = getElementKey(selectedElement);
        if (!content.positionOverrides) content.positionOverrides = {};
        const existing = content.positionOverrides[key] || {};
        content.positionOverrides[key] = {
          ...existing,
          x: lastX,
          y: lastY
        };
        setDirty(true);
        syncDraftStorage();
        pushHistory();
      };

      doc.addEventListener("mousemove", onMouseMove);
      doc.addEventListener("mouseup", onMouseUp);
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    });

    // 2. Resize element by dragging handles
    handles.forEach(handle => {
      handle.addEventListener("mousedown", e => {
        if (!selectedElement) return;
        e.preventDefault();
        e.stopPropagation();

        const handleType = handle.dataset.handle;
        const startMouseX = e.clientX;
        const startMouseY = e.clientY;
        const startRect = selectedElement.getBoundingClientRect();
        const startW = startRect.width;
        const startH = startRect.height;
        const startLeft = parseFloat(selectedElement.style.left) || 0;
        const startTop = parseFloat(selectedElement.style.top) || 0;

        selectedElement.style.position = "relative";
        if (selectedElement.tagName.toLowerCase() === "img") {
          selectedElement.style.maxWidth = "none";
          selectedElement.style.objectFit = "cover";
        } else if (window.getComputedStyle(selectedElement).display === "inline") {
          selectedElement.style.display = "inline-block";
        }

        let finalW = startW;
        let finalH = startH;
        let finalLeft = startLeft;
        let finalTop = startTop;

        const onMouseMove = ev => {
          const dx = ev.clientX - startMouseX;
          const dy = ev.clientY - startMouseY;

          let newW = startW;
          let newH = startH;
          let newLeft = startLeft;
          let newTop = startTop;

          if (handleType === "se") {
            newW = Math.max(30, startW + dx);
            newH = Math.max(20, startH + dy);
          } else if (handleType === "sw") {
            newW = Math.max(30, startW - dx);
            newH = Math.max(20, startH + dy);
            newLeft = startLeft + (startW - newW);
          } else if (handleType === "ne") {
            newW = Math.max(30, startW + dx);
            newH = Math.max(20, startH - dy);
            newTop = startTop + (startH - newH);
          } else if (handleType === "nw") {
            newW = Math.max(30, startW - dx);
            newH = Math.max(20, startH - dy);
            newLeft = startLeft + (startW - newW);
            newTop = startTop + (startH - newH);
          } else if (handleType === "e") {
            newW = Math.max(30, startW + dx);
          } else if (handleType === "s") {
            newH = Math.max(20, startH + dy);
          }

          finalW = Math.round(newW);
          finalH = Math.round(newH);
          finalLeft = Math.round(newLeft);
          finalTop = Math.round(newTop);

          selectedElement.style.width = `${finalW}px`;
          if (handleType !== "e") {
            selectedElement.style.height = `${finalH}px`;
            if (selectedElement.tagName.toLowerCase() !== "img") {
              selectedElement.style.minHeight = `${finalH}px`;
            }
          }
          if (handleType === "sw" || handleType === "nw") {
            selectedElement.style.left = `${finalLeft}px`;
          }
          if (handleType === "ne" || handleType === "nw") {
            selectedElement.style.top = `${finalTop}px`;
          }
          if (selectedElement.classList.contains("lesson-photo")) {
            selectedElement.style.setProperty("--lesson-image-height", `${finalH}px`);
          }
          updateTransformerPosition();
        };

        const onMouseUp = () => {
          doc.removeEventListener("mousemove", onMouseMove);
          doc.removeEventListener("mouseup", onMouseUp);
          window.removeEventListener("mousemove", onMouseMove);
          window.removeEventListener("mouseup", onMouseUp);

          const key = getElementKey(selectedElement);
          if (!content.positionOverrides) content.positionOverrides = {};
          const existing = content.positionOverrides[key] || {};
          content.positionOverrides[key] = {
            ...existing,
            x: Math.round(parseFloat(selectedElement.style.left) || 0),
            y: Math.round(parseFloat(selectedElement.style.top) || 0),
            width: finalW,
            height: finalH
          };
          if (selectedElement.classList.contains("lesson-photo")) {
            const lessonSlug = selectedElement.closest("[data-lesson]")?.dataset.lesson;
            if (lessonSlug && Array.isArray(content.devotionals)) {
              for (const dev of content.devotionals) {
                const l = dev.lessons?.find(x => x.slug === lessonSlug);
                if (l) { l.imageHeight = finalH; break; }
              }
            }
          }
          setDirty(true);
          syncDraftStorage();
          pushHistory();
        };

        doc.addEventListener("mousemove", onMouseMove);
        doc.addEventListener("mouseup", onMouseUp);
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
      });
    });

    // 3. Reset Button
    resetBtn.addEventListener("click", e => {
      if (!selectedElement) return;
      e.preventDefault();
      e.stopPropagation();
      const key = getElementKey(selectedElement);
      if (content.positionOverrides && content.positionOverrides[key]) {
        delete content.positionOverrides[key];
      }
      selectedElement.style.position = "";
      selectedElement.style.left = "";
      selectedElement.style.top = "";
      selectedElement.style.width = "";
      selectedElement.style.height = "";
      selectedElement.style.minHeight = "";
      selectedElement.style.maxWidth = "";
      selectedElement.style.objectFit = "";
      if (selectedElement.classList.contains("lesson-photo")) {
        selectedElement.style.removeProperty("--lesson-image-height");
      }
      updateTransformerPosition();
      setDirty(true);
      syncDraftStorage();
      pushHistory();
    });

    // 4. Quick Action Buttons: Move Up, Move Down, Duplicate, Delete
    const upBtn = transformer.querySelector(".wov-tf-up");
    upBtn?.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      const bId = selectedBlockId || selectedElement?.closest("[data-wov-block-id]")?.dataset.wovBlockId;
      if (bId) moveBlock(bId, -1);
    });

    const downBtn = transformer.querySelector(".wov-tf-down");
    downBtn?.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      const bId = selectedBlockId || selectedElement?.closest("[data-wov-block-id]")?.dataset.wovBlockId;
      if (bId) moveBlock(bId, 1);
    });

    const dupBtn = transformer.querySelector(".wov-tf-dup");
    dupBtn?.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      const bId = selectedBlockId || selectedElement?.closest("[data-wov-block-id]")?.dataset.wovBlockId;
      if (bId) duplicateBlock(bId);
    });

    const delBtn = transformer.querySelector(".wov-tf-del");
    delBtn?.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      const bId = selectedBlockId || selectedElement?.closest("[data-wov-block-id]")?.dataset.wovBlockId;
      if (bId && (selectedBlockId || selectedElement?.matches("[data-wov-block-id]"))) {
        deleteBlock(bId);
      } else if (selectedElement) {
        selectedElement.style.display = "none";
        updateTransformerPosition();
        setDirty(true);
        pushHistory();
      }
    });
  }

  // Keyboard Nudge
  function handleElementNudge(e) {
    if (!selectedElement || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) return;
    e.preventDefault();
    const step = e.shiftKey ? 10 : 1;
    let dx = 0, dy = 0;
    if (e.key === "ArrowLeft") dx = -step;
    else if (e.key === "ArrowRight") dx = step;
    else if (e.key === "ArrowUp") dy = -step;
    else if (e.key === "ArrowDown") dy = step;

    selectedElement.style.position = "relative";
    const curX = (parseFloat(selectedElement.style.left) || 0) + dx;
    const curY = (parseFloat(selectedElement.style.top) || 0) + dy;
    selectedElement.style.left = `${curX}px`;
    selectedElement.style.top = `${curY}px`;
    updateTransformerPosition();

    const key = getElementKey(selectedElement);
    if (!content.positionOverrides) content.positionOverrides = {};
    const existing = content.positionOverrides[key] || {};
    content.positionOverrides[key] = { ...existing, x: curX, y: curY };
    setDirty(true);
    syncDraftStorage();
  }

  // Two-way sync from Canvas element to Devotionals Content Store
  function syncLessonTextFromElement(el, newText) {
    if (!el || !content.devotionals) return;
    const doc = preview.contentDocument;
    const hash = preview.contentWindow?.location?.hash || "";
    let lessonSlug = el.closest("[data-lesson]")?.dataset.lesson;
    if (!lessonSlug && hash.startsWith("#/devotionals/")) {
      lessonSlug = hash.replace("#/devotionals/", "").split("?")[0].replace(/\/$/, "");
    }
    if (!lessonSlug) return;

    let targetLesson = null;
    if (Array.isArray(content.devotionals)) {
      for (const dev of content.devotionals) {
        if (Array.isArray(dev.lessons)) {
          targetLesson = dev.lessons.find(l => l.slug === lessonSlug);
          if (targetLesson) break;
        } else if (dev.slug === lessonSlug) {
          targetLesson = dev;
          break;
        }
      }
    }
    if (!targetLesson && Array.isArray(content.devotionals)) {
      // If content.devotionals does not yet have units or lessons, copy from default lessons
      const defLesson = lessons.find(l => l.slug === lessonSlug);
      if (defLesson) {
        let firmUnit = content.devotionals.find(d => d.id === "firm-foundations" || d.title === "Firm Foundations");
        if (!firmUnit) {
          firmUnit = {
            id: "firm-foundations",
            title: "Firm Foundations",
            description: "Weekly Devotionals for Women of Virtue",
            lessons: JSON.parse(JSON.stringify(lessons))
          };
          content.devotionals.unshift(firmUnit);
        }
        targetLesson = firmUnit.lessons?.find(l => l.slug === lessonSlug);
      }
    }
    if (!targetLesson) return;

    const cleanText = newText.replace(/^[▾▸]\s*/, "").trim();
    const tagName = el.tagName.toLowerCase();
    const sectionDetails = el.closest("details.lesson-section");

    if (sectionDetails) {
      const isResource = sectionDetails.querySelector("summary")?.textContent?.includes("Resource") ||
                         sectionDetails.querySelector("summary")?.textContent?.includes("Prayer") ||
                         Boolean(sectionDetails.closest("section")?.querySelector(".download-link"));

      if (tagName === "summary") {
        if (isResource) {
          targetLesson.resourceTitle = cleanText;
        } else {
          const allSections = [...doc.querySelectorAll(".lesson-copy details.lesson-section")].filter(d => !d.closest("section")?.querySelector(".download-link") && !d.querySelector("summary")?.textContent?.includes("Prayer") && !d.querySelector("summary")?.textContent?.includes("Resource"));
          const secIdx = allSections.indexOf(sectionDetails);
          if (secIdx !== -1 && Array.isArray(targetLesson.sections) && targetLesson.sections[secIdx]) {
            const sec = targetLesson.sections[secIdx];
            if (Array.isArray(sec)) {
              sec[0] = cleanText;
            } else if (typeof sec === "object") {
              sec.title = cleanText;
            }
          }
        }
      } else if (tagName === "p" || el.classList.contains("cms-rich-copy")) {
        if (isResource) {
          const pEls = [...sectionDetails.querySelectorAll("p, .cms-rich-copy")];
          const pIdx = pEls.indexOf(el);
          if (Array.isArray(targetLesson.resource)) {
            if (pIdx !== -1 && pIdx < targetLesson.resource.length) {
              targetLesson.resource[pIdx] = cleanText;
            }
          } else {
            targetLesson.resource = cleanText;
          }
        } else {
          const allSections = [...doc.querySelectorAll(".lesson-copy details.lesson-section")].filter(d => !d.closest("section")?.querySelector(".download-link") && !d.querySelector("summary")?.textContent?.includes("Prayer") && !d.querySelector("summary")?.textContent?.includes("Resource"));
          const secIdx = allSections.indexOf(sectionDetails);
          if (secIdx !== -1 && Array.isArray(targetLesson.sections) && targetLesson.sections[secIdx]) {
            const sec = targetLesson.sections[secIdx];
            const pEls = [...sectionDetails.querySelectorAll("p, .cms-rich-copy")];
            const pIdx = pEls.indexOf(el);
            if (pIdx !== -1) {
              if (Array.isArray(sec)) {
                if (!Array.isArray(sec[1])) sec[1] = [];
                sec[1][pIdx] = cleanText;
              } else if (typeof sec === "object") {
                if (!Array.isArray(sec.paragraphs)) sec.paragraphs = [];
                sec.paragraphs[pIdx] = cleanText;
              }
            }
          }
        }
      }
    } else {
      if (tagName === "h1") {
        targetLesson.title = cleanText;
      } else if (tagName === "h2") {
        targetLesson.introTitle = cleanText;
      } else if (tagName === "p" && el.closest(".lesson-content")) {
        targetLesson.intro = cleanText;
      }
    }
    setDirty(true);
    syncDraftStorage();
  }

  // Universal Selection Function
  function selectVisualElement(el) {
    const doc = preview.contentDocument;
    if (!doc || !el) return;

    // If inside a details dropdown, make sure it is open so content is visible
    const parentDetails = el.closest("details");
    if (parentDetails && !parentDetails.open) {
      parentDetails.open = true;
      const btn = parentDetails.querySelector(".wov-details-toggle");
      if (btn) btn.textContent = "▾";
    }

    // Deselect previous
    doc.querySelectorAll(".wov-visual-target").forEach(item => {
      item.classList.remove("wov-element-selected");
      if (item !== el) item.removeAttribute("contenteditable");
    });
    doc.querySelectorAll(".wov-block").forEach(b => b.classList.remove("wov-selected"));

    selectedElement = el;
    el.classList.add("wov-element-selected");

    // Check if it belongs to a block
    const blockEl = el.closest("[data-wov-block-id]");
    if (blockEl) {
      selectedBlockId = blockEl.dataset.wovBlockId;
      blockEl.classList.add("wov-selected");
    } else {
      selectedBlockId = null;
    }

    selectedCmsKey = el.dataset.cmsKey || getElementKey(el);
    if (!el.dataset.cmsKey) el.dataset.cmsKey = selectedCmsKey;

    // Determine element type name & tag
    const tagName = el.tagName.toLowerCase();
    let displayType = "Element";
    if (el.classList.contains("wordmark")) displayType = "Site Logo / Brand";
    else if (el.classList.contains("menu-toggle")) displayType = "Mobile Menu Button";
    else if (el.closest(".site-header") && (tagName === "a" || el.classList.contains("site-nav"))) displayType = "Header Nav Link";
    else if (el.closest(".site-footer") && tagName === "a") displayType = "Footer Link";
    else if (tagName === "header" || el.classList.contains("site-header")) displayType = "Site Header Container";
    else if (tagName === "footer" || el.classList.contains("site-footer")) displayType = "Site Footer Container";
    else if (el.classList.contains("footer-partnership")) displayType = "Footer Partnership Info";
    else if (tagName.startsWith("h")) displayType = `Heading (${tagName.toUpperCase()})`;
    else if (tagName === "p") displayType = "Text / Paragraph";
    else if (tagName === "summary") displayType = "Dropdown Section";
    else if (tagName === "a" || tagName === "button") displayType = "Button / Link";
    else if (tagName === "img") displayType = "Image";
    else if (tagName === "blockquote" || tagName === "cite") displayType = "Quote";
    else if (blockEl) displayType = `Block: ${(blockEl.dataset.wovBlockType || 'block').toUpperCase()}`;

    // Switch to Inspector Sidebar View
    viewWidgets.hidden = true;
    viewSettings.hidden = true;
    if (viewDevotionals) viewDevotionals.hidden = true;
    viewInspector.hidden = false;
    tabBtnWidgets.classList.remove("is-active");
    tabBtnSettings.classList.remove("is-active");
    if (tabBtnDevotionals) tabBtnDevotionals.classList.remove("is-active");

    inspectorElementType.textContent = displayType;
    inspectorBlockTitle.textContent = `Edit ${displayType}`;
    document.querySelector("#adv-block-id").value = selectedBlockId || selectedCmsKey || el.id || el.className || tagName;
    document.querySelector("#adv-css-classes").value = el.className.replace(/wov-visual-target|wov-element-selected/g, "").trim();

    // Direct Inline Canvas Editing for Text Elements (exclude layout container wrappers)
    const isContainer = ["header", "footer", "nav"].includes(tagName) || el.classList.contains("site-header") || el.classList.contains("site-footer") || el.classList.contains("footer-partnership") || el.classList.contains("social-links") || el.classList.contains("site-nav");
    const isTextElement = !isContainer && (["h1", "h2", "h3", "h4", "h5", "h6", "p", "a", "button", "blockquote", "cite", "summary"].includes(tagName) || el.classList.contains("cms-rich-copy"));
    if (isTextElement) {
      el.setAttribute("contenteditable", "true");
      el.focus();

      // Two-way sync: Canvas input -> Sidebar & Content Store
      el.oninput = () => {
        const newText = el.innerText || el.textContent;
        const block = findBlock(selectedBlockId);
        if (block) {
          if (block.content.text !== undefined) block.content.text = newText;
          else if (block.content.html !== undefined) block.content.html = el.innerHTML;
          else if (block.content.quote !== undefined) block.content.quote = newText;
          else if (block.content.buttonText !== undefined) block.content.buttonText = newText;
        }
        if (selectedCmsKey) {
          content.copyOverrides[selectedCmsKey] = newText;
        }

        // Sync with lesson devotionals store if inside a lesson
        syncLessonTextFromElement(el, newText);

        // Sync with dynamic sidebar input if open
        const sidebarInput = dynamicContentFields.querySelector("input[type='text'], textarea");
        if (sidebarInput && sidebarInput.value !== newText) {
          sidebarInput.value = newText;
        }

        setDirty(true);
        syncDraftStorage();
        updateTransformerPosition();
      };

      el.onblur = () => {
        pushHistory();
      };
    }

    // Populate Inspector Fields
    populateInspectorContent(el);
    populateInspectorStyle(el);
    renderNavigator();
    attachTransformer(el);
  }

  function selectBlock(id) {
    const doc = preview.contentDocument;
    const blockEl = doc?.querySelector(`[data-wov-block-id="${id}"]`);
    if (blockEl) {
      selectVisualElement(blockEl);
    } else {
      selectedBlockId = id;
      selectedElement = null;
      selectedCmsKey = null;
      const block = findBlock(id);
      if (!block) return;
      viewWidgets.hidden = true;
      viewSettings.hidden = true;
      viewInspector.hidden = false;
      inspectorElementType.textContent = `Block: ${block.type.toUpperCase()}`;
      inspectorBlockTitle.textContent = `Edit ${block.type.toUpperCase()}`;
      populateInspectorContent(null, block);
      populateInspectorStyle(null, block);
      renderNavigator();
    }
  }

  // Populate Dynamic Content Fields in Inspector
  function populateInspectorContent(el, blockFallback = null) {
    dynamicContentFields.innerHTML = "";
    const block = findBlock(selectedBlockId) || blockFallback;
    const tagName = el ? el.tagName.toLowerCase() : "";

    const createField = (label, inputHtml) => {
      const row = document.createElement("div");
      row.className = "control-row";
      row.innerHTML = `<label>${label}</label>${inputHtml}`;
      return row;
    };

    // 0. Dedicated Dropdown Section / Lesson Content Inspector
    const sectionDetails = el ? el.closest("details.lesson-section") : null;
    if (sectionDetails || tagName === "summary") {
      const details = sectionDetails || (tagName === "summary" ? el.closest("details") : null);
      const summaryEl = details?.querySelector("summary");
      let currentTitle = "";
      if (summaryEl) {
        currentTitle = (summaryEl.textContent || "").replace(/^[▾▸]\s*/, "").trim();
      }
      const isOpen = details ? details.open : true;

      const rowDropdownStatus = createField("Dropdown State", `
        <div style="display:flex; align-items:center; gap:10px;">
          <button type="button" class="action-btn" id="btn-toggle-dropdown-inspector" style="padding:6px 14px; font-size:12px; background:${isOpen ? '#00b4d8' : '#3c4048'}; color:#fff; border-radius:4px; border:0; cursor:pointer;">
            ${isOpen ? "▾ Dropdown is OPEN (Click to Collapse)" : "▸ Dropdown is COLLAPSED (Click to Open)"}
          </button>
        </div>
      `);

      const rowTitle = createField("Dropdown Section Title", `
        <input type="text" id="field-dropdown-title" value="${escapeHtml(currentTitle)}" />
      `);

      const pEls = details ? [...details.querySelectorAll("p, .cms-rich-copy")] : [];
      const paragraphsWrap = document.createElement("div");
      paragraphsWrap.className = "control-row";
      paragraphsWrap.innerHTML = `
        <label>Dropdown Content &amp; Scriptures (${pEls.length} items)</label>
        <div class="dropdown-paragraphs-list" style="display:flex; flex-direction:column; gap:8px; margin-top:6px;">
          ${pEls.map((p, idx) => `
            <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:4px; padding:8px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <span style="font-size:11px; color:#9cb2ab; font-weight:600;">Item #${idx + 1}</span>
                <button type="button" class="wov-badge-btn" data-del-p="${idx}" title="Delete" style="width:18px; height:18px; color:#ff8080;">✕</button>
              </div>
              <textarea class="dropdown-p-input" data-p-idx="${idx}" rows="3" style="width:100%; box-sizing:border-box;">${escapeHtml(p.innerText || p.textContent || "")}</textarea>
            </div>
          `).join("")}
          <button type="button" class="action-btn" id="btn-add-p-inspector" style="margin-top:4px; padding:6px 12px; font-size:11px; background:rgba(0,180,216,0.15); color:#00b4d8; border:1px dashed #00b4d8; border-radius:4px; cursor:pointer;">
            + Add Scripture / Paragraph to this Dropdown
          </button>
        </div>
      `;

      dynamicContentFields.append(rowDropdownStatus, rowTitle, paragraphsWrap);

      rowDropdownStatus.querySelector("#btn-toggle-dropdown-inspector").addEventListener("click", () => {
        if (details) {
          details.open = !details.open;
          const toggleBtn = details.querySelector(".wov-details-toggle");
          if (toggleBtn) toggleBtn.textContent = details.open ? "▾" : "▸";
          setTimeout(updateTransformerPosition, 50);
          populateInspectorContent(el);
        }
      });

      rowTitle.querySelector("input").addEventListener("input", e => {
        const val = e.target.value;
        if (summaryEl) {
          const toggleBtn = summaryEl.querySelector(".wov-details-toggle");
          summaryEl.textContent = val;
          if (toggleBtn) summaryEl.prepend(toggleBtn);
        }
        syncLessonTextFromElement(summaryEl, val);
        updateTransformerPosition();
      });

      paragraphsWrap.querySelectorAll(".dropdown-p-input").forEach(ta => {
        ta.addEventListener("input", e => {
          const idx = parseInt(e.target.dataset.pIdx, 10);
          if (pEls[idx]) {
            pEls[idx].textContent = e.target.value;
            syncLessonTextFromElement(pEls[idx], e.target.value);
            updateTransformerPosition();
          }
        });
      });

      paragraphsWrap.addEventListener("click", e => {
        const delBtn = e.target.closest("[data-del-p]");
        if (!delBtn) return;
        const idx = parseInt(delBtn.dataset.delP, 10);
        if (pEls[idx]) {
          pEls[idx].remove();
          syncLessonTextFromElement(summaryEl, summaryEl?.textContent || "");
          updatePreviewLive();
          setTimeout(() => selectVisualElement(summaryEl), 100);
        }
      });

      paragraphsWrap.querySelector("#btn-add-p-inspector").addEventListener("click", () => {
        if (details) {
          const newP = details.ownerDocument.createElement("p");
          newP.textContent = "New scripture passage or lesson reflection…";
          details.appendChild(newP);
          bindPreviewCanvas();
          selectVisualElement(newP);
          syncLessonTextFromElement(newP, newP.textContent);
        }
      });

      return;
    }

    // Container Elements: Header, Footer, Partnership
    if (el?.classList.contains("site-header") || el?.classList.contains("site-footer") || el?.classList.contains("footer-partnership")) {
      const isHeader = el.classList.contains("site-header");
      const title = isHeader ? "Site Header" : (el.classList.contains("footer-partnership") ? "Footer Partnership Section" : "Site Footer");
      const infoRow = createField(title, `
        <div style="background:rgba(255,255,255,0.05); padding:12px; border-radius:4px; font-size:12px; color:var(--text-muted); line-height:1.5;">
          <p style="margin:0 0 8px 0; color:#fff; font-weight:600;">Overall ${title} Container Selected</p>
          <p style="margin:0 0 8px 0;">Use the <strong>Style</strong> tab above to adjust background color, padding, margins, borders, or drag/resize corners Squarespace-style.</p>
          <p style="margin:0;">To edit words, logo, or navigation links directly, click on them individually in the canvas.</p>
        </div>
      `);
      dynamicContentFields.append(infoRow);
      return;
    }

    // 1. Heading Element or Block
    if (tagName.startsWith("h") || block?.type === "heading") {
      const currentTag = tagName.startsWith("h") ? tagName : (block?.content?.tag || "h2");
      const currentText = el ? (el.innerText || el.textContent) : (block?.content?.text || "");

      const rowTag = createField("HTML Tag", `
        <select id="field-heading-tag">
          <option value="h1" ${currentTag === "h1" ? "selected" : ""}>H1 (Main Headline)</option>
          <option value="h2" ${currentTag === "h2" ? "selected" : ""}>H2 (Section Heading)</option>
          <option value="h3" ${currentTag === "h3" ? "selected" : ""}>H3 (Subheading)</option>
          <option value="h4" ${currentTag === "h4" ? "selected" : ""}>H4 (Minor Heading)</option>
          <option value="h5" ${currentTag === "h5" ? "selected" : ""}>H5</option>
          <option value="h6" ${currentTag === "h6" ? "selected" : ""}>H6</option>
        </select>
      `);
      const rowText = createField("Heading Text", `<input type="text" id="field-heading-text" value="${escapeHtml(currentText)}" />`);
      dynamicContentFields.append(rowTag, rowText);

      rowTag.querySelector("select").addEventListener("change", e => {
        const newTag = e.target.value;
        if (block) {
          block.content.tag = newTag;
          updateBlockLive(block);
        } else if (el) {
          const replacement = el.ownerDocument.createElement(newTag);
          replacement.innerHTML = el.innerHTML;
          replacement.className = el.className;
          if (el.dataset.cmsKey) replacement.dataset.cmsKey = el.dataset.cmsKey;
          el.replaceWith(replacement);
          selectVisualElement(replacement);
          setDirty(true);
        }
      });

      rowText.querySelector("input").addEventListener("input", e => {
        const val = e.target.value;
        if (el) el.textContent = val;
        if (block) block.content.text = val;
        if (selectedCmsKey) content.copyOverrides[selectedCmsKey] = val;
        setDirty(true);
        syncDraftStorage();
      });
      return;
    }

    // 2. Paragraph or Text Editor
    if (tagName === "p" || block?.type === "text") {
      const currentVal = el ? (el.innerHTML || el.textContent) : (block?.content?.html || block?.content?.text || "");
      const rowText = createField("Content HTML / Text", `<textarea id="field-text-html" rows="5">${escapeHtml(currentVal)}</textarea>`);
      dynamicContentFields.append(rowText);

      rowText.querySelector("textarea").addEventListener("input", e => {
        const val = e.target.value;
        if (el) el.innerHTML = val;
        if (block) block.content.html = val;
        if (selectedCmsKey) {
          if (val.includes("<") && val.includes(">")) {
            content.richTextOverrides[selectedCmsKey] = val;
          } else {
            content.copyOverrides[selectedCmsKey] = val;
          }
        }
        setDirty(true);
        syncDraftStorage();
      });
      return;
    }

    // 3. Button or Link
    if (tagName === "a" || tagName === "button" || block?.type === "button") {
      const currentText = (selectedCmsKey && content.copyOverrides?.[selectedCmsKey]) || (el ? el.textContent.trim() : (block?.content?.text || "Learn More"));
      const currentLink = (selectedCmsKey && content.linkOverrides?.[selectedCmsKey]) || el?.getAttribute("href") || block?.content?.link || "#/";
      const isBlockBtn = Boolean(block?.type === "button");
      const isMenuToggle = Boolean(el?.classList.contains("menu-toggle") || el?.closest(".menu-toggle"));

      const rowText = createField("Button / Link Text", `<input type="text" id="field-btn-text" value="${escapeHtml(currentText)}" />`);
      const rowLink = createField("Destination Link / URL (href)", `
        <div style="display:flex; flex-direction:column; gap:6px;">
          <input type="text" id="field-btn-link" value="${escapeHtml(currentLink)}" placeholder="e.g. #/about or https://..." />
          <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:4px;">
            <button type="button" class="action-btn" id="btn-visit-link-inspector" style="padding:6px 12px; font-size:11px; background:#00b4d8; color:#fff; border-radius:4px; border:0; cursor:pointer;">
              🔗 Visit Link / Test
            </button>
            ${isMenuToggle ? `
              <button type="button" class="action-btn" id="btn-toggle-menu-inspector" style="padding:6px 12px; font-size:11px; background:#3c4048; color:#fff; border-radius:4px; border:0; cursor:pointer;">
                📱 Toggle Mobile Menu
              </button>
            ` : ""}
          </div>
        </div>
      `);

      dynamicContentFields.append(rowText, rowLink);

      if (isBlockBtn) {
        const rowVariant = createField("Button Style", `
          <select id="field-btn-variant">
            <option value="primary" ${block?.content?.variant === "primary" ? "selected" : ""}>Primary (Filled)</option>
            <option value="outline" ${block?.content?.variant === "outline" ? "selected" : ""}>Outline</option>
            <option value="pill" ${block?.content?.variant === "pill" ? "selected" : ""}>Pill</option>
          </select>
        `);
        dynamicContentFields.append(rowVariant);
        rowVariant.querySelector("select").addEventListener("change", e => {
          if (block) {
            block.content.variant = e.target.value;
            updateBlockLive(block);
          }
        });
      }

      rowText.querySelector("input").addEventListener("input", e => {
        const val = e.target.value;
        if (el) el.textContent = val;
        if (block) block.content.text = val;
        if (selectedCmsKey) content.copyOverrides[selectedCmsKey] = val;
        setDirty(true);
        syncDraftStorage();
        updateTransformerPosition();
      });

      rowLink.querySelector("input").addEventListener("input", e => {
        const val = e.target.value.trim();
        if (el) el.setAttribute("href", val);
        if (block) block.content.link = val;
        if (selectedCmsKey) {
          if (!content.linkOverrides) content.linkOverrides = {};
          content.linkOverrides[selectedCmsKey] = val;
        }
        setDirty(true);
        syncDraftStorage();
      });

      rowLink.querySelector("#btn-visit-link-inspector")?.addEventListener("click", () => {
        const url = rowLink.querySelector("input").value.trim();
        if (!url) return;
        if (url.startsWith("#/")) {
          preview.contentWindow.location.hash = url;
          const route = url.replace(/^#\/?/, "").replace(/\/$/, "") || "home";
          if (pageSelector) pageSelector.value = route;
          currentRoute = route;
        } else if (url.startsWith("http://") || url.startsWith("https://")) {
          window.open(url, "_blank", "noopener,noreferrer");
        }
      });

      rowLink.querySelector("#btn-toggle-menu-inspector")?.addEventListener("click", () => {
        const doc = preview.contentDocument;
        const navEl = doc?.querySelector("#site-nav");
        const toggleEl = doc?.querySelector(".menu-toggle");
        if (navEl && toggleEl) {
          const isOpen = navEl.classList.toggle("is-open");
          toggleEl.setAttribute("aria-expanded", String(isOpen));
          toggleEl.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
          setTimeout(updateTransformerPosition, 50);
        }
      });

      return;
    }

    // 4. Image Element or Block
    if (tagName === "img" || block?.type === "image") {
      const currentUrl = el ? el.src : (block?.content?.url || "");
      const currentAlt = el ? (el.alt || "") : (block?.content?.alt || "");
      const currentCap = block?.content?.caption || "";

      // Image Dropper Dropzone
      const dropzone = document.createElement("div");
      dropzone.className = "image-dropzone";
      dropzone.innerHTML = `
        <div class="dropzone-icon">📷</div>
        <div class="dropzone-text"><strong>Drop image file here</strong> or <span class="dropzone-browse">browse files</span></div>
        <span class="dropzone-sub">PNG, JPG, WEBP, GIF, SVG up to 15MB</span>
        <input type="file" accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml" style="display:none;" />
      `;

      const rowUrl = createField("Or Image URL (HTTPS)", `<input type="url" id="field-img-url" value="${escapeHtml(currentUrl)}" placeholder="https://..." />`);
      const rowAlt = createField("Alt Text", `<input type="text" id="field-img-alt" value="${escapeHtml(currentAlt)}" />`);
      const rowCap = createField("Caption", `<input type="text" id="field-img-cap" value="${escapeHtml(currentCap)}" />`);

      // Preset Images Selector
      const presetsWrap = document.createElement("div");
      presetsWrap.className = "control-row";
      presetsWrap.innerHTML = `
        <label>Or Pick from Site Presets</label>
        <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:4px;">
          ${PRESET_IMAGES.map((img, i) => `
            <button type="button" class="small-quiet-btn" data-preset-idx="${i}" title="${img.name}" style="font-size:10px; padding:3px 6px;">
              ${img.name}
            </button>
          `).join("")}
        </div>
      `;

      dynamicContentFields.append(dropzone, rowUrl, presetsWrap, rowAlt, rowCap);

      const applyImgUrl = url => {
        rowUrl.querySelector("input").value = url;
        if (el) el.src = url;
        if (block) block.content.url = url;
        if (el?.dataset?.cmsLayoutKey) {
          content.graphics[el.dataset.cmsLayoutKey] = url;
        }
        setDirty(true);
        syncDraftStorage();
      };

      // Dropper event listeners
      const fileInput = dropzone.querySelector("input[type='file']");
      dropzone.addEventListener("click", () => fileInput.click());

      dropzone.addEventListener("dragover", e => {
        e.preventDefault();
        dropzone.classList.add("is-dragover");
      });
      dropzone.addEventListener("dragleave", () => {
        dropzone.classList.remove("is-dragover");
      });
      dropzone.addEventListener("drop", async e => {
        e.preventDefault();
        dropzone.classList.remove("is-dragover");
        const file = e.dataTransfer?.files?.[0];
        if (file) await handleDrop(file);
      });

      fileInput.addEventListener("change", async e => {
        const file = e.target.files?.[0];
        if (file) await handleDrop(file);
        e.target.value = "";
      });

      async function handleDrop(file) {
        dropzone.querySelector(".dropzone-text").innerHTML = "<strong>Uploading…</strong>";
        try {
          const url = await uploadImageFile(file);
          applyImgUrl(url);
          dropzone.querySelector(".dropzone-text").innerHTML = `<strong>Uploaded!</strong> <span class="dropzone-browse">Change Image</span>`;
        } catch (err) {
          alert("Upload failed: " + err.message);
          dropzone.querySelector(".dropzone-text").innerHTML = "<strong>Drop image file here</strong> or <span class=\"dropzone-browse\">browse files</span>";
        }
      }

      rowUrl.querySelector("input").addEventListener("input", e => applyImgUrl(e.target.value));
      presetsWrap.addEventListener("click", e => {
        const btn = e.target.closest("button[data-preset-idx]");
        if (!btn) return;
        const preset = PRESET_IMAGES[parseInt(btn.dataset.presetIdx, 10)];
        if (preset) applyImgUrl(preset.url);
      });
      rowAlt.querySelector("input").addEventListener("input", e => {
        if (el) el.alt = e.target.value;
        if (block) block.content.alt = e.target.value;
        setDirty(true);
      });
      rowCap.querySelector("input").addEventListener("input", e => {
        if (block) block.content.caption = e.target.value;
        setDirty(true);
      });
      return;
    }

    // 5. Scripture Quote
    if (tagName === "blockquote" || tagName === "cite" || block?.type === "quote") {
      const quoteVal = block?.content?.quote || (el ? el.textContent.trim() : "");
      const refVal = block?.content?.reference || "";
      const rowQuote = createField("Scripture Quote", `<textarea id="field-quote-text" rows="3">${escapeHtml(quoteVal)}</textarea>`);
      const rowRef = createField("Scripture Reference / Author", `<input type="text" id="field-quote-ref" value="${escapeHtml(refVal)}" />`);
      dynamicContentFields.append(rowQuote, rowRef);

      rowQuote.querySelector("textarea").addEventListener("input", e => {
        if (el && tagName === "blockquote") el.textContent = `“${e.target.value}”`;
        if (block) block.content.quote = e.target.value;
        setDirty(true);
      });
      rowRef.querySelector("input").addEventListener("input", e => {
        if (el && tagName === "cite") el.textContent = `— ${e.target.value}`;
        if (block) block.content.reference = e.target.value;
        setDirty(true);
      });
      return;
    }

    // 6. Hero Block
    if (block?.type === "hero") {
      const c = block.content || {};
      const rowEye = createField("Eyebrow", `<input type="text" id="field-hero-eye" value="${escapeHtml(c.eyebrow || '')}" />`);
      const rowT1 = createField("First Headline", `<input type="text" id="field-hero-t1" value="${escapeHtml(c.title1 || '')}" />`);
      const rowT2 = createField("Second Headline", `<input type="text" id="field-hero-t2" value="${escapeHtml(c.title2 || '')}" />`);
      const rowDesc = createField("Description", `<textarea id="field-hero-desc" rows="3">${escapeHtml(c.description || '')}</textarea>`);
      const rowBtn = createField("Button Text", `<input type="text" id="field-hero-btn" value="${escapeHtml(c.buttonText || '')}" />`);
      const rowLink = createField("Button Link", `<input type="text" id="field-hero-link" value="${escapeHtml(c.buttonLink || '')}" />`);

      // Hero Background Image Dropper
      const bgDropzone = document.createElement("div");
      bgDropzone.className = "image-dropzone";
      bgDropzone.innerHTML = `
        <div class="dropzone-icon">🌄</div>
        <div class="dropzone-text"><strong>Drop background image here</strong> or <span class="dropzone-browse">browse</span></div>
        <span class="dropzone-sub">PNG, JPG, WEBP, GIF, SVG up to 15MB</span>
        <input type="file" accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml" style="display:none;" />
      `;

      const rowBg = createField("Or Background Image URL", `<input type="url" id="field-hero-bg" value="${escapeHtml(c.backgroundImage || '')}" placeholder="https://..." />`);

      const applyHeroBg = url => {
        c.backgroundImage = url;
        rowBg.querySelector("input").value = url;
        updateBlockLive(block);
      };

      const bgFileInput = bgDropzone.querySelector("input[type='file']");
      bgDropzone.addEventListener("click", () => bgFileInput.click());
      bgDropzone.addEventListener("dragover", e => { e.preventDefault(); bgDropzone.classList.add("is-dragover"); });
      bgDropzone.addEventListener("dragleave", () => { bgDropzone.classList.remove("is-dragover"); });
      bgDropzone.addEventListener("drop", async e => {
        e.preventDefault();
        bgDropzone.classList.remove("is-dragover");
        const file = e.dataTransfer?.files?.[0];
        if (file) {
          bgDropzone.querySelector(".dropzone-text").innerHTML = "<strong>Uploading…</strong>";
          try {
            const url = await uploadImageFile(file);
            applyHeroBg(url);
            bgDropzone.querySelector(".dropzone-text").innerHTML = `<strong>Uploaded!</strong> <span class="dropzone-browse">Change</span>`;
          } catch (err) {
            alert("Upload failed: " + err.message);
            bgDropzone.querySelector(".dropzone-text").innerHTML = "<strong>Drop background image here</strong> or <span class=\"dropzone-browse\">browse</span>";
          }
        }
      });
      bgFileInput.addEventListener("change", async e => {
        const file = e.target.files?.[0];
        if (file) {
          bgDropzone.querySelector(".dropzone-text").innerHTML = "<strong>Uploading…</strong>";
          try {
            const url = await uploadImageFile(file);
            applyHeroBg(url);
            bgDropzone.querySelector(".dropzone-text").innerHTML = `<strong>Uploaded!</strong> <span class="dropzone-browse">Change</span>`;
          } catch (err) {
            alert("Upload failed: " + err.message);
            bgDropzone.querySelector(".dropzone-text").innerHTML = "<strong>Drop background image here</strong> or <span class=\"dropzone-browse\">browse</span>";
          }
        }
      });

      dynamicContentFields.append(rowEye, rowT1, rowT2, rowDesc, rowBtn, rowLink, bgDropzone, rowBg);

      rowEye.querySelector("input").addEventListener("input", e => { c.eyebrow = e.target.value; updateBlockLive(block); });
      rowT1.querySelector("input").addEventListener("input", e => { c.title1 = e.target.value; updateBlockLive(block); });
      rowT2.querySelector("input").addEventListener("input", e => { c.title2 = e.target.value; updateBlockLive(block); });
      rowDesc.querySelector("textarea").addEventListener("input", e => { c.description = e.target.value; updateBlockLive(block); });
      rowBtn.querySelector("input").addEventListener("input", e => { c.buttonText = e.target.value; updateBlockLive(block); });
      rowLink.querySelector("input").addEventListener("input", e => { c.buttonLink = e.target.value; updateBlockLive(block); });
      rowBg.querySelector("input").addEventListener("input", e => applyHeroBg(e.target.value));
      return;
    }

    // 7. Spacer
    if (block?.type === "spacer") {
      const rowLine = createField("Show Divider Line", `<input type="checkbox" id="field-spacer-line" ${block.content.showLine ? "checked" : ""} style="width:auto; margin:0;" />`);
      dynamicContentFields.append(rowLine);
      rowLine.querySelector("input").addEventListener("change", e => {
        block.content.showLine = e.target.checked;
        updateBlockLive(block);
      });
      return;
    }

    // 8. Marquee
    if (block?.type === "marquee") {
      const rowText = createField("Scrolling Text", `<input type="text" id="field-marquee-text" value="${escapeHtml(block.content.text || '')}" />`);
      dynamicContentFields.append(rowText);
      rowText.querySelector("input").addEventListener("input", e => {
        block.content.text = e.target.value;
        updateBlockLive(block);
      });
      return;
    }

    // 9. Contact Form Block
    if (block?.type === "form") {
      const c = block.content || {};
      const rowTitle = createField("Form Title", `<input type="text" id="field-form-title" value="${escapeHtml(c.title || '')}" />`);
      const rowSub = createField("Subtitle", `<textarea id="field-form-sub" rows="2">${escapeHtml(c.subtitle || '')}</textarea>`);
      const rowBtn = createField("Submit Button Text", `<input type="text" id="field-form-btn" value="${escapeHtml(c.submitText || '')}" />`);
      dynamicContentFields.append(rowTitle, rowSub, rowBtn);
      rowTitle.querySelector("input").addEventListener("input", e => { c.title = e.target.value; updateBlockLive(block); });
      rowSub.querySelector("textarea").addEventListener("input", e => { c.subtitle = e.target.value; updateBlockLive(block); });
      rowBtn.querySelector("input").addEventListener("input", e => { c.submitText = e.target.value; updateBlockLive(block); });
      return;
    }

    // 10. Video / Media Block
    if (block?.type === "video") {
      const c = block.content || {};
      const rowUrl = createField("Video or Audio URL (YouTube, Vimeo, MP4, MP3)", `<input type="url" id="field-video-url" value="${escapeHtml(c.url || '')}" placeholder="https://www.youtube.com/watch?v=..." />`);
      const rowTitle = createField("Title (Optional)", `<input type="text" id="field-video-title" value="${escapeHtml(c.title || '')}" placeholder="e.g. Weekly Video Message" />`);
      const rowCaption = createField("Caption / Notes", `<input type="text" id="field-video-caption" value="${escapeHtml(c.caption || '')}" placeholder="e.g. Watch this sermon excerpt on grace" />`);
      dynamicContentFields.append(rowUrl, rowTitle, rowCaption);
      rowUrl.querySelector("input").addEventListener("input", e => { c.url = e.target.value; updateBlockLive(block); });
      rowTitle.querySelector("input").addEventListener("input", e => { c.title = e.target.value; updateBlockLive(block); });
      rowCaption.querySelector("input").addEventListener("input", e => { c.caption = e.target.value; updateBlockLive(block); });
      return;
    }

    // 11. Reflection / Callout Block
    if (block?.type === "callout") {
      const c = block.content || {};
      const rowIcon = createField("Icon / Emoji", `<input type="text" id="field-callout-icon" value="${escapeHtml(c.icon || '📖')}" style="max-width:80px;" />`);
      const rowTitle = createField("Card Title", `<input type="text" id="field-callout-title" value="${escapeHtml(c.title || '')}" />`);
      const rowText = createField("Reflection / Scripture Note", `<textarea id="field-callout-text" rows="4">${escapeHtml(c.text || '')}</textarea>`);
      const rowVariant = createField("Style Theme", `
        <select id="field-callout-variant">
          <option value="highlight" ${c.variant === 'highlight' ? 'selected' : ''}>Rose Highlight (Warm Pink Tint)</option>
          <option value="quote" ${c.variant === 'quote' ? 'selected' : ''}>Warm Sand (Neutral Cream)</option>
          <option value="prayer" ${c.variant === 'prayer' ? 'selected' : ''}>Sage Green (Peaceful Herbal)</option>
          <option value="note" ${c.variant === 'note' ? 'selected' : ''}>Clean Slate (Minimal Gray)</option>
        </select>
      `);
      dynamicContentFields.append(rowIcon, rowTitle, rowText, rowVariant);
      rowIcon.querySelector("input").addEventListener("input", e => { c.icon = e.target.value; updateBlockLive(block); });
      rowTitle.querySelector("input").addEventListener("input", e => { c.title = e.target.value; updateBlockLive(block); });
      rowText.querySelector("textarea").addEventListener("input", e => { c.text = e.target.value; updateBlockLive(block); });
      rowVariant.querySelector("select").addEventListener("change", e => { c.variant = e.target.value; updateBlockLive(block); });
      return;
    }

    // 12. Call to Action Banner
    if (block?.type === "cta") {
      const c = block.content || {};
      const rowTitle = createField("Headline Title", `<input type="text" id="field-cta-title" value="${escapeHtml(c.title || '')}" />`);
      const rowSub = createField("Subtitle", `<textarea id="field-cta-sub" rows="2">${escapeHtml(c.subtitle || '')}</textarea>`);
      const rowBtn = createField("Button Text", `<input type="text" id="field-cta-btn" value="${escapeHtml(c.buttonText || '')}" />`);
      const rowLink = createField("Button Target URL", `<input type="text" id="field-cta-link" value="${escapeHtml(c.buttonLink || '')}" placeholder="#/devotionals" />`);
      const rowVariant = createField("Banner Appearance", `
        <select id="field-cta-variant">
          <option value="brand" ${c.variant === 'brand' ? 'selected' : ''}>Terracotta Brand (Warm Clay)</option>
          <option value="dark" ${c.variant === 'dark' ? 'selected' : ''}>Forest Ink (Deep Green)</option>
          <option value="light" ${c.variant === 'light' ? 'selected' : ''}>Cream Soft (Light & Airy)</option>
        </select>
      `);
      dynamicContentFields.append(rowTitle, rowSub, rowBtn, rowLink, rowVariant);
      rowTitle.querySelector("input").addEventListener("input", e => { c.title = e.target.value; updateBlockLive(block); });
      rowSub.querySelector("textarea").addEventListener("input", e => { c.subtitle = e.target.value; updateBlockLive(block); });
      rowBtn.querySelector("input").addEventListener("input", e => { c.buttonText = e.target.value; updateBlockLive(block); });
      rowLink.querySelector("input").addEventListener("input", e => { c.buttonLink = e.target.value; updateBlockLive(block); });
      rowVariant.querySelector("select").addEventListener("change", e => { c.variant = e.target.value; updateBlockLive(block); });
      return;
    }

    // 13. Social Links Block
    if (block?.type === "social") {
      const c = block.content || {};
      const rowTitle = createField("Section Header", `<input type="text" id="field-social-title" value="${escapeHtml(c.title || '')}" />`);
      const rowIg = createField("Instagram URL", `<input type="url" id="field-social-ig" value="${escapeHtml(c.instagram || '')}" placeholder="https://instagram.com/..." />`);
      const rowYt = createField("YouTube URL", `<input type="url" id="field-social-yt" value="${escapeHtml(c.youtube || '')}" placeholder="https://youtube.com/..." />`);
      const rowSp = createField("Spotify URL", `<input type="url" id="field-social-sp" value="${escapeHtml(c.spotify || '')}" placeholder="https://open.spotify.com/..." />`);
      const rowEmail = createField("Email Address", `<input type="email" id="field-social-email" value="${escapeHtml(c.email || '')}" placeholder="heylee@absolutionuecna.org" />`);
      dynamicContentFields.append(rowTitle, rowIg, rowYt, rowSp, rowEmail);
      rowTitle.querySelector("input").addEventListener("input", e => { c.title = e.target.value; updateBlockLive(block); });
      rowIg.querySelector("input").addEventListener("input", e => { c.instagram = e.target.value; updateBlockLive(block); });
      rowYt.querySelector("input").addEventListener("input", e => { c.youtube = e.target.value; updateBlockLive(block); });
      rowSp.querySelector("input").addEventListener("input", e => { c.spotify = e.target.value; updateBlockLive(block); });
      rowEmail.querySelector("input").addEventListener("input", e => { c.email = e.target.value; updateBlockLive(block); });
      return;
    }

    // Default Fallback
    if (el) {
      const row = createField("Selected Element", `<p style="font-size:12px; color:var(--text-muted); margin:0;">${escapeHtml(el.tagName)}: ${escapeHtml(el.textContent.slice(0, 80))}</p>`);
      dynamicContentFields.append(row);
    }
  }

  // Populate Inspector Style Controls from Element / Block
  function populateInspectorStyle(el, blockFallback = null) {
    const block = findBlock(selectedBlockId) || blockFallback;
    const computed = el ? preview.contentWindow?.getComputedStyle(el) : null;
    const blockStyle = block?.style || {};
    const cmsStyle = selectedCmsKey ? (content.textStyles[selectedCmsKey] || {}) : {};

    const getProp = (cssProp, blockProp) => {
      return blockStyle[blockProp || cssProp] || cmsStyle[blockProp || cssProp] || (el ? el.style[cssProp] : "") || (computed ? computed[cssProp] : "");
    };

    // Typography
    const fontFamily = getProp("fontFamily");
    const fontSelect = document.querySelector("#style-font-family");
    if (fontFamily) {
      const match = [...fontSelect.options].find(opt => opt.value && fontFamily.includes(opt.value.replace(/['",]/g, "")));
      fontSelect.value = match ? match.value : "";
    } else {
      fontSelect.value = "";
    }

    const rawSize = getProp("fontSize");
    const size = parseInt(rawSize || "16", 10) || 16;
    document.querySelector("#style-font-size-range").value = Math.min(Math.max(size, 10), 120);
    document.querySelector("#style-font-size").value = Math.min(Math.max(size, 10), 120);

    const weight = getProp("fontWeight");
    document.querySelector("#style-font-weight").value = weight || "";

    const rawLineHeight = getProp("lineHeight");
    const lhNum = parseFloat(rawLineHeight) || 1.5;
    document.querySelector("#style-line-height-range").value = Math.min(Math.max(lhNum, 0.8), 2.6);
    document.querySelector("#style-line-height").value = Math.min(Math.max(lhNum, 0.8), 2.6);

    const rawSpacing = getProp("letterSpacing");
    const lsNum = parseFloat(rawSpacing) || 0;
    document.querySelector("#style-letter-spacing-range").value = lsNum;
    document.querySelector("#style-letter-spacing").value = lsNum;

    const transform = getProp("textTransform");
    document.querySelector("#style-text-transform").value = transform || "";

    const align = getProp("textAlign") || "left";
    document.querySelectorAll(".align-btn").forEach(btn => {
      btn.classList.toggle("is-active", btn.dataset.align === align);
    });

    // Colors
    const textColor = getProp("color", "textColor") || "#303636";
    const textHex = rgbToHex(textColor);
    document.querySelector("#style-text-color").value = textHex;
    document.querySelector("#style-text-color-hex").value = textHex;

    const bgColor = getProp("backgroundColor") || "#ffffff";
    const bgHex = rgbToHex(bgColor);
    document.querySelector("#style-bg-color").value = bgHex === "transparent" ? "#ffffff" : bgHex;
    document.querySelector("#style-bg-color-hex").value = bgHex;

    const accentColor = getProp("borderColor", "accentColor") || "#c9755b";
    const accentHex = rgbToHex(accentColor);
    document.querySelector("#style-accent-color").value = accentHex;
    document.querySelector("#style-accent-color-hex").value = accentHex;

    // Spacing (Quad Padding)
    document.querySelector("#style-pad-top").value = getProp("paddingTop") || "";
    document.querySelector("#style-pad-right").value = getProp("paddingRight") || "";
    document.querySelector("#style-pad-bottom").value = getProp("paddingBottom") || "";
    document.querySelector("#style-pad-left").value = getProp("paddingLeft") || "";

    // Spacing (Quad Margin)
    document.querySelector("#style-mar-top").value = getProp("marginTop") || "";
    document.querySelector("#style-mar-right").value = getProp("marginRight") || "";
    document.querySelector("#style-mar-bottom").value = getProp("marginBottom") || "";
    document.querySelector("#style-mar-left").value = getProp("marginLeft") || "";

    // Borders & Corners
    document.querySelector("#style-border-type").value = getProp("borderStyle") || "";
    const bWidth = parseInt(getProp("borderWidth") || "0", 10) || 0;
    document.querySelector("#style-border-width-range").value = bWidth;
    document.querySelector("#style-border-width").value = bWidth;

    const bRadius = parseInt(getProp("borderRadius") || "0", 10) || 0;
    document.querySelector("#style-border-radius-range").value = bRadius;
    document.querySelector("#style-border-radius").value = bRadius;

    document.querySelector("#style-box-shadow").value = getProp("boxShadow") || "";

    // Size & Position (Squarespace Builder)
    const posXInput = document.querySelector("#style-pos-x");
    const posYInput = document.querySelector("#style-pos-y");
    const customWInput = document.querySelector("#style-custom-width");
    const customHInput = document.querySelector("#style-custom-height");
    if (el) {
      const key = getElementKey(el);
      const posOverride = content.positionOverrides?.[key] || {};
      const rect = el.getBoundingClientRect();
      const currentX = posOverride.x !== undefined ? posOverride.x : (parseFloat(el.style.left) || "");
      const currentY = posOverride.y !== undefined ? posOverride.y : (parseFloat(el.style.top) || "");
      const currentW = posOverride.width !== undefined ? posOverride.width : Math.round(rect.width);
      const currentH = posOverride.height !== undefined ? posOverride.height : Math.round(rect.height);

      if (posXInput) posXInput.value = currentX;
      if (posYInput) posYInput.value = currentY;
      if (customWInput) customWInput.value = currentW;
      if (customHInput) customHInput.value = currentH;
    } else {
      if (posXInput) posXInput.value = "";
      if (posYInput) posYInput.value = "";
      if (customWInput) customWInput.value = "";
      if (customHInput) customHInput.value = "";
    }

    // Advanced Z-index
    document.querySelector("#adv-z-index").value = getProp("zIndex") || "";
  }

  // Helper to convert rgb(r, g, b) to #hex
  function rgbToHex(str) {
    if (!str || str === "transparent" || str === "rgba(0, 0, 0, 0)") return "transparent";
    if (str.startsWith("#") && str.length === 7) return str;
    const match = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return "#303636";
    const r = parseInt(match[1], 10).toString(16).padStart(2, "0");
    const g = parseInt(match[2], 10).toString(16).padStart(2, "0");
    const b = parseInt(match[3], 10).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`;
  }

  // Universal Live Style Application
  function applyStyleToSelection(prop, val) {
    if (selectedElement) {
      selectedElement.style[prop] = val;
    }
    const block = findBlock(selectedBlockId);
    if (block) {
      if (!block.style) block.style = {};
      block.style[prop] = val;
    }
    if (selectedCmsKey) {
      if (!content.textStyles[selectedCmsKey]) {
        content.textStyles[selectedCmsKey] = {};
      }
      content.textStyles[selectedCmsKey][prop] = val;
    }
    setDirty(true);
    syncDraftStorage();
  }

  // Re-render single block live
  function updateBlockLive(block) {
    pushHistory();
    const doc = preview.contentDocument;
    if (doc) {
      const el = doc.querySelector(`[data-wov-block-id="${block.id}"]`);
      if (el && typeof preview.contentWindow?.renderBlock === "function") {
        const temp = doc.createElement("div");
        temp.innerHTML = preview.contentWindow.renderBlock(block);
        const newEl = temp.firstElementChild;
        if (newEl) {
          el.replaceWith(newEl);
          bindPreviewCanvas();
          return;
        }
      }
    }
    updatePreviewLive();
  }

  // ==========================================
  // Inspector Style Controls Listeners
  // ==========================================

  // Font Family
  document.querySelector("#style-font-family").addEventListener("change", e => {
    applyStyleToSelection("fontFamily", e.target.value);
  });

  // Font Size (Range & Number)
  const fontSizeRange = document.querySelector("#style-font-size-range");
  const fontSizeNum = document.querySelector("#style-font-size");
  fontSizeRange.addEventListener("input", e => {
    fontSizeNum.value = e.target.value;
    applyStyleToSelection("fontSize", `${e.target.value}px`);
  });
  fontSizeNum.addEventListener("input", e => {
    fontSizeRange.value = e.target.value;
    applyStyleToSelection("fontSize", `${e.target.value}px`);
  });

  // Font Weight
  document.querySelector("#style-font-weight").addEventListener("change", e => {
    applyStyleToSelection("fontWeight", e.target.value);
  });

  // Line Height
  const lhRange = document.querySelector("#style-line-height-range");
  const lhNum = document.querySelector("#style-line-height");
  lhRange.addEventListener("input", e => {
    lhNum.value = e.target.value;
    applyStyleToSelection("lineHeight", e.target.value);
  });
  lhNum.addEventListener("input", e => {
    lhRange.value = e.target.value;
    applyStyleToSelection("lineHeight", e.target.value);
  });

  // Letter Spacing
  const lsRange = document.querySelector("#style-letter-spacing-range");
  const lsNum = document.querySelector("#style-letter-spacing");
  lsRange.addEventListener("input", e => {
    lsNum.value = e.target.value;
    applyStyleToSelection("letterSpacing", `${e.target.value}px`);
  });
  lsNum.addEventListener("input", e => {
    lsRange.value = e.target.value;
    applyStyleToSelection("letterSpacing", `${e.target.value}px`);
  });

  // Text Transform
  document.querySelector("#style-text-transform").addEventListener("change", e => {
    applyStyleToSelection("textTransform", e.target.value);
  });

  // Text Alignment
  document.querySelectorAll(".align-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".align-btn").forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      applyStyleToSelection("textAlign", btn.dataset.align);
    });
  });

  // Color Tracking & Swatches
  document.querySelector("#style-text-color").addEventListener("focus", () => { lastActiveColorTarget = "textColor"; });
  document.querySelector("#style-bg-color").addEventListener("focus", () => { lastActiveColorTarget = "backgroundColor"; });
  document.querySelector("#style-accent-color").addEventListener("focus", () => { lastActiveColorTarget = "accentColor"; });

  document.querySelectorAll(".swatch-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const color = btn.dataset.color;
      if (lastActiveColorTarget === "backgroundColor") {
        document.querySelector("#style-bg-color").value = color;
        document.querySelector("#style-bg-color-hex").value = color;
        applyStyleToSelection("backgroundColor", color);
      } else if (lastActiveColorTarget === "accentColor") {
        document.querySelector("#style-accent-color").value = color;
        document.querySelector("#style-accent-color-hex").value = color;
        applyStyleToSelection("borderColor", color);
        applyStyleToSelection("accentColor", color);
      } else {
        document.querySelector("#style-text-color").value = color;
        document.querySelector("#style-text-color-hex").value = color;
        applyStyleToSelection("color", color);
        applyStyleToSelection("textColor", color);
      }
    });
  });

  // Text Color
  document.querySelector("#style-text-color").addEventListener("input", e => {
    document.querySelector("#style-text-color-hex").value = e.target.value;
    applyStyleToSelection("color", e.target.value);
    applyStyleToSelection("textColor", e.target.value);
  });
  document.querySelector("#style-text-color-hex").addEventListener("input", e => {
    if (/^#[0-9a-f]{6}$/i.test(e.target.value)) {
      document.querySelector("#style-text-color").value = e.target.value;
      applyStyleToSelection("color", e.target.value);
      applyStyleToSelection("textColor", e.target.value);
    }
  });

  // Background Color
  document.querySelector("#style-bg-color").addEventListener("input", e => {
    document.querySelector("#style-bg-color-hex").value = e.target.value;
    applyStyleToSelection("backgroundColor", e.target.value);
  });
  document.querySelector("#style-bg-color-hex").addEventListener("input", e => {
    if (/^#[0-9a-f]{6}$/i.test(e.target.value)) {
      document.querySelector("#style-bg-color").value = e.target.value;
      applyStyleToSelection("backgroundColor", e.target.value);
    }
  });
  document.querySelector("#btn-bg-transparent").addEventListener("click", () => {
    document.querySelector("#style-bg-color-hex").value = "transparent";
    applyStyleToSelection("backgroundColor", "transparent");
  });

  // Accent / Border Color
  document.querySelector("#style-accent-color").addEventListener("input", e => {
    document.querySelector("#style-accent-color-hex").value = e.target.value;
    applyStyleToSelection("borderColor", e.target.value);
    applyStyleToSelection("accentColor", e.target.value);
  });
  document.querySelector("#style-accent-color-hex").addEventListener("input", e => {
    if (/^#[0-9a-f]{6}$/i.test(e.target.value)) {
      document.querySelector("#style-accent-color").value = e.target.value;
      applyStyleToSelection("borderColor", e.target.value);
      applyStyleToSelection("accentColor", e.target.value);
    }
  });

  // Spacing (Quad Padding)
  const linkPadBtn = document.querySelector("#btn-link-padding");
  linkPadBtn.addEventListener("click", () => {
    isPaddingLinked = !isPaddingLinked;
    linkPadBtn.textContent = isPaddingLinked ? "🔗 Linked" : "⛓️ Unlinked";
    linkPadBtn.classList.toggle("is-active", isPaddingLinked);
  });

  ["top", "right", "bottom", "left"].forEach(side => {
    const input = document.querySelector(`#style-pad-${side}`);
    input.addEventListener("input", e => {
      let val = e.target.value.trim();
      if (val && !val.endsWith("px") && !val.endsWith("%") && !val.endsWith("em") && !val.endsWith("rem")) {
        val = `${val}px`;
      }
      if (isPaddingLinked) {
        ["top", "right", "bottom", "left"].forEach(s => {
          document.querySelector(`#style-pad-${s}`).value = val;
          const capSide = s.charAt(0).toUpperCase() + s.slice(1);
          applyStyleToSelection(`padding${capSide}`, val);
        });
      } else {
        const capSide = side.charAt(0).toUpperCase() + side.slice(1);
        applyStyleToSelection(`padding${capSide}`, val);
      }
    });
  });

  // Spacing (Quad Margin)
  const linkMarBtn = document.querySelector("#btn-link-margin");
  linkMarBtn.addEventListener("click", () => {
    isMarginLinked = !isMarginLinked;
    linkMarBtn.textContent = isMarginLinked ? "🔗 Linked" : "⛓️ Unlinked";
    linkMarBtn.classList.toggle("is-active", isMarginLinked);
  });

  ["top", "right", "bottom", "left"].forEach(side => {
    const input = document.querySelector(`#style-mar-${side}`);
    input.addEventListener("input", e => {
      let val = e.target.value.trim();
      if (val && !val.endsWith("px") && !val.endsWith("%") && !val.endsWith("em") && !val.endsWith("rem")) {
        val = `${val}px`;
      }
      if (isMarginLinked) {
        ["top", "right", "bottom", "left"].forEach(s => {
          document.querySelector(`#style-mar-${s}`).value = val;
          const capSide = s.charAt(0).toUpperCase() + s.slice(1);
          applyStyleToSelection(`margin${capSide}`, val);
        });
      } else {
        const capSide = side.charAt(0).toUpperCase() + side.slice(1);
        applyStyleToSelection(`margin${capSide}`, val);
      }
    });
  });

  // Borders & Corners
  document.querySelector("#style-border-type").addEventListener("change", e => {
    applyStyleToSelection("borderStyle", e.target.value);
    if (e.target.value && !document.querySelector("#style-border-width").value) {
      document.querySelector("#style-border-width").value = "1";
      document.querySelector("#style-border-width-range").value = "1";
      applyStyleToSelection("borderWidth", "1px");
    }
  });

  const bWidthRange = document.querySelector("#style-border-width-range");
  const bWidthNum = document.querySelector("#style-border-width");
  bWidthRange.addEventListener("input", e => {
    bWidthNum.value = e.target.value;
    applyStyleToSelection("borderWidth", `${e.target.value}px`);
    if (!document.querySelector("#style-border-type").value) {
      document.querySelector("#style-border-type").value = "solid";
      applyStyleToSelection("borderStyle", "solid");
    }
  });
  bWidthNum.addEventListener("input", e => {
    bWidthRange.value = e.target.value;
    applyStyleToSelection("borderWidth", `${e.target.value}px`);
    if (!document.querySelector("#style-border-type").value) {
      document.querySelector("#style-border-type").value = "solid";
      applyStyleToSelection("borderStyle", "solid");
    }
  });

  const bRadiusRange = document.querySelector("#style-border-radius-range");
  const bRadiusNum = document.querySelector("#style-border-radius");
  bRadiusRange.addEventListener("input", e => {
    bRadiusNum.value = e.target.value;
    applyStyleToSelection("borderRadius", `${e.target.value}px`);
  });
  bRadiusNum.addEventListener("input", e => {
    bRadiusRange.value = e.target.value;
    applyStyleToSelection("borderRadius", `${e.target.value}px`);
  });

  document.querySelector("#style-box-shadow").addEventListener("change", e => {
    applyStyleToSelection("boxShadow", e.target.value);
  });

  // Size & Position (Squarespace Builder)
  document.querySelector("#style-pos-x")?.addEventListener("input", e => {
    if (!selectedElement) return;
    const val = parseInt(e.target.value, 10) || 0;
    selectedElement.style.position = "relative";
    selectedElement.style.left = `${val}px`;
    updateTransformerPosition();
    const key = getElementKey(selectedElement);
    if (!content.positionOverrides) content.positionOverrides = {};
    content.positionOverrides[key] = { ...(content.positionOverrides[key] || {}), x: val };
    setDirty(true);
    syncDraftStorage();
  });

  document.querySelector("#style-pos-y")?.addEventListener("input", e => {
    if (!selectedElement) return;
    const val = parseInt(e.target.value, 10) || 0;
    selectedElement.style.position = "relative";
    selectedElement.style.top = `${val}px`;
    updateTransformerPosition();
    const key = getElementKey(selectedElement);
    if (!content.positionOverrides) content.positionOverrides = {};
    content.positionOverrides[key] = { ...(content.positionOverrides[key] || {}), y: val };
    setDirty(true);
    syncDraftStorage();
  });

  document.querySelector("#style-custom-width")?.addEventListener("input", e => {
    if (!selectedElement) return;
    const val = parseInt(e.target.value, 10);
    if (isNaN(val) || val <= 0) {
      selectedElement.style.width = "";
    } else {
      selectedElement.style.width = `${val}px`;
      if (selectedElement.tagName.toLowerCase() === "img") {
        selectedElement.style.maxWidth = "none";
      } else if (window.getComputedStyle(selectedElement).display === "inline") {
        selectedElement.style.display = "inline-block";
      }
    }
    updateTransformerPosition();
    const key = getElementKey(selectedElement);
    if (!content.positionOverrides) content.positionOverrides = {};
    content.positionOverrides[key] = { ...(content.positionOverrides[key] || {}), width: val };
    setDirty(true);
    syncDraftStorage();
  });

  document.querySelector("#style-custom-height")?.addEventListener("input", e => {
    if (!selectedElement) return;
    const val = parseInt(e.target.value, 10);
    if (isNaN(val) || val <= 0) {
      selectedElement.style.height = "";
      selectedElement.style.minHeight = "";
    } else {
      selectedElement.style.height = `${val}px`;
      if (selectedElement.tagName.toLowerCase() === "img") {
        selectedElement.style.objectFit = "cover";
      } else {
        selectedElement.style.minHeight = `${val}px`;
      }
      if (selectedElement.classList.contains("lesson-photo")) {
        selectedElement.style.setProperty("--lesson-image-height", `${val}px`);
      }
    }
    updateTransformerPosition();
    const key = getElementKey(selectedElement);
    if (!content.positionOverrides) content.positionOverrides = {};
    content.positionOverrides[key] = { ...(content.positionOverrides[key] || {}), height: val };
    setDirty(true);
    syncDraftStorage();
  });

  document.querySelector("#btn-reset-pos-size")?.addEventListener("click", () => {
    if (!selectedElement) return;
    const key = getElementKey(selectedElement);
    if (content.positionOverrides && content.positionOverrides[key]) {
      delete content.positionOverrides[key];
    }
    selectedElement.style.position = "";
    selectedElement.style.left = "";
    selectedElement.style.top = "";
    selectedElement.style.width = "";
    selectedElement.style.height = "";
    selectedElement.style.minHeight = "";
    selectedElement.style.maxWidth = "";
    selectedElement.style.objectFit = "";
    if (selectedElement.classList.contains("lesson-photo")) {
      selectedElement.style.removeProperty("--lesson-image-height");
    }
    document.querySelector("#style-pos-x").value = "";
    document.querySelector("#style-pos-y").value = "";
    document.querySelector("#style-custom-width").value = "";
    document.querySelector("#style-custom-height").value = "";
    updateTransformerPosition();
    setDirty(true);
    syncDraftStorage();
    pushHistory();
  });

  // Advanced: CSS Classes & Z-Index
  document.querySelector("#adv-css-classes").addEventListener("input", e => {
    if (selectedElement) {
      selectedElement.className = `${e.target.value} wov-visual-target wov-element-selected`;
    }
    const block = findBlock(selectedBlockId);
    if (block) {
      if (!block.advanced) block.advanced = {};
      block.advanced.cssClasses = e.target.value;
    }
    setDirty(true);
  });

  document.querySelector("#adv-z-index").addEventListener("input", e => {
    applyStyleToSelection("zIndex", e.target.value);
  });

  // Reset Styles Button
  document.querySelector("#btn-reset-styles").addEventListener("click", () => {
    if (selectedElement) {
      selectedElement.removeAttribute("style");
    }
    const block = findBlock(selectedBlockId);
    if (block) {
      block.style = {};
    }
    if (selectedCmsKey) {
      delete content.textStyles[selectedCmsKey];
    }
    populateInspectorStyle(selectedElement, block);
    pushHistory();
    setDirty(true);
  });

  // Block Manipulation: Move, Duplicate, Delete
  function moveBlock(id, direction) {
    const list = getCurrentPageBlocks();
    const index = list.findIndex(b => b.id === id);
    if (index === -1) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= list.length) return;
    const [moved] = list.splice(index, 1);
    list.splice(newIndex, 0, moved);
    pushHistory();
    updatePreviewLive();
  }

  function duplicateBlock(id) {
    const list = getCurrentPageBlocks();
    const index = list.findIndex(b => b.id === id);
    if (index === -1) return;
    const clone = JSON.parse(JSON.stringify(list[index]));
    clone.id = `block_${clone.type}_${Math.random().toString(36).slice(2, 9)}`;
    list.splice(index + 1, 0, clone);
    pushHistory();
    updatePreviewLive();
    setTimeout(() => selectBlock(clone.id), 250);
  }

  function deleteBlock(id) {
    const list = getCurrentPageBlocks();
    const index = list.findIndex(b => b.id === id);
    if (index === -1) return;
    list.splice(index, 1);
    selectedBlockId = null;
    selectedElement = null;
    pushHistory();
    showSidebarTab("widgets");
    updatePreviewLive();
  }

  document.querySelector("#btn-duplicate-block").addEventListener("click", () => {
    if (selectedBlockId) duplicateBlock(selectedBlockId);
  });
  document.querySelector("#btn-delete-block").addEventListener("click", () => {
    if (selectedBlockId) deleteBlock(selectedBlockId);
    else if (selectedElement) {
      selectedElement.style.display = "none";
      setDirty(true);
    }
  });

  // Navigator Structure Tree
  function renderNavigator() {
    navigatorTree.innerHTML = "";
    const list = getCurrentPageBlocks();
    if (list.length === 0) {
      navigatorTree.innerHTML = `<p style="font-size:11px; color:var(--text-muted); padding:8px;">No modular blocks on this page yet. Click or drag widgets from the sidebar to start building.</p>`;
      return;
    }
    list.forEach((block, idx) => {
      const node = document.createElement("div");
      node.className = `tree-node ${block.id === selectedBlockId ? 'is-active' : ''}`;
      const title = block.content?.text || block.content?.title || block.content?.title1 || block.content?.quote || block.type;
      node.innerHTML = `
        <span class="tree-node-icon">▫</span>
        <span class="tree-node-label">${idx + 1}. ${escapeHtml(title).slice(0, 24)}</span>
      `;
      node.addEventListener("click", () => {
        selectBlock(block.id);
        const doc = preview.contentDocument;
        doc?.querySelector(`[data-wov-block-id="${block.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      navigatorTree.append(node);
    });
  }

  // Header Handlers
  pageSelector.addEventListener("change", e => {
    currentRoute = e.target.value;
    selectedBlockId = null;
    selectedElement = null;
    selectedCmsKey = null;
    showSidebarTab("widgets");
    refreshPreview();
  });

  document.querySelectorAll(".device-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".device-btn").forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const device = btn.dataset.device;
      deviceWrapper.className = `canvas-device-wrapper is-${device}`;
    });
  });

  undoBtn.addEventListener("click", undo);
  redoBtn.addEventListener("click", redo);

  previewModeBtn.addEventListener("click", () => {
    const isPreview = document.body.classList.toggle("is-preview-mode");
    previewModeBtn.classList.toggle("is-active", isPreview);
    const iframeDoc = preview.contentDocument;
    if (iframeDoc && iframeDoc.body) {
      iframeDoc.body.classList.toggle("is-clean-preview", isPreview);
      const tf = iframeDoc.querySelector("#wov-transformer-box");
      if (tf) tf.style.display = isPreview ? "none" : "";
      if (isPreview && selectedElement) {
        selectedElement.removeAttribute("contenteditable");
      }
    }
  });

  navigatorBtn.addEventListener("click", () => {
    navigatorPanel.hidden = !navigatorPanel.hidden;
    navigatorBtn.classList.toggle("is-active", !navigatorPanel.hidden);
    if (!navigatorPanel.hidden) renderNavigator();
  });
  document.querySelector("#btn-close-navigator").addEventListener("click", () => {
    navigatorPanel.hidden = true;
    navigatorBtn.classList.remove("is-active");
  });

  // Sidebar Tabs Navigation
  tabBtnWidgets.addEventListener("click", () => showSidebarTab("widgets"));
  tabBtnSettings.addEventListener("click", () => showSidebarTab("site-settings"));
  if (tabBtnDevotionals) tabBtnDevotionals.addEventListener("click", () => showSidebarTab("devotionals"));
  backToWidgetsBtn.addEventListener("click", () => {
    selectedBlockId = null;
    selectedElement = null;
    selectedCmsKey = null;
    const doc = preview.contentDocument;
    doc?.querySelectorAll(".wov-block").forEach(b => b.classList.remove("wov-selected"));
    doc?.querySelectorAll(".wov-visual-target").forEach(b => b.classList.remove("wov-element-selected"));
    showSidebarTab("widgets");
  });

  // Inspector Subtabs (Content, Style, Advanced)
  document.querySelectorAll(".subtab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".subtab-btn").forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const tab = btn.dataset.subtab;
      document.querySelector("#subview-content").hidden = tab !== "content";
      document.querySelector("#subview-style").hidden = tab !== "style";
      document.querySelector("#subview-advanced").hidden = tab !== "advanced";
    });
  });

  // GitHub Status & Auto-Push Handlers
  function updateGithubStatusBadge(data) {
    const badge = document.querySelector("#github-sync-badge");
    const statusText = document.querySelector("#gh-status-text");
    if (!badge || !statusText) return;

    badge.hidden = false;
    badge.classList.remove("is-syncing", "is-synced");

    if (!data) {
      statusText.textContent = "GitHub: Ready";
      return;
    }

    if (data.pushed) {
      badge.classList.add("is-synced");
      statusText.textContent = `GitHub: Pushed (${data.commit || 'main'})`;
      badge.title = data.message || `Changes successfully pushed to GitHub (${data.commit})`;
    } else if (data.success && !data.error) {
      badge.classList.add("is-synced");
      statusText.textContent = data.commit ? `GitHub: ${data.commit}` : "GitHub: Up to date";
      badge.title = data.message || "All commits pushed to GitHub main";
    } else if (data.error) {
      statusText.textContent = "GitHub: Sync Issue";
      badge.title = `GitHub Sync Error: ${data.error}`;
    } else if (data.branch) {
      badge.classList.add("is-synced");
      const shortCommit = data.lastCommit ? data.lastCommit.slice(0, 7) : "";
      statusText.textContent = `GitHub: ${data.branch}${shortCommit ? ` (${shortCommit})` : ''}`;
      badge.title = `Branch: ${data.branch}\nLast Commit: ${data.lastCommit}\nRemote: ${data.remote}`;
    }
  }

  async function fetchGithubStatus() {
    try {
      const data = await api("./api/admin/github-status");
      updateGithubStatusBadge(data);
    } catch (err) {
      console.warn("Could not fetch GitHub status:", err.message);
    }
  }

  async function syncGitHub() {
    const badge = document.querySelector("#github-sync-badge");
    const btn = document.querySelector("#btn-github-sync");
    const statusText = document.querySelector("#gh-status-text");
    if (btn) btn.disabled = true;
    if (badge) badge.classList.add("is-syncing");
    if (statusText) statusText.textContent = "Pushing to GitHub…";

    try {
      const res = await api("./api/admin/github-sync", { method: "POST", body: {} });
      updateGithubStatusBadge(res);
      if (res.success) {
        if (res.pushed) {
          alert(`Successfully committed and pushed to GitHub main (${res.commit})!\nGitHub Pages will automatically rebuild and deploy the live site.`);
        } else {
          alert("GitHub is already up to date with the latest site files.");
        }
      } else {
        alert("GitHub Push Issue: " + (res.error || "Unknown error"));
      }
    } catch (err) {
      alert("GitHub Sync Error: " + err.message);
    } finally {
      if (btn) btn.disabled = false;
      if (badge) badge.classList.remove("is-syncing");
    }
  }

  document.querySelector("#btn-github-sync")?.addEventListener("click", syncGitHub);

  // Save & Publish (with automatic GitHub push)
  async function saveContent() {
    saveBtn.disabled = true;
    saveStatus.querySelector(".status-text").textContent = "Saving to server & GitHub…";
    const dot = saveStatus.querySelector(".status-dot");
    if (dot) dot.style.background = "#d4967d";

    const ghBadge = document.querySelector("#github-sync-badge");
    const ghStatusText = document.querySelector("#gh-status-text");
    if (ghBadge) ghBadge.classList.add("is-syncing");
    if (ghStatusText) ghStatusText.textContent = "Syncing GitHub…";

    try {
      const res = await api("./api/admin/content", { method: "PUT", body: content });
      setDirty(false);
      updatePreviewLive();

      if (res && res.github) {
        updateGithubStatusBadge(res.github);
        if (res.github.pushed) {
          saveStatus.querySelector(".status-text").textContent = `Saved & Pushed to GitHub (${res.github.commit || 'main'})`;
          if (dot) dot.style.background = "#2e7d32";
        } else if (res.github.success) {
          saveStatus.querySelector(".status-text").textContent = "Saved · GitHub: Up to date";
          if (dot) dot.style.background = "#2e7d32";
        } else {
          saveStatus.querySelector(".status-text").textContent = "Saved locally (GitHub push pending)";
          if (dot) dot.style.background = "#c9755b";
          console.warn("GitHub sync issue:", res.github);
        }
      } else {
        saveStatus.querySelector(".status-text").textContent = "All changes saved";
        if (dot) dot.style.background = "#2e7d32";
      }
    } catch (err) {
      alert("Failed to save changes: " + err.message);
      setDirty(true);
      if (dot) dot.style.background = "#c92a2a";
    } finally {
      saveBtn.disabled = false;
      if (ghBadge) ghBadge.classList.remove("is-syncing");
    }
  }

  saveBtn.addEventListener("click", saveContent);

  // Keyboard Shortcuts: Ctrl+S, Ctrl+Z, Ctrl+Y
  window.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      if (isDirty) saveContent();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      undo();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
      e.preventDefault();
      redo();
    }
  });

  // Load Content
  async function loadContent() {
    content = await api("./api/admin/content");
    if (!content.blocks || typeof content.blocks !== "object") {
      content.blocks = {};
    }
    if (!content.copyOverrides) content.copyOverrides = {};
    if (!content.richTextOverrides) content.richTextOverrides = {};
    if (!content.linkOverrides) content.linkOverrides = {};
    if (!content.textStyles) content.textStyles = {};
    if (!content.theme) content.theme = {};
    if (!content.graphics) content.graphics = {};
    if (!content.layout) content.layout = {};
    if (!content.positionOverrides) content.positionOverrides = {};

    historyStack = [JSON.stringify({
      blocks: content.blocks,
      copyOverrides: content.copyOverrides,
      richTextOverrides: content.richTextOverrides,
      linkOverrides: content.linkOverrides,
      textStyles: content.textStyles,
      positionOverrides: content.positionOverrides
    })];
    historyIndex = 0;
    updateUndoRedoButtons();
    ensureDevotionalsInitialized();
    renderDevotionalsManager();
    updatePageSelectorOptions();
    syncDraftStorage();
    refreshPreview();
  }

  // Setup Form
  document.querySelector("#setup-form").addEventListener("submit", async e => {
    e.preventDefault();
    const username = document.querySelector("#setup-username").value.trim();
    const password = document.querySelector("#setup-password").value;
    const confirm = document.querySelector("#setup-confirm").value;
    const messageEl = document.querySelector("#setup-message");

    if (password !== confirm) {
      messageEl.textContent = "Passwords do not match.";
      return;
    }

    try {
      const res = await api("./api/admin/setup", {
        method: "POST",
        body: { username, password }
      });
      csrfToken = res.csrf;
      authenticatedUser = res.username;
      await enterDashboard();
    } catch (err) {
      messageEl.textContent = err.message;
    }
  });

  // Login Form
  document.querySelector("#login-form").addEventListener("submit", async e => {
    e.preventDefault();
    const username = document.querySelector("#login-username").value.trim();
    const password = document.querySelector("#login-password").value;
    const messageEl = document.querySelector("#login-message");

    try {
      const res = await api("./api/admin/login", {
        method: "POST",
        body: { username, password }
      });
      csrfToken = res.csrf;
      authenticatedUser = res.username;
      await enterDashboard();
    } catch (err) {
      messageEl.textContent = err.message;
    }
  });

  // Logout
  logoutBtn.addEventListener("click", async () => {
    try {
      await api("./api/admin/logout", { method: "POST", body: {} });
    } catch {}
    csrfToken = "";
    authenticatedUser = "";
    showScreen("login");
  });

  function showScreen(screen) {
    setupPanel.hidden = screen !== "setup";
    loginPanel.hidden = screen !== "login";
    restrictedPanel.hidden = screen !== "restricted";
    dashboard.hidden = screen !== "dashboard";
    headerPageControl.hidden = screen !== "dashboard";
    headerCanvasControls.hidden = screen !== "dashboard";
    saveBtn.hidden = screen !== "dashboard";
    logoutBtn.hidden = screen !== "dashboard";
    const ghBadge = document.querySelector("#github-sync-badge");
    if (ghBadge) ghBadge.hidden = screen !== "dashboard";
  }

  async function enterDashboard() {
    showScreen("dashboard");
    logoutBtn.textContent = `Sign out (${authenticatedUser || 'Admin'})`;
    setupSidebarDrag();
    setupMediaLibrary();
    setupInquiries();
    await loadContent();
    fetchGithubStatus();
    loadMediaLibrary();
    loadInquiries();
  }

  // Media Library (Site Settings)
  function setupMediaLibrary() {
    const dropzone = document.querySelector("#library-image-dropzone");
    const fileInput = document.querySelector("#library-file-input");
    const statusEl = document.querySelector("#library-upload-status");

    if (!dropzone || !fileInput) return;

    dropzone.addEventListener("click", () => fileInput.click());

    dropzone.addEventListener("dragover", e => {
      e.preventDefault();
      dropzone.classList.add("is-dragover");
    });
    dropzone.addEventListener("dragleave", () => {
      dropzone.classList.remove("is-dragover");
    });
    dropzone.addEventListener("drop", async e => {
      e.preventDefault();
      dropzone.classList.remove("is-dragover");
      const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type.startsWith("image/"));
      if (files.length === 0) return;
      await uploadFiles(files);
    });

    fileInput.addEventListener("change", async e => {
      const files = Array.from(e.target.files || []).filter(f => f.type.startsWith("image/"));
      if (files.length === 0) return;
      await uploadFiles(files);
      e.target.value = "";
    });

    async function uploadFiles(files) {
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = `Uploading ${files.length} image(s)…`;
      }
      for (const file of files) {
        try {
          await uploadImageFile(file);
        } catch (err) {
          console.error("Upload error:", err);
        }
      }
      if (statusEl) {
        statusEl.textContent = "Upload complete!";
        setTimeout(() => { statusEl.hidden = true; }, 2000);
      }
      await loadMediaLibrary();
    }
  }

  async function loadMediaLibrary() {
    const listEl = document.querySelector("#library-media-list");
    if (!listEl) return;
    try {
      const res = await api("./api/admin/uploads");
      const uploads = Array.isArray(res.uploads) ? res.uploads : [];
      if (uploads.length === 0) {
        listEl.innerHTML = `<p style="font-size:11px; color:var(--text-muted); grid-column:1/-1; margin:6px 0;">No images uploaded yet. Drop image files above to build your media library.</p>`;
        return;
      }
      listEl.innerHTML = uploads.map(item => `
        <div class="media-card" data-url="${escapeHtml(item.url)}" title="Click to use or copy URL">
          <img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.filename)}" loading="lazy" />
          <div class="media-card-info">
            <span>${escapeHtml(item.filename.slice(0, 16))}</span>
            <span>${Math.round(item.size / 1024)} KB</span>
          </div>
        </div>
      `).join("");

      listEl.querySelectorAll(".media-card").forEach(card => {
        card.addEventListener("click", () => {
          const url = card.dataset.url;
          if (selectedElement && selectedElement.tagName.toLowerCase() === "img") {
            selectedElement.src = url;
            const block = findBlock(selectedBlockId);
            if (block && block.content) block.content.url = url;
            setDirty(true);
            alert("Applied image to selected element on page!");
          } else {
            navigator.clipboard?.writeText(url);
            alert(`Copied image URL to clipboard:\n${url}`);
          }
        });
      });
    } catch {
      listEl.innerHTML = `<p style="font-size:11px; color:var(--text-muted); grid-column:1/-1;">Drop images above to add to your library.</p>`;
    }
  }

  // Form Inquiries sent to heylee@absolutionuecna.org
  function setupInquiries() {
    document.querySelector("#btn-refresh-messages")?.addEventListener("click", loadInquiries);
    document.querySelector("#settings-messages")?.addEventListener("toggle", e => {
      if (e.target.open) loadInquiries();
    });
    document.querySelector("#settings-media-library")?.addEventListener("toggle", e => {
      if (e.target.open) loadMediaLibrary();
    });
  }

  async function loadInquiries() {
    const container = document.querySelector("#inquiries-list");
    if (!container) return;
    try {
      const res = await api("./api/admin/messages");
      const messages = Array.isArray(res.messages) ? res.messages : [];
      if (messages.length === 0) {
        container.innerHTML = `<p style="font-size:11px; color:var(--text-muted); margin:0;">No inquiries received yet. All new inquiries submitted on the website will be sent to <strong>heylee@absolutionuecna.org</strong> and logged here.</p>`;
        return;
      }
      container.innerHTML = messages.map(msg => `
        <div class="inquiry-card" data-msg-id="${escapeHtml(msg.id)}">
          <div class="inquiry-header">
            <span>${escapeHtml(msg.senderName)}</span>
            <span class="inquiry-meta">${new Date(msg.createdAt).toLocaleDateString()}</span>
          </div>
          <div>
            <a href="mailto:${escapeHtml(msg.senderEmail)}" class="inquiry-email">${escapeHtml(msg.senderEmail)}</a>
            ${msg.phone ? `<span style="color:var(--text-muted); font-size:10px; margin-left:6px;">☎ ${escapeHtml(msg.phone)}</span>` : ""}
            <span style="font-size:10px; color:var(--text-muted); margin-left:6px;">(${escapeHtml(msg.formType)})</span>
          </div>
          <div class="inquiry-msg">${escapeHtml(msg.message)}</div>
        </div>
      `).join("");
    } catch (err) {
      container.innerHTML = `<p style="font-size:11px; color:var(--text-muted);">Unable to load messages: ${escapeHtml(err.message)}</p>`;
    }
  }

  // Site Settings Handlers
  document.querySelector("#btn-save-site-theme").addEventListener("click", async () => {
    content.theme = {
      headerPink: document.querySelector("#setting-header-color").value,
      headingPink: document.querySelector("#setting-heading-color").value,
      bodyTextColor: document.querySelector("#setting-body-color").value
    };
    setDirty(true);
    await saveContent();
  });

  // ==========================================================================
  // Devotionals & Lessons Manager
  // ==========================================================================
  const DEFAULT_DEVOTIONALS = [
    {
      id: "firm-foundations",
      title: "Firm Foundations",
      description: "Weekly Devotionals for Women of Virtue",
      lessons: [
        {
          id: "lesson-defining-femininity",
          slug: "defining-femininity",
          title: "Defining Femininity",
          publishedAt: "2026-01-05",
          introTitle: "What is a Woman?",
          intro: "Contrary to the blurred lines of the fallen world, the bible defines a woman quite clearly. Follow along to learn what God’s word has to say about the true woman.",
          sections: [
            {
              title: "Creation and Identity",
              paragraphs: [
                "Genesis 1:27",
                "“So God created man in his own image, in the image of God he created him; Male and Female he created them.”",
                "Both Women and Men share equal value in being created in God's image.",
                "Genesis 2:22",
                "“And the rib that the Lord God had taken from the man he made into a Woman and brought her to the man.”",
                "God intentionally formed womanhood."
              ]
            },
            {
              title: "Character and Value",
              paragraphs: [
                "Proverbs 31:30",
                "“Charm is deceitful, and beauty is vain, but a woman who fears the lord is to be praised”",
                "True worth comes from honoring and fearing the Lord",
                "Proverbs 14:1",
                "“Every wise woman buildeth her house; but the foolish plucketh it down with her hands”",
                "A woman’s actions and attitude, both within the home and outside of it, have a profound impact.",
                "Proverbs 31:25",
                "“Strength and honor are her clothing; and she shall rejoice in time to come.”",
                "Character, virtue, and dignity define a powerful and capable woman."
              ]
            },
            {
              title: "Roles and Distinction",
              paragraphs: [
                "Genesis 2:18",
                "“Then the lord God said, ‘It is not good for man to be alone, I shall make a helper fit for him”",
                "The woman was designed as a partner and strong helper. {Ezer}",
                "Ezer was often used to refer to God himself when he was called on for help and rescue.",
                "Deuteronomy 22:5",
                "“A woman shall not wear a man’s garment, nor shall a man put on a woman’s cloak”",
                "Scripture continually affirms a clear distinction between male and female identities."
              ]
            }
          ],
          resourceTitle: "This Weeks Prayer:",
          resource: [
            "The Prayer for the Human Family",
            "“O God, you made us in your own image and redeemed us through Jesus your Son: Look with compassion on the whole human family; take away the arrogance and hatred which infect our hearts; break down the walls that separate us; unite us in bonds of love; and work through our struggle and confusion to accomplish your purposes on earth; that, in your good time, all nations and races may serve you in harmony around your heavenly throne; through Jesus Christ our lord. Amen”",
            "1928 Book of Common Prayer"
          ],
          image: "https://images.squarespace-cdn.com/content/v1/6abaae7844626360a63d6f9d/1790621013944-MPTRWXGPL1YPY8P4GTIT/unsplash-image-iA-YMIV6GoM.jpg?format=500w",
          imageAlt: "Woman praying",
          imageHeight: 1182.5,
          pdfUrl: ""
        },
        {
          id: "lesson-prayer-life-and-church-community",
          slug: "prayer-life-and-church-community",
          title: "Prayer Life and Church Community",
          publishedAt: "2026-01-12",
          introTitle: "Women were never meant to face life alone.",
          intro: "",
          sections: [
            {
              title: "Prayer Life",
              paragraphs: [
                "1 Thessalonians 5:16–18",
                "\"Rejoice always, pray continually, give thanks in all circumstances; for this is God’s will for you in Christ Jesus.\"",
                "When you have a healthy prayer life, it is easier to feel more connected to Christ. Thus making it easier to trust that he is working in your favor.",
                "Romans 12:12",
                "\"Rejoice in hope, be patient in tribulation, be constant in prayer.\"",
                "Scripture regularly reminds us to be “constant in prayer.” We ought not to forsake building a personal relationship with the Lord through prayer."
              ]
            },
            {
              title: "Church Community",
              paragraphs: [
                "Romans 12:4–5:",
                "\"For as in one body we have many members, and the members do not all have the same function, so we, though many, are one body in Christ, and individually members one of another.\"",
                "Every woman brings her own unique set of gifts into the body of Christ.",
                "Galatians 6:2:",
                "\"Bear one another's burdens, and so fulfill the law of Christ.\"",
                "When we are able to rely on each other’s shoulders, we lighten the load of each individual.",
                "Hebrews 10:24–25:",
                "\"And let us consider how to stir up one another to love and good works, not neglecting to meet together, as is the habit of some, but encouraging one another.\"",
                "It is important for sisters in Christ to keep each other not only company, but accountable."
              ]
            }
          ],
          resourceTitle: "Additional Resources",
          resource: [
            "Add a short summary or a list of helpful resources here.",
            "1928 Book of Common Prayer: The General Thanksgiving",
            "Almighty God, Father of all mercies, we thine unworthy servants do give thee most humble and hearty thanks for all thy goodness and loving-kindness to us and to all men. We bless thee for our creation, preservation, and all the blessings of this life; but above all, for thine inestimable love in the redemption of the world by our Lord Jesus Christ; for the means of grace, and for the hope of glory. And, we beseech thee, give us that due sense of all thy mercies, that our hearts may be unfeignedly thankful; and that we show forth thy praise, not only with our lips, but in our lives, by giving up ourselves to thy service, and by walking before thee in holiness and righteousness all our days; through Jesus Christ our Lord, to whom, with thee and the Holy Ghost, be all honor and glory, world without end. Amen."
          ],
          image: "https://images.squarespace-cdn.com/content/v1/6abaae7844626360a63d6f9d/1790624992327-BEGE1WTS3E9WQ4ULYJGH/unsplash-image-mn5sKCN4eFs.jpg?format=500w",
          imageAlt: "Church fellowship",
          imageHeight: 1072.9,
          imageOffset: -4.6,
          pdfUrl: ""
        }
      ]
    }
  ];

  const devotionalsManagerList = document.querySelector("#devotionals-manager-list");
  const modalDevotional = document.querySelector("#modal-devotional");
  const formDevotionalModal = document.querySelector("#form-devotional-modal");
  const devModalId = document.querySelector("#dev-modal-id");
  const devModalTitle = document.querySelector("#dev-modal-title");
  const devModalDesc = document.querySelector("#dev-modal-desc");
  const devModalHeading = document.querySelector("#modal-dev-title-heading");

  const modalLesson = document.querySelector("#modal-lesson");
  const formLessonModal = document.querySelector("#form-lesson-modal");
  const lessonModalId = document.querySelector("#lesson-modal-id");
  const lessonModalDevId = document.querySelector("#lesson-modal-dev-id");
  const lessonModalTitle = document.querySelector("#lesson-modal-title");
  const lessonModalSlug = document.querySelector("#lesson-modal-slug");
  const lessonModalDate = document.querySelector("#lesson-modal-date");
  const lessonModalImage = document.querySelector("#lesson-modal-image");
  const lessonModalImageAlt = document.querySelector("#lesson-modal-image-alt");
  const lessonModalIntroTitle = document.querySelector("#lesson-modal-intro-title");
  const lessonModalIntroBody = document.querySelector("#lesson-modal-intro-body");
  const lessonModalSectionsList = document.querySelector("#lesson-modal-sections-list");
  const lessonModalResourceTitle = document.querySelector("#lesson-modal-resource-title");
  const lessonModalResourceBody = document.querySelector("#lesson-modal-resource-body");
  const lessonModalPdf = document.querySelector("#lesson-modal-pdf");
  const lessonModalHeading = document.querySelector("#modal-lesson-title-heading");

  function ensureDevotionalsInitialized() {
    if (!content.devotionals || !Array.isArray(content.devotionals) || content.devotionals.length === 0) {
      content.devotionals = JSON.parse(JSON.stringify(DEFAULT_DEVOTIONALS));
      return;
    }
    const hasUnits = content.devotionals.some(d => d && Array.isArray(d.lessons));
    if (!hasUnits) {
      const flat = content.devotionals;
      content.devotionals = [
        {
          id: "firm-foundations",
          title: "Firm Foundations",
          description: "Weekly Devotionals for Women of Virtue",
          lessons: flat
        }
      ];
    }
  }

  function updatePageSelectorOptions() {
    const group = document.querySelector("#page-selector-lessons-group");
    const customGroup = document.querySelector("#page-selector-custom-group");
    
    if (group) {
      group.innerHTML = "";
      ensureDevotionalsInitialized();

      content.devotionals.forEach(dev => {
        if (!dev || !Array.isArray(dev.lessons)) return;
        dev.lessons.forEach(l => {
          if (!l || !l.slug) return;
          const opt = document.createElement("option");
          opt.value = `devotionals/${l.slug}`;
          opt.textContent = `${dev.title}: ${l.title || l.slug}`;
          group.append(opt);
        });
      });
    }

    if (customGroup) {
      customGroup.innerHTML = "";
      const standardRoutes = ["home", "about", "contact", "devotionals"];
      const blockKeys = Object.keys(content.blocks || {});
      const customRoutes = blockKeys.filter(k => !standardRoutes.includes(k) && !k.startsWith("devotionals/"));
      customRoutes.forEach(slug => {
        const opt = document.createElement("option");
        opt.value = slug;
        const pageTitle = slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        opt.textContent = `${pageTitle} (#/${slug})`;
        customGroup.append(opt);
      });
    }

    if (currentRoute) {
      pageSelector.value = currentRoute;
    }
  }

  function renderDevotionalsManager() {
    if (!devotionalsManagerList) return;
    ensureDevotionalsInitialized();
    devotionalsManagerList.innerHTML = "";

    content.devotionals.forEach(dev => {
      const card = document.createElement("div");
      card.className = "devotional-card";
      card.dataset.devId = dev.id;

      const lessonCount = (dev.lessons || []).length;
      const countText = `${lessonCount} ${lessonCount === 1 ? 'Lesson' : 'Lessons'}`;

      card.innerHTML = `
        <div class="devotional-card-header">
          <div class="devotional-card-title-wrap">
            <span class="devotional-card-title">${escapeHtml(dev.title)}</span>
            <span class="devotional-badge">${countText}</span>
          </div>
          <div class="devotional-card-actions">
            <button type="button" class="dev-icon-btn is-add" data-action="add-lesson" data-dev-id="${dev.id}" title="Add a new lesson to this devotional">+ Lesson</button>
            <button type="button" class="dev-icon-btn" data-action="edit-dev" data-dev-id="${dev.id}" title="Edit devotional title">✎</button>
            <button type="button" class="dev-icon-btn is-danger" data-action="delete-dev" data-dev-id="${dev.id}" title="Delete devotional">✕</button>
          </div>
        </div>
        ${dev.description ? `<p style="padding:6px 12px 0; margin:0; font-size:11px; color:var(--text-muted);">${escapeHtml(dev.description)}</p>` : ''}
        <ul class="dev-lesson-list">
          ${lessonCount === 0 ? `<li class="dev-lesson-item" style="color:var(--text-muted); font-style:italic;">No lessons added yet. Click "+ Lesson" above to add one.</li>` : ''}
          ${(dev.lessons || []).map(l => `
            <li class="dev-lesson-item" data-lesson-id="${l.id}">
              <div class="dev-lesson-info">
                <span class="dev-lesson-title">${escapeHtml(l.title)}</span>
                ${l.publishedAt ? `<span class="dev-lesson-date">${escapeHtml(l.publishedAt)}</span>` : ''}
              </div>
              <div class="dev-lesson-actions">
                <button type="button" class="dev-lesson-action-btn" data-action="preview-lesson" data-dev-id="${dev.id}" data-lesson-slug="${l.slug}" title="Preview lesson on canvas">👁️</button>
                <button type="button" class="dev-lesson-action-btn" data-action="edit-lesson" data-dev-id="${dev.id}" data-lesson-id="${l.id}" title="Edit lesson content">✎</button>
                <button type="button" class="dev-lesson-action-btn is-delete" data-action="delete-lesson" data-dev-id="${dev.id}" data-lesson-id="${l.id}" title="Delete lesson">✕</button>
              </div>
            </li>
          `).join("")}
        </ul>
      `;

      devotionalsManagerList.append(card);
    });

    // Also update legacy site-settings devotional-list if present
    const legacyList = document.querySelector("#devotional-list");
    if (legacyList) {
      legacyList.innerHTML = "";
      content.devotionals.forEach(dev => {
        (dev.lessons || []).forEach(l => {
          const li = document.createElement("li");
          li.innerHTML = `
            <span><strong>${escapeHtml(dev.title)}:</strong> ${escapeHtml(l.title)} <small style="color:var(--text-muted);">(${l.publishedAt || ''})</small></span>
            <button type="button" data-del-lesson-pair="${dev.id}:${l.id}">Remove</button>
          `;
          legacyList.append(li);
        });
      });
    }
  }

  // Delegated clicks for manager cards
  if (devotionalsManagerList) {
    devotionalsManagerList.addEventListener("click", e => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const action = btn.dataset.action;
      const devId = btn.dataset.devId;
      const lessonId = btn.dataset.lessonId;
      const lessonSlug = btn.dataset.lessonSlug;

      if (action === "add-lesson") {
        openLessonModal(devId);
      } else if (action === "edit-dev") {
        openDevotionalModal(devId);
      } else if (action === "delete-dev") {
        deleteDevotional(devId);
      } else if (action === "preview-lesson") {
        currentRoute = `devotionals/${lessonSlug}`;
        pageSelector.value = currentRoute;
        selectedBlockId = null;
        selectedElement = null;
        selectedCmsKey = null;
        refreshPreview();
      } else if (action === "edit-lesson") {
        openLessonModal(devId, lessonId);
      } else if (action === "delete-lesson") {
        deleteLesson(devId, lessonId);
      }
    });
  }

  const legacyDevList = document.querySelector("#devotional-list");
  if (legacyDevList) {
    legacyDevList.addEventListener("click", e => {
      const btn = e.target.closest("button[data-del-lesson-pair]");
      if (!btn) return;
      const [devId, lessonId] = btn.dataset.delLessonPair.split(":");
      deleteLesson(devId, lessonId);
    });
  }

  function deleteDevotional(devId) {
    const dev = content.devotionals.find(d => d.id === devId);
    if (!dev) return;
    if (!confirm(`Are you sure you want to delete "${dev.title}" and its ${(dev.lessons || []).length} lesson(s)?`)) return;
    content.devotionals = content.devotionals.filter(d => d.id !== devId);
    setDirty(true);
    renderDevotionalsManager();
    updatePageSelectorOptions();
    saveContent();
    refreshPreview();
  }

  function deleteLesson(devId, lessonId) {
    const dev = content.devotionals.find(d => d.id === devId);
    if (!dev || !Array.isArray(dev.lessons)) return;
    const lesson = dev.lessons.find(l => l.id === lessonId);
    if (!lesson) return;
    if (!confirm(`Are you sure you want to delete lesson "${lesson.title}"?`)) return;
    dev.lessons = dev.lessons.filter(l => l.id !== lessonId);
    setDirty(true);
    renderDevotionalsManager();
    updatePageSelectorOptions();
    saveContent();
    refreshPreview();
  }

  function openDevotionalModal(devId = null) {
    if (!modalDevotional) return;
    if (devId) {
      const dev = content.devotionals.find(d => d.id === devId);
      if (dev) {
        devModalId.value = dev.id;
        devModalTitle.value = dev.title || "";
        devModalDesc.value = dev.description || "";
        devModalHeading.textContent = "Edit Devotional Course";
      }
    } else {
      devModalId.value = "";
      devModalTitle.value = "";
      devModalDesc.value = "";
      devModalHeading.textContent = "Create Devotional Course";
    }
    modalDevotional.hidden = false;
    devModalTitle.focus();
  }

  function closeDevotionalModal() {
    if (modalDevotional) modalDevotional.hidden = true;
  }

  document.querySelector("#btn-add-devotional-modal")?.addEventListener("click", () => openDevotionalModal());
  document.querySelector("#btn-close-dev-modal")?.addEventListener("click", closeDevotionalModal);
  document.querySelector("#btn-cancel-dev-modal")?.addEventListener("click", closeDevotionalModal);

  formDevotionalModal?.addEventListener("submit", async e => {
    e.preventDefault();
    const title = devModalTitle.value.trim();
    const desc = devModalDesc.value.trim();
    const id = devModalId.value;

    if (!title) return;
    ensureDevotionalsInitialized();

    if (id) {
      const dev = content.devotionals.find(d => d.id === id);
      if (dev) {
        dev.title = title;
        dev.description = desc;
      }
    } else {
      const newId = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `dev-${Date.now().toString(36)}`;
      content.devotionals.push({
        id: newId,
        title,
        description: desc,
        lessons: []
      });
    }

    closeDevotionalModal();
    setDirty(true);
    renderDevotionalsManager();
    updatePageSelectorOptions();
    await saveContent();
    refreshPreview();
  });

  function addSectionRow(title = "", paragraphsText = "") {
    if (!lessonModalSectionsList) return;
    const row = document.createElement("div");
    row.className = "section-builder-item";
    row.innerHTML = `
      <div class="section-builder-item-header">
        <input type="text" class="section-title-input" placeholder="Section Heading (e.g. Creation and Identity)" value="${escapeHtml(title)}" required />
        <button type="button" class="btn-remove-section">✕ Remove</button>
      </div>
      <textarea class="section-body-input" rows="4" placeholder="Scriptures, verses and reflection paragraphs. Separate paragraphs with an empty blank line.">${escapeHtml(paragraphsText)}</textarea>
    `;

    row.querySelector(".btn-remove-section").addEventListener("click", () => {
      row.remove();
    });

    lessonModalSectionsList.append(row);
  }

  document.querySelector("#btn-add-section-row")?.addEventListener("click", () => addSectionRow());

  function openLessonModal(devId = null, lessonId = null) {
    if (!modalLesson) return;
    ensureDevotionalsInitialized();

    lessonModalDevId.innerHTML = "";
    content.devotionals.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = d.title;
      lessonModalDevId.append(opt);
    });

    if (devId) {
      lessonModalDevId.value = devId;
    }

    lessonModalSectionsList.innerHTML = "";

    if (lessonId) {
      let targetLesson = null;
      let parentDev = null;
      for (const d of content.devotionals) {
        const found = (d.lessons || []).find(l => l.id === lessonId);
        if (found) {
          targetLesson = found;
          parentDev = d;
          break;
        }
      }

      if (targetLesson) {
        lessonModalHeading.textContent = "Edit Lesson";
        lessonModalId.value = targetLesson.id;
        if (parentDev) lessonModalDevId.value = parentDev.id;
        lessonModalTitle.value = targetLesson.title || "";
        lessonModalSlug.value = targetLesson.slug || "";
        lessonModalDate.value = targetLesson.publishedAt || "";
        lessonModalImage.value = targetLesson.image || "";
        lessonModalImageAlt.value = targetLesson.imageAlt || "";
        lessonModalIntroTitle.value = targetLesson.introTitle || targetLesson.title || "";
        lessonModalIntroBody.value = targetLesson.intro || "";
        lessonModalResourceTitle.value = targetLesson.resourceTitle || "Additional Resources";

        let resText = "";
        if (Array.isArray(targetLesson.resource)) {
          resText = targetLesson.resource.map(p => typeof p === 'object' && p !== null ? (p.html || '') : p).join("\n\n");
        } else if (targetLesson.resource) {
          resText = targetLesson.resource;
        }
        lessonModalResourceBody.value = resText;
        lessonModalPdf.value = targetLesson.pdfUrl || "";

        if (Array.isArray(targetLesson.sections) && targetLesson.sections.length > 0) {
          targetLesson.sections.forEach(s => {
            const sTitle = Array.isArray(s) ? s[0] : s.title;
            const sParas = Array.isArray(s) ? s[1] : s.paragraphs;
            const paraText = Array.isArray(sParas)
              ? sParas.map(p => typeof p === 'object' && p !== null ? (p.html || '') : p).join("\n\n")
              : "";
            addSectionRow(sTitle, paraText);
          });
        } else {
          addSectionRow("Biblical Foundation", "");
        }
      }
    } else {
      lessonModalHeading.textContent = "Add Lesson";
      lessonModalId.value = "";
      lessonModalTitle.value = "";
      lessonModalSlug.value = "";
      lessonModalDate.value = new Date().toISOString().split("T")[0];
      lessonModalImage.value = "";
      lessonModalImageAlt.value = "";
      lessonModalIntroTitle.value = "";
      lessonModalIntroBody.value = "";
      lessonModalResourceTitle.value = "This Week's Prayer:";
      lessonModalResourceBody.value = "";
      lessonModalPdf.value = "";

      addSectionRow("Biblical Foundation", "");
    }

    modalLesson.hidden = false;
    lessonModalTitle.focus();
  }

  function closeLessonModal() {
    if (modalLesson) modalLesson.hidden = true;
  }

  document.querySelector("#btn-close-lesson-modal")?.addEventListener("click", closeLessonModal);
  document.querySelector("#btn-cancel-lesson-modal")?.addEventListener("click", closeLessonModal);

  lessonModalTitle?.addEventListener("input", () => {
    if (!lessonModalId.value) {
      lessonModalSlug.value = lessonModalTitle.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    }
    if (!lessonModalIntroTitle.value || lessonModalIntroTitle.value === lessonModalTitle.value.slice(0, -1)) {
      lessonModalIntroTitle.value = lessonModalTitle.value;
    }
  });

  formLessonModal?.addEventListener("submit", async e => {
    e.preventDefault();
    const lessonId = lessonModalId.value;
    const targetDevId = lessonModalDevId.value;
    const title = lessonModalTitle.value.trim();
    let slug = lessonModalSlug.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!slug) {
      slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `lesson-${Date.now().toString(36)}`;
    }
    const date = lessonModalDate.value;
    const image = lessonModalImage.value.trim();
    const imageAlt = lessonModalImageAlt.value.trim();
    const introTitle = lessonModalIntroTitle.value.trim() || title;
    const introBody = lessonModalIntroBody.value.trim();
    const resourceTitle = lessonModalResourceTitle.value.trim() || "Additional Resources";
    const resourceRaw = lessonModalResourceBody.value.trim();
    const resource = resourceRaw ? resourceRaw.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean) : [];
    const pdfUrl = lessonModalPdf.value.trim();

    const sections = [];
    lessonModalSectionsList.querySelectorAll(".section-builder-item").forEach(item => {
      const sTitle = (item.querySelector(".section-title-input")?.value || "").trim();
      const sBody = (item.querySelector(".section-body-input")?.value || "").trim();
      if (sTitle) {
        const paragraphs = sBody ? sBody.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean) : [];
        sections.push({
          title: sTitle,
          paragraphs: paragraphs
        });
      }
    });

    ensureDevotionalsInitialized();

    const lessonData = {
      id: lessonId || `lesson-${slug}`,
      slug: slug,
      title: title,
      publishedAt: date,
      introTitle: introTitle,
      intro: introBody,
      sections: sections,
      resourceTitle: resourceTitle,
      resource: resource,
      image: image,
      imageAlt: imageAlt,
      pdfUrl: pdfUrl,
      imageHeight: 600,
      imageOffset: 0
    };

    for (const d of content.devotionals) {
      if (Array.isArray(d.lessons)) {
        d.lessons = d.lessons.filter(l => l.id !== lessonData.id && l.slug !== lessonData.slug);
      }
    }

    let targetDev = content.devotionals.find(d => d.id === targetDevId);
    if (!targetDev) {
      targetDev = content.devotionals[0];
    }
    if (!targetDev.lessons) targetDev.lessons = [];
    targetDev.lessons.push(lessonData);

    closeLessonModal();
    setDirty(true);
    renderDevotionalsManager();
    updatePageSelectorOptions();
    await saveContent();

    currentRoute = `devotionals/${slug}`;
    pageSelector.value = currentRoute;
    refreshPreview();
  });

  // Export / Import
  document.querySelector("#btn-export-content").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "content.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  document.querySelector("#btn-import-content").addEventListener("click", () => {
    document.querySelector("#import-file").click();
  });
  document.querySelector("#import-file").addEventListener("change", async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      content = JSON.parse(text);
      setDirty(true);
      await saveContent();
      ensureDevotionalsInitialized();
      renderDevotionalsManager();
      updatePageSelectorOptions();
      refreshPreview();
      alert("Content imported successfully!");
    } catch (err) {
      alert("Import failed: " + err.message);
    } finally {
      e.target.value = "";
    }
  });

  // ==========================================
  // Custom Page Creator Modal
  // ==========================================
  const modalNewPage = document.querySelector("#modal-new-page");
  const formNewPageModal = document.querySelector("#form-new-page-modal");
  const newPageTitleInput = document.querySelector("#new-page-title");
  const newPageSlugInput = document.querySelector("#new-page-slug");
  const newPageTemplateSelect = document.querySelector("#new-page-template");
  const btnOpenNewPageModal = document.querySelector("#btn-open-new-page-modal");
  const btnCloseNewPageModal = document.querySelector("#btn-close-new-page-modal");
  const btnCancelNewPageModal = document.querySelector("#btn-cancel-new-page-modal");

  function openNewPageModal() {
    if (!modalNewPage) return;
    if (newPageTitleInput) newPageTitleInput.value = "";
    if (newPageSlugInput) newPageSlugInput.value = "";
    if (newPageTemplateSelect) newPageTemplateSelect.value = "standard";
    modalNewPage.hidden = false;
    newPageTitleInput?.focus();
  }

  function closeNewPageModal() {
    if (modalNewPage) modalNewPage.hidden = true;
  }

  btnOpenNewPageModal?.addEventListener("click", openNewPageModal);
  btnCloseNewPageModal?.addEventListener("click", closeNewPageModal);
  btnCancelNewPageModal?.addEventListener("click", closeNewPageModal);

  newPageTitleInput?.addEventListener("input", () => {
    if (newPageSlugInput) {
      newPageSlugInput.value = newPageTitleInput.value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    }
  });

  formNewPageModal?.addEventListener("submit", async e => {
    e.preventDefault();
    const title = (newPageTitleInput?.value || "").trim();
    let slug = (newPageSlugInput?.value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!slug) slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `page-${Date.now().toString(36)}`;
    const template = newPageTemplateSelect?.value || "standard";

    if (!content.blocks) content.blocks = {};
    if (!Array.isArray(content.blocks[slug])) {
      if (template === "standard") {
        content.blocks[slug] = [
          {
            id: `block_hero_${Date.now()}`,
            type: "hero",
            content: {
              eyebrow: "Women of Virtue",
              title1: title,
              title2: "Walk in Wisdom",
              description: "Welcome to our new page. You can customize this layout directly with visual tools.",
              buttonText: "Get in Touch",
              buttonLink: "#/contact",
              backgroundImage: PRESET_IMAGES[4].url
            },
            style: { paddingTop: "80px", paddingBottom: "90px" }
          },
          {
            id: `block_text_${Date.now() + 1}`,
            type: "text",
            content: {
              html: `<p>Welcome to <strong>${escapeHtml(title)}</strong>. We are dedicated to walking alongside women who seek godly character, modesty, and strength in the Lord.</p>`
            },
            style: { paddingTop: "30px", paddingBottom: "30px", fontSize: "17px" }
          },
          {
            id: `block_cta_${Date.now() + 2}`,
            type: "cta",
            content: {
              title: "Join Our Fellowship",
              subtitle: "Sign up for weekly devotionals and stay connected with our community.",
              buttonText: "Browse Devotionals",
              buttonLink: "#/devotionals",
              variant: "brand"
            },
            style: { paddingTop: "50px", paddingBottom: "50px" }
          }
        ];
      } else if (template === "media-focus") {
        content.blocks[slug] = [
          {
            id: `block_hero_${Date.now()}`,
            type: "hero",
            content: {
              eyebrow: "Featured Media & Study",
              title1: title,
              title2: "Audio & Reflection",
              description: "Listen, reflect, and meditate on this week's message.",
              buttonText: "Contact Heylee",
              buttonLink: "#/contact",
              backgroundImage: PRESET_IMAGES[2].url
            },
            style: { paddingTop: "70px", paddingBottom: "80px" }
          },
          {
            id: `block_video_${Date.now() + 1}`,
            type: "video",
            content: {
              url: "https://www.youtube.com/watch?v=y6120QOlsfU",
              title: "Featured Video Message",
              caption: "Scripture study and reflection for the week."
            },
            style: { paddingTop: "30px", paddingBottom: "20px" }
          },
          {
            id: `block_callout_${Date.now() + 2}`,
            type: "callout",
            content: {
              icon: "🕊️",
              title: "Scripture Focus",
              text: "She opens her mouth with wisdom, and the teaching of kindness is on her tongue. (Proverbs 31:26)",
              variant: "prayer"
            },
            style: { paddingTop: "15px", paddingBottom: "25px" }
          },
          {
            id: `block_cta_${Date.now() + 3}`,
            type: "cta",
            content: {
              title: "Connect With Our Group",
              subtitle: "Share prayer requests, thoughts, or questions with our community.",
              buttonText: "Get in Touch",
              buttonLink: "#/contact",
              variant: "dark"
            },
            style: { paddingTop: "50px", paddingBottom: "50px" }
          }
        ];
      } else {
        // Blank canvas
        content.blocks[slug] = [
          {
            id: `block_heading_${Date.now()}`,
            type: "heading",
            content: { text: title, tag: "h1" },
            style: { paddingTop: "60px", paddingBottom: "20px", textAlign: "center", fontSize: "36px" }
          }
        ];
      }
    }

    closeNewPageModal();
    setDirty(true);
    updatePageSelectorOptions();
    currentRoute = slug;
    pageSelector.value = slug;
    await saveContent();
    refreshPreview();
  });

  // Helper
  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[c]);
  }

  // Preview load event
  preview.addEventListener("load", bindPreviewCanvas);

  // Initialize
  async function init() {
    try {
      const status = await api("./api/admin/status");
      if (status.authenticated) {
        csrfToken = status.csrf;
        authenticatedUser = status.username;
        await enterDashboard();
      } else if (status.setupRequired) {
        showScreen("setup");
      } else {
        showScreen("login");
      }
    } catch {
      showScreen("restricted");
    }
  }

  init();
})();