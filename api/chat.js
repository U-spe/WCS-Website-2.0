const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const SITE_PAGES = [
  { label: "Home", url: "/" },
  { label: "About", url: "/about.html" },
  { label: "Team", url: "/team.html" },
  { label: "Services", url: "/services.html" },
  { label: "Pricing", url: "/pricing.html" },
  { label: "Portfolio", url: "/portfolio.html" }
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
        item.content.trim().length > 0
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

Allowed pages:
${SITE_PAGES.map((pageItem) => `- ${pageItem.label}: ${pageItem.url}`).join("\n")}

Behavior:
- Answer questions about Web Creation Studios, services, pages, projects, pricing, and contact.
- If the user wants to go to a page, return a navigation action.
- If the user makes a direct request like "open services" or "take me to pricing", set action.auto to true.
- If the user is asking generally about a page, action.auto can be false.
- Do not invent facts.
- Keep the reply short and practical.

Return ONLY valid JSON in this shape:

{
  "reply": "string",
  "action": null
}

or

{
  "reply": "string",
  "action": {
    "type": "navigate",
    "label": "string",
    "url": "string",
    "auto": true
  }
}
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
    try {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    } catch {}
  }

  return null;
}

function fallbackAction(message) {
  const text = message.toLowerCase();

  const directMatches = [
    {
      test: /(take me to|open|go to|show me).*(home|homepage|main page)/,
      url: "/",
      label: "Open Home"
    },
    {
      test: /(take me to|open|go to|show me).*(about)/,
      url: "/about.html",
      label: "Open About"
    },
    {
      test: /(take me to|open|go to|show me).*(team|staff)/,
      url: "/team.html",
      label: "Open Team"
    },
    {
      test: /(take me to|open|go to|show me).*(services?)/,
      url: "/services.html",
      label: "Open Services"
    },
    {
      test: /(take me to|open|go to|show me).*(pricing|price|rates)/,
      url: "/pricing.html",
      label: "Open Pricing"
    },
    {
      test: /(take me to|open|go to|show me).*(portfolio|projects?|work|gallery)/,
      url: "/portfolio.html",
      label: "Open Portfolio"
    }
  ];

  const suggestionMatches = [
    {
      test: /(home|homepage|main page)/,
      url: "/",
      label: "Open Home"
    },
    {
      test: /(about)/,
      url: "/about.html",
      label: "Open About"
    },
    {
      test: /(team|staff)/,
      url: "/team.html",
      label: "Open Team"
    },
    {
      test: /(services?)/,
      url: "/services.html",
      label: "Open Services"
    },
    {
      test: /(pricing|price|rates)/,
      url: "/pricing.html",
      label: "Open Pricing"
    },
    {
      test: /(portfolio|projects?|work|gallery)/,
      url: "/portfolio.html",
      label: "Open Portfolio"
    }
  ];

  for (const match of directMatches) {
    if (match.test.test(text)) {
      return {
        type: "navigate",
        label: match.label,
        url: match.url,
        auto: true
      };
    }
  }

  for (const match of suggestionMatches) {
    if (match.test.test(text)) {
      return {
        type: "navigate",
        label: match.label,
        url: match.url,
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

    const modelAction =
      parsed && parsed.action && typeof parsed.action === "object"
        ? parsed.action
        : null;

    const fallback = fallbackAction(message);

    const action =
      modelAction &&
      modelAction.type === "navigate" &&
      typeof modelAction.label === "string" &&
      typeof modelAction.url === "string"
        ? {
            type: "navigate",
            label: modelAction.label,
            url: modelAction.url,
            auto: Boolean(modelAction.auto)
          }
        : fallback;

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
