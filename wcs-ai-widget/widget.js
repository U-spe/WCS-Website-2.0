(() => {
  if (window.__WCS_CODEO_WIDGET_LOADED__) return;
  window.__WCS_CODEO_WIDGET_LOADED__ = true;

  const REMIX_ICON_URL = "https://cdn.jsdelivr.net/npm/remixicon@4.6.0/fonts/remixicon.css";
  const CONFIG_URL = "/wcs-ai-widget/brand.json";
  const API_URL = "/api/chat";

  const STATE_KEY = "codeo-widget-state-v1";
  const MEMORY_KEY = "codeo-widget-memory-v1";
  const RESEARCH_KEY = "codeo-widget-research-v1";

  const MIN_REPLY_DELAY_MS = 1450;
  const REPLY_JITTER_MS = 350;
  const RESEARCH_TICK_MS = 620;
  const RESEARCH_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
  const PREFETCH_COOLDOWN_MS = 1000 * 60 * 10;
  const SESSION_LIMIT = 8;

  const DEFAULT_CONFIG = {
    assistantName: "Codeo",
    companyName: "Web Creation Studios",
    subtitle: "WCS research assistant",
    contact: {
      email: "solutionsforyourweb@gmail.com",
      phone: "(302) 526-0930"
    },
    pageDirectory: [
      { key: "home", label: "Home", url: "/", aliases: ["home", "homepage", "main"] },
      { key: "about", label: "About", url: "/about.html", aliases: ["about"] },
      { key: "team", label: "Team", url: "/team.html", aliases: ["team", "staff"] },
      { key: "services", label: "Services", url: "/services.html", aliases: ["services", "service"] },
      { key: "pricing", label: "Pricing", url: "/pricing.html", aliases: ["pricing", "price", "rates", "cost"] },
      { key: "portfolio", label: "Portfolio", url: "/portfolio.html", aliases: ["portfolio", "projects", "work", "gallery"] }
    ],
    starterQuestions: [
      {
        label: "Services",
        message: "What services does Web Creation Studios provide?"
      },
      {
        label: "Pricing",
        message: "What pricing information is available?"
      },
      {
        label: "Portfolio",
        message: "Show me the portfolio page."
      }
    ],
    welcomeMessage: "Hello. I am Codeo. How can I help with Web Creation Studios today?"
  };

  let config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  let currentPageKey = "home";

  let appState = { activeSessionId: null, sessions: {} };
  let memory = {
    lastPageKey: null,
    lastSeenAt: 0,
    businessType: "",
    budget: "",
    timeline: "",
    recentTopics: [],
    intake: {
      fullName: "",
      email: "",
      businessName: "",
      budget: "",
      timeline: "",
      needs: "",
      notes: ""
    }
  };
  let researchCache = { pages: {}, lastPrefetchAt: 0 };

  let activeSessionId = null;
  let closeTimer = null;
  let touchOpen = false;
  let researchTimer = null;
  let researchStepIndex = 0;
  let statusAutoClearTimer = null;
  let toastTimer = null;
  let notificationReady = false;
  let currentBookingSummary = "";

  const ui = {};

  function safeText(value) {
    return typeof value === "string" ? value : "";
  }

  function storageGet(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function trimText(value, max = 2200) {
    const text = safeText(value).replace(/\s+/g, " ").trim();
    if (text.length <= max) return text;
    return `${text.slice(0, Math.max(0, max - 1)).trim()}…`;
  }

  function ensureRemixIcons() {
    if (document.querySelector('link[data-wcs-remixicons="true"]')) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = REMIX_ICON_URL;
    link.setAttribute("data-wcs-remixicons", "true");
    document.head.appendChild(link);
  }

  function canHoverFinePointer() {
    return window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }

  function getPageByKey(key) {
    return config.pageDirectory.find((item) => item.key === key) || config.pageDirectory[0];
  }

  function sanitizePageKey(value) {
    const lowered = safeText(value).trim().toLowerCase();
    const page = config.pageDirectory.find(
      (item) => item.key === lowered || (Array.isArray(item.aliases) && item.aliases.includes(lowered))
    );
    return page ? page.key : null;
  }

  function getPageKeyFromPath(pathname) {
    const path = safeText(pathname).split("?")[0].split("#")[0];

    if (!path || path === "/" || path === "/index.html") return "home";
    if (path === "/about.html" || path === "/about") return "about";
    if (path === "/team.html" || path === "/team") return "team";
    if (path === "/services.html" || path === "/services") return "services";
    if (path === "/pricing.html" || path === "/pricing") return "pricing";
    if (path === "/portfolio.html" || path === "/portfolio" || path === "/projects.html") return "portfolio";

    const page = config.pageDirectory.find((item) => item.url === path);
    return page ? page.key : "home";
  }

  function inferTargetPageKey(message, fallbackPageKey) {
    const text = safeText(message).toLowerCase();
    const patterns = [
      { re: /(take me to|open|go to|show me).*(services?|service)/, key: "services" },
      { re: /(take me to|open|go to|show me).*(pricing|price|rates|cost)/, key: "pricing" },
      { re: /(take me to|open|go to|show me).*(portfolio|projects?|work|gallery)/, key: "portfolio" },
      { re: /(take me to|open|go to|show me).*(team|staff)/, key: "team" },
      { re: /(take me to|open|go to|show me).*(about)/, key: "about" },
      { re: /(take me to|open|go to|show me).*(home|homepage|main page)/, key: "home" },
      { re: /(services?|service|what do you build|what can you do)/, key: "services" },
      { re: /(pricing|price|rates|cost|budget|quote)/, key: "pricing" },
      { re: /(portfolio|projects?|work|examples|gallery)/, key: "portfolio" },
      { re: /(team|staff|who works|about the team)/, key: "team" },
      { re: /(about|story|background|who is wcs)/, key: "about" },
      { re: /(home|homepage|main page|start page)/, key: "home" }
    ];

    for (const item of patterns) {
      if (item.re.test(text)) return item.key;
    }

    return fallbackPageKey || "home";
  }

  function loadState() {
    const saved = storageGet(STATE_KEY, null);
    if (!saved || typeof saved !== "object") {
      return { activeSessionId: null, sessions: {} };
    }

    return {
      activeSessionId: typeof saved.activeSessionId === "string" ? saved.activeSessionId : null,
      sessions: saved.sessions && typeof saved.sessions === "object" ? saved.sessions : {}
    };
  }

  function saveState() {
    const sessions = Object.values(appState.sessions || {})
      .filter(Boolean)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    const kept = {};
    for (const session of sessions.slice(0, SESSION_LIMIT)) {
      kept[session.id] = session;
    }

    appState.sessions = kept;

    if (!kept[appState.activeSessionId]) {
      appState.activeSessionId = sessions[0]?.id || null;
    }

    storageSet(STATE_KEY, appState);
  }

  function loadMemory() {
    const saved = storageGet(MEMORY_KEY, null);
    const defaultMemory = {
      lastPageKey: null,
      lastSeenAt: 0,
      businessType: "",
      budget: "",
      timeline: "",
      recentTopics: [],
      intake: {
        fullName: "",
        email: "",
        businessName: "",
        budget: "",
        timeline: "",
        needs: "",
        notes: ""
      }
    };
    if (!saved || typeof saved !== "object") return defaultMemory;

    return {
      lastPageKey: safeText(saved.lastPageKey) || null,
      lastSeenAt: typeof saved.lastSeenAt === "number" ? saved.lastSeenAt : 0,
      businessType: safeText(saved.businessType),
      budget: safeText(saved.budget),
      timeline: safeText(saved.timeline),
      recentTopics: Array.isArray(saved.recentTopics) ? saved.recentTopics.filter(Boolean).slice(-8) : [],
      intake: {
        fullName: safeText(saved.intake?.fullName),
        email: safeText(saved.intake?.email),
        businessName: safeText(saved.intake?.businessName),
        budget: safeText(saved.intake?.budget),
        timeline: safeText(saved.intake?.timeline),
        needs: safeText(saved.intake?.needs),
        notes: safeText(saved.intake?.notes)
      }
    };
  }

  function saveMemory() {
    storageSet(MEMORY_KEY, memory);
  }

  function loadResearchCache() {
    const saved = storageGet(RESEARCH_KEY, null);
    if (!saved || typeof saved !== "object") return { pages: {}, lastPrefetchAt: 0 };

    return {
      pages: saved.pages && typeof saved.pages === "object" ? saved.pages : {},
      lastPrefetchAt: typeof saved.lastPrefetchAt === "number" ? saved.lastPrefetchAt : 0
    };
  }

  function saveResearchCache() {
    storageSet(RESEARCH_KEY, researchCache);
  }

  function currentSession() {
    return activeSessionId ? appState.sessions[activeSessionId] || null : null;
  }

  function hasUserMessages(session) {
    return Boolean(session && Array.isArray(session.messages) && session.messages.some((m) => m.role === "user"));
  }

  function createSession() {
    const id = `codeo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();

    const session = {
      id,
      title: "New chat",
      focusPageKey: currentPageKey,
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          role: "assistant",
          content: config.welcomeMessage,
          time: now
        }
      ]
    };

    appState.sessions[id] = session;
    activeSessionId = id;
    appState.activeSessionId = id;
    saveState();
    return session;
  }

  function ensureSession() {
    let session = currentSession();
    if (!session) session = createSession();
    return session;
  }

  function pruneAndSaveSession(session) {
    session.updatedAt = Date.now();
    appState.sessions[session.id] = session;

    if (Array.isArray(session.messages) && session.messages.length > 50) {
      session.messages = session.messages.slice(-50);
    }

    saveState();
  }

  function extractBusinessType(text) {
    const lowered = safeText(text).toLowerCase();
    const keywords = [
      "bakery", "church", "nonprofit", "school", "restaurant", "real estate", "coaching", "consulting",
      "photography", "music", "beauty", "salon", "barber", "construction", "legal", "medical", "sports",
      "gaming", "ecommerce", "store", "events", "portfolio", "fitness", "travel", "hospitality"
    ];

    for (const word of keywords) {
      if (lowered.includes(word)) return word;
    }

    return "";
  }

  function extractBudget(text) {
    const lowered = safeText(text);
    const match = lowered.match(/(?:budget|price|cost|quote)\s*(?:is|=|around|about)?\s*([$£€]\s?\d[\d,]*(?:\.\d{1,2})?|(?:\d[\d,]*(?:\.\d{1,2})?\s*(?:k|thousand)))/i);
    if (match) return match[1].replace(/\s+/g, " ").trim();

    const money = lowered.match(/([$£€]\s?\d[\d,]*(?:\.\d{1,2})?)/);
    if (money) return money[1].replace(/\s+/g, " ").trim();

    return "";
  }

  function extractTimeline(text) {
    const lowered = safeText(text).toLowerCase();
    const patterns = [
      /(asap|immediately|right away|urgent)/,
      /(this week|next week|this month|next month)/,
      /(soon|later|by [a-z]+|in \d+ days?|in \d+ weeks?)/,
      /(deadline|due date|launch date)/
    ];

    for (const re of patterns) {
      const match = lowered.match(re);
      if (match) return match[0];
    }

    return "";
  }

  function updateMemoryFromText(text, targetPageKey) {
    const businessType = extractBusinessType(text);
    const budget = extractBudget(text);
    const timeline = extractTimeline(text);

    if (businessType) memory.businessType = businessType;
    if (budget) memory.budget = budget;
    if (timeline) memory.timeline = timeline;

    const topicKey = sanitizePageKey(targetPageKey);
    if (topicKey) {
      const recent = Array.isArray(memory.recentTopics) ? memory.recentTopics.slice() : [];
      recent.push(topicKey);
      memory.recentTopics = Array.from(new Set(recent)).slice(-8);
    }

    saveMemory();
  }

  function buildMemorySummary() {
    return {
      lastPageKey: memory.lastPageKey,
      businessType: memory.businessType,
      budget: memory.budget,
      timeline: memory.timeline,
      recentTopics: Array.isArray(memory.recentTopics) ? memory.recentTopics.slice(-8) : [],
      intake: memory.intake
    };
  }

  function setStatus(text) {
    if (ui.status) ui.status.textContent = safeText(text);
  }

  function showToast(text, autoClear = true) {
    if (!ui.toast) return;
    ui.toast.textContent = safeText(text);
    ui.toast.classList.add("show");

    clearTimeout(toastTimer);
    if (autoClear) {
      toastTimer = window.setTimeout(() => {
        ui.toast.classList.remove("show");
      }, 2200);
    }
  }

  function openBookingPanel() {
    if (!ui.booking) return;
    ui.booking.classList.add("show");
    if (ui.bookingResult) ui.bookingResult.classList.remove("show");
    if (ui.bookingForm) ui.bookingForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
    populateBookingForm();
    showToast("Project intake opened.");
  }

  function closeBookingPanel() {
    if (ui.booking) ui.booking.classList.remove("show");
  }

  function toggleBookingPanel() {
    if (!ui.booking) return;
    if (ui.booking.classList.contains("show")) closeBookingPanel();
    else openBookingPanel();
  }

  function populateBookingForm() {
    if (!ui.bookingName) return;
    ui.bookingName.value = memory.intake.fullName || "";
    ui.bookingEmail.value = memory.intake.email || "";
    ui.bookingBusiness.value = memory.intake.businessName || memory.businessType || "";
    ui.bookingBudget.value = memory.intake.budget || memory.budget || "";
    ui.bookingTimeline.value = memory.intake.timeline || memory.timeline || "";
    ui.bookingNeeds.value = memory.intake.needs || "";
    ui.bookingNotes.value = memory.intake.notes || "";
  }

  function syncBookingInputsToMemory() {
    if (!ui.bookingName) return;
    memory.intake = {
      fullName: safeText(ui.bookingName.value).trim(),
      email: safeText(ui.bookingEmail.value).trim(),
      businessName: safeText(ui.bookingBusiness.value).trim(),
      budget: safeText(ui.bookingBudget.value).trim(),
      timeline: safeText(ui.bookingTimeline.value).trim(),
      needs: safeText(ui.bookingNeeds.value).trim(),
      notes: safeText(ui.bookingNotes.value).trim()
    };
    if (memory.intake.businessName && !memory.businessType) memory.businessType = memory.intake.businessName;
    if (memory.intake.budget) memory.budget = memory.intake.budget;
    if (memory.intake.timeline) memory.timeline = memory.intake.timeline;
    saveMemory();
  }

  function buildBookingSummary() {
    syncBookingInputsToMemory();
    const data = memory.intake;

    const summary = [
      "WCS Project Intake",
      `Name: ${data.fullName || "Not provided"}`,
      `Email: ${data.email || "Not provided"}`,
      `Business: ${data.businessName || "Not provided"}`,
      `Budget: ${data.budget || "Not provided"}`,
      `Timeline: ${data.timeline || "Not provided"}`,
      `Needs: ${data.needs || "Not provided"}`,
      `Notes: ${data.notes || "Not provided"}`,
      `Current page: ${getPageByKey(currentPageKey).label}`,
      `Prepared by: Codeo`
    ].join("\n");

    currentBookingSummary = summary;
    return summary;
  }

  async function copyBookingSummary() {
    if (!currentBookingSummary) {
      showToast("Generate an intake summary first.");
      return;
    }

    try {
      await navigator.clipboard.writeText(currentBookingSummary);
      showToast("Intake summary copied.");
    } catch {
      showToast("Could not copy the intake summary.");
    }
  }

  function openBookingEmailDraft() {
    if (!currentBookingSummary) {
      showToast("Generate an intake summary first.");
      return;
    }

    const subject = encodeURIComponent(`WCS Project Intake - ${memory.intake.businessName || memory.businessType || "New Lead"}`);
    const body = encodeURIComponent(currentBookingSummary);
    window.location.href = `mailto:${config.contact.email}?subject=${subject}&body=${body}`;
  }

  function renderCompanionBanner(previousPageKey) {
    if (!ui.companion) return;
    const current = getPageByKey(currentPageKey);
    const previous = previousPageKey && previousPageKey !== currentPageKey ? getPageByKey(previousPageKey) : null;

    if (previous) {
      ui.companion.innerHTML = `<strong>Site companion:</strong> You are on ${current.label}. Last time you were on ${previous.label}. I can read this page, scan related pages, and help you move through the site.`;
    } else if (currentPageKey !== "home") {
      ui.companion.innerHTML = `<strong>Site companion:</strong> You are on ${current.label}. I can read this page, scan related pages, and help you book an intake.`;
    } else {
      ui.companion.innerHTML = `<strong>Site companion:</strong> Browse WCS or ask Codeo to research any page on the site.`;
    }
  }

  function clearMessages() {
    if (ui.messages) ui.messages.innerHTML = "";
  }

  function addMessage(role, content) {
    if (!ui.messages) return;
    const bubble = document.createElement("div");
    bubble.className = `wcs-ai-message ${role}`;
    bubble.textContent = safeText(content);
    ui.messages.appendChild(bubble);
    
    ui.messages.scrollTo({
      top: ui.messages.scrollHeight,
      behavior: "smooth"
    });
    return bubble;
  }

  function addActionBubble(label, url, auto = false) {
    if (!ui.messages) return;
    const bubble = document.createElement("div");
    bubble.className = "wcs-ai-message assistant";

    const text = document.createElement("div");
    text.textContent = `Opening ${label || "page"}...`;
    bubble.appendChild(text);

    const row = document.createElement("div");
    row.className = "wcs-ai-action-row";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "wcs-ai-action-btn";
    button.textContent = label || "Open page";
    button.addEventListener("click", () => {
      window.location.href = url;
    });

    row.appendChild(button);
    bubble.appendChild(row);
    ui.messages.appendChild(bubble);
    
    ui.messages.scrollTo({
      top: ui.messages.scrollHeight,
      behavior: "smooth"
    });

    if (auto) {
      window.setTimeout(() => {
        window.location.href = url;
      }, 650);
    }
  }

  function setBusy(isBusy) {
    if (ui.sendBtn) ui.sendBtn.disabled = isBusy;
    if (ui.input) ui.input.disabled = isBusy;
    if (ui.typing) ui.typing.classList.toggle("show", isBusy);
  }

  function startResearchStatus(targetLabel) {
    clearInterval(researchTimer);
    researchStepIndex = 0;

    const steps = [
      `Scanning ${getPageByKey(currentPageKey).label}...`,
      `Checking ${targetLabel || "the target page"}...`,
      "Reading the site context...",
      "Building the answer..."
    ];

    setStatus(steps[0]);
    showToast(steps[0], false);

    researchTimer = window.setInterval(() => {
      researchStepIndex = (researchStepIndex + 1) % steps.length;
      setStatus(steps[researchStepIndex]);
      if (ui.toast) {
        ui.toast.textContent = steps[researchStepIndex];
        ui.toast.classList.add("show");
      }
    }, RESEARCH_TICK_MS);
  }

  function stopResearchStatus(doneText = "Codeo is done.") {
    clearInterval(researchTimer);
    researchTimer = null;

    setStatus("Ready.");
    showToast(doneText);

    clearTimeout(statusAutoClearTimer);
    statusAutoClearTimer = window.setTimeout(() => {
      if (ui.panel && !ui.panel.classList.contains("open")) {
        if (ui.toast) ui.toast.classList.remove("show");
      }
    }, 1200);
  }

  async function requestNotifications() {
    if (!("Notification" in window)) {
      showToast("Notifications are not supported in this browser.");
      return;
    }

    try {
      if (Notification.permission === "granted") {
        notificationReady = true;
        showToast("Notifications are already enabled.");
        return;
      }

      if (Notification.permission === "denied") {
        showToast("Notifications are blocked in browser settings.");
        return;
      }

      const permission = await Notification.requestPermission();
      notificationReady = permission === "granted";
      showToast(notificationReady ? "Notifications are enabled." : "Notifications are off.");
    } catch {
      showToast("Notifications could not be enabled.");
    }
  }

  function notifyDone(replyText) {
    const preview = trimText(replyText, 96) || "Codeo finished responding.";

    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("Codeo", {
          body: preview
        });
      } catch {}
    }

    if (navigator.vibrate) {
      navigator.vibrate(15);
    }
  }

  function openWidget() {
    if (ui.panel) ui.panel.classList.add("open");
    if (ui.input) ui.input.focus();
    showIntroArea();
  }

  function closeWidget() {
    if (ui.panel) ui.panel.classList.remove("open");
  }

  function scheduleClose() {
    clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      if (canHoverFinePointer() && ui.widget && !ui.widget.matches(":hover")) {
        closeWidget();
      }
    }, 220);
  }

  function renderQuestions(container, questions) {
    if (!container) return;
    container.innerHTML = "";

    questions.forEach((question) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "wcs-ai-chip";
      button.textContent = question.label;

      button.addEventListener("click", () => {
        sendMessage(question.message, { source: "starter" });
      });

      container.appendChild(button);
    });
  }

  function showIntroArea() {
    const session = ensureSession();
    if (!ui.intro) return;

    if (hasUserMessages(session)) {
      ui.intro.classList.add("hidden");
    } else {
      ui.intro.classList.remove("hidden");
      renderQuestions(ui.questions, config.starterQuestions.slice(0, 3));
    }
  }

  function renderSession(sessionId) {
    const session = appState.sessions[sessionId];
    if (!session) return;

    clearMessages();
    session.messages.forEach((message) => {
      addMessage(message.role, message.content);
    });

    showIntroArea();
    if (ui.messages) {
      ui.messages.scrollTop = ui.messages.scrollHeight;
    }
  }

  function getVisibleTextFromDocument(doc) {
    const root = doc.body ? doc.body.cloneNode(true) : doc.documentElement.cloneNode(true);

    if (root && typeof root.querySelectorAll === "function") {
      root.querySelectorAll("script, style, noscript, template, svg, canvas, iframe").forEach((node) => node.remove());
      const widget = root.querySelector("#wcs-ai-widget");
      if (widget) widget.remove();
    }

    return trimText(root?.textContent || "", 1800);
  }

  function extractLinksFromDocument(doc) {
    return Array.from(doc.querySelectorAll("a[href]"))
      .slice(0, 6)
      .map((node) => ({
        text: trimText(node.textContent || "", 80),
        href: safeText(node.getAttribute("href")).trim()
      }))
      .filter((item) => item.href);
  }

  function briefFromDocument(doc, page, sourceType) {
    const headings = Array.from(doc.querySelectorAll("h1, h2, h3, h4"))
      .slice(0, 8)
      .map((node) => trimText(node.textContent || "", 120))
      .filter(Boolean);

    return {
      key: page.key,
      url: page.url,
      label: page.label,
      title: trimText(doc.title || page.label || page.key, 120),
      sourceType,
      sourceLength: (doc.documentElement?.outerHTML || "").length,
      headings,
      links: extractLinksFromDocument(doc),
      summary: getVisibleTextFromDocument(doc),
      fetchedAt: Date.now()
    };
  }

  function cacheBrief(pageUrl, brief) {
    researchCache.pages[pageUrl] = brief;
    saveResearchCache();
  }

  function getCachedBrief(pageKey) {
    const page = getPageByKey(pageKey);
    const brief = researchCache.pages[page.url];
    if (!brief) return null;

    if (Date.now() - (brief.fetchedAt || 0) > RESEARCH_CACHE_TTL_MS) return null;
    return brief;
  }

  async function scanLivePage(pageKey) {
    if (pageKey !== currentPageKey) return null;

    try {
      const html = document.documentElement.outerHTML;
      const doc = new DOMParser().parseFromString(html, "text/html");
      return briefFromDocument(doc, getPageByKey(pageKey), "live-dom");
    } catch {
      return null;
    }
  }

  async function fetchRemotePage(pageKey) {
    const page = getPageByKey(pageKey);

    try {
      const response = await fetch(page.url, { cache: "no-store" });
      if (!response.ok) return null;

      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      return briefFromDocument(doc, page, "fetched-html");
    } catch {
      return null;
    }
  }

  async function getPageBrief(pageKey) {
    const normalized = sanitizePageKey(pageKey) || currentPageKey;
    const page = getPageByKey(normalized);
    const cached = getCachedBrief(normalized);
    if (cached) return cached;

    const live = await scanLivePage(normalized);
    if (live) {
      cacheBrief(page.url, live);
      return live;
    }

    const remote = await fetchRemotePage(normalized);
    if (remote) {
      cacheBrief(page.url, remote);
      return remote;
    }

    return cached || null;
  }

  async function gatherResearchContext(targetPageKey) {
    const normalizedTarget = sanitizePageKey(targetPageKey) || currentPageKey;
    const current = await getPageBrief(currentPageKey);
    const target = await getPageBrief(normalizedTarget);

    const related = [];
    const preferredKeys = Array.from(
      new Set([normalizedTarget, currentPageKey, "home", "services", "pricing", "portfolio", "about", "team"])
    );

    for (const key of preferredKeys) {
      if (related.length >= 3) break;
      const brief = await getPageBrief(key);
      if (!brief) continue;

      const exists = related.some((item) => item.url === brief.url);
      if (!exists) related.push(brief);
    }

    return {
      currentPage: current,
      targetPage: target || current,
      relatedPages: related
    };
  }

  async function prefetchAllPagesInBackground() {
    if (Date.now() - (researchCache.lastPrefetchAt || 0) < PREFETCH_COOLDOWN_MS) return;

    researchCache.lastPrefetchAt = Date.now();
    saveResearchCache();

    const run = async () => {
      for (const page of config.pageDirectory) {
        await getPageBrief(page.key);
        await sleep(120);
      }
    };

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => {
        run().catch(() => {});
      }, { timeout: 2000 });
    } else {
      window.setTimeout(() => {
        run().catch(() => {});
      }, 1200);
    }
  }

  async function sendMessage(message, options = {}) {
    const trimmed = safeText(message).trim();
    if (!trimmed) return;

    const session = ensureSession();
    const targetPageKey = inferTargetPageKey(trimmed, session.focusPageKey || currentPageKey);

    if (!hasUserMessages(session) && ui.intro) {
      ui.intro.classList.add("hidden");
    }

    addMessage("user", trimmed);

    const userEntry = {
      role: "user",
      content: trimmed,
      time: Date.now()
    };

    session.messages.push(userEntry);
    if (session.title === "New chat") {
      session.title = trimText(trimmed, 36) || "New chat";
    }

    session.focusPageKey = targetPageKey;
    updateMemoryFromText(trimmed, targetPageKey);
    pruneAndSaveSession(session);

    const research = await gatherResearchContext(targetPageKey);
    const targetPage = getPageByKey(targetPageKey);
    const targetLabel = targetPage?.label || "the target page";

    startResearchStatus(targetLabel);
    setBusy(true);

    const startTime = Date.now();

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: trimmed,
          history: session.messages.slice(-8),
          page: {
            path: window.location.pathname,
            title: document.title,
            key: currentPageKey
          },
          targetPage: {
            key: targetPage.key,
            url: targetPage.url,
            label: targetPage.label
          },
          research,
          memory: buildMemorySummary()
        })
      });

      const data = await response.json().catch(() => ({}));
      const elapsed = Date.now() - startTime;
      const minimumDelay = MIN_REPLY_DELAY_MS + Math.floor(Math.random() * REPLY_JITTER_MS);
      if (elapsed < minimumDelay) {
        await sleep(minimumDelay - elapsed);
      }

      const reply =
        typeof data.reply === "string" && data.reply.trim()
          ? data.reply.trim()
          : "I am unable to reach the AI service at the moment. Please try again shortly.";

      addMessage("assistant", reply);

      session.messages.push({
        role: "assistant",
        content: reply,
        time: Date.now()
      });

      if (data.focusPage) {
        session.focusPageKey = sanitizePageKey(data.focusPage) || targetPageKey;
      } else {
        session.focusPageKey = targetPageKey;
      }

      pruneAndSaveSession(session);

      if (data.action && typeof data.action === "object" && data.action.type === "navigate") {
        addActionBubble(data.action.label, data.action.url, Boolean(data.action.auto));
      }

      stopResearchStatus("Codeo is done.");
      showToast("Codeo finished.");
      notifyDone(reply);
    } catch {
      const elapsed = Date.now() - startTime;
      const minimumDelay = MIN_REPLY_DELAY_MS + Math.floor(Math.random() * REPLY_JITTER_MS);
      if (elapsed < minimumDelay) {
        await sleep(minimumDelay - elapsed);
      }

      const fallback = "I am unable to reach the AI service at the moment. Please try again shortly.";
      addMessage("assistant", fallback);

      session.messages.push({
        role: "assistant",
        content: fallback,
        time: Date.now()
      });

      pruneAndSaveSession(session);
      stopResearchStatus("Codeo is done.");
      showToast("Codeo finished.");
      notifyDone(fallback);
    } finally {
      setBusy(false);
      if (ui.input) ui.input.focus();
      showIntroArea();
    }
  }

  function startNewChat() {
    const session = createSession();
    activeSessionId = session.id;
    appState.activeSessionId = session.id;
    saveState();

    closeBookingPanel();
    renderSession(session.id);
    showToast("New chat started.");
  }

  function addBookingMessage(text) {
    addMessage("system", text);
    const session = ensureSession();
    session.messages.push({
      role: "system",
      content: text,
      time: Date.now()
    });
    pruneAndSaveSession(session);
  }

  function mountWidget() {
    const widget = document.createElement("div");
    widget.id = "wcs-ai-widget";
    widget.innerHTML = `
      <button id="wcs-ai-launcher" type="button" aria-label="Open Codeo">
        <i class="ri-global-line" aria-hidden="true"></i>
      </button>

      <section id="wcs-ai-panel" aria-label="Codeo assistant">
        <header id="wcs-ai-header">
          <div id="wcs-ai-title-wrap">
            <div id="wcs-ai-title"></div>
            <div id="wcs-ai-subtitle"></div>
            <div id="wcs-ai-status"></div>
          </div>

          <div class="wcs-ai-header-actions">
            <button id="wcs-ai-booking-btn" class="wcs-ai-icon-btn" type="button" aria-label="Open intake form" title="Intake">
              <i class="ri-clipboard-line" aria-hidden="true"></i>
            </button>
            <button id="wcs-ai-newchat" class="wcs-ai-icon-btn" type="button" aria-label="Start new chat" title="New chat">
              <i class="ri-add-line" aria-hidden="true"></i>
            </button>
            <button id="wcs-ai-notify" class="wcs-ai-icon-btn" type="button" aria-label="Enable notifications" title="Notifications">
              <i class="ri-notification-3-line" aria-hidden="true"></i>
            </button>
          </div>

          <button id="wcs-ai-close" type="button" aria-label="Close assistant">×</button>
        </header>

        <div id="wcs-ai-toast" aria-live="polite"></div>
        <div id="wcs-ai-companion"></div>

        <div id="wcs-ai-intro">
          <div id="wcs-ai-intro-title">Start here</div>
          <div id="wcs-ai-intro-copy">Use one of these questions, or type your own.</div>
          <div id="wcs-ai-questions"></div>
        </div>

        <div id="wcs-ai-booking">
          <div class="wcs-ai-booking-head">
            <div>
              <div class="wcs-ai-booking-title">Project intake</div>
              <div class="wcs-ai-booking-subtitle">Tell Codeo what you need. It will prepare a clean intake summary.</div>
            </div>
            <button id="wcs-ai-booking-close" type="button" aria-label="Close intake form">×</button>
          </div>

          <form id="wcs-ai-booking-form">
            <div class="wcs-ai-booking-grid">
              <input id="wcs-ai-booking-name" type="text" placeholder="Full name" class="full" />
              <input id="wcs-ai-booking-email" type="email" placeholder="Email address" />
              <input id="wcs-ai-booking-business" type="text" placeholder="Business name" />
              <input id="wcs-ai-booking-budget" type="text" placeholder="Budget" />
              <input id="wcs-ai-booking-timeline" type="text" placeholder="Timeline" />
              <textarea id="wcs-ai-booking-needs" class="full" placeholder="What do you need?"></textarea>
              <textarea id="wcs-ai-booking-notes" class="full" placeholder="Extra notes"></textarea>
            </div>

            <div class="wcs-ai-booking-actions">
              <button type="submit">Build intake summary</button>
              <button type="button" id="wcs-ai-booking-copy" class="secondary">Copy summary</button>
              <button type="button" id="wcs-ai-booking-email-draft" class="secondary">Email draft</button>
            </div>

            <pre id="wcs-ai-booking-result"></pre>
          </form>
        </div>

        <div id="wcs-ai-messages" aria-live="polite" aria-relevant="additions"></div>
        <div id="wcs-ai-typing">
          Codeo is researching
          <span class="wcs-ai-dots" aria-hidden="true">
            <span></span><span></span><span></span>
          </span>
        </div>

        <form id="wcs-ai-input-wrap">
          <input
            id="wcs-ai-input"
            type="text"
            placeholder="Ask about WCS services, contact, or site details"
            autocomplete="off"
          />
          <button id="wcs-ai-send" type="submit">Send</button>
        </form>
      </section>
    `;

    document.body.appendChild(widget);

    ui.widget = widget;
    ui.launcher = document.getElementById("wcs-ai-launcher");
    ui.panel = document.getElementById("wcs-ai-panel");
    ui.closeBtn = document.getElementById("wcs-ai-close");
    ui.newChatBtn = document.getElementById("wcs-ai-newchat");
    ui.notifyBtn = document.getElementById("wcs-ai-notify");
    ui.bookingBtn = document.getElementById("wcs-ai-booking-btn");
    ui.intro = document.getElementById("wcs-ai-intro");
    ui.questions = document.getElementById("wcs-ai-questions");
    ui.messages = document.getElementById("wcs-ai-messages");
    ui.typing = document.getElementById("wcs-ai-typing");
    ui.input = document.getElementById("wcs-ai-input");
    ui.sendBtn = document.getElementById("wcs-ai-send");
    ui.title = document.getElementById("wcs-ai-title");
    ui.subtitle = document.getElementById("wcs-ai-subtitle");
    ui.status = document.getElementById("wcs-ai-status");
    ui.toast = document.getElementById("wcs-ai-toast");
    ui.companion = document.getElementById("wcs-ai-companion");
    ui.booking = document.getElementById("wcs-ai-booking");
    ui.bookingClose = document.getElementById("wcs-ai-booking-close");
    ui.bookingForm = document.getElementById("wcs-ai-booking-form");
    ui.bookingName = document.getElementById("wcs-ai-booking-name");
    ui.bookingEmail = document.getElementById("wcs-ai-booking-email");
    ui.bookingBusiness = document.getElementById("wcs-ai-booking-business");
    ui.bookingBudget = document.getElementById("wcs-ai-booking-budget");
    ui.bookingTimeline = document.getElementById("wcs-ai-booking-timeline");
    ui.bookingNeeds = document.getElementById("wcs-ai-booking-needs");
    ui.bookingNotes = document.getElementById("wcs-ai-booking-notes");
    ui.bookingResult = document.getElementById("wcs-ai-booking-result");
    ui.bookingCopy = document.getElementById("wcs-ai-booking-copy");
    ui.bookingEmailDraft = document.getElementById("wcs-ai-booking-email-draft");

    ui.title.textContent = config.assistantName || "Codeo";
    ui.subtitle.textContent = config.subtitle || "WCS research assistant";

    const inputsToSync = [ui.bookingName, ui.bookingEmail, ui.bookingBusiness, ui.bookingBudget, ui.bookingTimeline, ui.bookingNeeds, ui.bookingNotes];
    inputsToSync.forEach(input => {
      if (input) {
        input.addEventListener("input", syncBookingInputsToMemory);
      }
    });

    const previousPageKey = memory.lastPageKey;
    currentPageKey = getPageKeyFromPath(window.location.pathname);
    memory.lastPageKey = currentPageKey;
    memory.lastSeenAt = Date.now();
    saveMemory();

    renderCompanionBanner(previousPageKey);
    showToast("Codeo is ready.", true);
    setStatus("Ready.");

    const session = ensureSession();
    renderSession(session.id);

    if (canHoverFinePointer()) {
      ui.widget.addEventListener("pointerenter", () => {
        clearTimeout(closeTimer);
        openWidget();
      });

      ui.widget.addEventListener("pointerleave", scheduleClose);
      ui.launcher.addEventListener("focus", openWidget);
      ui.panel.addEventListener("focusin", openWidget);
      ui.panel.addEventListener("focusout", scheduleClose);
    } else {
      ui.launcher.addEventListener("click", () => {
        touchOpen = !touchOpen;
        if (touchOpen) openWidget();
        else closeWidget();
      });
    }

    ui.closeBtn.addEventListener("click", closeWidget);
    ui.newChatBtn.addEventListener("click", startNewChat);
    ui.notifyBtn.addEventListener("click", requestNotifications);
    ui.bookingBtn.addEventListener("click", toggleBookingPanel);
    ui.bookingClose.addEventListener("click", closeBookingPanel);

    ui.bookingForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const summary = buildBookingSummary();
      ui.bookingResult.textContent = summary;
      ui.bookingResult.classList.add("show");

      addBookingMessage("Project intake summary prepared.");
      addMessage("assistant", "I prepared your intake summary. You can copy it, email it, or continue the chat.");
      showToast("Intake summary prepared.");
    });

    ui.bookingCopy.addEventListener("click", copyBookingSummary);
    ui.bookingEmailDraft.addEventListener("click", openBookingEmailDraft);

    ui.input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeWidget();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && ui.panel.classList.contains("open")) {
        closeWidget();
      }
    });

    ui.panel.querySelector("form#wcs-ai-input-wrap").addEventListener("submit", (event) => {
      event.preventDefault();
      sendMessage(ui.input.value, { source: "manual" });
      ui.input.value = "";
    });

    prefetchAllPagesInBackground();
    setTimeout(() => {
      if (!hasUserMessages(session) && ui.intro) {
        ui.intro.classList.remove("hidden");
      }
    }, 50);
  }

  async function loadConfig() {
    try {
      const response = await fetch(CONFIG_URL, { cache: "no-store" });
      if (!response.ok) {
        config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
        return;
      }

      const data = await response.json();
      config = {
        ...JSON.parse(JSON.stringify(DEFAULT_CONFIG)),
        ...data,
        contact: {
          ...DEFAULT_CONFIG.contact,
          ...(data.contact || {})
        },
        pageDirectory:
          Array.isArray(data.pageDirectory) && data.pageDirectory.length
            ? data.pageDirectory
            : DEFAULT_CONFIG.pageDirectory,
        starterQuestions:
          Array.isArray(data.starterQuestions) && data.starterQuestions.length
            ? data.starterQuestions
            : DEFAULT_CONFIG.starterQuestions,
        welcomeMessage: safeText(data.welcomeMessage) || DEFAULT_CONFIG.welcomeMessage
      };
    } catch {
      config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    }
  }

  async function init() {
    ensureRemixIcons();
    await loadConfig();
    currentPageKey = getPageKeyFromPath(window.location.pathname);

    appState = loadState();
    memory = loadMemory();
    researchCache = loadResearchCache();

    if (!activeSessionId || !appState.sessions[activeSessionId]) {
      const created = createSession();
      activeSessionId = created.id;
      appState.activeSessionId = created.id;
      saveState();
    }

    mountWidget();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
