(() => {
  if (document.getElementById("wcs-ai-widget")) return;

  const DEFAULT_CONFIG = {
    assistantName: "WCS AI Assistant",
    subtitle: "Business support and site guidance",
    contact: {
      email: "solutionsforyourweb@gmail.com",
      phone: "(302) 526-0930"
    },
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
    followUpQuestions: [
      {
        label: "Open Home",
        message: "Open the home page.",
        navigateTo: "/"
      },
      {
        label: "Open About",
        message: "Open the about page.",
        navigateTo: "/about.html"
      },
      {
        label: "Open Team",
        message: "Open the team page.",
        navigateTo: "/team.html"
      }
    ],
    welcomeMessage: "Hello. How can I help with Web Creation Studios today?"
  };

  const CONFIG_URL = "/wcs-ai-widget/brand.json";
  const API_URL = "/api/chat";
  const CHAT_STATE_KEY = "wcs-ai-has-chatted";

  let config = { ...DEFAULT_CONFIG };
  let hasChatted = false;
  const history = [];

  let elements = null;
  let hoverCloseTimer = null;
  let touchModeOpen = false;

  function safeText(value) {
    return typeof value === "string" ? value : "";
  }

  function canHoverFinePointer() {
    return window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }

  function getSessionFlag() {
    try {
      return sessionStorage.getItem(CHAT_STATE_KEY) === "1";
    } catch {
      return false;
    }
  }

  function setSessionFlag() {
    try {
      sessionStorage.setItem(CHAT_STATE_KEY, "1");
    } catch {}
  }

  function scrollToBottom() {
    if (!elements?.messages) return;
    elements.messages.scrollTop = elements.messages.scrollHeight;
  }

  function addMessage(role, text) {
    const el = document.createElement("div");
    el.className = `wcs-ai-message ${role}`;
    el.textContent = safeText(text);
    elements.messages.appendChild(el);
    scrollToBottom();
    return el;
  }

  function setBusy(isBusy) {
    elements.sendBtn.disabled = isBusy;
    elements.input.disabled = isBusy;
    elements.typing.classList.toggle("show", isBusy);
  }

  function buildFallbackReply(raw) {
    const text = raw.toLowerCase();

    if (text.includes("contact") || text.includes("email") || text.includes("phone")) {
      return `Contact WCS at ${config.contact.email} or ${config.contact.phone}.`;
    }

    if (text.includes("service") || text.includes("services")) {
      return "Web Creation Studios provides web design, website development, ecommerce setup, branding, logo design, hosting support, domain setup, analytics setup, email setup, site security, and custom website features.";
    }

    if (text.includes("pricing") || text.includes("price") || text.includes("rates")) {
      return "Pricing information is available on the pricing page. If you need current exact numbers, contact Web Creation Studios directly.";
    }

    if (text.includes("portfolio") || text.includes("projects") || text.includes("work")) {
      return "The portfolio page shows examples of the type of work Web Creation Studios builds.";
    }

    if (text.includes("about")) {
      return "The about page has background on Web Creation Studios and the brand direction behind the site.";
    }

    if (text.includes("team") || text.includes("staff")) {
      return "The team page shows the people behind Web Creation Studios.";
    }

    if (text.includes("home")) {
      return "The home page is the main entry point for Web Creation Studios.";
    }

    return "I am unable to reach the AI service at the moment. Please try again shortly.";
  }

  function renderQuestions(container, questions, mode) {
    container.innerHTML = "";

    questions.forEach((question) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = mode === "followup" ? "wcs-ai-mini-btn" : "wcs-ai-chip";
      button.textContent = question.label;

      button.addEventListener("click", () => {
        if (question.navigateTo) {
          addMessage("user", question.message);
          window.location.href = question.navigateTo;
          return;
        }

        sendMessage(question.message);
      });

      container.appendChild(button);
    });
  }

  function showIntro() {
    if (hasChatted) {
      elements.intro.classList.add("hidden");
      elements.followups.classList.add("show");
      renderQuestions(elements.followupGrid, config.followUpQuestions, "followup");
      return;
    }

    elements.intro.classList.remove("hidden");
    renderQuestions(elements.introQuestions, config.starterQuestions, "starter");
    elements.followups.classList.remove("show");
    elements.followupGrid.innerHTML = "";
  }

  function showFollowUps() {
    elements.intro.classList.add("hidden");
    elements.followups.classList.add("show");
    renderQuestions(elements.followupGrid, config.followUpQuestions, "followup");
  }

  function togglePanel(open) {
    const shouldOpen = typeof open === "boolean" ? open : !elements.panel.classList.contains("open");
    elements.panel.classList.toggle("open", shouldOpen);

    if (shouldOpen) {
      elements.input.focus();
    }
  }

  function openPanel() {
    togglePanel(true);
  }

  function closePanel() {
    togglePanel(false);
  }

  function scheduleClose() {
    clearTimeout(hoverCloseTimer);
    hoverCloseTimer = setTimeout(() => {
      if (canHoverFinePointer() && !elements.widget.matches(":hover")) {
        closePanel();
      }
    }, 160);
  }

  function renderActionButton(action) {
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
        contact: { ...DEFAULT_CONFIG.contact, ...(data.contact || {}) },
        starterQuestions:
          Array.isArray(data.starterQuestions) && data.starterQuestions.length
            ? data.starterQuestions
            : DEFAULT_CONFIG.starterQuestions,
        followUpQuestions:
          Array.isArray(data.followUpQuestions) && data.followUpQuestions.length
            ? data.followUpQuestions
            : DEFAULT_CONFIG.followUpQuestions
      };
    } catch {
      config = { ...DEFAULT_CONFIG };
    }
  }

  async function sendMessage(message) {
    const trimmed = safeText(message).trim();
    if (!trimmed) return;

    if (!hasChatted) {
      hasChatted = true;
      setSessionFlag();
      elements.intro.classList.add("hidden");
    }

    addMessage("user", trimmed);
    history.push({ role: "user", content: trimmed });
    elements.input.value = "";
    setBusy(true);

    const payload = {
      message: trimmed,
      history: history.slice(-8),
      page: window.location.pathname,
      title: document.title
    };

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      const reply =
        typeof data.reply === "string" && data.reply.trim()
          ? data.reply.trim()
          : buildFallbackReply(trimmed);

      addMessage("assistant", reply);
      history.push({ role: "assistant", content: reply });

      if (data.action && typeof data.action === "object") {
        renderActionButton(data.action);
      }

      showFollowUps();
    } catch {
      const reply = buildFallbackReply(trimmed);
      addMessage("assistant", reply);
      history.push({ role: "assistant", content: reply });
      showFollowUps();
    } finally {
      setBusy(false);
      elements.input.focus();
    }
  }

  function mountWidget() {
    const widget = document.createElement("div");
    widget.id = "wcs-ai-widget";
    widget.innerHTML = `
      <button id="wcs-ai-launcher" type="button" aria-label="Open WCS AI Assistant">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2a7 7 0 0 0-7 7v4a4 4 0 0 0 4 4h1v2H8v2h8v-2h-2v-2h1a4 4 0 0 0 4-4V9a7 7 0 0 0-7-7Zm-4 8a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm8 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3ZM9 13h6v1a3 3 0 1 1-6 0v-1Z"/>
        </svg>
      </button>

      <section id="wcs-ai-panel" aria-label="WCS AI Assistant">
        <header id="wcs-ai-header">
          <div id="wcs-ai-title-wrap">
            <div id="wcs-ai-title"></div>
            <div id="wcs-ai-subtitle"></div>
          </div>
          <button id="wcs-ai-close" type="button" aria-label="Close assistant">×</button>
        </header>

        <div id="wcs-ai-intro">
          <div id="wcs-ai-intro-title">Start here</div>
          <div id="wcs-ai-intro-copy">Use one of these questions, or type your own.</div>
          <div id="wcs-ai-questions"></div>
        </div>

        <div id="wcs-ai-messages" aria-live="polite" aria-relevant="additions"></div>
        <div id="wcs-ai-typing">WCS AI is typing...</div>

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
      intro: document.getElementById("wcs-ai-intro"),
      introQuestions: document.getElementById("wcs-ai-questions"),
      messages: document.getElementById("wcs-ai-messages"),
      typing: document.getElementById("wcs-ai-typing"),
      followups: document.getElementById("wcs-ai-followups"),
      followupGrid: document.getElementById("wcs-ai-followup-grid"),
      input: document.getElementById("wcs-ai-input"),
      sendBtn: document.getElementById("wcs-ai-send"),
      title: document.getElementById("wcs-ai-title"),
      subtitle: document.getElementById("wcs-ai-subtitle")
    };

    elements.title.textContent = config.assistantName;
    elements.subtitle.textContent = config.subtitle;

    renderQuestions(elements.introQuestions, config.starterQuestions, "starter");
    renderQuestions(elements.followupGrid, config.followUpQuestions, "followup");

    showIntro();
    addMessage("assistant", config.welcomeMessage);

    elements.closeBtn.addEventListener("click", closePanel);

    if (canHoverFinePointer()) {
      elements.widget.addEventListener("pointerenter", () => {
        clearTimeout(hoverCloseTimer);
        openPanel();
      });

      elements.widget.addEventListener("pointerleave", scheduleClose);
      elements.launcher.addEventListener("focus", openPanel);
      elements.panel.addEventListener("focusin", openPanel);
      elements.panel.addEventListener("focusout", scheduleClose);
    } else {
      elements.launcher.addEventListener("click", () => {
        touchModeOpen = !touchModeOpen;
        togglePanel(touchModeOpen);
      });
    }

    elements.panel.querySelector("form").addEventListener("submit", (event) => {
      event.preventDefault();
      sendMessage(elements.input.value);
    });

    elements.input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closePanel();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && elements.panel.classList.contains("open")) {
        closePanel();
      }
    });
  }

  async function init() {
    hasChatted = getSessionFlag();
    await loadConfig();
    mountWidget();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
