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

let csrfToken = "";
let selectedKey = "";
let selectedElement = null;
let activeRichEditor = copyField;
let storageMode = "server";
let content = { copyOverrides: {}, richTextOverrides: {}, textStyles: {}, theme: {}, devotionals: [] };

function normalizeGodCapitalization(value) {
  return String(value || "")
    .replace(/\bgod['’]s\b/gi, match => match.endsWith("’s") ? "God’s" : "God's")
    .replace(/\bgods\b/gi, "Gods")
    .replace(/\bgod\b/gi, "God");
}

function normalizeContent(data = {}) {
  const copyOverrides = Object.fromEntries(Object.entries(data.copyOverrides || {}).map(([key, value]) => [key, normalizeGodCapitalization(value)]));
  const richTextOverrides = Object.fromEntries(Object.entries(data.richTextOverrides || {}).map(([key, value]) => [key, sanitizeRichHtml(value)]));
  return {
    copyOverrides,
    richTextOverrides,
    textStyles: data.textStyles || {},
    theme: data.theme || {},
    devotionals: Array.isArray(data.devotionals) ? data.devotionals.map(item => ({
      ...item,
      title: normalizeGodCapitalization(item.title),
      intro: sanitizeRichHtml(item.intro),
      body: sanitizeRichHtml(item.body),
      resource: sanitizeRichHtml(item.resource)
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
  devotionalList.innerHTML = content.devotionals.map((item, index) => `<li><span>${escapeHtml(item.title)}</span><button type="button" data-remove="${index}" aria-label="Remove ${escapeHtml(item.title)}">Remove</button></li>`).join("");
}

function bindPreview() {
  const documentInFrame = preview.contentDocument;
  if (!documentInFrame) return;
  documentInFrame.querySelector("#cms-admin-preview-style")?.remove();
  const style = documentInFrame.createElement("style");
  style.id = "cms-admin-preview-style";
  style.textContent = "[data-cms-key]{cursor:crosshair!important}[data-cms-key]:hover{outline:2px dashed #d4967d!important;outline-offset:2px!important}";
  documentInFrame.head.append(style);
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
  content.devotionals.push({
    title,
    titleHtml,
    intro: sanitizeRichHtml(document.querySelector("#devotional-intro").innerHTML),
    body: sanitizeRichHtml(document.querySelector("#devotional-body").innerHTML),
    resource: sanitizeRichHtml(document.querySelector("#devotional-resource").innerHTML),
    image: form.get("image").trim()
  });
  try {
    await saveContent();
    renderDevotionals();
    devotionalForm.reset();
    devotionalForm.querySelectorAll(".devotional-rich").forEach(editor => { editor.innerHTML = ""; });
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