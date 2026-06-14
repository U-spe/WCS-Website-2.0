(() => {
  if (document.getElementById("wcs-ai-widget")) return;

  const REMIX_ICON_URL = "https://cdn.jsdelivr.net/npm/remixicon@4.6.0/fonts/remixicon.css";
  const CONFIG_URL = "/wcs-ai-widget/brand.json";
  const API_URL = "/api/chat";
  const STATE_KEY = "wcs-ai-state-v3";
  const RESEARCH_KEY = "wcs-ai-research-v2";
  const RESEARCH_TTL_MS = 1000 * 60 * 60 * 24 * 7;

  const DEFAULT_CONFIG = {
    assistantName: "Codeo",
    companyName: "Web Creation Studios",
    subtitle: "WCS research assistant",
    contact: {
      email: "solutionsforyourweb@gmail.com",
      phone: "(302) 526-0930"
    },
    pageDirectory: [
      {
        key: "home",
        label: "Home",
        url: "/",
        aliases: ["home", "homepage", "main"]
      },
      {
        key: "about",
        label: "About",
        url: "/about.html",
        aliases: ["about"]
      },
      {
        key: "team",
        label: "Team",
        url: "/team.html",
        aliases: ["team", "staff"]
      },
      {
        key: "services",
        label: "Services",
        url: "/services.html",
        aliases: ["services", "service"]
      },
      {
        key: "pricing",
        label: "Pricing",
        url: "/pricing.html",
        aliases: ["pricing", "price", "rates", "cost"]
      },
      {
        key: "portfolio",
        label: "Portfolio",
        url: "/portfolio.html",
        aliases: ["portfolio", "projects", "work", "gallery"]
      }
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
    followUpQuestionsByPage: {
      home: [
        {
          label: "What does WCS build?",
          message: "What kinds of websites and projects does Web Creation Studios build?"
        },
        {
          label: "Open Services",
          message: "Open the services page.",
          navigateTo: "/services.html"
        },
        {
          label: "Open Pricing",
          message: "Open the pricing page.",
          navigateTo: "/pricing.html"
        }
      ],
      about: [
        {
          label: "Open Team",
          message: "Open the team page.",
          navigateTo: "/team.html"
        },
        {
          label: "Open Services",
          message: "Open the services page.",
          navigateTo: "/services.html"
        },
        {
          label: "Learn WCS story",
          message: "Tell me more about Web Creation Studios."
        }
      ],
      team: [
        {
          label: "About WCS",
          message: "Tell me more about Web Creation Studios."
        },
        {
          label: "Open Services",
          message: "Open the services page.",
          navigateTo: "/services.html"
        },
        {
          label: "Open Portfolio",
          message: "Open the portfolio page.",
          navigateTo: "/portfolio.html"
        }
      ],
      services: [
        {
          label: "Help me choose",
          message: "Help me choose the right Web Creation Studios service for my business."
        },
        {
          label: "Open Pricing",
          message: "Open the pricing page.",
          navigateTo: "/pricing.html"
        },
        {
          label: "See examples",
          message: "Open the portfolio page.",
          navigateTo: "/portfolio.html"
        }
      ],
      pricing: [
        {
          label: "Open Services",
          message: "Open the services page.",
          navigateTo: "/services.html"
        },
        {
          label: "Open Portfolio",
          message: "Open the portfolio page.",
          navigateTo: "/portfolio.html"
        },
        {
          label: "What do I need?",
          message: "What Web Creation Studios service fits my budget and goals?"
        }
      ],
      portfolio: [
        {
          label: "Open Services",
          message: "Open the services page.",
          navigateTo: "/services.html"
        },
        {
          label: "Open Pricing",
          message: "Open the pricing page.",
          navigateTo: "/pricing.html"
        },
        {
          label: "Open About",
          message: "Open the about page.",
          navigateTo: "/about.html"
        }
      ]
    },
    welcomeMessage: "Hello. I am Codeo. How can I help with Web Creation Studios today?"
  };

  let config = { ...DEFAULT_CONFIG };
  let currentPageKey = "home";
  let activeSessionId = null;
  let sessionsState = { activeSessionId: null, sessions: {} };
  let researchCache = { pages: {}, lastPrefetchAt: 0 };
  let canHover = false;
  let closeTimer = null;
  let touchOpen = false;
  let notificationReady = false;
  let elements = null;

  function safeText(value) {
    return typeof value === "string" ? value : "";
  }

  function ensureRemixIcons() {
    if (document.querySelector('link[data-wcs-remixicons="true"]')) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = REMIX_ICON_URL;
    link.setAttribute("data-wcs-remixicons", "true");
    document.head.appendChild(link);
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

  function sanitizePageKey(value) {
    const lowered = safeText(value).trim().toLowerCase();
    const page = config.pageDirectory.find(
      (item) => item.key === lowered || item.aliases.includes(lowered)
    );
    return page ? page.key : null;
  }

  function getPageByKey(key) {
    return config.pageDirectory.find((page) => page.key === key) || config.pageDirectory[0];
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

  function loadResearchCache() {
    const saved = storageGet(RESEARCH_KEY, null);
    if (!saved || typeof saved !== "object") {
      return { pages: {}, lastPrefetchAt: 0 };
    }

    return {
      pages: saved.pages && typeof saved.pages === "object" ? saved.pages : {},
      lastPrefetchAt: typeof saved.lastPrefetchAt === "number" ? saved.lastPrefetchAt : 0
    };
  }

  function saveResearchCache() {
    storageSet(RESEARCH_KEY, researchCache);
  }

  function getCachedBrief(pageKey) {
    const page = getPageByKey(pageKey);
    const brief = researchCache.pages[page.url];
    if (!brief) return null;

    if (Date.now() - (brief.fetchedAt || 0) > RESEARCH_TTL_MS) return null;
    return brief;
  }

  function saveBrief(pageUrl, brief) {
    researchCache.pages[pageUrl] = brief;
    saveResearchCache();
  }

  function textFromDocument(doc) {
    const clone = doc.body ? doc.body.cloneNode(true) : doc.documentElement.cloneNode(true);
    if (!clone) return "";

    clone.querySelectorAll("script, style, noscript, svg, canvas, iframe, template").forEach((node) => node.remove());

    const widget = clone.querySelector("#wcs-ai-widget");
    if (widget) widget.remove();

    return safeText(clone.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function trimText(text, max = 2200) {
    const value = safeText(text).replace(/\s+/g, " ").trim();
    if (value.length <= max) return value;
    return `${value.slice(0, max - 1).trim()}…`;
  }

  async function fetchPageBrief(pageKey) {
    const page = getPageByKey(pageKey);
    const cached = getCachedBrief(page.key);
    if (cached) return cached;

    try {
      const response = await fetch(page.url, { cache: "no-store" });
      if (!response.ok) {
        return cached || null;
      }

      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");

      const title = safeText(doc.title || page.label || page.key).trim();
      const headings = Array.from(doc.querySelectorAll("h1, h2, h3"))
        .slice(0, 8)
        .map((node) => safeText(node.textContent))
        .filter(Boolean);

      const rawText = textFromDocument(doc);
      const summary = trimText(rawText, 2600);

      const brief = {
        key: page.key,
        url: page.url,
        label: page.label,
        title,
        headings,
        summary,
        fetchedAt: Date.now()
      };

      saveBrief(page.url, brief);
      return brief;
    } catch {
      return cached || null;
    }
  }

  async function gatherResearchContext(targetPageKey) {
    const target = targetPageKey ? await fetchPageBrief(targetPageKey) : null;
    const current = await fetchPageBrief(currentPageKey);
    const related = [];

    if (target && target.key !== currentPageKey) related.push(target);
    if (current && (!target || current.key !== target.key)) related.push(current);

    return {
      currentPage: current,
      targetPage: target || current,
      relatedPages: related.slice(0, 3)
    };
  }

  function prefetchAllPagesInBackground() {
    if (Date.now() - researchCache.lastPrefetchAt < 1000 * 60 * 10) return;

    researchCache.lastPrefetchAt = Date.now();
    saveResearchCache();

    const run = async () => {
      for (const page of config.pageDirectory) {
        await fetchPageBrief(page.key);
      }
    };

    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(() => {
        run().catch(() => {});
      }, { timeout: 2000 });
    } else {
      window.setTimeout(() => {
        run().catch(() => {});
      }, 1200);
    }
  }

  function loadState() {
    const saved = storageGet(STATE_KEY, null);
    if (!saved || typeof saved !== "object") {
      return { activeSessionId: null, sessions: {} };
    }

    return {
      activeSessionId: typeof saved.activeSessionId === "string" ? saved.activeSessionId : null,
      sessions:
        saved.sessions && typeof saved.sessions === "object"
          ? saved.sessions
          : {}
    };
  }

  function saveState() {
    sessionsState.activeSessionId = activeSessionId;
    storageSet(STATE_KEY, sessionsState);
  }

  function createSession({ preserveHistory = false } = {}) {
    const id = `codeo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const welcome = config.welcomeMessage || DEFAULT_CONFIG.welcomeMessage;
    const focusPageKey = currentPageKey;

    const session = {
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      title: "New chat",
      focusPageKey,
      messages: [
        {
          role: "assistant",
          content: welcome,
          time: Date.now()
        }
      ]
    };

    sessionsState.sessions[id] = session;
    activeSessionId = id;
    saveState();

    if (!preserveHistory) {
      renderSession(id);
    }

    return session;
  }

  function getActiveSession() {
    if (!activeSessionId) return null;
    return sessionsState.sessions[activeSessionId] || null;
  }

  function ensureActiveSession() {
    let session = getActiveSession();

    if (!session) {
      session = createSession({ preserveHistory: true });
    }

    if (!Array.isArray(session.messages) || !session.messages.length) {
      session.messages = [
        {
          role: "assistant",
          content: config.welcomeMessage || DEFAULT_CONFIG.welcomeMessage,
          time: Date.now()
        }
      ];
      session.updatedAt = Date.now();
      sessionsState.sessions[session.id] = session;
      saveState();
    }

    return session;
  }

  function normalizeMessagesForRender(messages) {
    return Array.isArray(messages)
      ? messages.filter((m) => m && (m.role === "user" || m.role === "assistant" || m.role === "system"))
      : [];
  }

  function scrollToBottom() {
    elements.messages.scrollTop = elements.messages.scrollHeight;
  }

  function addMessageToDOM(role, content) {
    const el = document.createElement("div");
    el.className = `wcs-ai-message ${role}`;
    el.textContent = safeText(content);
    elements.messages.appendChild(el);
    scrollToBottom();
    return el;
  }

  function showToast(text) {
    elements.toast.textContent = safeText(text);
    elements.toast.classList.add("show");

    clearTimeout(elements.toastHideTimer);
    elements.toastHideTimer = window.setTimeout(() => {
      elements.toast.classList.remove("show");
    }, 2400);
  }

  function setBusy(isBusy) {
    elements.sendBtn.disabled = isBusy;
    elements.input.disabled = isBusy;
    elements.typing.classList.toggle("show", isBusy);
  }

  function canUseHoverPointer() {
    return window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }

  function injectIconStyles() {
    if (document.querySelector('link[data-wcs-remixicons="true"]')) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = REMIX_ICON_URL;
    link.setAttribute("data-wcs-remixicons", "true");
    document.head.appendChild(link);
  }

  function renderFollowUpsForPage(pageKey) {
    const normalized = sanitizePageKey(pageKey) || "home";
    const items = config.followUpQuestionsByPage?.[normalized] || config.followUpQuestionsByPage?.home || [];

    elements.followupGrid.innerHTML = "";

    items.slice(0, 3).forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "wcs-ai-mini-btn";
      btn.textContent = item.label;

      btn.addEventListener("click", () => {
        if (item.navigateTo) {
          addMessageToSession("user", item.message);
          window.location.href = item.navigateTo;
          return;
        }

        sendMessage(item.message, { source: "followup" });
      });

      elements.followupGrid.appendChild(btn);
    });

    elements.followups.classList.add("show");
  }

  function showIntro() {
    const active = ensureActiveSession();
    const hasUserMessage = active.messages.some((message) => message.role === "user");

    if (!hasUserMessage) {
      elements.intro.classList.remove("hidden");
      elements.followups.classList.remove("show");

      elements.questions.innerHTML = "";
      config.starterQuestions.slice(0, 3).forEach((item) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "wcs-ai-chip";
        btn.textContent = item.label;
        btn.addEventListener("click", () => sendMessage(item.message, { source: "starter" }));
        elements.questions.appendChild(btn);
      });
    } else {
      elements.intro.classList.add("hidden");
      renderFollowUpsForPage(active.focusPageKey || currentPageKey);
    }
  }

  function renderSession(sessionId) {
    const session = sessionsState.sessions[sessionId];
    if (!session) return;

    elements.messages.innerHTML = "";
    normalizeMessagesForRender(session.messages).forEach((message) => {
      addMessageToDOM(message.role, message.content);
    });

    const hasUserMessage = session.messages.some((message) => message.role === "user");
    if (hasUserMessage) {
      elements.intro.classList.add("hidden");
      renderFollowUpsForPage(session.focusPageKey || currentPageKey);
    } else {
      showIntro();
    }
  }

  function addMessageToSession(role, content) {
    const session = ensureActiveSession();

    session.messages.push({
      role,
      content: safeText(content),
      time: Date.now()
    });

    session.updatedAt = Date.now();

    if (role === "user" && session.title === "New chat") {
      session.title = trimText(content, 34) || "New chat";
    }

    sessionsState.sessions[session.id] = session;

    const maxMessages = 50;
    if (session.messages.length > maxMessages) {
      session.messages = session.messages.slice(-maxMessages);
    }

    saveState();
  }

  function startNewChat() {
    const newSession = createSession({ preserveHistory: true });
    activeSessionId = newSession.id;
    sessionsState.activeSessionId = activeSessionId;
    saveState();
    renderSession(activeSessionId);
    showToast("New chat started.");
  }

  async function requestNotifications() {
    if (!("Notification" in window)) {
      showToast("Notifications are not supported in this browser.");
      return;
    }

    try {
      if (Notification.permission === "granted") {
        notificationReady = true;
        showToast("Notifications are enabled.");
        return;
      }

      if (Notification.permission === "denied") {
        showToast("Notifications are blocked in browser settings.");
        return;
      }

      const permission = await Notification.requestPermission();
      notificationReady = permission === "granted";

      if (notificationReady) {
        showToast("Notifications are enabled.");
      } else {
        showToast("Notifications are off.");
      }
    } catch {
      showToast("Notifications could not be enabled.");
    }
  }

  function notifyDone(replyText) {
    const preview = trimText(replyText, 90) || "Codeo finished responding.";

    showToast("Codeo is done.");

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

  function openPanel() {
    elements.panel.classList.add("open");
    elements.input.focus();
    showIntro();
  }

  function closePanel() {
    elements.panel.classList.remove("open");
  }

  function scheduleClose() {
    clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      if (canUseHoverPointer() && !elements.widget.matches(":hover")) {
        closePanel();
      }
    }, 160);
  }

  function renderResponseAction(action) {
    if (!action || action.type !== "navigate" || !action.url) return;

    const bubble = document.createElement("div");
    bubble.className = "wcs-ai-message assistant";

    const text = document.createElement("div");
    text.textContent = `Opening ${action.label || "page"}...`;
    bubble.appendChild(text);

    const row = document.createElement("div");
    row.className = "wcs-ai-action-row";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "wcs-ai-action-btn";
    btn.textContent = action.label || "Open page";
    btn.addEventListener("click", () => {
      window.location.href = action.url;
    });

    row.appendChild(btn);
    bubble.appendChild(row);

    elements.messages.appendChild(bubble);
    scrollToBottom();

    if (action.auto) {
      window.setTimeout(() => {
        window.location.href = action.url;
      }, 650);
    }
  }

  function buildResearchForRequest(targetPageKey) {
    const targetKey = sanitizePageKey(targetPageKey) || currentPageKey;
    return gatherResearchContext(targetKey);
  }

  async function sendMessage(message, options = {}) {
    const trimmed = safeText(message).trim();
    if (!trimmed) return;

    const session = ensureActiveSession();
    if (!session) return;

    if (!session.messages.some((item) => item.role === "user")) {
      elements.intro.classList.add("hidden");
    }

    addMessageToDOM("user", trimmed);
    addMessageToSession("user", trimmed);

    const targetPageKey = inferTargetPageKey(trimmed, session.focusPageKey || currentPageKey);
    const research = await buildResearchForRequest(targetPageKey);

    setBusy(true);

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
            key: targetPageKey,
            url: getPageByKey(targetPageKey).url,
            label: getPageByKey(targetPageKey).label
          },
          research
        })
      });

      const data = await response.json().catch(() => ({}));

      const reply =
        typeof data.reply === "string" && data.reply.trim()
          ? data.reply.trim()
          : "I am unable to reach the AI service at the moment. Please try again shortly.";

      addMessageToDOM("assistant", reply);
      addMessageToSession("assistant", reply);

      if (data.focusPage) {
        session.focusPageKey = sanitizePageKey(data.focusPage) || targetPageKey || currentPageKey;
      } else {
        session.focusPageKey = targetPageKey || currentPageKey;
      }

      session.updatedAt = Date.now();
      sessionsState.sessions[session.id] = session;
      saveState();

      if (data.action && typeof data.action === "object") {
        renderResponseAction(data.action);
      }

      renderFollowUpsForPage(session.focusPageKey || currentPageKey);
      notifyDone(reply);
    } catch {
      const fallback = "I am unable to reach the AI service at the moment. Please try again shortly.";
      addMessageToDOM("assistant", fallback);
      addMessageToSession("assistant", fallback);
      renderFollowUpsForPage(session.focusPageKey || currentPageKey);
      notifyDone(fallback);
    } finally {
      setBusy(false);
      elements.input.focus();
      showIntro();
    }
  }

  async function loadConfig() {
    try {
      const response = await fetch(CONFIG_URL, { cache: "no-store" });
      if (!response.ok) {
        config = { ...DEFAULT_CONFIG };
        return;
      }

      const data = await response.json();

      config = {
        ...DEFAULT_CONFIG,
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
        followUpQuestionsByPage:
          data.followUpQuestionsByPage && typeof data.followUpQuestionsByPage === "object"
            ? data.followUpQuestionsByPage
            : DEFAULT_CONFIG.followUpQuestionsByPage,
        welcomeMessage: safeText(data.welcomeMessage) || DEFAULT_CONFIG.welcomeMessage
      };
    } catch {
      config = { ...DEFAULT_CONFIG };
    }
  }

  function mountWidget() {
    const widget = document.createElement("div");
    widget.id = "wcs-ai-widget";
    widget.innerHTML = `
      <button id="wcs-ai-launcher" type="button" aria-label="Open Codeo">
        <i class="ri-robot-2-line" aria-hidden="true"></i>
      </button>

      <section id="wcs-ai-panel" aria-label="Codeo assistant">
        <header id="wcs-ai-header">
          <div id="wcs-ai-title-wrap">
            <div id="wcs-ai-title"></div>
            <div id="wcs-ai-subtitle"></div>
          </div>

          <div class="wcs-ai-header-actions">
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

        <div id="wcs-ai-intro">
          <div id="wcs-ai-intro-title">Start here</div>
          <div id="wcs-ai-intro-copy">Use one of these questions, or type your own.</div>
          <div id="wcs-ai-questions"></div>
        </div>

        <div id="wcs-ai-messages" aria-live="polite" aria-relevant="additions"></div>
        <div id="wcs-ai-typing">Codeo is typing...</div>

        <div id="wcs-ai-followups">
          <div id="wcs-ai-followups-title">Next steps</div>
          <div id="wcs-ai-followup-grid"></div>
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

        <div id="wcs-ai-footer-note">
          Responses are limited to official WCS business and site guidance.
        </div>
      </section>
    `;

    document.body.appendChild(widget);

    elements = {
      widget,
      launcher: document.getElementById("wcs-ai-launcher"),
      panel: document.getElementById("wcs-ai-panel"),
      closeBtn: document.getElementById("wcs-ai-close"),
      newChatBtn: document.getElementById("wcs-ai-newchat"),
      notifyBtn: document.getElementById("wcs-ai-notify"),
      intro: document.getElementById("wcs-ai-intro"),
      questions: document.getElementById("wcs-ai-questions"),
      messages: document.getElementById("wcs-ai-messages"),
      typing: document.getElementById("wcs-ai-typing"),
      followups: document.getElementById("wcs-ai-followups"),
      followupGrid: document.getElementById("wcs-ai-followup-grid"),
      input: document.getElementById("wcs-ai-input"),
      sendBtn: document.getElementById("wcs-ai-send"),
      title: document.getElementById("wcs-ai-title"),
      subtitle: document.getElementById("wcs-ai-subtitle"),
      toast: document.getElementById("wcs-ai-toast"),
      toastHideTimer: null
    };

    elements.title.textContent = config.assistantName;
    elements.subtitle.textContent = config.subtitle;

    currentPageKey = getPageKeyFromPath(window.location.pathname);

    sessionsState = loadState();
    researchCache = loadResearchCache();
    activeSessionId = sessionsState.activeSessionId;

    if (!activeSessionId || !sessionsState.sessions[activeSessionId]) {
      const created = createSession({ preserveHistory: true });
      activeSessionId = created.id;
      sessionsState.activeSessionId = activeSessionId;
      saveState();
    }

    const active = ensureActiveSession();
    active.focusPageKey = active.focusPageKey || currentPageKey;
    sessionsState.sessions[active.id] = active;
    saveState();

    renderSession(activeSessionId);

    if (canUseHoverPointer()) {
      elements.widget.addEventListener("pointerenter", () => {
        clearTimeout(closeTimer);
        openPanel();
      });

      elements.widget.addEventListener("pointerleave", scheduleClose);
      elements.launcher.addEventListener("focus", openPanel);
      elements.panel.addEventListener("focusin", openPanel);
      elements.panel.addEventListener("focusout", scheduleClose);
    } else {
      elements.launcher.addEventListener("click", () => {
        touchOpen = !touchOpen;
        if (touchOpen) {
          openPanel();
        } else {
          closePanel();
        }
      });
    }

    elements.closeBtn.addEventListener("click", closePanel);
    elements.newChatBtn.addEventListener("click", startNewChat);
    elements.notifyBtn.addEventListener("click", requestNotifications);

    elements.panel.querySelector("form").addEventListener("submit", (event) => {
      event.preventDefault();
      sendMessage(elements.input.value);
    });

    elements.input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closePanel();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && elements.panel.classList.contains("open")) {
        closePanel();
      }
    });

    prefetchAllPagesInBackground();
  }

  async function init() {
    ensureRemixIcons();
    currentPageKey = getPageKeyFromPath(window.location.pathname);
    await loadConfig();
    mountWidget();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
