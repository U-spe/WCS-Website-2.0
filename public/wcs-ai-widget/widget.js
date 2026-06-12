(() => {
  if (document.getElementById("wcs-ai-widget")) return;

  const DEFAULT_CONFIG = {
    assistantName: "WCS AI Assistant",
    subtitle: "Business support and site guidance",
    welcomeMessage: "Hello. How can I help with Web Creation Studios today?",
    contact: {
      email: "solutionsforyourweb@gmail.com",
      phone: "(302) 526-0930"
    },
    services: [
      "Web design",
      "Website development",
      "Ecommerce setup",
      "Branding and logo design",
      "Hosting support",
      "Domain setup",
      "Analytics setup",
      "Email setup",
      "Site security",
      "Custom website features"
    ]
  };

  const API_ENDPOINT = "/wcs-ai-widget/api/chat";
  const CONFIG_ENDPOINT = "/wcs-ai-widget/brand.json";

  let config = { ...DEFAULT_CONFIG };
  const history = [];

  function escapeText(value) {
    return typeof value === "string" ? value : "";
  }

  function scrollToBottom(messages) {
    messages.scrollTop = messages.scrollHeight;
  }

  function addMessage(messages, role, text) {
    const el = document.createElement("div");
    el.className = `wcs-ai-message ${role}`;
    el.textContent = escapeText(text);
    messages.appendChild(el);
    scrollToBottom(messages);
  }

  function setBusy(input, sendBtn, typing, isBusy) {
    sendBtn.disabled = isBusy;
    input.disabled = isBusy;
    typing.classList.toggle("show", isBusy);
  }

  function localFallbackReply(raw) {
    const text = raw.toLowerCase();

    if (text.includes("contact") || text.includes("email") || text.includes("phone")) {
      return `Contact WCS at ${config.contact.email} or ${config.contact.phone}.`;
    }

    if (text.includes("service") || text.includes("services")) {
      return `WCS provides ${config.services.join(", ")}.`;
    }

    if (text.includes("who are you") || text.includes("what is wcs")) {
      return "Web Creation Studios is the WCS brand. This assistant is for business support and site guidance.";
    }

    return "I am unable to reach the AI service at the moment. Please try again shortly.";
  }

  async function loadConfig() {
    try {
      const response = await fetch(CONFIG_ENDPOINT, { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      config = {
        ...DEFAULT_CONFIG,
        ...data,
        contact: { ...DEFAULT_CONFIG.contact, ...(data.contact || {}) },
        services: Array.isArray(data.services) && data.services.length ? data.services : DEFAULT_CONFIG.services
      };
    } catch {
      config = { ...DEFAULT_CONFIG };
    }
  }

  function mountWidget() {
    const widget = document.createElement("div");
    widget.id = "wcs-ai-widget";
    widget.innerHTML = `
      <button id="wcs-ai-toggle" type="button" aria-label="Open WCS AI Assistant">
        <span>AI</span>
      </button>

      <section id="wcs-ai-panel" aria-label="WCS AI Assistant">
        <header id="wcs-ai-header">
          <div id="wcs-ai-title-wrap">
            <div id="wcs-ai-title"></div>
            <div id="wcs-ai-subtitle"></div>
          </div>
          <button id="wcs-ai-close" type="button" aria-label="Close assistant">×</button>
        </header>

        <div id="wcs-ai-messages" aria-live="polite" aria-relevant="additions"></div>
        <div id="wcs-ai-typing">WCS AI is typing...</div>

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

    const toggle = document.getElementById("wcs-ai-toggle");
    const panel = document.getElementById("wcs-ai-panel");
    const closeBtn = document.getElementById("wcs-ai-close");
    const form = document.getElementById("wcs-ai-input-wrap");
    const input = document.getElementById("wcs-ai-input");
    const sendBtn = document.getElementById("wcs-ai-send");
    const messages = document.getElementById("wcs-ai-messages");
    const typing = document.getElementById("wcs-ai-typing");
    const title = document.getElementById("wcs-ai-title");
    const subtitle = document.getElementById("wcs-ai-subtitle");

    title.textContent = config.assistantName;
    subtitle.textContent = config.subtitle;

    function openPanel() {
      panel.classList.add("open");
      input.focus();
    }

    function closePanel() {
      panel.classList.remove("open");
    }

    async function sendMessage(text) {
      const trimmed = text.trim();
      if (!trimmed) return;

      addMessage(messages, "user", trimmed);
      history.push({ role: "user", content: trimmed });
      input.value = "";
      setBusy(input, sendBtn, typing, true);

      try {
        const response = await fetch(API_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message: trimmed,
            history: history.slice(-8)
          })
        });

        const data = await response.json().catch(() => ({}));

        const reply =
          typeof data.reply === "string" && data.reply.trim()
            ? data.reply.trim()
            : localFallbackReply(trimmed);

        addMessage(messages, "assistant", reply);
        history.push({ role: "assistant", content: reply });
      } catch {
        const reply = localFallbackReply(trimmed);
        addMessage(messages, "assistant", reply);
        history.push({ role: "assistant", content: reply });
      } finally {
        setBusy(input, sendBtn, typing, false);
        input.focus();
      }
    }

    toggle.addEventListener("click", () => {
      panel.classList.toggle("open");
      if (panel.classList.contains("open")) input.focus();
    });

    closeBtn.addEventListener("click", closePanel);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      sendMessage(input.value);
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closePanel();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && panel.classList.contains("open")) {
        closePanel();
      }
    });

    addMessage(messages, "assistant", config.welcomeMessage);
  }

  async function init() {
    await loadConfig();
    mountWidget();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
