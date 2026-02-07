import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config as loadEnv } from "dotenv";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

loadEnv({ path: ".env.server.local" });
loadEnv();

const PORT = toInt(process.env.AI_PROXY_PORT ?? process.env.PORT, 8787);
const REQUEST_BODY_LIMIT = process.env.AI_MAX_BODY_SIZE ?? "64kb";
const RATE_LIMIT_PER_MINUTE = toInt(process.env.AI_RATE_LIMIT_MAX, 40);
const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  "http://localhost:8787",
  "http://127.0.0.1:8787",
];
const ALLOWED_ORIGINS = new Set(
  (process.env.AI_ALLOWED_ORIGINS ?? DEFAULT_ALLOWED_ORIGINS.join(","))
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);
const PROVIDERS = new Set(["ollama", "openai", "anthropic"]);
const DEFAULT_OLLAMA_BASE_URL = withNoTrailingSlash(process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434");
const DEFAULT_MODEL_BY_PROVIDER = {
  ollama: process.env.OLLAMA_MODEL ?? "tinyllama:latest",
  openai: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  anthropic: process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest",
};
const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(SERVER_DIR, "../dist");
const DIST_INDEX_PATH = path.join(DIST_DIR, "index.html");
const SERVE_WEB_APP = process.env.SERVE_WEB_APP !== "0" && existsSync(DIST_INDEX_PATH);

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin) return next();

  if (!ALLOWED_ORIGINS.has(origin)) {
    return res.status(403).json({ error: "Origin not allowed." });
  }

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Provider-Api-Key");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json({ limit: REQUEST_BODY_LIMIT, strict: true }));

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: RATE_LIMIT_PER_MINUTE,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many AI requests. Please retry in a minute." },
});
app.use("/api/ai", aiLimiter);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, providers: Array.from(PROVIDERS) });
});

app.post("/api/ai/generate-questions", async (req, res, next) => {
  try {
    const input = parseGenerateRequest(req.body);
    const apiKey = resolveApiKey(req, input.provider);
    const parsed = await providerJson({
      provider: input.provider,
      model: input.model,
      ollamaBaseUrl: input.ollamaBaseUrl,
      apiKey,
      systemPrompt:
        "You are a reading comprehension coach. Return strict JSON only. Do not include markdown, commentary, or code fences.",
      userPrompt: buildGeneratePrompt(input),
    });

    const questions = normalizeQuestions(parsed, input.count);
    if (questions.length === 0) {
      throw new HttpError(502, "AI provider returned no usable questions.");
    }

    res.json({ questions });
  } catch (error) {
    next(error);
  }
});

app.post("/api/ai/grade", async (req, res, next) => {
  try {
    const input = parseGradeRequest(req.body);
    const apiKey = resolveApiKey(req, input.provider);
    const parsed = await providerJson({
      provider: input.provider,
      model: input.model,
      ollamaBaseUrl: input.ollamaBaseUrl,
      apiKey,
      systemPrompt:
        "You grade student reading answers. Return strict JSON only. No markdown. Be specific and constructive.",
      userPrompt: buildGradePrompt(input),
    });

    const results = normalizeGrades(parsed, input.answers);
    if (results.length === 0) {
      throw new HttpError(502, "AI provider returned no usable grade results.");
    }

    res.json({ results });
  } catch (error) {
    next(error);
  }
});

if (SERVE_WEB_APP) {
  app.use(express.static(DIST_DIR, { index: false }));
}

app.use((req, res) => {
  if (SERVE_WEB_APP && req.method === "GET" && !req.path.startsWith("/api")) {
    return res.sendFile(DIST_INDEX_PATH);
  }
  res.status(404).json({ error: "Not found." });
});

app.use((error, _req, res, _next) => {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message });
  }

  const message = error instanceof Error ? error.message : "Unexpected error";
  console.error(`[ai-proxy] ${message}`);
  res.status(500).json({ error: "Internal server error." });
});

app.listen(PORT, () => {
  console.log(`[ai-proxy] listening on http://127.0.0.1:${PORT}`);
  console.log(`[ai-proxy] allowed origins: ${Array.from(ALLOWED_ORIGINS).join(", ")}`);
  if (SERVE_WEB_APP) {
    console.log(`[ai-proxy] serving web app from ${DIST_DIR}`);
  }
});

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function toInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(n);
}

function withNoTrailingSlash(url) {
  return String(url ?? "").trim().replace(/\/+$/, "");
}

function clampText(value, maxLen = 1000) {
  if (typeof value !== "string") return "";
  const out = value.trim();
  return out.length > maxLen ? out.slice(0, maxLen) : out;
}

function sanitizeModel(provider, modelRaw) {
  const model = clampText(
    modelRaw || DEFAULT_MODEL_BY_PROVIDER[provider] || DEFAULT_MODEL_BY_PROVIDER.ollama,
    120
  );
  if (!model) {
    throw new HttpError(400, "Model is required.");
  }
  if (!/^[a-zA-Z0-9._:/-]+$/.test(model)) {
    throw new HttpError(400, "Model contains invalid characters.");
  }
  return model;
}

function sanitizeBaseUrl(urlRaw) {
  const value = withNoTrailingSlash(urlRaw || DEFAULT_OLLAMA_BASE_URL);
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new HttpError(400, "Invalid Ollama base URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new HttpError(400, "Ollama base URL must use http or https.");
  }
  return value;
}

function readProvider(value) {
  const provider = clampText(value, 20).toLowerCase();
  if (!PROVIDERS.has(provider)) {
    throw new HttpError(400, 'Provider must be one of: "ollama", "openai", "anthropic".');
  }
  return provider;
}

function readCount(value) {
  const n = toInt(value, 6);
  return Math.max(1, Math.min(15, n));
}

function readDifficulty(value) {
  const difficulty = clampText(value, 20).toLowerCase();
  if (difficulty === "easy" || difficulty === "medium" || difficulty === "hard" || difficulty === "mixed") {
    return difficulty;
  }
  return "mixed";
}

function readStyle(value) {
  const style = clampText(value, 32).toLowerCase();
  if (style === "comprehension" || style === "critical_thinking" || style === "mixed") {
    return style;
  }
  return "comprehension";
}

function parseGenerateRequest(body) {
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "Invalid request body.");
  }

  const provider = readProvider(body.provider);
  const model = sanitizeModel(provider, body.model);
  const ollamaBaseUrl = sanitizeBaseUrl(body.ollamaBaseUrl);
  const book = body.book && typeof body.book === "object" ? body.book : {};
  const chapter = body.chapter && typeof body.chapter === "object" ? body.chapter : {};

  return {
    provider,
    model,
    ollamaBaseUrl,
    book: {
      title: clampText(book.title, 300),
      author: clampText(book.author, 300),
    },
    chapter: {
      label: clampText(chapter.label, 300),
      summary: clampText(chapter.summary, 7000),
      takeaways: clampText(chapter.takeaways, 5000),
      reflection: clampText(chapter.reflection, 5000),
    },
    count: readCount(body.count),
    difficulty: readDifficulty(body.difficulty),
    style: readStyle(body.style),
  };
}

function parseGradeRequest(body) {
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "Invalid request body.");
  }

  const provider = readProvider(body.provider);
  const model = sanitizeModel(provider, body.model);
  const ollamaBaseUrl = sanitizeBaseUrl(body.ollamaBaseUrl);
  const book = body.book && typeof body.book === "object" ? body.book : {};
  const chapter = body.chapter && typeof body.chapter === "object" ? body.chapter : {};
  const answersRaw = Array.isArray(body.answers) ? body.answers : [];

  const answers = answersRaw
    .slice(0, 20)
    .map((row) => {
      const safeRow = row && typeof row === "object" ? row : {};
      return {
        questionId: clampText(safeRow.questionId, 120),
        question: clampText(safeRow.question, 700),
        studentAnswer: clampText(safeRow.studentAnswer, 10000),
      };
    })
    .filter((row) => row.questionId && row.question && row.studentAnswer);

  if (answers.length === 0) {
    throw new HttpError(400, "At least one answer is required.");
  }

  return {
    provider,
    model,
    ollamaBaseUrl,
    book: {
      title: clampText(book.title, 300),
      author: clampText(book.author, 300),
    },
    chapter: {
      label: clampText(chapter.label, 300),
      summary: clampText(chapter.summary, 7000),
      takeaways: clampText(chapter.takeaways, 5000),
    },
    answers,
  };
}

function resolveApiKey(req, provider) {
  if (provider === "ollama") return "";

  const keyFromHeader = clampText(readHeader(req.headers["x-provider-api-key"]), 400);
  const keyFromEnv =
    provider === "openai"
      ? clampText(process.env.OPENAI_API_KEY ?? "", 400)
      : clampText(process.env.ANTHROPIC_API_KEY ?? "", 400);

  const apiKey = keyFromHeader || keyFromEnv;
  if (!apiKey) {
    throw new HttpError(400, `Missing API key for provider "${provider}".`);
  }
  return apiKey;
}

function readHeader(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : "";
  return "";
}

function parseModelJson(content) {
  const text = clampText(content, 25000);
  const attempts = [text];
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) attempts.push(fenced[1].trim());
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    attempts.push(text.slice(firstBrace, lastBrace + 1));
  }
  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate);
    } catch {}
  }
  throw new HttpError(502, "Provider did not return valid JSON.");
}

function providerErrorMessage(payload, fallback) {
  if (payload && typeof payload === "object") {
    const p = payload;
    if (typeof p.error === "string" && p.error.trim()) return p.error.trim();
    if (p.error && typeof p.error === "object" && typeof p.error.message === "string" && p.error.message.trim()) {
      return p.error.message.trim();
    }
  }
  return fallback;
}

async function providerJson(params) {
  const { provider, model, ollamaBaseUrl, apiKey, systemPrompt, userPrompt } = params;
  if (provider === "openai") {
    return callOpenAI({ model, apiKey, systemPrompt, userPrompt });
  }
  if (provider === "anthropic") {
    return callAnthropic({ model, apiKey, systemPrompt, userPrompt });
  }
  return callOllama({ model, ollamaBaseUrl, systemPrompt, userPrompt });
}

async function callOllama({ model, ollamaBaseUrl, systemPrompt, userPrompt }) {
  let response;
  try {
    response = await fetch(`${ollamaBaseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        format: "json",
        options: { temperature: 0.2 },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });
  } catch {
    throw new HttpError(502, `Could not connect to Ollama at ${ollamaBaseUrl}.`);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {}

  if (!response.ok) {
    throw new HttpError(response.status, providerErrorMessage(payload, `Ollama request failed (${response.status}).`));
  }

  const content = clampText(payload?.message?.content, 25000);
  if (!content) {
    throw new HttpError(502, "Ollama returned an empty response.");
  }
  return parseModelJson(content);
}

async function callOpenAI({ model, apiKey, systemPrompt, userPrompt }) {
  let response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });
  } catch {
    throw new HttpError(502, "Could not reach OpenAI.");
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {}

  if (!response.ok) {
    throw new HttpError(response.status, providerErrorMessage(payload, `OpenAI request failed (${response.status}).`));
  }

  const content = clampText(payload?.choices?.[0]?.message?.content, 25000);
  if (!content) {
    throw new HttpError(502, "OpenAI returned an empty response.");
  }
  return parseModelJson(content);
}

async function callAnthropic({ model, apiKey, systemPrompt, userPrompt }) {
  let response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1400,
        temperature: 0.2,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
  } catch {
    throw new HttpError(502, "Could not reach Anthropic.");
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {}

  if (!response.ok) {
    throw new HttpError(response.status, providerErrorMessage(payload, `Anthropic request failed (${response.status}).`));
  }

  const blocks = Array.isArray(payload?.content) ? payload.content : [];
  const content = clampText(
    blocks
      .filter((block) => block && block.type === "text" && typeof block.text === "string")
      .map((block) => block.text)
      .join("\n"),
    25000
  );

  if (!content) {
    throw new HttpError(502, "Anthropic returned an empty response.");
  }
  return parseModelJson(content);
}

function buildGeneratePrompt(input) {
  return [
    "Create chapter questions from the provided context.",
    "Requirements:",
    `- Return exactly ${input.count} questions.`,
    `- Difficulty: ${input.difficulty}.`,
    `- Style: ${input.style}.`,
    "- Make each question specific to the chapter context.",
    "- Keep each question <= 220 characters.",
    "- Provide a short grading rubric for each question.",
    '- Output JSON in this shape only: {"questions":[{"id":"q1","question":"...","rubric":"..."}]}',
    "",
    "Book:",
    `- Title: ${input.book.title || "(unknown)"}`,
    `- Author: ${input.book.author || "(unknown)"}`,
    "Chapter:",
    `- Label: ${input.chapter.label || "(unknown)"}`,
    `- Summary: ${input.chapter.summary || "(none)"}`,
    `- Takeaways: ${input.chapter.takeaways || "(none)"}`,
    `- Reflection: ${input.chapter.reflection || "(none)"}`,
  ].join("\n");
}

function buildGradePrompt(input) {
  return [
    "Grade each answer based on chapter context and the question asked.",
    "Requirements:",
    "- Score each answer from 0 to 100.",
    "- Use higher scores for accuracy, completeness, and reasoning.",
    "- Feedback should be concise and actionable.",
    "- Provide an ideal answer (2-4 sentences).",
    '- Output JSON only in this shape: {"results":[{"questionId":"...","score":0,"feedback":"...","idealAnswer":"..."}]}',
    "",
    "Book:",
    `- Title: ${input.book.title || "(unknown)"}`,
    `- Author: ${input.book.author || "(unknown)"}`,
    "Chapter:",
    `- Label: ${input.chapter.label || "(unknown)"}`,
    `- Summary: ${input.chapter.summary || "(none)"}`,
    `- Takeaways: ${input.chapter.takeaways || "(none)"}`,
    "",
    "Answers:",
    ...input.answers.map((answer, idx) => {
      return [
        `${idx + 1}. questionId=${answer.questionId}`,
        `Question: ${answer.question}`,
        `Student Answer: ${answer.studentAnswer}`,
      ].join("\n");
    }),
  ].join("\n");
}

function normalizeQuestions(parsed, expectedCount) {
  const rows = Array.isArray(parsed?.questions) ? parsed.questions : [];
  const out = [];
  const usedIds = new Set();

  for (const row of rows) {
    if (out.length >= expectedCount) break;
    const question = clampText(row?.question, 500);
    if (!question) continue;
    let id = clampText(row?.id, 120);
    if (!id || usedIds.has(id)) id = `q${out.length + 1}`;
    usedIds.add(id);
    out.push({
      id,
      question,
      rubric: clampText(row?.rubric, 2000),
    });
  }
  return out;
}

function normalizeGrades(parsed, answers) {
  const rows = Array.isArray(parsed?.results) ? parsed.results : [];
  const answerById = new Map(answers.map((row) => [row.questionId, row]));
  const out = [];

  for (const row of rows) {
    const questionId = clampText(row?.questionId, 120);
    if (!questionId || !answerById.has(questionId)) continue;
    const answer = answerById.get(questionId);
    out.push({
      questionId,
      score: Math.max(0, Math.min(100, toInt(row?.score, 0))),
      feedback: clampText(row?.feedback, 2000),
      idealAnswer: clampText(row?.idealAnswer, 2000),
      question: answer.question,
      studentAnswer: answer.studentAnswer,
    });
  }

  return out.map((result) => ({
    questionId: result.questionId,
    score: result.score,
    feedback: result.feedback,
    idealAnswer: result.idealAnswer,
  }));
}
