const setupPanel = document.querySelector("#setup-panel");
const loginPanel = document.querySelector("#login-panel");
const dashboard = document.querySelector("#dashboard");
const statusLabel = document.querySelector("#connection-status");
const preview = document.querySelector("#site-preview");
const copyField = document.querySelector("#selected-copy");
const copySave = document.querySelector("#save-copy");
const copyMessage = document.querySelector("#copy-message");
const devotionalForm = document.querySelector("#devotional-form");
const devotionalMessage = document.querySelector("#devotional-message");
const devotionalList = document.querySelector("#devotional-list");
const storageModeLabel = document.querySelector("#storage-mode");
const richEditors = [...document.querySelectorAll(".rich-editor")];
const browserContentKey = "women-of-virtue-content-v1";
const heroCopyFields = [
  ["hero-title-one", "home:hero-title-one", "Reject Culture"],
  ["hero-title-two", "home:hero-title-two", "Follow Christ"],
  ["hero-description", "home:hero-description", "Join the movement to bring back traditional Femininity."],
  ["hero-button-text", "home:hero-button-text", "Learn More"]
];

let csrfToken = "";
let selectedKey = "";
let selectedElement = null;
let activeRichEditor = copyField;
let draggedLayoutElement = null;
let storageMode = "server";
let adminDragState = null;
let content = { copyOverrides: {}, richTextOverrides: {}, textStyles: {}, theme: {}, graphics: {}, layout: {}, positionOverrides: {}, devotionals: [] };

function normalizeGodCapitalization(value) {
  return String(value || "")
    .replace(/\bgod['’]s\b/gi, match => match.endsWith("’s") ? "God’s" : "God's")
    .replace(/\bgods\b/gi, "Gods")
    .replace(/\bgod\b/gi, "God");
}

function normalizePositionOverrides(data = {}) {
  const raw = data && typeof data === "object" ? data : {};
  return Object.fromEntries(Object.entries(raw).filter(([key, value]) => typeof key === "string" && value && typeof value === "object").map(([key, value]) => {
    const x = Number(value.x);
    const y = Number(value.y);
    const width = Number(value.width);
    const height = Number(value.height);
    return [key, {
      x: Number.isFinite(x) ? x : 0,
      y: Number.isFinite(y) ? y : 0,
      width: Number.isFinite(width) ? Math.max(80, width) : null,
      height: Number.isFinite(height) ? Math.max(40, height) : null
    }];
  }));
}

function normalizeContent(data = {}) {
  const copyOverrides = Object.fromEntries(Object.entries(data.copyOverrides || {}).map(([key, value]) => [key, normalizeGodCapitalization(value)]));
  const richTextOverrides = Object.fromEntries(Object.entries(data.richTextOverrides || {}).map(([key, value]) => [key, sanitizeRichHtml(value)]));
  const layoutGroups = new Set(["home-sections", "home-gallery", "about-columns", "contact-columns", "course-sections", "course-lessons", "lesson-page", "lesson-columns", "site-header", "site-navigation"]);
  return {
    copyOverrides,
    richTextOverrides,
    textStyles: data.textStyles || {},
    theme: data.theme || {},
    graphics: data.graphics && typeof data.graphics === "object" ? data.graphics : {},
    layout: Object.fromEntries(Object.entries(data.layout || {}).filter(([group, keys]) => layoutGroups.has(group) && Array.isArray(keys)).map(([group, keys]) => [group, [...new Set(keys.filter(key => typeof key === "string" && /^[a-z0-9:-]{1,120}$/.test(key)))].slice(0, 50)])),
    positionOverrides: normalizePositionOverrides(data.positionOverrides),
    devotionals: Array.isArray(data.devotionals) ? data.devotionals.map(item => ({
      ...item,
      title: normalizeGodCapitalization(item.title),
      titleHtml: sanitizeRichHtml(item.titleHtml),
      publishedAt: /^\d{4}-\d{2}-\d{2}$/.test(item.publishedAt || "") ? item.publishedAt : "",
      introTitle: normalizeGodCapitalization(item.introTitle || item.title),
      intro: sanitizeRichHtml(item.intro),
      body: sanitizeRichHtml(item.body),
      sections: Array.isArray(item.sections) ? item.sections.filter(Boolean).map(section => {
        const [title, paragraphs] = Array.isArray(section) ? section : [section.title, section.paragraphs];
        return [normalizeGodCapitalization(title), Array.isArray(paragraphs) ? paragraphs.map(paragraph => (
          paragraph && typeof paragraph === "object" && Object.hasOwn(paragraph, "html")
            ? { ...paragraph, html: sanitizeRichHtml(paragraph.html) }
            : normalizeGodCapitalization(paragraph)
        )) : []];
      }) : [],
      resourceTitle: normalizeGodCapitalization(item.resourceTitle || "Additional Resources"),
      resource: sanitizeRichHtml(item.resource),
      imageAlt: normalizeGodCapitalization(item.imageAlt || "")
    })) : []
  };
}

function sanitizeRichHtml(value) {
  const template = document.createElement("template");
  template.innerHTML = String(value || "");
  const allowed = new Set(["B", "STRONG", "I", "EM", "U", "P", "BR", "UL", "OL", "LI", "H1", "H2", "H3", "H4", "BLOCKQUOTE", "DIV", "SPAN", "FONT"]);
  const fonts = new Set(["Georgia, serif", "Arial, sans-serif", "cursive"]);
  const clean = parent => [...parent.children].forEach(element => {
    clean(element);
    if (!allowed.has(element.tagName)) {
      element.replaceWith(...element.childNodes);
      return;
    }
    [...element.attributes].forEach(attribute => {
      if (attribute.name !== "style" && !(element.tagName === "FONT" && ["color", "face", "size"].includes(attribute.name))) element.removeAttribute(attribute.name);
    });
    if (element.tagName === "FONT") {
      if (element.hasAttribute("color") && !/^#[0-9a-f]{6}$/i.test(element.getAttribute("color"))) element.removeAttribute("color");
      if (element.hasAttribute("face") && !fonts.has(element.getAttribute("face"))) element.removeAttribute("face");
      if (element.hasAttribute("size") && !/^[1-7]$/.test(element.getAttribute("size"))) element.removeAttribute("size");
    }
    if (element.hasAttribute("style")) {
      const align = element.style.textAlign;
      const color = element.style.color;
      const family = element.style.fontFamily.replaceAll('"', "").replaceAll("'", "");
      const size = element.style.fontSize;
      const safe = [];
      if (["left", "center", "right", "justify"].includes(align)) safe.push(`text-align:${align}`);
      if (/^#[0-9a-f]{6}$/i.test(color)) safe.push(`color:${color}`);
      if (fonts.has(family)) safe.push(`font-family:${family}`);
      if (/^(?:1[0-9]|2[0-9]|3[0-6]|48)px$/.test(size)) safe.push(`font-size:${size}`);
      if (safe.length) element.setAttribute("style", safe.join(";"));
      else element.removeAttribute("style");
    }
  });
  clean(template.content);
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) walker.currentNode.nodeValue = normalizeGodCapitalization(walker.currentNode.nodeValue);
  return template.innerHTML;
}

function getAdminElementId(element) {
  if (!element) return "";
  return element.dataset.cmsLayoutKey || element.dataset.cmsKey || "";
}

function getPositionOverride(id) {
  const override = content.positionOverrides[id];
  if (!override || typeof override !== "object") return { x: 0, y: 0, width: null, height: null };
  return {
    x: Number.isFinite(Number(override.x)) ? Number(override.x) : 0,
    y: Number.isFinite(Number(override.y)) ? Number(override.y) : 0,
    width: Number.isFinite(Number(override.width)) ? Math.max(80, Number(override.width)) : null,
    height: Number.isFinite(Number(override.height)) ? Math.max(40, Number(override.height)) : null
  };
}

function syncPositionOverride(element, override) {
  if (!element) return;
  if (override.x || override.y) element.style.transform = `translate(${override.x}px, ${override.y}px)`;
  else element.style.transform = "";
  if (override.width !== null) element.style.width = `${override.width}px`;
  else element.style.width = "";
  if (override.height !== null) element.style.height = `${override.height}px`;
  else element.style.height = "";
  element.style.position = "relative";
  element.style.maxWidth = "none";
}

function applyPreviewLayoutAdjustments(documentInFrame) {
  if (!documentInFrame) return;
  documentInFrame.querySelectorAll("[data-cms-layout-group][data-cms-layout-key], [data-cms-key]").forEach(element => {
    const id = getAdminElementId(element);
    if (!id) return;
    const override = getPositionOverride(id);
    syncPositionOverride(element, override);
    element.classList.add("admin-layout-editable");
    if (!element.querySelector(".admin-layout-handle")) {
      const handle = documentInFrame.createElement("span");
      handle.className = "admin-layout-handle";
      handle.setAttribute("aria-label", "Resize layout element");
      handle.title = "Resize element";
      element.append(handle);
    }
  });
}

async function runLayoutSelfCheck() {
  const documentInFrame = preview.contentDocument;
  const candidate = documentInFrame?.querySelector("[data-cms-layout-group][data-cms-layout-key], [data-cms-key]");
  if (!candidate) {
    statusLabel.textContent = "Layout self-check skipped: no preview elements are available.";
    return;
  }
  const id = getAdminElementId(candidate);
  const original = getPositionOverride(id);
  const width = Math.max(180, candidate.getBoundingClientRect().width || 180) + 26;
  const height = Math.max(80, candidate.getBoundingClientRect().height || 80) + 20;
  const next = { x: (original.x || 0) + 18, y: (original.y || 0) + 12, width, height };
  content.positionOverrides[id] = next;
  syncPositionOverride(candidate, next);
  try {
    await saveContent();
    statusLabel.textContent = "Layout self-check passed: drag and resize state persisted.";
  } catch (error) {
    content.positionOverrides[id] = original;
    syncPositionOverride(candidate, original);
    statusLabel.textContent = `Layout self-check failed: ${error.message}`;
  }
}

function previewUrl(route = "#/") {
  const url = new URL("./index.html", window.location.href);
  url.searchParams.set("cmsPreview", "1");
  url.hash = route;
  return url.href;
}

function setPreviewThemeInputs() {
  document.querySelector("#header-color").value = content.theme.headerPink || "#d4967d";
  document.querySelector("#heading-color").value = content.theme.headingPink || "#ffc0cb";
  document.querySelector("#body-color").value = content.theme.bodyTextColor || "#303636";
  heroCopyFields.forEach(([id, key, fallback]) => {
    document.querySelector(`#${id}`).value = Object.hasOwn(content.copyOverrides, key) ? content.copyOverrides[key] : fallback;
  });
  document.querySelectorAll("[data-graphic]").forEach(input => {
    input.value = content.graphics[input.dataset.graphic] || "";
  });
}

async function api(path, options = {}) {
  const method = options.method || "GET";
  const headers = { ...(options.headers || {}) };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET" && csrfToken) headers["X-CSRF-Token"] = csrfToken;
  const response = await fetch(path, {
    method,
    headers,
    credentials: "same-origin",
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
  return result;
}

function showAccess(mode) {
  setupPanel.hidden = mode !== "setup";
  loginPanel.hidden = mode !== "login";
  dashboard.hidden = mode !== "dashboard";
}

function showMessage(element, message, isError = true) {
  element.textContent = message;
  element.classList.toggle("is-success", !isError);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

async function loadContent() {
  if (storageMode === "server") {
    content = normalizeContent(await api("./api/admin/content"));
  } else {
    let loaded = null;
    try {
      const local = localStorage.getItem(browserContentKey);
      if (local) loaded = JSON.parse(local);
    } catch {}
    if (!loaded && window.location.protocol !== "file:") {
      try {
        const response = await fetch("./content.json", { cache: "no-store" });
        if (response.ok) loaded = await response.json();
      } catch {}
    }
    content = normalizeContent(loaded || {});
  }
  renderDevotionals();
  setPreviewThemeInputs();
}

async function saveContent() {
  if (storageMode === "server") {
    await api("./api/admin/content", { method: "PUT", body: content });
  } else {
    localStorage.setItem(browserContentKey, JSON.stringify(content));
  }
}

function downloadContent() {
  const blob = new Blob([JSON.stringify(normalizeContent(content), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "content.json";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function importContentFile(file) {
  const parsed = JSON.parse(await file.text());
  content = normalizeContent(parsed);
  await saveContent();
  renderDevotionals();
  setPreviewThemeInputs();
  preview.src = previewUrl();
}

function renderDevotionals() {
  if (!content.devotionals.length) {
    devotionalList.innerHTML = "<li class=\"empty-list\">No added devotionals</li>";
    return;
  }
  devotionalList.innerHTML = content.devotionals.map((item, index) => `<li><span>${escapeHtml(item.title)}${item.publishedAt ? `<small>${escapeHtml(item.publishedAt)}</small>` : ""}</span><button type="button" data-remove="${index}" aria-label="Remove ${escapeHtml(item.title)}">Remove</button></li>`).join("");
}

function todayDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

document.querySelector("#devotional-date").value = todayDate();

const devotionalSections = document.querySelector("#devotional-sections");
const devotionalSectionTemplate = document.querySelector("#devotional-section-template");

function updateDevotionalSectionLabels() {
  const fields = [...devotionalSections.querySelectorAll(".devotional-section-field")];
  fields.forEach((field, index) => {
    field.querySelector("legend").textContent = `Section ${index + 1}`;
    field.querySelector("[data-remove-section]").disabled = fields.length === 1;
  });
}

function persistPreviewLayout(source, target, dropEvent) {
  const group = source.dataset.cmsLayoutGroup;
  const parent = source.parentElement;
  if (target === source || target.parentElement !== parent || target.dataset.cmsLayoutGroup !== group) return;
  const previousOrder = Array.isArray(content.layout[group]) ? [...content.layout[group]] : null;
  const sourceRect = source.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const sameRow = sourceRect.top < targetRect.bottom && sourceRect.bottom > targetRect.top;
  const insertBefore = sameRow
    ? dropEvent.clientX < targetRect.left + targetRect.width / 2
    : dropEvent.clientY < targetRect.top + targetRect.height / 2;
  parent.insertBefore(source, insertBefore ? target : target.nextSibling);
  content.layout[group] = [...parent.children]
    .filter(element => element.dataset.cmsLayoutGroup === group)
    .map(element => element.dataset.cmsLayoutKey);
  saveContent().then(() => {
    statusLabel.textContent = "Layout saved";
  }).catch(error => {
    if (previousOrder) content.layout[group] = previousOrder;
    else delete content.layout[group];
    applyCmsLayout();
    statusLabel.textContent = `Layout was not saved: ${error.message}`;
  });
}

document.querySelector("#add-devotional-section").addEventListener("click", () => {
  devotionalSections.append(devotionalSectionTemplate.content.cloneNode(true));
  updateDevotionalSectionLabels();
});

devotionalSections.addEventListener("click", event => {
  const removeButton = event.target.closest("[data-remove-section]");
  if (!removeButton || devotionalSections.querySelectorAll(".devotional-section-field").length === 1) return;
  removeButton.closest(".devotional-section-field").remove();
  updateDevotionalSectionLabels();
});

function bindPreview() {
  const documentInFrame = preview.contentDocument;
  if (!documentInFrame) return;
  documentInFrame.querySelector("#cms-admin-preview-style")?.remove();
  const style = documentInFrame.createElement("style");
  style.id = "cms-admin-preview-style";
  style.textContent = "[data-cms-key]{cursor:crosshair!important}[data-cms-key]:hover{outline:2px dashed #d4967d!important;outline-offset:2px!important}[data-cms-layout-group][draggable=true]{cursor:grab!important}[data-cms-layout-group][draggable=true]:active{cursor:grabbing!important}[data-cms-layout-drop-target]{outline:3px solid #698777!important;outline-offset:2px!important}";
  documentInFrame.head.append(style);
  documentInFrame.querySelectorAll("[data-cms-layout-group][data-cms-layout-key]").forEach(element => {
    element.draggable = true;
    element.setAttribute("aria-grabbed", "false");
    element.title = "Drag to rearrange or resize";
  });
  applyPreviewLayoutAdjustments(documentInFrame);
  let currentDropTarget = null;
  documentInFrame.addEventListener("pointerdown", event => {
    const handle = event.target.closest(".admin-layout-handle");
    const editable = event.target.closest("[data-cms-layout-group][data-cms-layout-key], [data-cms-key]");
    if (!editable || event.target.closest("a,button,summary,label,input,textarea,select")) return;
    const id = getAdminElementId(editable);
    if (!id) return;
    event.preventDefault();
    if (handle) {
      adminDragState = {
        mode: "resize",
        id,
        element: editable,
        startX: event.clientX,
        startY: event.clientY,
        initial: getPositionOverride(id)
      };
      return;
    }
    adminDragState = {
      mode: "move",
      id,
      element: editable,
      startX: event.clientX,
      startY: event.clientY,
      initial: getPositionOverride(id)
    };
    editable.classList.add("admin-being-edited");
  }, true);
  documentInFrame.addEventListener("pointermove", event => {
    if (!adminDragState) return;
    const { mode, id, element, startX, startY, initial } = adminDragState;
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    const next = {
      x: mode === "move" ? (initial.x || 0) + deltaX : initial.x || 0,
      y: mode === "move" ? (initial.y || 0) + deltaY : initial.y || 0,
      width: mode === "resize" ? Math.max(80, (initial.width ?? element.getBoundingClientRect().width) + deltaX) : initial.width,
      height: mode === "resize" ? Math.max(40, (initial.height ?? element.getBoundingClientRect().height) + deltaY) : initial.height
    };
    content.positionOverrides[id] = next;
    syncPositionOverride(element, next);
  }, true);
  documentInFrame.addEventListener("pointerup", async () => {
    if (!adminDragState) return;
    const { id, element } = adminDragState;
    element?.classList.remove("admin-being-edited");
    try {
      await saveContent();
      statusLabel.textContent = "Layout adjustments saved";
    } catch (error) {
      statusLabel.textContent = `Layout adjustments not saved: ${error.message}`;
    }
    adminDragState = null;
  }, true);
  documentInFrame.addEventListener("pointercancel", () => {
    adminDragState = null;
  }, true);
  documentInFrame.addEventListener("dragstart", dragEvent => {
    draggedLayoutElement = dragEvent.target.closest("[data-cms-layout-group][data-cms-layout-key]");
    if (!draggedLayoutElement) return;
    draggedLayoutElement.setAttribute("aria-grabbed", "true");
    dragEvent.dataTransfer.effectAllowed = "move";
    dragEvent.dataTransfer.setData("text/plain", `${draggedLayoutElement.dataset.cmsLayoutGroup}:${draggedLayoutElement.dataset.cmsLayoutKey}`);
  }, true);
  documentInFrame.addEventListener("dragover", dragEvent => {
    const target = dragEvent.target.closest("[data-cms-layout-group][data-cms-layout-key]");
    if (!draggedLayoutElement || !target || target === draggedLayoutElement || target.parentElement !== draggedLayoutElement.parentElement || target.dataset.cmsLayoutGroup !== draggedLayoutElement.dataset.cmsLayoutGroup) return;
    dragEvent.preventDefault();
    dragEvent.dataTransfer.dropEffect = "move";
    if (currentDropTarget && currentDropTarget !== target) delete currentDropTarget.dataset.cmsLayoutDropTarget;
    currentDropTarget = target;
    target.dataset.cmsLayoutDropTarget = "true";
  }, true);
  documentInFrame.addEventListener("drop", dragEvent => {
    const target = dragEvent.target.closest("[data-cms-layout-group][data-cms-layout-key]");
    if (!draggedLayoutElement || !target || target.parentElement !== draggedLayoutElement.parentElement || target.dataset.cmsLayoutGroup !== draggedLayoutElement.dataset.cmsLayoutGroup) return;
    dragEvent.preventDefault();
    persistPreviewLayout(draggedLayoutElement, target, dragEvent);
    draggedLayoutElement.setAttribute("aria-grabbed", "false");
    delete target.dataset.cmsLayoutDropTarget;
    draggedLayoutElement = null;
    currentDropTarget = null;
  }, true);
  documentInFrame.addEventListener("dragend", () => {
    draggedLayoutElement?.setAttribute("aria-grabbed", "false");
    if (currentDropTarget) delete currentDropTarget.dataset.cmsLayoutDropTarget;
    draggedLayoutElement = null;
    currentDropTarget = null;
  }, true);
  documentInFrame.addEventListener("click", event => {
    const target = event.target.closest("[data-cms-key]");
    if (!target) return;
    const interactive = target.closest("a,button,summary,label");
    if (interactive && !event.altKey) return;
    event.preventDefault();
    event.stopPropagation();
    selectedKey = target.dataset.cmsKey;
    selectedElement = target;
    activeRichEditor = copyField;
    document.querySelector("#selected-location").textContent = `${target.tagName.toLowerCase()} · ${selectedKey}`;
    copyField.contentEditable = "true";
    copySave.disabled = false;
    copyField.innerHTML = sanitizeRichHtml(content.richTextOverrides[selectedKey] ?? target.innerHTML);
    const textStyle = content.textStyles[selectedKey] || {};
    document.querySelector("[data-format-font]").value = textStyle.fontFamily || "Georgia, serif";
    document.querySelector("[data-format-size]").value = textStyle.fontSize || "";
    document.querySelector("[data-format-color]").value = textStyle.color || "#303636";
    selectedElement.style.fontFamily = textStyle.fontFamily || "";
    selectedElement.style.fontSize = textStyle.fontSize || "";
    selectedElement.style.color = textStyle.color || "";
    selectedElement.style.textAlign = textStyle.textAlign || "";
    showMessage(copyMessage, "", false);
  }, true);
}

async function enterDashboard() {
  showAccess("dashboard");
  statusLabel.textContent = storageMode === "server" ? "Signed in · server saved" : "GitHub Pages · browser saved";
  document.querySelector("#logout-button").textContent = storageMode === "server" ? "Sign out" : "Back to site";
  storageModeLabel.textContent = storageMode === "server"
    ? "Changes save to the local CMS server."
    : "Browser-only mode: changes stay in this browser until you download and commit content.json.";
  try {
    await loadContent();
    preview.src = previewUrl();
  } catch (error) {
    statusLabel.textContent = error.message;
  }
}

document.querySelector("#setup-form").addEventListener("submit", async event => {
  event.preventDefault();
  const password = document.querySelector("#setup-password").value;
  const confirmation = document.querySelector("#setup-confirm").value;
  if (password !== confirmation) {
    showMessage(document.querySelector("#setup-message"), "Passwords do not match.");
    return;
  }
  try {
    const result = await api("./api/admin/setup", { method: "POST", body: { password } });
    csrfToken = result.csrf;
    await enterDashboard();
  } catch (error) {
    showMessage(document.querySelector("#setup-message"), error.message);
  }
});

document.querySelector("#login-form").addEventListener("submit", async event => {
  event.preventDefault();
  try {
    const result = await api("./api/admin/login", {
      method: "POST",
      body: { password: document.querySelector("#login-password").value }
    });
    csrfToken = result.csrf;
    await enterDashboard();
  } catch (error) {
    showMessage(document.querySelector("#login-message"), error.message);
  }
});

copySave.addEventListener("click", async () => {
  if (!selectedKey) return;
  content.richTextOverrides[selectedKey] = sanitizeRichHtml(copyField.innerHTML);
  content.copyOverrides[selectedKey] = normalizeGodCapitalization(copyField.innerText.trim());
  try {
    await saveContent();
    showMessage(copyMessage, "Saved", false);
    preview.contentWindow.location.reload();
  } catch (error) {
    showMessage(copyMessage, error.message);
  }
});

document.querySelector("#preview-route").addEventListener("change", event => {
  if (preview.contentWindow) preview.contentWindow.location.hash = event.target.value;
});
document.querySelector("#layout-self-check").addEventListener("click", runLayoutSelfCheck);
preview.addEventListener("load", bindPreview);

document.addEventListener("focusin", event => {
  if (event.target.matches(".rich-editor[contenteditable='true']")) activeRichEditor = event.target;
});

document.querySelectorAll(".format-toolbar button[data-command]").forEach(button => {
  button.addEventListener("mousedown", event => event.preventDefault());
  button.addEventListener("click", () => {
    if (!activeRichEditor) return;
    activeRichEditor.focus();
    document.execCommand(button.dataset.command, false, null);
  });
});

document.querySelector("[data-format-font]").addEventListener("change", event => {
  const value = event.target.value;
  if (activeRichEditor === copyField && selectedKey) {
    content.textStyles[selectedKey] = { ...(content.textStyles[selectedKey] || {}), fontFamily: value };
    if (selectedElement) selectedElement.style.fontFamily = value;
  } else {
    activeRichEditor.focus();
    document.execCommand("fontName", false, value);
  }
});

document.querySelector("[data-format-size]").addEventListener("change", event => {
  const value = event.target.value;
  if (!value) return;
  if (activeRichEditor === copyField && selectedKey) {
    content.textStyles[selectedKey] = { ...(content.textStyles[selectedKey] || {}), fontSize: value };
    if (selectedElement) selectedElement.style.fontSize = value;
  } else {
    const size = Number.parseInt(value, 10);
    const commandSize = size <= 12 ? 1 : size <= 14 ? 2 : size <= 16 ? 3 : size <= 20 ? 4 : size <= 24 ? 5 : size <= 32 ? 6 : 7;
    activeRichEditor.focus();
    document.execCommand("fontSize", false, commandSize);
  }
});

document.querySelector("[data-format-color]").addEventListener("input", event => {
  const value = event.target.value;
  if (activeRichEditor === copyField && selectedKey) {
    content.textStyles[selectedKey] = { ...(content.textStyles[selectedKey] || {}), color: value };
    if (selectedElement) selectedElement.style.color = value;
  } else {
    activeRichEditor.focus();
    document.execCommand("foreColor", false, value);
  }
});

document.querySelector("[data-format-block]").addEventListener("change", event => {
  activeRichEditor.focus();
  document.execCommand("formatBlock", false, event.target.value);
});

document.querySelector("#save-theme").addEventListener("click", async () => {
  content.theme = {
    headerPink: document.querySelector("#header-color").value,
    headingPink: document.querySelector("#heading-color").value,
    bodyTextColor: document.querySelector("#body-color").value
  };
  try {
    await saveContent();
    preview.contentWindow.location.reload();
    showMessage(document.querySelector("#theme-message"), "Site colors saved", false);
  } catch (error) {
    showMessage(document.querySelector("#theme-message"), error.message);
  }
});

document.querySelector("#save-hero-copy").addEventListener("click", async () => {
  heroCopyFields.forEach(([id, key]) => {
    content.copyOverrides[key] = normalizeGodCapitalization(document.querySelector(`#${id}`).value.trim());
    delete content.richTextOverrides[key];
  });
  try {
    await saveContent();
    preview.contentWindow.location.reload();
    showMessage(document.querySelector("#hero-copy-message"), "Homepage copy saved", false);
  } catch (error) {
    showMessage(document.querySelector("#hero-copy-message"), error.message);
  }
});

document.querySelector("#save-graphics").addEventListener("click", async () => {
  const graphics = { ...content.graphics };
  for (const input of document.querySelectorAll("[data-graphic]")) {
    const value = input.value.trim();
    if (!value) {
      delete graphics[input.dataset.graphic];
      continue;
    }
    try {
      const url = new URL(value);
      if (url.protocol !== "https:") throw new Error("Use an HTTPS image URL.");
      graphics[input.dataset.graphic] = url.href;
    } catch {
      showMessage(document.querySelector("#graphics-message"), `Enter a valid HTTPS URL for ${input.labels[0].textContent}.`);
      input.focus();
      return;
    }
  }
  content.graphics = graphics;
  try {
    await saveContent();
    preview.contentWindow.location.reload();
    showMessage(document.querySelector("#graphics-message"), "Site images saved", false);
  } catch (error) {
    showMessage(document.querySelector("#graphics-message"), error.message);
  }
});

document.querySelector("#export-content").addEventListener("click", downloadContent);
document.querySelector("#import-content").addEventListener("click", () => document.querySelector("#import-file").click());
document.querySelector("#import-file").addEventListener("change", async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    await importContentFile(file);
    statusLabel.textContent = storageMode === "server" ? "Imported to local CMS" : "Imported into this browser";
  } catch (error) {
    statusLabel.textContent = `Import failed: ${error.message}`;
  } finally {
    event.target.value = "";
  }
});

devotionalForm.addEventListener("submit", async event => {
  event.preventDefault();
  const titleEditor = document.querySelector("#devotional-name");
  const title = normalizeGodCapitalization(titleEditor.innerText.trim());
  if (!title) {
    showMessage(devotionalMessage, "Enter a devotional title.");
    titleEditor.focus();
    return;
  }
  document.querySelector("#devotional-title-value").value = title;
  const titleHtml = sanitizeRichHtml(titleEditor.innerHTML);
  const form = new FormData(devotionalForm);
  const sections = [...devotionalSections.querySelectorAll(".devotional-section-field")].map(field => {
    const sectionTitle = normalizeGodCapitalization(field.querySelector("[data-section-title]").value.trim());
    const html = sanitizeRichHtml(field.querySelector("[data-section-body]").innerHTML);
    const template = document.createElement("template");
    template.innerHTML = html;
    return [sectionTitle, template.content.textContent.trim() ? [{ html }] : []];
  });
  if (sections.some(([sectionTitle]) => !sectionTitle) || !sections.some(([, paragraphs]) => paragraphs.length)) {
    showMessage(devotionalMessage, "Add a heading and text to at least one devotional section.");
    devotionalSections.querySelector("[data-section-title]").focus();
    return;
  }
  const slugBase = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "devotional";
  const usedSlugs = new Set(["defining-femininity", "prayer-life-and-church-community", ...content.devotionals.map(item => item.slug)]);
  let slug = slugBase;
  let suffix = 2;
  while (usedSlugs.has(slug)) slug = `${slugBase}-${suffix++}`;
  content.devotionals.push({
    slug,
    title,
    titleHtml,
    publishedAt: form.get("publishedAt"),
    introTitle: normalizeGodCapitalization(form.get("introTitle").trim()) || title,
    intro: sanitizeRichHtml(document.querySelector("#devotional-intro").innerHTML),
    sections,
    resourceTitle: normalizeGodCapitalization(form.get("resourceTitle").trim()) || "Additional Resources",
    resource: sanitizeRichHtml(document.querySelector("#devotional-resource").innerHTML),
    image: form.get("image").trim(),
    imageAlt: normalizeGodCapitalization(form.get("imageAlt").trim())
  });
  try {
    await saveContent();
    renderDevotionals();
    devotionalForm.reset();
    devotionalForm.querySelectorAll(".devotional-rich").forEach(editor => { editor.innerHTML = ""; });
    devotionalSections.querySelectorAll(".devotional-section-field:not(:first-child)").forEach(field => field.remove());
    devotionalSections.querySelector("[data-section-title]").value = "Devotional";
    document.querySelector("#devotional-date").value = todayDate();
    updateDevotionalSectionLabels();
    showMessage(devotionalMessage, "Devotional added", false);
    preview.contentWindow.location.hash = "#/devotionals";
    preview.contentWindow.location.reload();
  } catch (error) {
    content.devotionals.pop();
    showMessage(devotionalMessage, error.message);
  }
});

devotionalList.addEventListener("click", async event => {
  const button = event.target.closest("button[data-remove]");
  if (!button) return;
  const index = Number(button.dataset.remove);
  const [removed] = content.devotionals.splice(index, 1);
  try {
    await saveContent();
    renderDevotionals();
    preview.contentWindow.location.reload();
  } catch (error) {
    content.devotionals.splice(index, 0, removed);
    renderDevotionals();
    statusLabel.textContent = error.message;
  }
});

document.querySelector("#logout-button").addEventListener("click", async () => {
  if (storageMode === "browser") {
    window.location.href = "./index.html";
    return;
  }
  try { await api("./api/admin/logout", { method: "POST", body: {} }); } catch {}
  csrfToken = "";
  showAccess("login");
  statusLabel.textContent = "Signed out";
});

async function initialize() {
  const localServer = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  if (!localServer) {
    storageMode = "browser";
    showAccess("dashboard");
    statusLabel.textContent = "GitHub Pages · browser mode";
    storageModeLabel.textContent = "Browser-only mode: edits stay in this browser until you download and commit content.json.";
    try {
      await loadContent();
      preview.src = previewUrl();
    } catch (error) {
      statusLabel.textContent = `Browser storage unavailable: ${error.message}`;
    }
    return;
  }
  try {
    storageMode = "server";
    const status = await api("./api/admin/status");
    if (status.authenticated) {
      csrfToken = status.csrf;
      await enterDashboard();
    } else if (status.setupRequired) {
      showAccess("setup");
      statusLabel.textContent = "Setup required";
    } else {
      showAccess("login");
      statusLabel.textContent = "Administrator access";
    }
  } catch (error) {
    storageMode = "browser";
    showAccess("dashboard");
    statusLabel.textContent = "GitHub Pages · browser mode";
    storageModeLabel.textContent = "Browser-only mode: edits stay in this browser until you download and commit content.json.";
    try {
      await loadContent();
      preview.src = previewUrl();
    } catch (loadError) {
      statusLabel.textContent = `Browser storage unavailable: ${loadError.message}`;
    }
  }
}

initialize();