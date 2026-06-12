const Groq = require("groq-sdk");
const brand = require("../brand.json");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

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

function buildSystemPrompt() {
  return `
You are ${brand.assistantName}, the official business assistant for ${brand.companyName}.

Brand facts:
- Company: ${brand.companyName}
- Founder: ${brand.founder}
- Contact email: ${brand.contact.email}
- Contact phone: ${brand.contact.phone}

Tone:
- Business-level strict
- Professional
- Clear
- Direct
- Helpful
- No slang
- No emojis
- No hype
- No casual filler
- No excessive warmth
- No fake friendliness

Primary task:
- Help visitors understand ${brand.companyName}
- Answer questions about services, contact, and website guidance
- Keep replies concise, accurate, and practical

Known services:
${brand.services.map((service) => `- ${service}`).join("\n")}

Rules:
- Use plain text only
- Keep answers short
- Do not use markdown tables
- Do not invent facts
- If something is unknown, say it is not confirmed
- If asked for contact information, provide the email and phone above
- If asked for business details not present here, say you do not have that confirmed
- If asked for code help, be practical and concise
- If the user is off-topic, redirect them to how ${brand.companyName} can help them
`.trim();
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

    if (!message) {
      return res.status(400).json({ error: "Missing message" });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        reply: "WCS AI is not configured. Add GROQ_API_KEY in Vercel environment variables."
      });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.2,
      max_tokens: 220,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        ...history,
        { role: "user", content: message }
      ]
    });

    const reply =
      completion?.choices?.[0]?.message?.content?.trim() ||
      "I am unable to generate at the moment. ";

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("WCS AI error:", error);
    return res.status(500).json({
      reply: "WCS AI is temporarily unavailable. Please try again shortly. If the error persists, please contact us via email."
    });
  }
};
