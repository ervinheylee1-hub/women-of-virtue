const main = document.querySelector("#main");
const nav = document.querySelector("#site-nav");
const menuToggle = document.querySelector(".menu-toggle");
const cmsStorageKey = "women-of-virtue-content-v1";
let cmsContent = {
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

function escapeCmsText(value) {
  return String(value || "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function normalizeLessonItem(item) {
  if (!item) return null;
  const slug = item.slug || (item.title ? item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : "");
  const sections = Array.isArray(item.sections) && item.sections.some(Boolean)
    ? item.sections.filter(Boolean).map(section => {
      const [title, paragraphs] = Array.isArray(section) ? section : [section.title, section.paragraphs];
      return [
        escapeCmsText(title || "Section"),
        Array.isArray(paragraphs) ? paragraphs.map(p => (
          p && typeof p === "object" && Object.hasOwn(p, "html") ? { html: sanitizeCmsHtml(p.html) } : p
        )) : []
      ];
    })
    : (item.body ? [["Devotional", [{ html: sanitizeCmsHtml(item.body) }]]] : []);

  let resource = [];
  if (Array.isArray(item.resource)) {
    resource = item.resource.map(p => (
      p && typeof p === "object" && Object.hasOwn(p, "html") ? { html: sanitizeCmsHtml(p.html) } : p
    ));
  } else if (item.resource) {
    resource = [{ html: sanitizeCmsHtml(item.resource) }];
  }

  return {
    id: item.id || `lesson-${slug}`,
    slug: slug,
    title: escapeCmsText(item.title || "Lesson"),
    titleHtml: sanitizeCmsHtml(item.titleHtml || ""),
    publishedAt: item.publishedAt || "",
    next: item.next || "",
    introTitle: escapeCmsText(item.introTitle || item.title || "Introduction"),
    intro: item.intro || "",
    introHtml: item.introHtml ? sanitizeCmsHtml(item.introHtml) : "",
    sections: sections,
    resourceTitle: escapeCmsText(item.resourceTitle || "Additional Resources"),
    resource: resource,
    image: cmsImage(`lesson:${slug}`, item.image || images.bible),
    imageAlt: escapeCmsText(item.imageAlt || item.title || ""),
    imageHeight: item.imageHeight || 600,
    imageOffset: item.imageOffset || 0,
    pdfUrl: item.pdfUrl || ""
  };
}

function allDevotionals() {
  if (Array.isArray(cmsContent.devotionals) && cmsContent.devotionals.length > 0) {
    const hasUnits = cmsContent.devotionals.some(d => d && Array.isArray(d.lessons));
    if (hasUnits) {
      return cmsContent.devotionals.map(d => {
        if (d && Array.isArray(d.lessons)) {
          return {
            id: d.id || (d.title ? d.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "unit"),
            title: escapeCmsText(d.title || "Devotional Course"),
            description: escapeCmsText(d.description || ""),
            lessons: d.lessons.map(normalizeLessonItem).filter(Boolean)
          };
        }
        return {
          id: d.id || "unit",
          title: escapeCmsText(d.devotionalTitle || d.title || "Devotional Course"),
          description: "",
          lessons: [normalizeLessonItem(d)].filter(Boolean)
        };
      });
    } else {
      const defaultLessons = lessons.map(normalizeLessonItem).filter(Boolean);
      const customLessons = cmsContent.devotionals.map(normalizeLessonItem).filter(Boolean);
      return [
        {
          id: "firm-foundations",
          title: "Firm Foundations",
          description: "Weekly Devotionals for Women of Virtue",
          lessons: [...defaultLessons, ...customLessons]
        }
      ];
    }
  }

  return [
    {
      id: "firm-foundations",
      title: "Firm Foundations",
      description: "Weekly Devotionals for Women of Virtue",
      lessons: lessons.map(normalizeLessonItem).filter(Boolean)
    }
  ];
}

function allLessons() {
  const devotionals = allDevotionals();
  const list = [];
  devotionals.forEach(dev => {
    if (Array.isArray(dev.lessons)) {
      list.push(...dev.lessons);
    }
  });
  return list;
}

function getDevotionalForLesson(slug) {
  const devotionals = allDevotionals();
  return devotionals.find(d => (d.lessons || []).some(l => l.slug === slug)) || null;
}

function findNextLesson(slug) {
  const parent = getDevotionalForLesson(slug);
  if (!parent || !Array.isArray(parent.lessons)) return null;
  const idx = parent.lessons.findIndex(l => l.slug === slug);
  if (idx >= 0 && idx < parent.lessons.length - 1) {
    return parent.lessons[idx + 1];
  }
  return null;
}

function sanitizeCmsHtml(value) {
  const parsed = new DOMParser().parseFromString(String(value || ""), "text/html");
  const allowed = new Set(["B", "STRONG", "I", "EM", "U", "P", "BR", "UL", "OL", "LI", "H1", "H2", "H3", "H4", "BLOCKQUOTE", "DIV", "SPAN", "FONT"]);
  const safeFonts = new Set(["Georgia, serif", "Arial, sans-serif", "cursive"]);
  function clean(parent) {
    [...parent.children].forEach(element => {
      clean(element);
      if (!allowed.has(element.tagName)) {
        element.replaceWith(...element.childNodes);
        return;
      }
      [...element.attributes].forEach(attribute => {
        if (attribute.name !== "style" && !(element.tagName === "FONT" && ["color", "face", "size"].includes(attribute.name))) element.removeAttribute(attribute.name);
      });
      if (element.tagName === "FONT") {
        const color = element.getAttribute("color");
        const face = element.getAttribute("face");
        const size = element.getAttribute("size");
        if (color && !/^#[0-9a-f]{6}$/i.test(color)) element.removeAttribute("color");
        if (face && !safeFonts.has(face)) element.removeAttribute("face");
        if (size && !/^[1-7]$/.test(size)) element.removeAttribute("size");
      }
      if (element.hasAttribute("style")) {
        const styles = [];
        const alignment = element.style.textAlign;
        const family = element.style.fontFamily.replaceAll('"', "").replaceAll("'", "");
        const size = element.style.fontSize;
        const color = element.style.color;
        if (["left", "center", "right", "justify"].includes(alignment)) styles.push(`text-align:${alignment}`);
        if (safeFonts.has(family)) styles.push(`font-family:${family}`);
        if (/^(?:1[0-9]|2[0-9]|3[0-6]|48)px$/.test(size)) styles.push(`font-size:${size}`);
        if (/^#[0-9a-f]{6}$/i.test(color)) styles.push(`color:${color}`);
        if (styles.length) element.setAttribute("style", styles.join(";"));
        else element.removeAttribute("style");
      }
    });
  }
  clean(parsed.body);
  return parsed.body.innerHTML;
}

function applyCmsText(element, key) {
  if (Object.hasOwn(cmsContent.richTextOverrides, key)) {
    element.innerHTML = sanitizeCmsHtml(cmsContent.richTextOverrides[key]);
  } else if (Object.hasOwn(cmsContent.copyOverrides, key)) {
    setCmsText(element, cmsContent.copyOverrides[key]);
  }
  if (cmsContent.linkOverrides && Object.hasOwn(cmsContent.linkOverrides, key)) {
    const url = cmsContent.linkOverrides[key];
    if (element.tagName.toLowerCase() === "a") {
      element.setAttribute("href", url);
    } else {
      const parentA = element.closest("a");
      if (parentA) parentA.setAttribute("href", url);
    }
  }
  const style = cmsContent.textStyles[key];
  if (!style || typeof style !== "object") return;
  if (style.fontFamily) element.style.fontFamily = style.fontFamily;
  if (style.fontSize) element.style.fontSize = style.fontSize;
  if (style.color) element.style.color = style.color;
  if (style.backgroundColor) element.style.backgroundColor = style.backgroundColor;
  if (style.textAlign) element.style.textAlign = style.textAlign;
  if (style.fontStyle) element.style.fontStyle = style.fontStyle;
  if (style.textDecoration) element.style.textDecoration = style.textDecoration;
  if (style.textTransform) element.style.textTransform = style.textTransform;
  if (style.fontWeight) element.style.fontWeight = style.fontWeight;
  if (style.lineHeight) element.style.lineHeight = style.lineHeight;
  if (style.letterSpacing) element.style.letterSpacing = style.letterSpacing;
  if (style.padding) element.style.padding = style.padding;
  if (style.paddingTop) element.style.paddingTop = style.paddingTop;
  if (style.paddingRight) element.style.paddingRight = style.paddingRight;
  if (style.paddingBottom) element.style.paddingBottom = style.paddingBottom;
  if (style.paddingLeft) element.style.paddingLeft = style.paddingLeft;
  if (style.margin) element.style.margin = style.margin;
  if (style.marginTop) element.style.marginTop = style.marginTop;
  if (style.marginRight) element.style.marginRight = style.marginRight;
  if (style.marginBottom) element.style.marginBottom = style.marginBottom;
  if (style.marginLeft) element.style.marginLeft = style.marginLeft;
  if (style.borderStyle) element.style.borderStyle = style.borderStyle;
  if (style.borderWidth) element.style.borderWidth = style.borderWidth;
  if (style.borderColor) element.style.borderColor = style.borderColor;
  if (style.borderRadius) element.style.borderRadius = style.borderRadius;
  if (style.boxShadow) element.style.boxShadow = style.boxShadow;
  if (style.zIndex !== undefined && style.zIndex !== "") element.style.zIndex = style.zIndex;
}

function applyCmsTheme() {
  const theme = cmsContent.theme || {};
  const colors = {
    headerPink: /^#[0-9a-f]{6}$/i.test(theme.headerPink || "") ? theme.headerPink : "#d4967d",
    headingPink: /^#[0-9a-f]{6}$/i.test(theme.headingPink || "") ? theme.headingPink : "#d4967d",
    bodyTextColor: /^#[0-9a-f]{6}$/i.test(theme.bodyTextColor || "") ? theme.bodyTextColor : "#303636"
  };
  document.documentElement.style.setProperty("--cms-header-pink", colors.headerPink);
  document.documentElement.style.setProperty("--peach", colors.headerPink);
  document.documentElement.style.setProperty("--cms-heading-pink", colors.headingPink);
  document.documentElement.style.setProperty("--cms-body-text-color", colors.bodyTextColor);
  for (const name of ["hero", "course"]) {
    const imageUrl = cmsImage(name).replace(/["\\]/g, "\\$&");
    document.documentElement.style.setProperty(`--cms-${name}-image`, `url("${imageUrl}")`);
  }
  const headerEl = document.querySelector(".site-header");
  if (headerEl) {
    headerEl.style.setProperty("background-color", colors.headerPink, "important");
    headerEl.style.setProperty("color", "#303636", "important");
  }
  const footerEl = document.querySelector(".site-footer");
  if (footerEl) {
    footerEl.style.setProperty("background-color", colors.headerPink, "important");
    footerEl.style.setProperty("color", "#ffffff", "important");
  }
  let bodyColorRule = document.querySelector("#cms-body-color-rule");
  if (theme.bodyTextColor) {
    if (!bodyColorRule) {
      bodyColorRule = document.createElement("style");
      bodyColorRule.id = "cms-body-color-rule";
      document.head.append(bodyColorRule);
    }
    bodyColorRule.textContent = `#main p, #main li, #main label { color: ${colors.bodyTextColor}; }`;
  } else {
    bodyColorRule?.remove();
  }
}

function applyCmsLayout() {
  const groups = new Map();
  document.querySelectorAll("[data-cms-layout-group][data-cms-layout-key]").forEach(element => {
    const group = element.dataset.cmsLayoutGroup;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(element);
  });
  for (const [group, elements] of groups) {
    const parent = elements[0].parentElement;
    if (elements.some(element => element.parentElement !== parent)) continue;
    const byKey = new Map(elements.map(element => [element.dataset.cmsLayoutKey, element]));
    const savedOrder = Array.isArray(cmsContent.layout[group]) ? cmsContent.layout[group] : [];
    const ordered = [...savedOrder.filter(key => byKey.has(key)).map(key => byKey.get(key)), ...elements.filter(element => !savedOrder.includes(element.dataset.cmsLayoutKey))];
    parent.append(...ordered);
  }
}

function applyCmsPositionOverrides() {
  if (!cmsContent.positionOverrides || typeof cmsContent.positionOverrides !== "object") return;
  const isMobile = window.innerWidth <= 768;
  for (const [key, pos] of Object.entries(cmsContent.positionOverrides)) {
    if (!pos) continue;
    let el = null;
    try {
      el = document.querySelector(`[data-wov-block-id="${CSS.escape(key)}"], [data-cms-key="${CSS.escape(key)}"], [data-cms-layout-key="${CSS.escape(key)}"]`);
    } catch {}
    if (!el) {
      el = [...document.querySelectorAll("[data-cms-key], [data-wov-block-id], [data-cms-layout-key]")].find(e => e.dataset.cmsKey === key || e.dataset.wovBlockId === key || e.dataset.cmsLayoutKey === key);
    }
    if (!el && document.getElementById(key)) {
      el = document.getElementById(key);
    }
    if (!el && key.startsWith("pos:")) {
      const parts = key.split(":");
      if (parts.length >= 5) {
        const [, , tag, rawClass, idxStr] = parts;
        const idx = parseInt(idxStr, 10) || 0;
        const selector = rawClass && rawClass !== "el" ? `${tag}.${rawClass.replace(/-/g, ".")}` : tag;
        try {
          const matches = document.querySelectorAll(selector);
          if (matches[idx]) el = matches[idx];
        } catch {}
      }
    }
    if (!el && key === "photo") {
      el = document.querySelector(".lesson-photo, img[data-cms-layout-key='photo'], img");
    }
    if (el) {
      if (isMobile) {
        el.style.position = "";
        el.style.left = "";
        el.style.top = "";
        el.style.width = "";
        el.style.maxWidth = "100%";
        el.style.height = "";
        el.style.minHeight = "";
        continue;
      }
      if (pos.x !== undefined || pos.y !== undefined) {
        el.style.position = "relative";
        if (pos.x !== undefined) el.style.left = `${pos.x}px`;
        if (pos.y !== undefined) el.style.top = `${pos.y}px`;
      }
      if (pos.width !== undefined && pos.width > 0) {
        el.style.width = `${pos.width}px`;
        if (el.tagName.toLowerCase() === "img") {
          el.style.maxWidth = "none";
        } else {
          el.style.maxWidth = "100%";
          el.style.boxSizing = "border-box";
          if (window.getComputedStyle(el).display === "inline") {
            el.style.display = "inline-block";
          }
        }
      }
      if (pos.height !== undefined && pos.height > 0) {
        if (el.tagName.toLowerCase() === "img") {
          el.style.height = `${pos.height}px`;
          el.style.objectFit = "cover";
        } else {
          el.style.minHeight = `${pos.height}px`;
          el.style.height = "auto";
        }
        if (el.classList.contains("lesson-photo")) {
          el.style.setProperty("--lesson-image-height", `${pos.height}px`);
        }
      }
    }
  }
}

function registerCmsText() {
  const occurrences = new Map();
  const selectors = "h1,h2,h3,h4,p,summary,button,a,label,span,.cms-rich-copy,[data-cms-key]";
  document.querySelectorAll(selectors).forEach(element => {
    if (element.closest(".journey-marquee")) return;
    if (element.closest("[data-wov-block-id]")) {
      if (element.dataset.cmsKey) {
        applyCmsText(element, element.dataset.cmsKey);
      }
      return;
    }
    if (element.dataset.cmsKey) {
      applyCmsText(element, element.dataset.cmsKey);
      return;
    }
    const textNodes = [...element.childNodes].filter(node => node.nodeType === Node.TEXT_NODE);
    if (element.children.length > 0 && textNodes.length === 0) return;
    const value = (textNodes.length ? textNodes.map(node => node.nodeValue).join("") : element.textContent).trim();
    if (!value) return;
    const scope = element.closest("main")
      ? (window.location.hash.replace(/^#\/?/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-") || "home")
      : "shared";
    const base = `${scope}:${element.tagName.toLowerCase()}:${value.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 48)}`;
    const occurrence = occurrences.get(base) || 0;
    occurrences.set(base, occurrence + 1);
    const key = `${base}:${occurrence}`;
    element.dataset.cmsKey = key;
    element.dataset.cmsDefault = value;
    applyCmsText(element, key);
  });

  const marquee = document.querySelector(".journey-marquee");
  if (marquee) {
    const key = "home:marquee:follow-the-journey";
    marquee.dataset.cmsKey = key;
    marquee.dataset.cmsDefault = marquee.firstElementChild?.textContent.trim() || "Follow the Journey ⦁ Follow the Journey";
    applyCmsText(marquee, key);
    if (Object.hasOwn(cmsContent.copyOverrides, key) || Object.hasOwn(cmsContent.richTextOverrides, key)) {
      const text = Object.hasOwn(cmsContent.copyOverrides, key) ? cmsContent.copyOverrides[key] : marquee.textContent.trim();
      marquee.querySelectorAll("span").forEach(span => { span.textContent = text; });
    }
  }
}

function setCmsText(element, value) {
  const textNodes = [...element.childNodes].filter(node => node.nodeType === Node.TEXT_NODE);
  if (!textNodes.length) {
    element.textContent = value;
    return;
  }
  textNodes[0].nodeValue = value;
  textNodes.slice(1).forEach(node => { node.nodeValue = ""; });
}

async function loadCmsContent() {
  let data = null;
  const isCmsPreview = new URLSearchParams(window.location.search).get("cmsPreview") === "1";
  if (isCmsPreview) {
    try {
      const saved = localStorage.getItem(cmsStorageKey);
      if (saved) data = JSON.parse(saved);
    } catch {}
  }
  const localServer = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  if (!data && localServer) {
    try {
      const response = await fetch("./api/public-content", { cache: "no-store" });
      if (response.ok) data = await response.json();
    } catch {}
  }
  if (!data) {
    try {
      const response = await fetch(`./content.json?_t=${Date.now()}`, { cache: "no-store" });
      if (response.ok) data = await response.json();
    } catch {}
  }
  if (!data && isCmsPreview) {
    try {
      const stored = localStorage.getItem(cmsStorageKey);
      if (stored) data = JSON.parse(stored);
    } catch {}
  }
  if (!data) return;
  cmsContent = {
    blocks: data.blocks && typeof data.blocks === "object" ? data.blocks : {},
    copyOverrides: data.copyOverrides || {},
    richTextOverrides: data.richTextOverrides || {},
    linkOverrides: data.linkOverrides && typeof data.linkOverrides === "object" ? data.linkOverrides : {},
    textStyles: data.textStyles || {},
    theme: data.theme || {},
    graphics: data.graphics || {},
    layout: data.layout && typeof data.layout === "object" ? data.layout : {},
    positionOverrides: data.positionOverrides && typeof data.positionOverrides === "object" ? data.positionOverrides : {},
    devotionals: Array.isArray(data.devotionals) ? data.devotionals : []
  };
}

const images = {
  hero: "https://images.squarespace-cdn.com/content/v1/6abaae7844626360a63d6f9d/1790629802685-Z59JDUC9LV7BDA5CMUSW/unsplash-image-WpFZu1CGBNc.jpg?format=1500w",
  brunch: "https://images.squarespace-cdn.com/content/v1/6abaae7844626360a63d6f9d/1790632930773-RF3V2JYFYIYKVQQI0EEO/unsplash-image-fKRGi5AnR3Y.jpg?format=1500w",
  prayer: "https://images.squarespace-cdn.com/content/v1/6abaae7844626360a63d6f9d/1790633053455-M9PKGDBGT7X31AK2HVEM/unsplash-image-w15nu-WJLNs.jpg?format=1500w",
  bible: "https://images.squarespace-cdn.com/content/v1/6abaae7844626360a63d6f9d/1790633299594-ZJP2LO473KCB4KZ92TRN/unsplash-image-yuqCAKrbjyE.jpg?format=1500w",
  letter: "https://images.squarespace-cdn.com/content/v1/6abaae7844626360a63d6f9d/1790633201979-AX91BC0BXNUUGWC7AXC8/unsplash-image-8huCshiNhro.jpg?format=1500w",
  about: "https://images.squarespace-cdn.com/content/v1/6abaae7844626360a63d6f9d/8a3db183-40c8-4b12-8aa2-19b3ad9a1ba6/unsplash-image-OjbUJBT65tk.jpg?format=1500w",
  course: "https://images.squarespace-cdn.com/content/v1/6abaae7844626360a63d6f9d/1790620338988-PR9FRMO87HJ2YZFTA46A/unsplash-image-XqXJJhK-c08.jpg?format=1500w",
  contact: "https://images.squarespace-cdn.com/content/v1/6abaae7844626360a63d6f9d/1790619981837-7AS9A066HHXXG5JZJWRV/unsplash-image-lUjOwG-o2XM.jpg?format=1500w"
};

function validImageUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value, window.location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function cmsImage(name, fallback = images[name]) {
  return validImageUrl(cmsContent.graphics[name]) || validImageUrl(fallback);
}

const lessons = [
  {
    slug: "defining-femininity",
    title: "Defining Femininity",
    image: "https://images.squarespace-cdn.com/content/v1/6abaae7844626360a63d6f9d/1790621013944-MPTRWXGPL1YPY8P4GTIT/unsplash-image-iA-YMIV6GoM.jpg?format=500w",
    imageHeight: 1182.5,
    next: "prayer-life-and-church-community",
    introTitle: "What is a Woman?",
    intro: "Contrary to the blurred lines of the fallen world, the bible defines a woman quite clearly. Follow along to learn what God’s word has to say about the true woman.",
    sections: [
      ["Creation and Identity", [
        "Genesis 1:27",
        "“So God created man in his own image, in the image of God he created  him; Male and Female he created them.”",
        "Both Women and Men share equal value in being created in God's image.",
        "Genesis 2:22",
        "“And the rib that the Lord God had taken from the man he made into a Woman and brought her to the man.”",
        "God intentionally formed womanhood."
      ]],
      ["Character and Value", [
        "Proverbs 31:30",
        "“Charm is deceitful, and beauty is vain, but a woman who fears the lord is to be praised”",
        "True worth comes from honoring and fearing the Lord",
        "Proverbs 14:1",
        "“Every wise woman buildeth her house; but the foolish plucketh it down with her hands”",
        "A woman’s actions and attitude, both within the home and outside of it, have a profound impact.",
        "Proverbs 31:25",
        "“Strength and honor are her clothing; and she shall rejoice in time to come.”",
        "Character, virtue, and dignity define a capable and powerful woman."
      ]],
      ["Roles and Distinction", [
        "Genesis 2:18",
        "“Then the lord God said, ‘It is not good for man to be alone, I shall make a helper fit for him”",
        "The woman was designed as a partner and strong helper. {Ezer}",
        "Ezer was often used to refer to God himself when he was called on for help and rescue.",
        "Deuteronomy 22:5",
        "“A woman shall not wear a man’s garment, nor shall a man put on a woman’s cloak”",
        "Scripture continually affirms a clear distinction between male and female identities."
      ]]
    ],
    resourceTitle: "This Weeks Prayer:",
    resource: [
      "The Prayer for the Human Family",
      "“O God, you made us in your own image and redeemed us through Jesus your Son: Look with compassion on the whole human family; take away the arrogance and hatred which infect our hearts; break down the walls that separate us; unite us in bonds of love; and work through our struggle and confusion to accomplish your purposes on earth; that, in your good time, all nations and races may serve you in harmony around your heavenly throne; through Jesus Christ our lord. Amen”",
      "1928 Book of Common Prayer"
    ]
  },
  {
    slug: "prayer-life-and-church-community",
    title: "Prayer Life and Church Community",
    image: "https://images.squarespace-cdn.com/content/v1/6abaae7844626360a63d6f9d/1790624992327-BEGE1WTS3E9WQ4ULYJGH/unsplash-image-mn5sKCN4eFs.jpg?format=500w",
    imageHeight: 1072.9,
    imageOffset: -4.6,
    next: "",
    introTitle: "Women were never meant to face life alone.",
    intro: "",
    sections: [
      ["Prayer Life", [
        "1 Thessalonians 5:16–18",
        "\"Rejoice always, pray continually, give thanks in all circumstances; for this is God’s will for you in Christ Jesus.\"",
        "When you have a healthy prayer life, it is easier to feel more connected to Christ. Thus making it easier to trust that he is working in your favor.",
        "Romans 12:12",
        "\"Rejoice in hope, be patient in tribulation, be constant in prayer.\"",
        "Scripture regularly reminds us to be “constant in prayer.” We ought not to forsake building a personal relationship with the Lord through prayer."
      ]],
      ["Church Community", [
        "Romans 12:4–5:",
        "\"For as in one body we have many members, and the members do not all have the same function, so we, though many, are one body in Christ, and individually members one of another.\"",
        "Every woman brings her own unique set of gifts into the body of Christ.",
        "Galatians 6:2:",
        "\"Bear one another's burdens, and so fulfill the law of Christ.\"",
        "When we are able to rely on each other’s shoulders, we lighten the load of each individual.",
        "Hebrews 10:24–25:",
        "\"And let us consider how to stir up one another to love and good works, not neglecting to meet together, as is the habit of some, but encouraging one another.\"",
        "It is important for sisters in Christ to keep each other not only company, but accountable."
      ]]
    ],
    resourceTitle: "Additional Resources",
    resource: [
      "Add a short summary or a list of helpful resources here.",
      "1928 Book of Common Prayer: The General Thanksgiving",
      "Almighty God, Father of all mercies, we thine unworthy servants do give thee most humble and hearty thanks for all thy goodness and loving-kindness to us and to all men. We bless thee for our creation, preservation, and all the blessings of this life; but above all, for thine inestimable love in the redemption of the world by our Lord Jesus Christ; for the means of grace, and for the hope of glory. And, we beseech thee, give us that due sense of all thy mercies, that our hearts may be unfeignedly thankful; and that we show forth thy praise, not only with our lips, but in our lives, by giving up ourselves to thy service, and by walking before thee in holiness and righteousness all our days; through Jesus Christ our Lord, to whom, with thee and the Holy Ghost, be all honor and glory, world without end. Amen."
    ]
  }
];

const faqs = [
  ["What are the devotional courses?", "They are devotionals for each week of the year, geared towards guiding young women towards biblical virtue."],
  ["Do I need anthing?", "Just an eager heart! However, we ecourage you to follow  along wih your own Bible and Book of Common Prayer."],
  ["How much time does each devotional take?", "Plan for 30 focused minutes a week. Short. Intense. Transformational."],
  ["What if i don't attend a Church?", "Get started here! When you are ready, we will help you find a faithful parish near you!"],
  ["What is the foundation of your teachings?", "Women of Virtue pulls all Devotional Material and Guidance from the Bible, The Book of Common Prayer (1928) and The 39 Articles of Religion."]
];

function homePage() {
  return `<div class="page-fade home-page">
    <section class="hero page-section" aria-label="Welcome" data-cms-layout-group="home-sections" data-cms-layout-key="hero">
      <div class="hero-copy"><h1 class="hero-title1" data-cms-key="home:hero-title-one">Reject Culture</h1><h1 class="hero-title2" data-cms-key="home:hero-title-two">Follow Christ</h1><p class="hero-desc" data-cms-key="home:hero-description">Join the movement to bring back traditional Femininity.</p><a class="button hero-btn" data-cms-key="home:hero-button-text" href="#/about">Learn More</a></div>
    </section>
    <section class="journey page-section" data-cms-layout-group="home-sections" data-cms-layout-key="journey">
      <h1 class="journey-marquee" aria-label="Follow the Journey"><span>Follow the Journey ⦁ Follow the Journey</span><span aria-hidden="true">Follow the Journey ⦁ Follow the Journey</span></h1>
      <a class="button" href="#/contact">Connect</a>
      <div class="gallery" aria-label="Follow the Journey">
        <img data-cms-layout-group="home-gallery" data-cms-layout-key="brunch" src="${escapeCmsText(cmsImage("brunch"))}" alt="Dessert with ice cream and toppings on a blue plate, drinks on pink table, blurred restaurant background." />
        <img data-cms-layout-group="home-gallery" data-cms-layout-key="prayer" src="${escapeCmsText(cmsImage("prayer"))}" alt="Close-up of a person wearing a floral-patterned outfit with their hands clasped together in prayer" />
        <img data-cms-layout-group="home-gallery" data-cms-layout-key="bible" src="${escapeCmsText(cmsImage("bible"))}" alt="a woman at a bible study" />
        <img data-cms-layout-group="home-gallery" data-cms-layout-key="letter" src="${escapeCmsText(cmsImage("letter"))}" alt="A framed letter board with the message, 'JESUS IS WORTH EVERYTHING YOU ARE AFRAID OF LOSING' written on it, placed on a windowsill near a window." />
      </div>
    </section>
    <section class="project page-section" id="project" data-cms-layout-group="home-sections" data-cms-layout-key="project">
      <h1>Start a Project</h1>
      <div class="project-copy"><p>Tell us your vision and let's transform it into reality. From Bible Studies to Brunches, we’ll help you start a community near you!</p></div>
      ${projectForm()}
    </section>
  </div>`;
}

function projectForm() {
  return `<form class="form" data-form="project">
    <div class="field"><label for="project-first">First Name <span>(required)</span></label><input id="project-first" name="fname" autocomplete="given-name" required /></div>
    <div class="field"><label for="project-last">Last Name <span>(required)</span></label><input id="project-last" name="lname" autocomplete="family-name" required /></div>
    <div class="field project-phone"><label for="project-phone">Phone</label><input id="project-phone" name="phone" type="tel" autocomplete="tel" /></div>
    <div class="field project-email"><label for="project-email">Email <span>(required)</span></label><input id="project-email" name="email" type="email" autocomplete="email" required /></div>
    <button class="button" type="submit">Send</button><p class="form-status" aria-live="polite"></p>
  </form>`;
}

function aboutPage() {
  return `<div class="page-fade"><section class="about-page page-section">
    <div class="about-story">
        <div class="about-copy" data-cms-layout-group="about-columns" data-cms-layout-key="copy"><h1>For decades, women across the globe have been fed a lie.</h1><h3>The lie that the biblical woman is an oppressed woman.</h3><p>This lie is as old as time; there is nothing new under the sun. The first feminists fought to be equal under the law, not to erase roles altogether. However, over the years, this has changed. The enemy has convinced young women that they must abandon their God-given calling within the home and flip their priorities backwards to appease the feminist hustler culture we see today.</p><p>God created man and woman equal, but <strong><em>different</em></strong>.</p><h3>What can we do?</h3><p>The Women of Virtue Movement is devoted to reassuring women around the globe that they do not need to suppress their feminine nature. By enlisting God’s word on their minds and fostering a community to grow in Christ without fear of condemnation from the modern culture. Together we can bring back the traditional femininity.</p><p class="about-empty"></p><p class="about-quote"><strong>Far too many Christian women today are eager to call themselves a feminist. The fear of the roles God has called women to is a direct act of unbelief and disobedience. We must not believe this fallen world’s definition of womanhood, and cling tightly to God’s truth.</strong></p></div>
      <div class="about-side" data-cms-layout-group="about-columns" data-cms-layout-key="media"><img src="${escapeCmsText(cmsImage("about"))}" alt="a woman wearing a veil in church" />
        <div class="virtues" aria-label="The Way, The Truth, The Life"><details class="virtue"><summary>THE WAY</summary><p>Daily calls to prayer and weekly devotionals.</p><p>The foundation of Women of Virtue</p></details><details class="virtue"><summary>THE TRUTH</summary><p>Breaking down years of unbiblical propaganda that’s been fed to young women.</p><p>Rebuilding women’s true, biblical mindset.</p></details><details class="virtue"><summary>THE LIFE</summary><p>Guidance on living out the Virtues in daily life.</p><p>Both for married and unmarried woman's.</p></details></div>
      </div>
    </section>
  </div>`;
}

function contactPage() {
  return `<div class="page-fade"><section class="contact-layout page-section">
    <div class="contact-copy" data-cms-layout-group="contact-columns" data-cms-layout-key="copy"><h1>Ready to find your inner virtue?</h1><p>Have questions about the Women of Virtue movement or how to get involved?</p><p>Reach out!</p>
      <form class="form contact-form" data-form="contact">
        <div class="field"><label for="contact-first">First Name <span>(required)</span></label><input id="contact-first" name="fname" autocomplete="given-name" required /></div>
        <div class="field"><label for="contact-last">Last Name <span>(required)</span></label><input id="contact-last" name="lname" autocomplete="family-name" required /></div>
        <div class="field full"><label for="contact-email">Email <span>(required)</span></label><input id="contact-email" name="email" type="email" autocomplete="email" required /></div>
        <div class="field full"><label for="contact-message">Message <span>(required)</span></label><textarea id="contact-message" name="message" rows="4" required></textarea></div>
        <button class="button" type="submit">SEND</button><p class="form-status" aria-live="polite"></p>
      </form>
    </div><img class="contact-photo" data-cms-layout-group="contact-columns" data-cms-layout-key="photo" src="${escapeCmsText(cmsImage("contact"))}" alt="A woman wearing a white hoodie and gold jewelry" />
  </section></div>`;
}

function progressData() {
  try { return JSON.parse(localStorage.getItem("virtue-progress") || "{}"); } catch { return {}; }
}

function coursePage() {
  const availableLessons = allLessons();
  const completed = progressData();
  const count = availableLessons.filter(lesson => completed[lesson.slug]).length;
  const percent = availableLessons.length > 0 ? Math.round(count / availableLessons.length * 100) : 0;
  const devotionals = allDevotionals();

  return `<div class="page-fade devotional-page">
    <section class="course-banner page-section" aria-label="Devotional courses" data-cms-layout-group="course-sections" data-cms-layout-key="banner"></section>
    <section class="course-list-region page-section" data-cms-layout-group="course-sections" data-cms-layout-key="lessons"><div class="course-page">
      <div class="course-intro"><h1>Devotional Courses</h1><p>Weekly Devotionals for Women of Virtue</p><p>Work through these continual courses on the various aspects of the Virtus woman.</p></div>
      <div class="course-head"><div class="progress-wrap"><div class="progress-track" role="progressbar" aria-label="Course Progress" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><span style="width:${percent}%"></span></div><span class="progress-count">${percent}%</span><span class="progress-label">Progress</span></div></div>
      ${devotionals.map((dev, devIndex) => `
        <details class="course-unit">
          <summary><strong>${dev.title}</strong><span>${dev.lessons.length} ${dev.lessons.length === 1 ? "Lesson" : "Lessons"}</span></summary>
          ${dev.description ? `<p style="font-size:13px; color:var(--muted); margin:0 0 14px;">${dev.description}</p>` : ""}
          <ul class="lesson-list">
            ${dev.lessons.map(lesson => `
              <li class="lesson-row" data-cms-layout-group="course-lessons" data-cms-layout-key="lesson:${lesson.slug}">
                <div class="lesson-row-copy">
                  <a href="#/devotionals/${lesson.slug}">${lesson.titleHtml || lesson.title}</a>
                </div>
                <label class="lesson-check"><input type="checkbox" data-lesson="${lesson.slug}" ${completed[lesson.slug] ? "checked" : ""} /></label>
              </li>
            `).join("")}
            ${dev.lessons.length === 0 ? `<li class="lesson-row" style="color:var(--muted); font-style:italic; font-size:13px; padding:12px 0;">No lessons added yet.</li>` : ""}
          </ul>
        </details>
      `).join("")}
    </div></section>
    <section class="course-faq-region page-section" data-cms-layout-group="course-sections" data-cms-layout-key="faq"><div class="faq"><h1>Questions? We've got answers.</h1>${faqs.map(([question, answer]) => `<details class="disclosure"><summary>${question}</summary><p>${answer}</p></details>`).join("")}</div></section>
  </div>`;
}

function lessonPage(lesson) {
  const isComplete = progressData()[lesson.slug] === true;
  const parentDevotional = getDevotionalForLesson(lesson.slug);
  const devotionalTitle = parentDevotional ? parentDevotional.title : "Firm Foundations";
  const devotionalLessons = parentDevotional ? parentDevotional.lessons : allLessons();
  const nextLesson = findNextLesson(lesson.slug);
  const nextLink = nextLesson ? `#/devotionals/${nextLesson.slug}` : "#/devotionals";

  return `<div class="page-fade"><article class="lesson-page">
    <nav class="lesson-crumb" aria-label="Course navigation" data-cms-layout-group="lesson-page" data-cms-layout-key="breadcrumb"><a href="#/devotionals">Devotional Courses</a><a href="${nextLink}">Complete &amp; Continue</a></nav>
    <header class="lesson-title" data-cms-layout-group="lesson-page" data-cms-layout-key="title"><p class="eyebrow">${devotionalTitle} · ${devotionalLessons.length} ${devotionalLessons.length === 1 ? "Lesson" : "Lessons"}</p><h1 data-cms-key="lesson:${lesson.slug}:title">${lesson.titleHtml || lesson.title}</h1></header>
    <div class="lesson-grid" data-cms-layout-group="lesson-page" data-cms-layout-key="content" data-lesson="${lesson.slug}" style="--lesson-image-offset: ${lesson.imageOffset || 0}px"><div class="lesson-copy" data-cms-layout-group="lesson-columns" data-cms-layout-key="copy">
      <section class="lesson-content"><p class="eyebrow">${lesson.slug === "defining-femininity" ? "IN THIS DEVOTIONAL:" : "IN THIS LESSON"}</p><h2 data-cms-key="lesson:${lesson.slug}:introTitle">${lesson.introTitle}</h2>${lesson.introHtml ? `<div class="cms-rich-copy" data-cms-key="lesson:${lesson.slug}:intro">${sanitizeCmsHtml(lesson.introHtml)}</div>` : lesson.intro ? `<p data-cms-key="lesson:${lesson.slug}:intro">${escapeCmsText(lesson.intro)}</p>` : ""}${(lesson.sections || []).map(([title, paragraphs], sIdx) => `<details class="lesson-section"><summary data-cms-key="lesson:${lesson.slug}:sec:${sIdx}:title">${title}</summary>${(paragraphs || []).map((p, pIdx) => renderLessonParagraph(p, `lesson:${lesson.slug}:sec:${sIdx}:p:${pIdx}`)).join("")}</details>`).join("")}</section>
      <section class="lesson-content">${lesson.pdfUrl ? `<a class="download-link" href="${escapeCmsText(lesson.pdfUrl)}" target="_blank" rel="noopener">Download PDF</a>` : `<a class="download-link" href="#">Download PDF</a>`}${(lesson.resource && (Array.isArray(lesson.resource) ? lesson.resource.length > 0 : lesson.resource)) ? `<details class="lesson-section"><summary data-cms-key="lesson:${lesson.slug}:res:title">${lesson.resourceTitle}</summary>${(Array.isArray(lesson.resource) ? lesson.resource : [lesson.resource]).map((p, pIdx) => renderLessonParagraph(p, `lesson:${lesson.slug}:res:p:${pIdx}`)).join("")}</details>` : ""}</section>
    </div><img class="lesson-photo" data-cms-layout-group="lesson-columns" data-cms-layout-key="photo" data-cms-key="lesson:${lesson.slug}:photo" src="${escapeCmsText(lesson.image)}" alt="${lesson.imageAlt || ""}" style="--lesson-image-height: ${lesson.imageHeight}px" /></div>
    <div class="lesson-end" data-cms-layout-group="lesson-page" data-cms-layout-key="completion"><label><input type="checkbox" data-lesson="${lesson.slug}" ${isComplete ? "checked" : ""} /> Mark lesson complete</label><a class="button" href="${nextLink}">Complete &amp; Continue</a></div>
  </article></div>`;
}

function renderLessonParagraph(paragraph, key = "") {
  const keyAttr = key ? ` data-cms-key="${key}"` : "";
  if (paragraph && typeof paragraph === "object" && Object.hasOwn(paragraph, "html")) {
    return `<div class="cms-rich-copy"${keyAttr}>${sanitizeCmsHtml(paragraph.html)}</div>`;
  }
  return `<p${keyAttr}>${escapeCmsText(paragraph)}</p>`;
}

function formatPublishedDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return "";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(date);
}

function renderBlock(block) {
  if (!block || !block.type) return "";
  const id = block.id || `b_${Math.random().toString(36).slice(2, 9)}`;
  const content = block.content || {};
  const style = block.style || {};
  const customStyles = [
    style.textAlign ? `text-align: ${style.textAlign};` : "",
    style.backgroundColor ? `background-color: ${style.backgroundColor};` : "",
    style.textColor || style.color ? `color: ${style.textColor || style.color};` : "",
    style.paddingTop ? `padding-top: ${style.paddingTop};` : "",
    style.paddingBottom ? `padding-bottom: ${style.paddingBottom};` : "",
    style.paddingLeft ? `padding-left: ${style.paddingLeft};` : "",
    style.paddingRight ? `padding-right: ${style.paddingRight};` : "",
    style.marginTop ? `margin-top: ${style.marginTop};` : "",
    style.marginBottom ? `margin-bottom: ${style.marginBottom};` : "",
    style.fontSize ? `font-size: ${style.fontSize};` : "",
    style.fontFamily ? `font-family: ${style.fontFamily};` : "",
    style.fontWeight ? `font-weight: ${style.fontWeight};` : "",
    style.lineHeight ? `line-height: ${style.lineHeight};` : "",
    style.letterSpacing ? `letter-spacing: ${style.letterSpacing};` : "",
    style.borderStyle ? `border-style: ${style.borderStyle};` : "",
    style.borderWidth ? `border-width: ${style.borderWidth};` : "",
    style.borderColor ? `border-color: ${style.borderColor};` : "",
    style.borderRadius ? `border-radius: ${style.borderRadius};` : "",
    style.boxShadow ? `box-shadow: ${style.boxShadow};` : "",
    style.zIndex !== undefined && style.zIndex !== "" ? `z-index: ${style.zIndex};` : ""
  ].filter(Boolean).join(" ");

  const styleAttr = customStyles ? `style="${customStyles}"` : "";

  switch (block.type) {
    case "hero": {
      const bg = content.backgroundImage ? `style="background-image: url('${escapeCmsText(content.backgroundImage)}');"` : "";
      return `<section class="wov-block wov-block-hero page-section" data-wov-block-id="${id}" data-wov-block-type="hero" ${bg}>
        <div class="hero-overlay"></div>
        <div class="hero-content" ${styleAttr}>
          ${content.eyebrow ? `<p class="eyebrow" data-cms-key="block:${id}:eyebrow">${escapeCmsText(content.eyebrow)}</p>` : ""}
          ${content.title1 ? `<h1 class="hero-title1" data-cms-key="block:${id}:title1">${escapeCmsText(content.title1)}</h1>` : ""}
          ${content.title2 ? `<h1 class="hero-title2" data-cms-key="block:${id}:title2">${escapeCmsText(content.title2)}</h1>` : ""}
          ${content.description ? `<p class="hero-desc" data-cms-key="block:${id}:description">${escapeCmsText(content.description)}</p>` : ""}
          ${content.buttonText ? `<a class="button hero-btn" data-cms-key="block:${id}:button" href="${escapeCmsText(content.buttonLink || '#/about')}">${escapeCmsText(content.buttonText)}</a>` : ""}
        </div>
      </section>`;
    }
    case "heading": {
      const tag = ["h1", "h2", "h3", "h4", "h5", "h6"].includes(content.tag) ? content.tag : "h2";
      return `<div class="wov-block wov-block-container" data-wov-block-id="${id}" data-wov-block-type="heading" style="padding: 14px 0;">
        <${tag} ${styleAttr} data-cms-key="block:${id}:heading">${escapeCmsText(content.text || "Heading Text")}</${tag}>
      </div>`;
    }
    case "text": {
      return `<div class="wov-block wov-block-container" data-wov-block-id="${id}" data-wov-block-type="text" style="padding: 12px 0;">
        <div class="cms-rich-copy" ${styleAttr} data-cms-key="block:${id}:text">${sanitizeCmsHtml(content.html || content.text || "<p>Add your content here...</p>")}</div>
      </div>`;
    }
    case "button": {
      const variantClass = content.variant === "outline" ? "wov-btn-outline" : (content.variant === "pill" ? "wov-btn-primary wov-btn-pill" : "wov-btn-primary");
      return `<div class="wov-block wov-block-container" style="text-align: ${style.textAlign || 'center'}; padding: 16px 0;" data-wov-block-id="${id}" data-wov-block-type="button">
        <a class="wov-block-btn ${variantClass}" href="${escapeCmsText(content.link || '#/')}" ${styleAttr} data-cms-key="block:${id}:btn">${escapeCmsText(content.text || "Learn More")}</a>
      </div>`;
    }
    case "image": {
      return `<div class="wov-block wov-block-container" style="text-align: ${style.textAlign || 'center'}; padding: 20px 0;" data-wov-block-id="${id}" data-wov-block-type="image">
        <img src="${escapeCmsText(content.url || '')}" alt="${escapeCmsText(content.alt || '')}" ${styleAttr} style="max-width: 100%; height: auto;" data-cms-key="block:${id}:image" />
        ${content.caption ? `<p class="image-caption" style="color: var(--muted); font-size: 12px; margin-top: 6px;" data-cms-key="block:${id}:caption">${escapeCmsText(content.caption)}</p>` : ""}
      </div>`;
    }
    case "quote": {
      return `<div class="wov-block wov-block-container" data-wov-block-id="${id}" data-wov-block-type="quote">
        <div class="wov-block-quote" ${styleAttr}>
          <blockquote data-cms-key="block:${id}:quote">“${escapeCmsText(content.quote || "Your scripture quote here")}”</blockquote>
          ${content.reference ? `<cite data-cms-key="block:${id}:cite">— ${escapeCmsText(content.reference)}</cite>` : ""}
        </div>
      </div>`;
    }
    case "accordion": {
      const items = Array.isArray(content.items) ? content.items : [];
      return `<div class="wov-block wov-block-container" data-wov-block-id="${id}" data-wov-block-type="accordion" ${styleAttr}>
        <div class="wov-block-accordion">
          ${items.map((item, idx) => `
            <details class="wov-accordion-item">
              <summary data-cms-key="block:${id}:acc:${idx}:title">${escapeCmsText(item.title || "Section")}</summary>
              <div class="wov-accordion-content" data-cms-key="block:${id}:acc:${idx}:content">${sanitizeCmsHtml(item.content || "")}</div>
            </details>
          `).join("")}
        </div>
      </div>`;
    }
    case "gallery": {
      const cols = Number(content.columns) || 4;
      const images = Array.isArray(content.images) ? content.images : [];
      return `<div class="wov-block wov-block-container" data-wov-block-id="${id}" data-wov-block-type="gallery" ${styleAttr}>
        ${content.title ? `<div class="section-heading"><h2 data-cms-key="block:${id}:title">${escapeCmsText(content.title)}</h2></div>` : ""}
        <div class="wov-block-gallery-grid wov-gallery-cols-${cols}">
          ${images.map((img, idx) => `
            <div class="wov-gallery-item">
              <img src="${escapeCmsText(img.url || '')}" alt="${escapeCmsText(img.alt || '')}" loading="lazy" data-cms-key="block:${id}:img:${idx}" />
            </div>
          `).join("")}
        </div>
      </div>`;
    }
    case "columns": {
      const layoutClass = `wov-layout-${content.layout || "50-50"}`;
      const cols = Array.isArray(content.columns) ? content.columns : [[], []];
      return `<div class="wov-block wov-block-container" data-wov-block-id="${id}" data-wov-block-type="columns" ${styleAttr}>
        <div class="wov-block-columns ${layoutClass}">
          ${cols.map(colBlocks => `
            <div class="wov-col">
              ${Array.isArray(colBlocks) ? colBlocks.map(renderBlock).join("") : ""}
            </div>
          `).join("")}
        </div>
      </div>`;
    }
    case "form": {
      return `<div class="wov-block page-section" data-wov-block-id="${id}" data-wov-block-type="form" ${styleAttr}>
        <div class="project" style="background: transparent; color: inherit; padding: 60px 8vw;">
          <div class="project-copy">
            <h2 data-cms-key="block:${id}:title">${escapeCmsText(content.title || "Get in Touch")}</h2>
            <p data-cms-key="block:${id}:subtitle">${escapeCmsText(content.subtitle || "")}</p>
          </div>
          <form class="form" data-form="contact">
            <div class="field"><label for="f-first-${id}">First Name <span>(required)</span></label><input id="f-first-${id}" name="fname" required /></div>
            <div class="field"><label for="f-last-${id}">Last Name <span>(required)</span></label><input id="f-last-${id}" name="lname" required /></div>
            <div class="field full"><label for="f-email-${id}">Email <span>(required)</span></label><input id="f-email-${id}" name="email" type="email" required /></div>
            <div class="field full"><label for="f-msg-${id}">Message <span>(required)</span></label><textarea id="f-msg-${id}" name="message" rows="3" required></textarea></div>
            <button class="button" type="submit" data-cms-key="block:${id}:submit">${escapeCmsText(content.submitText || "Send")}</button>
            <p class="form-status" aria-live="polite"></p>
          </form>
        </div>
      </div>`;
    }
    case "spacer": {
      const height = style.height || "40px";
      const showLine = content.showLine ? `<div class="wov-spacer-line"></div>` : "";
      return `<div class="wov-block wov-block-container wov-block-spacer" data-wov-block-id="${id}" data-wov-block-type="spacer" style="height: ${height};">
        ${showLine}
      </div>`;
    }
    case "marquee": {
      const text = escapeCmsText(content.text || "Follow the Journey ⦁ Follow the Journey");
      return `<div class="wov-block wov-block-marquee-wrap" data-wov-block-id="${id}" data-wov-block-type="marquee" ${styleAttr}>
        <div class="journey-marquee">
          <span data-cms-key="block:${id}:text1">${text}</span><span aria-hidden="true" data-cms-key="block:${id}:text2">${text}</span>
        </div>
      </div>`;
    }
    case "video": {
      const url = content.url || "";
      const isEmbed = url.includes("youtube.com") || url.includes("youtu.be") || url.includes("vimeo.com");
      let embedHtml = "";
      if (isEmbed) {
        let embedSrc = url;
        if (url.includes("youtube.com/watch?v=")) {
          embedSrc = url.replace("watch?v=", "embed/");
        } else if (url.includes("youtu.be/")) {
          embedSrc = url.replace("youtu.be/", "www.youtube.com/embed/");
        } else if (url.includes("vimeo.com/") && !url.includes("player.vimeo.com")) {
          embedSrc = url.replace("vimeo.com/", "player.vimeo.com/video/");
        }
        embedHtml = `<div class="wov-video-responsive" style="position:relative; padding-bottom:56.25%; height:0; overflow:hidden; border-radius:8px; box-shadow:0 4px 16px rgba(0,0,0,0.15);"><iframe src="${escapeCmsText(embedSrc)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy" style="position:absolute; top:0; left:0; width:100%; height:100%;"></iframe></div>`;
      } else if (url.endsWith(".mp3") || url.includes("audio")) {
        embedHtml = `<div class="wov-audio-wrap" style="padding:16px; background:var(--surface, #f8f6f0); border-radius:8px;"><audio controls src="${escapeCmsText(url)}" style="width:100%;"></audio></div>`;
      } else if (url) {
        embedHtml = `<div class="wov-video-responsive" style="border-radius:8px; overflow:hidden;"><video controls src="${escapeCmsText(url)}" style="width:100%; height:auto; display:block;"></video></div>`;
      } else {
        embedHtml = `<div class="wov-video-placeholder" style="padding:48px 20px; background:rgba(0,180,216,0.06); border:2px dashed #00b4d8; border-radius:8px; text-align:center;"><span style="font-size:32px;">▶</span><p style="margin-top:8px; font-weight:600; color:var(--ink);">Add YouTube, Vimeo, or Video URL in Inspector</p></div>`;
      }
      return `<div class="wov-block wov-block-container" data-wov-block-id="${id}" data-wov-block-type="video" ${styleAttr} style="padding: 24px 0;">
        ${content.title ? `<div class="section-heading" style="margin-bottom:14px;"><h3 style="margin:0; font-size:24px;" data-cms-key="block:${id}:title">${escapeCmsText(content.title)}</h3></div>` : ""}
        ${embedHtml}
        ${content.caption ? `<p class="image-caption" style="color: var(--muted); font-size: 13px; margin-top: 8px;" data-cms-key="block:${id}:caption">${escapeCmsText(content.caption)}</p>` : ""}
      </div>`;
    }
    case "callout": {
      const icon = content.icon || "📖";
      const title = content.title || "Weekly Reflection Focus";
      const text = content.text || "Add your inspirational takeaway or scripture focus here.";
      const variant = content.variant || "highlight";
      return `<div class="wov-block wov-block-container" data-wov-block-id="${id}" data-wov-block-type="callout" ${styleAttr} style="padding: 16px 0;">
        <div class="wov-callout-card wov-callout-${variant}">
          <div class="wov-callout-icon">${escapeCmsText(icon)}</div>
          <div class="wov-callout-body">
            <h4 class="wov-callout-title" data-cms-key="block:${id}:title">${escapeCmsText(title)}</h4>
            <div class="wov-callout-text" data-cms-key="block:${id}:text">${sanitizeCmsHtml(text)}</div>
          </div>
        </div>
      </div>`;
    }
    case "cta": {
      const title = content.title || "Grow in Faith & Virtue";
      const subtitle = content.subtitle || "Join our community of women walking together in dignity and truth.";
      const btnText = content.buttonText || "Explore Devotionals";
      const btnLink = content.buttonLink || "#/devotionals";
      const variant = content.variant || "brand";
      return `<section class="wov-block wov-block-cta wov-cta-${variant} page-section" data-wov-block-id="${id}" data-wov-block-type="cta" ${styleAttr}>
        <div class="wov-cta-inner">
          <h2 data-cms-key="block:${id}:title">${escapeCmsText(title)}</h2>
          <p data-cms-key="block:${id}:subtitle">${escapeCmsText(subtitle)}</p>
          <div class="wov-cta-actions">
            <a class="button" href="${escapeCmsText(btnLink)}" data-cms-key="block:${id}:button">${escapeCmsText(btnText)}</a>
          </div>
        </div>
      </section>`;
    }
    case "social": {
      const title = content.title || "Follow & Connect";
      return `<div class="wov-block wov-block-container" data-wov-block-id="${id}" data-wov-block-type="social" ${styleAttr} style="text-align: center; padding: 30px 0;">
        ${title ? `<h3 style="margin-bottom: 16px; font-size: 16px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted);" data-cms-key="block:${id}:title">${escapeCmsText(title)}</h3>` : ""}
        <div class="wov-social-links" style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
          ${content.instagram ? `<a class="button" style="padding: 8px 18px; font-size: 12px;" href="${escapeCmsText(content.instagram)}" target="_blank" rel="noopener">📸 Instagram</a>` : ""}
          ${content.youtube ? `<a class="button" style="padding: 8px 18px; font-size: 12px;" href="${escapeCmsText(content.youtube)}" target="_blank" rel="noopener">▶ YouTube</a>` : ""}
          ${content.spotify ? `<a class="button" style="padding: 8px 18px; font-size: 12px;" href="${escapeCmsText(content.spotify)}" target="_blank" rel="noopener">🎧 Spotify</a>` : ""}
          ${content.email ? `<a class="button" style="padding: 8px 18px; font-size: 12px;" href="mailto:${escapeCmsText(content.email)}">✉ Email Us</a>` : ""}
        </div>
      </div>`;
    }
    default:
      return "";
  }
}

function renderBlocksPage(blocks) {
  if (!Array.isArray(blocks) || blocks.length === 0) return "";
  return `<div class="page-fade wov-blocks-page">${blocks.map(renderBlock).join("")}</div>`;
}

function render() {
  const rawPath = window.location.hash.replace(/^#\/?/, "").replace(/\/$/, "");
  const path = rawPath.split("?")[0].replace(/\/$/, "");
  const routeKey = path || "home";
  const lesson = path.startsWith("devotionals/") ? allLessons().find(item => item.slug === path.slice("devotionals/".length)) : null;
  document.body.dataset.route = lesson ? "devotionals" : path || "home";

  if (cmsContent.blocks && Array.isArray(cmsContent.blocks[routeKey]) && cmsContent.blocks[routeKey].length > 0) {
    main.innerHTML = renderBlocksPage(cmsContent.blocks[routeKey]);
  } else if (!path) main.innerHTML = homePage();
  else if (path === "about") main.innerHTML = aboutPage();
  else if (path === "contact") main.innerHTML = contactPage();
  else if (path === "devotionals") main.innerHTML = coursePage();
  else if (lesson) main.innerHTML = lessonPage(lesson);
  else main.innerHTML = `<section class="page-intro"><div class="page-intro-inner"><p class="eyebrow">Women of Virtue</p><h1>Page not found.</h1><a class="button" href="#/">Return home</a></div></section>`;

  applyCmsLayout();
  registerCmsText();
  applyCmsPositionOverrides();
  applyCmsTheme();
  document.querySelectorAll(".site-nav a").forEach(link => {
    const href = link.getAttribute("href") || "";
    const target = href.replace(/^#\/?/, "");
    if (window.location.hash.replace(/^#\/?/, "") === target || (target === "devotionals" && path.startsWith("devotionals"))) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  document.title = lesson ? `${lesson.title} — Women of Virtue` : `${path ? `${path[0].toUpperCase()}${path.slice(1)}` : "Women of Virtue"} | Women of Virtue`;
  nav.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open navigation");
  document.body.style.overflow = "";
  window.scrollTo(0, 0);
}

function saveLesson(slug, checked) {
  const progress = progressData();
  progress[slug] = checked;
  localStorage.setItem("virtue-progress", JSON.stringify(progress));
  const path = window.location.hash.replace(/^#\/?/, "");
  if (path === "devotionals") render();
}

window.addEventListener("hashchange", render);
menuToggle.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("is-open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  document.body.style.overflow = isOpen ? "hidden" : "";
});

nav.addEventListener("click", event => {
  if (event.target.closest("a")) {
    nav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
    document.body.style.overflow = "";
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && nav.classList.contains("is-open")) {
    nav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
    document.body.style.overflow = "";
    menuToggle.focus();
  }
});

let resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    applyCmsPositionOverrides();
    if (window.innerWidth > 768 && nav.classList.contains("is-open")) {
      nav.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    }
  }, 100);
}, { passive: true });
main.addEventListener("change", event => {
  if (event.target.matches("[data-lesson]")) saveLesson(event.target.dataset.lesson, event.target.checked);
});
main.addEventListener("submit", async event => {
  const form = event.target.closest("form[data-form]");
  if (!form) return;
  event.preventDefault();

  const statusEl = form.querySelector(".form-status");
  const submitBtn = form.querySelector("button[type='submit']");
  const formType = form.dataset.form || "contact";

  const fname = (form.querySelector("[name='fname']")?.value || "").trim();
  const lname = (form.querySelector("[name='lname']")?.value || "").trim();
  const email = (form.querySelector("[name='email']")?.value || "").trim();
  const phone = (form.querySelector("[name='phone']")?.value || "").trim();
  const message = (form.querySelector("[name='message']")?.value || form.querySelector("textarea")?.value || "").trim();

  if (submitBtn) submitBtn.disabled = true;
  if (statusEl) {
    statusEl.style.color = "#777c75";
    statusEl.textContent = "Sending message to Heylee (heylee@absolutionuecna.org)…";
  }

  const payload = {
    recipient: "heylee@absolutionuecna.org",
    formType,
    fname,
    lname,
    email,
    phone,
    message
  };

  try {
    const res = await fetch("./api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      if (statusEl) {
        statusEl.style.color = "#2e7d32";
        statusEl.textContent = data.message || `Thank you, ${fname || 'friend'}! Your message has been sent to Heylee at heylee@absolutionuecna.org.`;
      }
      form.reset();
    } else {
      throw new Error(data.error || `Server returned ${res.status}`);
    }
  } catch (err) {
    console.warn("Contact API fallback to mailto:", err.message);
    const subject = encodeURIComponent(`[Women of Virtue] ${formType === 'project' ? 'Start a Project' : 'Inquiry'} from ${fname} ${lname}`.trim());
    const bodyText = encodeURIComponent(`From: ${fname} ${lname}\nEmail: ${email}\nPhone: ${phone}\n\nMessage:\n${message}`);
    const mailtoUrl = `mailto:heylee@absolutionuecna.org?subject=${subject}&body=${bodyText}`;

    if (statusEl) {
      statusEl.style.color = "#2e7d32";
      statusEl.innerHTML = `Your message is ready! If your mail client didn't open automatically, <a href="${mailtoUrl}" target="_blank" style="text-decoration:underline; font-weight:bold; color:inherit;">click here to email Heylee directly at heylee@absolutionuecna.org</a>.`;
    }
    window.location.href = mailtoUrl;
    form.reset();
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});

window.renderBlock = renderBlock;
window.render = render;
window.getCmsContent = () => cmsContent;
window.setCmsContent = (c) => { cmsContent = c; render(); };

window.addEventListener("message", event => {
  if (event.data && event.data.type === "WOV_UPDATE_CONTENT") {
    cmsContent = event.data.content;
    render();
  }
});

async function initializeSite() {
  await loadCmsContent();
  if (!window.location.hash) history.replaceState(null, "", `${window.location.pathname}${window.location.search}#/`);
  render();
}

initializeSite();