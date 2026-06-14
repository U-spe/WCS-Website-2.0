const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const SITE_PAGES = [
  { label: "Home", url: "/" },
  { label: "About", url: "/about.html" },
  { label: "Services", url: "/services.html" },
  { label: "Team", url: "/team.html" },
  { label: "Pricing", url: "/pricing.html" }
 ];

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string" &&
        item.content.trim()
    )
    .slice(-10)
    .map((item) => ({
      role: item.role,
      content: item.content.trim().slice(0, 4000)
    }));
}

function buildSystemPrompt(page, title) {
  return `
You are WCS AI, the official business assistant for Web Creation Studios.

Tone:
- Business-level strict
- Professional
- Clear
- Direct
- Helpful
- No slang
- No emojis
- No hype
- No filler
- No casual tone

Company facts:
- Company: Web Creation Studios
- Founder: CJ
- Contact email: solutionsforyourweb@gmail.com
- Contact phone: (302) 526-0930

Current page context:
- Path: ${page || "unknown"}
- Title: ${title || "unknown"}

Allowed site pages:
${SITE_PAGES.map((p) => `- ${p.label}: ${p.url}`).join("\n")}

Behavior:
- Answer questions about Web Creation Studios, services, pages, projects, and contact.
- If the user wants to go to a page, return an action object with the correct URL.
- If the user makes a direct request like "take me to services" or "open the about page", set action.auto = true.
- If the user is asking generally about a page, you may set action.auto = false and still provide the action.
- If you are not sure, do not invent facts.

Response format:
Return ONLY valid JSON with this shape:

{
  "reply": "string",
  "action": {
    "type": "navigate",
    "label": "string",
    "url": "string",
    "auto": true
  } or null
}

Rules:
- reply must be a short, useful business response
- action must be null unless a page navigation is needed
- do not wrap in markdown
- do not include extra keys
`.trim();
}

function extractJson(text) {
  if (!text || typeof text !== "string") return null;

  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {}

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {}
  }

  return null;
}

function fallbackAction(message) {
  const text = message.toLowerCase();

  const directNavigate = [
    { test: /(take me to|open|go to|show me).*(services?)/, url: "/services.html", label: "Open Services" },
    { test: /(take me to|open|go to|show me).*(about)/, url: "/about.html", label: "Open About" },
    { test: /(take me to|open|go to|show me).*(team|staff)/, url: "/team.html", label: "Open Team" },
    { test: /(take me to|open|go to|show me).*(projects?|work)/, url: "/projects.html", label: "Open Projects" },
    { test: /(take me to|open|go to|show me).*(home|homepage|main page)/, url: "/", label: "Open Home" }
  ];

  const suggestionNavigate = [
    { test: /(services?)/, url: "/services.html", label: "Open Services" },
    { test: /(about)/, url: "/about.html", label: "Open About" },
    { test: /(team|staff)/, url: "/team.html", label: "Open Team" },
    { test: /(projects?|work|portfolio)/, url: "/projects.html", label: "Open Projects" },
    { test: /(home|homepage|main page)/, url: "/", label: "Open Home" }
  ];

  for (const item of directNavigate) {
    if (item.test.test(text)) {
      return {
        type: "navigate",
        label: item.label,
        url: item.url,
        auto: true
      };
    }
  }

  for (const item of suggestionNavigate) {
    if (item.test.test(text)) {
      return {
        type: "navigate",
        label: item.label,
        url: item.url,
        auto: false
      };
    }
  }

  return null;
}

function fallbackReply(message) {
  const text = message.toLowerCase();

  if (text.includes("contact") || text.includes("email") || text.includes("phone")) {
    return "Contact Web Creation Studios at solutionsforyourweb@gmail.com or (302) 526-0930.";
  }

  if (text.includes("service") || text.includes("services")) {
    return "Web Creation Studios provides web design, website development, ecommerce setup, branding, logo design, hosting support, domain setup, analytics setup, email setup, site security, and custom website features.";
  }

  if (text.includes("project") || text.includes("work") || text.includes("portfolio")) {
    return "Web Creation Studios builds modern business sites, branded landing pages, service pages, and custom web features.";
  }

  if (text.includes("about")) {
    return "The about page has background on Web Creation Studios and the brand direction behind the site.";
  }

  if (text.includes("team") || text.includes("staff")) {
    return "The team page shows the people behind Web Creation Studios.";
  }

  return "I am unable to generate a response at the moment.";
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const body = req.body || {};
    const message = cleanString(body.message);
    const history = sanitizeHistory(body.history);
    const page = cleanString(body.page);
    const title = cleanString(body.title);

    if (!message) {
      return res.status(400).json({ error: "Missing message" });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        reply: "WCS AI is not configured. Add GROQ_API_KEY in Vercel environment variables.",
        action: null
      });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.2,
      max_tokens: 250,
      messages: [
        { role: "system", content: buildSystemPrompt(page, title) },
        ...history,
        { role: "user", content: message }
      ]
    });

    const raw = completion?.choices?.[0]?.message?.content || "";
    const parsed = extractJson(raw);

    const reply =
      cleanString(parsed?.reply) ||
      cleanString(raw) ||
      fallbackReply(message);

    const actionFromModel = parsed?.action && typeof parsed.action === "object" ? parsed.action : null;
    const actionFromFallback = fallbackAction(message);

    const action =
      actionFromModel &&
      actionFromModel.type === "navigate" &&
      typeof actionFromModel.url === "string" &&
      typeof actionFromModel.label === "string"
        ? {
            type: "navigate",
            label: actionFromModel.label,
            url: actionFromModel.url,
            auto: Boolean(actionFromModel.auto)
          }
        : actionFromFallback;

    return res.status(200).json({
      reply,
      action
    });
  } catch (error) {
    console.error("WCS AI error:", error);
    return res.status(500).json({
      reply: "WCS AI is temporarily unavailable. Please try again shortly.",
      action: null
    });
  }
};
