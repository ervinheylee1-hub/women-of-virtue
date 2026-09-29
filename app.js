const main = document.querySelector("#main");
const nav = document.querySelector("#site-nav");
const menuToggle = document.querySelector(".menu-toggle");
const cmsStorageKey = "women-of-virtue-content-v1";
let cmsContent = {
  copyOverrides: {},
  richTextOverrides: {},
  textStyles: {},
  theme: {},
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

function allLessons() {
  const added = cmsContent.devotionals.map(item => ({
    slug: item.slug,
    title: escapeCmsText(item.title),
    titleHtml: sanitizeCmsHtml(item.titleHtml || ""),
    next: "",
    introTitle: escapeCmsText(item.title),
    intro: "",
    introHtml: sanitizeCmsHtml(item.intro),
    sections: [["Devotional", [{ html: sanitizeCmsHtml(item.body) }]]],
    resourceTitle: "Additional Resources",
    resource: item.resource ? [{ html: sanitizeCmsHtml(item.resource) }] : [],
    image: item.image || images.bible,
    imageHeight: 450,
    imageOffset: 0
  }));
  return [...lessons, ...added];
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
  const style = cmsContent.textStyles[key];
  if (!style) return;
  if (["Georgia, serif", "Arial, sans-serif", "cursive"].includes(style.fontFamily)) element.style.fontFamily = style.fontFamily;
  if (/^(?:1[0-9]|2[0-9]|3[0-6]|48)px$/.test(style.fontSize || "")) element.style.fontSize = style.fontSize;
  if (/^#[0-9a-f]{6}$/i.test(style.color || "")) element.style.color = style.color;
  if (["left", "center", "right", "justify"].includes(style.textAlign)) element.style.textAlign = style.textAlign;
  if (["normal", "italic"].includes(style.fontStyle)) element.style.fontStyle = style.fontStyle;
  if (["none", "underline"].includes(style.textDecoration)) element.style.textDecoration = style.textDecoration;
  if (["normal", "bold"].includes(style.fontWeight)) element.style.fontWeight = style.fontWeight;
}

function applyCmsTheme() {
  const theme = cmsContent.theme || {};
  const colors = {
    headerPink: /^#[0-9a-f]{6}$/i.test(theme.headerPink || "") ? theme.headerPink : "#d4967d",
    headingPink: /^#[0-9a-f]{6}$/i.test(theme.headingPink || "") ? theme.headingPink : "#ffc0cb",
    bodyTextColor: /^#[0-9a-f]{6}$/i.test(theme.bodyTextColor || "") ? theme.bodyTextColor : "#303636"
  };
  document.documentElement.style.setProperty("--cms-header-pink", colors.headerPink);
  document.documentElement.style.setProperty("--cms-heading-pink", colors.headingPink);
  document.documentElement.style.setProperty("--cms-body-text-color", colors.bodyTextColor);
  let bodyColorRule = document.querySelector("#cms-body-color-rule");
  if (theme.bodyTextColor) {
    if (!bodyColorRule) {
      bodyColorRule = document.createElement("style");
      bodyColorRule.id = "cms-body-color-rule";
      document.head.append(bodyColorRule);
    }
    bodyColorRule.textContent = `#main p, #main li, #main label, .site-footer p { color: ${colors.bodyTextColor}; }`;
  } else {
    bodyColorRule?.remove();
  }
}

function registerCmsText() {
  const occurrences = new Map();
  const selectors = "h1,h2,h3,h4,p,summary,button,a,label,span,.cms-rich-copy";
  document.querySelectorAll(selectors).forEach(element => {
    if (element.closest(".journey-marquee")) return;
    const textNodes = [...element.childNodes].filter(node => node.nodeType === Node.TEXT_NODE);
    if (element.children.length > 0 && textNodes.length === 0) return;
    if (element.dataset.cmsKey) {
      applyCmsText(element, element.dataset.cmsKey);
      return;
    }
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
  const localServer = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  if (localServer) {
    try {
      const response = await fetch("./api/public-content", { cache: "no-store" });
      if (response.ok) data = await response.json();
    } catch {}
  }
  if (!data && window.location.protocol !== "file:") {
    try {
      const saved = localStorage.getItem(cmsStorageKey);
      if (saved) data = JSON.parse(saved);
    } catch {}
  }
  if (!data) {
    try {
      const stored = localStorage.getItem(cmsStorageKey);
      if (stored) data = JSON.parse(stored);
    } catch {}
  }
  if (!data) {
    try {
      const response = await fetch("./content.json", { cache: "no-store" });
      if (response.ok) data = await response.json();
    } catch {}
  }
  if (!data) return;
  cmsContent = {
    copyOverrides: data.copyOverrides || {},
    richTextOverrides: data.richTextOverrides || {},
    textStyles: data.textStyles || {},
    theme: data.theme || {},
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
    <section class="hero page-section" aria-label="Welcome">
      <div class="hero-copy"><h1>Reject Culture</h1><h1>Follow Christ</h1><p>Join the movement to bring back traditional Femininity.</p><a class="button" href="#/about">Learn More</a></div>
    </section>
    <section class="journey page-section">
      <h1 class="journey-marquee" aria-label="Follow the Journey"><span>Follow the Journey ⦁ Follow the Journey</span><span aria-hidden="true">Follow the Journey ⦁ Follow the Journey</span></h1>
      <a class="button" href="#/contact">Connect</a>
      <div class="gallery" aria-label="Follow the Journey">
        <img src="${images.brunch}" alt="Dessert with ice cream and toppings on a blue plate, drinks on pink table, blurred restaurant background." />
        <img src="${images.prayer}" alt="Close-up of a person wearing a floral-patterned outfit with their hands clasped together in prayer" />
        <img src="${images.bible}" alt="a woman at a bible study" />
        <img src="${images.letter}" alt="A framed letter board with the message, 'JESUS IS WORTH EVERYTHING YOU ARE AFRAID OF LOSING' written on it, placed on a windowsill near a window." />
      </div>
    </section>
    <section class="project page-section" id="project">
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
        <div class="about-copy"><h1>For decades, women across the globe have been fed a lie.</h1><h3>The lie that the biblical woman is an oppressed woman.</h3><p>This lie is as old as time; there is nothing new under the sun. The first feminists fought to be equal under the law, not to erase roles altogether. However, over the years, this has changed. The enemy has convinced young women that they must abandon their God-given calling within the home and flip their priorities backwards to appease the feminist hustler culture we see today.</p><p>God created man and woman equal, but <strong><em>different</em></strong>.</p><h3>What can we do?</h3><p>The Women of Virtue Movement is devoted to reassuring women around the globe that they do not need to suppress their feminine nature. By enlisting God’s word on their minds and fostering a community to grow in Christ without fear of condemnation from the modern culture. Together we can bring back the traditional femininity.</p><p class="about-empty"></p><p class="about-quote"><strong>Far too many Christian women today are eager to call themselves a feminist. The fear of the roles God has called women to is a direct act of unbelief and disobedience. We must not believe this fallen world’s definition of womanhood, and cling tightly to God’s truth.</strong></p></div>
      <div class="about-side"><img src="${images.about}" alt="a woman wearing a veil in church" />
        <div class="virtues" aria-label="The Way, The Truth, The Life"><details class="virtue"><summary>THE WAY</summary><p>Daily calls to prayer and weekly devotionals.</p><p>The foundation of Women of Virtue</p></details><details class="virtue"><summary>THE TRUTH</summary><p>Breaking down years of unbiblical propaganda that’s been fed to young women.</p><p>Rebuilding women’s true, biblical mindset.</p></details><details class="virtue"><summary>THE LIFE</summary><p>Guidance on living out the Virtues in daily life.</p><p>Both for married and unmarried woman's.</p></details></div>
      </div>
    </section>
  </div>`;
}

function contactPage() {
  return `<div class="page-fade"><section class="contact-layout page-section">
    <div class="contact-copy"><h1>Ready to find your inner virtue?</h1><p>Have questions about the Women of Virtue movement or how to get involved?</p><p>Reach out!</p>
      <form class="form contact-form" data-form="contact">
        <div class="field"><label for="contact-first">First Name <span>(required)</span></label><input id="contact-first" name="fname" autocomplete="given-name" required /></div>
        <div class="field"><label for="contact-last">Last Name <span>(required)</span></label><input id="contact-last" name="lname" autocomplete="family-name" required /></div>
        <div class="field full"><label for="contact-email">Email <span>(required)</span></label><input id="contact-email" name="email" type="email" autocomplete="email" required /></div>
        <div class="field full"><label for="contact-message">Message <span>(required)</span></label><textarea id="contact-message" name="message" rows="4" required></textarea></div>
        <button class="button" type="submit">SEND</button><p class="form-status" aria-live="polite"></p>
      </form>
    </div><img class="contact-photo" src="${images.contact}" alt="A woman wearing a white hoodie and gold jewelry" />
  </section></div>`;
}

function progressData() {
  try { return JSON.parse(localStorage.getItem("virtue-progress") || "{}"); } catch { return {}; }
}

function coursePage() {
  const availableLessons = allLessons();
  const completed = progressData();
  const count = availableLessons.filter(lesson => completed[lesson.slug]).length;
  const percent = Math.round(count / availableLessons.length * 100);
  return `<div class="page-fade devotional-page">
    <section class="course-banner page-section" aria-label="Devotional courses"></section>
    <section class="course-list-region page-section"><div class="course-page">
      <div class="course-intro"><h1>Devotional Courses</h1><p>Weekly Devotionals for Women of Virtue</p><p>Work through these continual courses on the various aspects of the Virtus woman.</p></div>
      <div class="course-head"><div class="progress-wrap"><div class="progress-track" role="progressbar" aria-label="Course Progress" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><span style="width:${percent}%"></span></div><span class="progress-count">${percent}%</span><span class="progress-label">Progress</span></div></div>
      <details class="course-unit" open><summary><strong>Firm Foundations</strong><span>${availableLessons.length} Lessons</span></summary><ul class="lesson-list">${availableLessons.map(lesson => `<li class="lesson-row"><a href="#/devotionals/${lesson.slug}">${lesson.titleHtml || lesson.title}</a><label class="lesson-check"><input type="checkbox" data-lesson="${lesson.slug}" ${completed[lesson.slug] ? "checked" : ""} /></label></li>`).join("")}</ul></details>
    </div></section>
    <section class="course-faq-region page-section"><div class="faq"><h1>Questions? We've got answers.</h1>${faqs.map(([question, answer], index) => `<details class="disclosure" ${index === 0 ? "open" : ""}><summary>${question}</summary><p>${answer}</p></details>`).join("")}</div></section>
  </div>`;
}

function lessonPage(lesson) {
  const isComplete = progressData()[lesson.slug] === true;
  const nextLink = lesson.next ? `#/devotionals/${lesson.next}` : "#/devotionals";
  return `<div class="page-fade"><article class="lesson-page">
    <nav class="lesson-crumb" aria-label="Course navigation"><a href="#/devotionals">Devotional Courses</a><a href="${nextLink}">Complete &amp; Continue</a></nav>
    <header class="lesson-title"><p class="eyebrow">Firm Foundations · ${allLessons().length} Lessons</p><h1>${lesson.titleHtml || lesson.title}</h1></header>
    <div class="lesson-grid" data-lesson="${lesson.slug}" style="--lesson-image-offset: ${lesson.imageOffset || 0}px"><div class="lesson-copy">
      <section class="lesson-content"><p class="eyebrow">${lesson.slug === "defining-femininity" ? "IN THIS DEVOTIONAL:" : "IN THIS LESSON"}</p><h2>${lesson.introTitle}</h2>${lesson.introHtml ? `<div class="cms-rich-copy">${sanitizeCmsHtml(lesson.introHtml)}</div>` : lesson.intro ? `<p>${lesson.intro}</p>` : ""}${lesson.sections.map(([title, paragraphs]) => `<details class="lesson-section"><summary>${title}</summary>${paragraphs.map(renderLessonParagraph).join("")}</details>`).join("")}</section>
      <section class="lesson-content"><a class="download-link" href="">Download PDF</a><details class="lesson-section"><summary>${lesson.resourceTitle}</summary>${lesson.resource.map(renderLessonParagraph).join("")}</details></section>
    </div><img class="lesson-photo" src="${lesson.image}" alt="" style="--lesson-image-height: ${lesson.imageHeight}px" /></div>
    <div class="lesson-end"><label><input type="checkbox" data-lesson="${lesson.slug}" ${isComplete ? "checked" : ""} /> Mark lesson complete</label><a class="button" href="${nextLink}">Complete &amp; Continue</a></div>
  </article></div>`;
}

function renderLessonParagraph(paragraph) {
  if (paragraph && typeof paragraph === "object" && Object.hasOwn(paragraph, "html")) {
    return `<div class="cms-rich-copy">${sanitizeCmsHtml(paragraph.html)}</div>`;
  }
  return `<p>${String(paragraph)}</p>`;
}

function render() {
  const path = window.location.hash.replace(/^#\/?/, "").replace(/\/$/, "");
  const lesson = path.startsWith("devotionals/") ? allLessons().find(item => item.slug === path.slice("devotionals/".length)) : null;
  document.body.dataset.route = lesson ? "devotionals" : path || "home";
  if (!path) main.innerHTML = homePage();
  else if (path === "about") main.innerHTML = aboutPage();
  else if (path === "contact") main.innerHTML = contactPage();
  else if (path === "devotionals") main.innerHTML = coursePage();
  else if (lesson) main.innerHTML = lessonPage(lesson);
  else main.innerHTML = `<section class="page-intro"><div class="page-intro-inner"><p class="eyebrow">Women of Virtue</p><h1>Page not found.</h1><a class="button" href="#/">Return home</a></div></section>`;

  applyCmsTheme();
  document.querySelectorAll(".site-nav a").forEach(link => {
    const target = link.getAttribute("href").slice(1);
    if (window.location.hash === `#${target}` || (target === "/devotionals" && path.startsWith("devotionals"))) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  document.title = lesson ? `${lesson.title} — Women of Virtue` : `${path ? `${path[0].toUpperCase()}${path.slice(1)}` : "Women of Virtue"} | Women of Virtue`;
  registerCmsText();
  nav.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open navigation");
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
});
main.addEventListener("change", event => {
  if (event.target.matches("[data-lesson]")) saveLesson(event.target.dataset.lesson, event.target.checked);
});
main.addEventListener("submit", event => {
  const form = event.target.closest("form[data-form]");
  if (!form) return;
  event.preventDefault();
  form.querySelector(".form-status").textContent = "Thank you for reaching out. Your message is ready to send.";
  form.reset();
});

async function initializeSite() {
  await loadCmsContent();
  if (!window.location.hash) history.replaceState(null, "", `${window.location.pathname}${window.location.search}#/`);
  render();
}

initializeSite();