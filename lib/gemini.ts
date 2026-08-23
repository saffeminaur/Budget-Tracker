import "server-only";
import { CATEGORIES, QUICK_ADD_TYPES, type QuickAddType } from "@/lib/types";

// "-latest" alias rather than a dated model name — Google periodically
// retires specific model versions for new API keys/accounts (this
// happened to gemini-2.5-flash), and the alias is Google's own pointer to
// whatever current flash-tier model is actually available, so it doesn't
// need to be manually bumped every time that happens.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

// Tried once, only after GEMINI_MODEL has exhausted every retry while
// still overloaded (see callGeminiWithRetry below) — a different
// model/tier so an outage on one doesn't necessarily also affect the
// other. Set this equal to GEMINI_MODEL to disable the fallback.
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-flash-lite-latest";

// Delay before each retry after a 503/UNAVAILABLE response — three
// retries (four attempts total) with 1s/2s/4s backoff.
const RETRY_DELAYS_MS = [1000, 2000, 4000];

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

// Gemini signals two different "not my fault, try elsewhere" conditions,
// and they call for different responses:
// - "overloaded" (HTTP 503 / status "UNAVAILABLE"): the model is
//   momentarily over capacity — retrying the same model shortly after
//   usually succeeds, hence the backoff loop below.
// - "quota_exceeded" (HTTP 429 / status "RESOURCE_EXHAUSTED"): this
//   specific model's quota on the API key is used up — retrying the same
//   model immediately just fails again with the same error. Gemini
//   quotas are allocated per model though, so GEMINI_FALLBACK_MODEL often
//   still has headroom even when GEMINI_MODEL doesn't.
//
// Thrown once every applicable retry — and the fallback model, if
// configured — has failed the same way. Callers that persist a "pending"
// state instead of a hard failure (see lib/email-ingest.ts) check
// specifically for this, to distinguish "try again later" from a
// genuine parsing failure that retrying won't fix.
export class GeminiUnavailableError extends Error {
  readonly kind: "overloaded" | "quota_exceeded";

  constructor(message: string, kind: "overloaded" | "quota_exceeded") {
    super(message);
    this.name = "GeminiUnavailableError";
    this.kind = kind;
  }
}

function classifyUnavailable(
  status: number,
  bodyText: string
): "overloaded" | "quota_exceeded" | null {
  if (status === 503 || /"status"\s*:\s*"UNAVAILABLE"/i.test(bodyText)) return "overloaded";
  if (status === 429 || /"status"\s*:\s*"RESOURCE_EXHAUSTED"/i.test(bodyText)) {
    return "quota_exceeded";
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGeminiOnce(
  model: string,
  apiKey: string,
  systemInstruction: string,
  text: string,
  schema: ReturnType<typeof buildResponseSchema>
): Promise<RawParsedEntry[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts: [{ text }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0.1,
        },
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const message = `Gemini API error (${response.status}): ${body.slice(0, 300)}`;
    const kind = classifyUnavailable(response.status, body);
    if (kind) {
      throw new GeminiUnavailableError(message, kind);
    }
    throw new Error(message);
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

// Retries with backoff only on "overloaded" — a genuine parsing/schema
// error would just fail the same way again, and "quota_exceeded" against
// the same model won't clear in seconds, so both skip straight to
// rethrowing (parseQuickAddText's fallback-model attempt below is the
// next line of defense for either).
async function callGeminiWithRetry(
  model: string,
  apiKey: string,
  systemInstruction: string,
  text: string,
  schema: ReturnType<typeof buildResponseSchema>
): Promise<RawParsedEntry[]> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await callGeminiOnce(model, apiKey, systemInstruction, text, schema);
    } catch (err) {
      const canRetrySameModel =
        err instanceof GeminiUnavailableError &&
        err.kind === "overloaded" &&
        attempt < RETRY_DELAYS_MS.length;
      if (!canRetrySameModel) {
        throw err;
      }
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
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

  const systemInstruction = SYSTEM_INSTRUCTION(todayIso, allowedTypes);
  const schema = buildResponseSchema(allowedTypes);

  try {
    return await callGeminiWithRetry(GEMINI_MODEL, apiKey, systemInstruction, text, schema);
  } catch (err) {
    if (!(err instanceof GeminiUnavailableError) || GEMINI_FALLBACK_MODEL === GEMINI_MODEL) {
      throw err;
    }
    // GEMINI_MODEL is still overloaded after every retry — one shot at
    // the fallback model/tier before giving up. If this also fails, the
    // GeminiUnavailableError propagates to the caller unchanged.
    return await callGeminiOnce(GEMINI_FALLBACK_MODEL, apiKey, systemInstruction, text, schema);
  }
}
