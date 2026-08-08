import "server-only";
import { CATEGORIES, QUICK_ADD_TYPES, type QuickAddType } from "@/lib/types";

// "-latest" alias rather than a dated model name — Google periodically
// retires specific model versions for new API keys/accounts (this
// happened to gemini-2.5-flash), and the alias is Google's own pointer to
// whatever current flash-tier model is actually available, so it doesn't
// need to be manually bumped every time that happens.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

// One line of prose per type, reused to build both the full instruction
// (all nine, for the free-text Femina AI flow, where the account isn't
// known ahead of time) and a restricted instruction (for callers like
// /api/ingest-email that already know the account from a source more
// reliable than free text — e.g. the sender's email domain — and only
// need Gemini to work out direction/amount/category/note/date).
const TYPE_DESCRIPTIONS: Record<QuickAddType, string> = {
  maribank_add: "money added to MariBank savings",
  maribank_subtract: "money taken out of / withdrawn from MariBank savings",
  dbs_income: "income into the DBS daily spending account (e.g. salary, allowance, a refund)",
  dbs_expense: "a purchase or expense from the DBS daily spending account — must include a \"category\"",
  receivables_i_paid:
    "the user paid for something on someone else's behalf, so that person now owes the user money — must include \"person\"",
  receivables_they_paid_back:
    "someone paid the user back money they previously owed — must include \"person\"",
  hsbc_contribution: "money added into the HSBC investment account",
  hsbc_valuation:
    "a statement of what the HSBC investment portfolio is currently worth right now (not money being added)",
  mendaki_repayment: "a repayment made toward the Mendaki loan",
};

function typeListBlock(allowedTypes: readonly QuickAddType[]): string {
  return allowedTypes.map((t) => `- "${t}": ${TYPE_DESCRIPTIONS[t]}`).join("\n");
}

const SYSTEM_INSTRUCTION = (todayIso: string, allowedTypes: readonly QuickAddType[]) => {
  const restricted = allowedTypes.length < QUICK_ADD_TYPES.length;

  const typeIntro = restricted
    ? `Which account this transaction belongs to is already known with certainty (determined separately, not from this text) — your only job is to work out the remaining fields. Each entry must have a "type" — chosen EXACTLY from this list (every option here belongs to the same, already-known account; do not use any type outside this list even if the wording seems to suggest another account):`
    : `Each entry must have a "type" — chosen EXACTLY from this list, which fully encodes both the account and the direction of money movement:`;

  return `You are a financial entry parser for a personal budget tracking app with five accounts. Extract one or more structured financial entries from the user's free-text message.

Today's date is ${todayIso}. Resolve relative dates ("yesterday", "last Monday") against this date. If no date is mentioned, use today's date. Always output dates as YYYY-MM-DD.

${typeIntro}
${typeListBlock(allowedTypes)}

Field rules:
- "amount": always a positive number. The direction is already encoded in "type", never make it negative. If the amount is expressed as a math expression (e.g. "12+3.50", "45/3", "$45/3 split with roommate" meaning 45/3), compute the result yourself and output only the final numeric value — never output the raw expression as text. Supported operators: +, -, *, / and parentheses, same as a basic calculator.
- "category": ONLY for "dbs_expense" entries — pick exactly one of: ${CATEGORIES.join(", ")}. Omit for every other type.
- "person": ONLY for "receivables_i_paid" and "receivables_they_paid_back" — the other person's name as mentioned, capitalized normally. Omit for every other type.
- "note": a short (a few words) human-readable description of the entry.
- "date": the resolved YYYY-MM-DD date for this entry.

If the message doesn't clearly describe a financial transaction matching one of the above types, do not invent an entry for it — omit it entirely. If nothing in the message qualifies, return an empty array.

Respond with ONLY a JSON array of entries matching this shape — no markdown, no commentary, no code fences:
[{ "type": "...", "amount": 0, "category": "...", "person": "...", "note": "...", "date": "YYYY-MM-DD" }]`;
};

// Structurally constrains what Gemini is allowed to emit — not just a
// prompt suggestion. When a caller already knows the account (e.g.
// /api/ingest-email, from the sender's email domain), passing a narrowed
// allowedTypes here makes it impossible for the model to return a type
// from a different account, rather than relying on it to follow the
// instruction text and catching a mismatch after the fact.
function buildResponseSchema(allowedTypes: readonly QuickAddType[]) {
  return {
    type: "ARRAY",
    items: {
      type: "OBJECT",
      properties: {
        type: { type: "STRING", enum: allowedTypes },
        amount: { type: "NUMBER" },
        category: { type: "STRING", enum: CATEGORIES },
        person: { type: "STRING" },
        note: { type: "STRING" },
        date: { type: "STRING" },
      },
      required: ["type", "amount", "note", "date"],
    },
  };
}

export interface RawParsedEntry {
  type: string;
  amount: number;
  category?: string;
  person?: string;
  note: string;
  date: string;
}

function extractJsonArray(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error("Gemini response did not contain valid JSON");
  }
}

export async function parseQuickAddText(
  text: string,
  todayIso: string,
  // Defaults to all nine types — the free-text Femina AI flow doesn't
  // know the account ahead of time, so Gemini has to determine it from
  // content. Callers that already know the account (see buildResponseSchema
  // above) should pass a narrowed list instead of validating after the fact.
  allowedTypes: readonly QuickAddType[] = QUICK_ADD_TYPES
): Promise<RawParsedEntry[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_INSTRUCTION(todayIso, allowedTypes) }],
        },
        contents: [{ role: "user", parts: [{ text }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: buildResponseSchema(allowedTypes),
          temperature: 0.1,
        },
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Gemini API error (${response.status}): ${body.slice(0, 300)}`);
  }

  const data = await response.json();
  const resultText: string | undefined =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!resultText) {
    throw new Error("Gemini returned no content.");
  }

  const parsed = extractJsonArray(resultText);
  if (!Array.isArray(parsed)) {
    throw new Error("Gemini response was not a JSON array.");
  }

  return parsed as RawParsedEntry[];
}
