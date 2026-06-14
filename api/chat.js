const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const SITE_PAGES = [
  { key: "home", label: "Home", url: "/", aliases: ["home", "homepage", "main"] },
  { key: "about", label: "About", url: "/about.html", aliases: ["about"] },
  { key: "team", label: "Team", url: "/team.html", aliases: ["team", "staff"] },
  { key: "services", label: "Services", url: "/services.html", aliases: ["services", "service"] },
  { key: "pricing", label: "Pricing", url: "/pricing.html", aliases: ["pricing", "price", "rates", "cost"] },
  { key: "portfolio", label: "Portfolio", url: "/portfolio.html", aliases: ["portfolio", "projects", "work", "gallery"] }
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

function normalizeFocusKey(value) {
  const cleaned = cleanString(value).toLowerCase();
  const match = SITE_PAGES.find((page) => page.key === cleaned || page.aliases.includes(cleaned));
  return match ? match.key : null;
}

function inferPageFromText(text) {
  const lowered = cleanString(text).toLowerCase();

  const directMatches = [
    { test: /(take me to|open|go to|show me).*(services?)/, key: "services", label: "Open Services", url: "/services.html", auto: true },
    { test: /(take me to|open|go to|show me).*(pricing|price|rates|cost)/, key: "pricing", label: "Open Pricing", url: "/pricing.html", auto: true },
    { test: /(take me to|open|go to|show me).*(portfolio|projects?|work|gallery)/, key: "portfolio", label: "Open Portfolio", url: "/portfolio.html", auto: true },
    { test: /(take me to|open|go to|show me).*(team|staff)/, key: "team", label: "Open Team", url: "/team.html", auto: true },
    { test: /(take me to|open|go to|show me).*(about)/, key: "about", label: "Open About", url: "/about.html", auto: true },
    { test: /(take me to|open|go to|show me).*(home|homepage|main page)/, key: "home", label: "Open Home", url: "/", auto: true }
  ];

  for (const item of directMatches) {
    if (item.test.test(lowered)) return item;
  }

  const softMatches = [
    { test: /(services?|service|what do you build|what can you do)/, key: "services", label: "Open Services", url: "/services.html", auto: false },
    { test: /(pricing|price|rates|cost|budget|quote)/, key: "pricing", label: "Open Pricing", url: "/pricing.html", auto: false },
    { test: /(portfolio|projects?|work|examples|gallery)/, key: "portfolio", label: "Open Portfolio", url: "/portfolio.html", auto: false },
    { test: /(team|staff|who works|about the team)/, key: "team", label: "Open Team", url: "/team.html", auto: false },
    { test: /(about|story|background|who is wcs)/, key: "about", label: "Open About", url: "/about.html", auto: false },
    { test: /(home|homepage|main page|start page)/, key: "home", label: "Open Home", url: "/", auto: false }
  ];

  for (const item of softMatches) {
    if (item.test.test(lowered)) return item;
  }

  return null;
}

function formatResearchContext(research) {
  if (!research || typeof research !== "object") return "No site research provided.";

  const blocks = [];

  const pushBrief = (label, brief) => {
    if (!brief) return;
    const headings = Array.isArray(brief.headings) && brief.headings.length ? brief.headings.join(" | ") : "none";
    blocks.push(
      [
        `${label}:`,
        `- key: ${brief.key || "unknown"}`,
        `- url: ${brief.url || "unknown"}`,
        `- title: ${brief.title || "unknown"}`,
        `- headings: ${headings}`,
        `- summary: ${brief.summary || "none"}`
      ].join("\n")
    );
  };

  pushBrief("Current page brief", research.currentPage);
  pushBrief("Target page brief", research.targetPage);

  if (Array.isArray(research.relatedPages) && research.relatedPages.length) {
    for (const item of research.relatedPages.slice(0, 3)) {
      pushBrief("Related page brief", item);
    }
  }

  if (!blocks.length) return "No site research provided.";

  return blocks.join("\n\n");
}

function buildSystemPrompt({ currentPage, targetPage, research, userMessage }) {
  const currentKey = normalizeFocusKey(currentPage?.key || currentPage?.path || "");
  const targetKey = normalizeFocusKey(targetPage?.key || targetPage?.path || "") || targetPage?.key || null;

  return `
You are Codeo, the official AI assistant for Web Creation Studios.

Brand rules:
- Stay locked to Web Creation Studios only.
- Use a strict business tone.
- Be professional, direct, and concise.
- Do not use slang.
- Do not use emojis.
- Do not hype.
- Do not invent facts.

Known company facts:
- Company: Web Creation Studios
- Founder: CJ
- Contact email: solutionsforyourweb@gmail.com
- Contact phone: (302) 526-0930

Allowed site pages:
- Home: /
- About: /about.html
- Team: /team.html
- Services: /services.html
- Pricing: /pricing.html
- Portfolio: /portfolio.html

Operating rules:
- Treat the research context below as the primary source of truth.
- If the question is about a page, answer from that page's content.
- If the user asks to open a page, return a navigation action.
- If the request clearly asks to go somewhere, set action.auto to true.
- If the answer is uncertain, say so briefly and direct the user to the relevant page or contact information.
- If the user asks about anything outside Web Creation Studios, redirect them back to WCS.

Current page key: ${currentKey || "unknown"}
Target page key: ${targetKey || "unknown"}

Research context:
${formatResearchContext(research)}

User message:
${userMessage}

Return ONLY valid JSON in this exact shape:

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
    const candidate = trimmed.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {}
  }

  return null;
}

function fallbackReply(message) {
  const text = cleanString(message).toLowerCase();

  if (text.includes("contact") || text.includes("email") || text.includes("phone")) {
    return "Contact Web Creation Studios at solutionsforyourweb@gmail.com or (302) 526-0930.";
  }

  if (text.includes("service") || text.includes("services")) {
    return "Web Creation Studios provides web design, website development, ecommerce setup, branding, logo design, hosting support, domain setup, analytics setup, email setup, site security, and custom website features.";
  }

  if (text.includes("pricing") || text.includes("price") || text.includes("rates") || text.includes("cost")) {
    return "Pricing information is available on the pricing page. For current exact details, contact Web Creation Studios directly.";
  }

  if (text.includes("portfolio") || text.includes("projects") || text.includes("work") || text.includes("gallery")) {
    return "The portfolio page shows examples of the type of work Web Creation Studios builds.";
  }

  if (text.includes("about")) {
    return "The about page has background on Web Creation Studios and the brand direction behind the site.";
  }

  if (text.includes("team") || text.includes("staff")) {
    return "The team page shows the people behind Web Creation Studios.";
  }

  if (text.includes("home") || text.includes("homepage")) {
    return "The home page is the main entry point for Web Creation Studios.";
  }

  return "I am unable to generate a response at the moment.";
}

function fallbackAction(message) {
  const inferred = inferPageFromText(message);
  if (!inferred) return null;

  return {
    type: "navigate",
    label: inferred.label,
    url: inferred.url,
    auto: inferred.auto
  };
}

function fallbackFocusKey(message, currentPageKey, targetPageKey) {
  const inferred = inferPageFromText(message);
  return normalizeFocusKey(targetPageKey) || inferred?.key || normalizeFocusKey(currentPageKey) || "home";
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

    const currentPage = body.page && typeof body.page === "object" ? body.page : {};
    const targetPage = body.targetPage && typeof body.targetPage === "object" ? body.targetPage : {};
    const research = body.research && typeof body.research === "object" ? body.research : null;

    if (!message) {
      return res.status(400).json({ error: "Missing message" });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        reply: "WCS AI is not configured. Add GROQ_API_KEY in Vercel environment variables.",
        action: null,
        focusPage: fallbackFocusKey(message, currentPage.key, targetPage.key)
      });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.2,
      max_tokens: 320,
      messages: [
        {
          role: "system",
          content: buildSystemPrompt({
            currentPage,
            targetPage,
            research,
            userMessage: message
          })
        },
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

    const focusPage =
      normalizeFocusKey(parsed?.focusPage) ||
      normalizeFocusKey(targetPage?.key) ||
      fallbackFocusKey(message, currentPage.key, targetPage.key);

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
      action,
      focusPage
    });
  } catch (error) {
    console.error("WCS AI error:", error);
    return res.status(500).json({
      reply: "WCS AI is temporarily unavailable. Please try again shortly.",
      action: null,
      focusPage: "home"
    });
  }
};
