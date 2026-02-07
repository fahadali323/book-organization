import type { GenerateQuestionsResponse, GradeAnswersResponse } from "../types";

export type AIProvider = "ollama" | "openai" | "anthropic";

export type AIProviderSettings = {
  provider: AIProvider;
  model: string;
  ollamaBaseUrl: string;
};

export type GenerateQuestionsInput = {
  providerSettings: AIProviderSettings;
  providerApiKey?: string;
  book: {
    title: string;
    author: string;
  };
  chapter: {
    label: string;
    summary: string;
    takeaways: string;
    reflection: string;
  };
  count: number;
  difficulty: string;
  style: string;
};

export type GradeAnswersInput = {
  providerSettings: AIProviderSettings;
  providerApiKey?: string;
  book: {
    title: string;
    author: string;
  };
  chapter: {
    label: string;
    summary: string;
    takeaways: string;
  };
  answers: Array<{
    questionId: string;
    question: string;
    studentAnswer: string;
  }>;
};

const DEFAULT_OLLAMA_BASE_URL = normalizeBaseUrlWithFallback(
  (import.meta.env.VITE_OLLAMA_BASE_URL as string | undefined) ?? "http://127.0.0.1:11434",
  "http://127.0.0.1:11434"
);
const DEFAULT_PROVIDER = normalizeProviderWithFallback(
  (import.meta.env.VITE_AI_PROVIDER as string | undefined) ?? "ollama",
  "ollama"
);
const DEFAULT_MODEL_BY_PROVIDER: Record<AIProvider, string> = {
  ollama: normalizeModelWithFallback(
    (import.meta.env.VITE_OLLAMA_MODEL as string | undefined) ?? "tinyllama:latest",
    "tinyllama:latest"
  ),
  openai: normalizeModelWithFallback(
    (import.meta.env.VITE_OPENAI_MODEL as string | undefined) ?? "gpt-4o-mini",
    "gpt-4o-mini"
  ),
  anthropic: normalizeModelWithFallback(
    (import.meta.env.VITE_ANTHROPIC_MODEL as string | undefined) ?? "claude-3-5-sonnet-latest",
    "claude-3-5-sonnet-latest"
  ),
};

const AI_PROVIDER_KEY = "bo_ai_provider_v1";
const AI_MODEL_KEY = "bo_ai_model_v1";
const AI_OLLAMA_BASE_URL_KEY = "bo_ai_ollama_base_url_v1";

export const MODEL_PRESETS_BY_PROVIDER: Record<AIProvider, string[]> = {
  ollama: [
    "tinyllama:latest",
    "llama3.2:3b",
    "llama3.1:8b",
    "mistral:latest",
    "qwen2.5:7b",
    "gemma2:9b",
  ],
  openai: ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4.1"],
  anthropic: [
    "claude-3-5-haiku-latest",
    "claude-3-5-sonnet-latest",
    "claude-3-7-sonnet-latest",
  ],
};

function hasLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readStorageValue(key: string): string | null {
  if (!hasLocalStorage()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return typeof raw === "string" ? raw : null;
  } catch {
    return null;
  }
}

function writeStorageValue(key: string, value: string) {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {}
}

function withNoTrailingSlash(url: string) {
  return url.trim().replace(/\/+$/, "");
}

function normalizeBaseUrlWithFallback(value: string | null | undefined, fallback: string) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return fallback;
  return withNoTrailingSlash(trimmed);
}

function normalizeModelWithFallback(value: string | null | undefined, fallback: string) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return fallback;
  return trimmed;
}

function normalizeProviderWithFallback(value: string | null | undefined, fallback: AIProvider): AIProvider {
  const next = (value ?? "").trim().toLowerCase();
  if (next === "ollama" || next === "openai" || next === "anthropic") return next;
  return fallback;
}

function defaultModelFor(provider: AIProvider) {
  return DEFAULT_MODEL_BY_PROVIDER[provider];
}

export function normalizeAIProvider(value?: string | null) {
  return normalizeProviderWithFallback(value, DEFAULT_PROVIDER);
}

export function normalizeAIModel(value: string | null | undefined, provider: AIProvider) {
  return normalizeModelWithFallback(value, defaultModelFor(provider));
}

export function normalizeOllamaBaseUrl(value?: string | null) {
  return normalizeBaseUrlWithFallback(value, DEFAULT_OLLAMA_BASE_URL);
}

export function getAIProviderSettings(): AIProviderSettings {
  const provider = normalizeAIProvider(readStorageValue(AI_PROVIDER_KEY));
  return {
    provider,
    model: normalizeAIModel(readStorageValue(AI_MODEL_KEY), provider),
    ollamaBaseUrl: normalizeOllamaBaseUrl(readStorageValue(AI_OLLAMA_BASE_URL_KEY)),
  };
}

export function updateAIProviderSettings(patch: Partial<AIProviderSettings>): AIProviderSettings {
  const current = getAIProviderSettings();
  const provider =
    patch.provider !== undefined ? normalizeAIProvider(patch.provider) : current.provider;
  const model =
    patch.model !== undefined
      ? normalizeAIModel(patch.model, provider)
      : current.provider === provider
      ? current.model
      : defaultModelFor(provider);
  const ollamaBaseUrl =
    patch.ollamaBaseUrl !== undefined
      ? normalizeOllamaBaseUrl(patch.ollamaBaseUrl)
      : current.ollamaBaseUrl;

  const next: AIProviderSettings = {
    provider,
    model,
    ollamaBaseUrl,
  };
  writeStorageValue(AI_PROVIDER_KEY, next.provider);
  writeStorageValue(AI_MODEL_KEY, next.model);
  writeStorageValue(AI_OLLAMA_BASE_URL_KEY, next.ollamaBaseUrl);
  return next;
}

function apiErrorMessage(payload: unknown, status: number) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const maybeError = (payload as { error?: unknown }).error;
    if (typeof maybeError === "string" && maybeError.trim()) {
      return maybeError.trim();
    }
  }
  return `Request failed (${status})`;
}

async function postAIJson<T>(url: string, body: unknown, providerApiKey?: string): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const trimmedApiKey = providerApiKey?.trim();
  if (trimmedApiKey) {
    headers["X-Provider-Api-Key"] = trimmedApiKey;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(apiErrorMessage(payload, response.status));
  }

  return payload as T;
}

export async function generateQuestionsWithAI(input: GenerateQuestionsInput): Promise<GenerateQuestionsResponse> {
  return postAIJson<GenerateQuestionsResponse>(
    "/api/ai/generate-questions",
    {
      provider: input.providerSettings.provider,
      model: input.providerSettings.model,
      ollamaBaseUrl: input.providerSettings.ollamaBaseUrl,
      book: input.book,
      chapter: input.chapter,
      count: input.count,
      difficulty: input.difficulty,
      style: input.style,
    },
    input.providerApiKey
  );
}

export async function gradeAnswersWithAI(input: GradeAnswersInput): Promise<GradeAnswersResponse> {
  return postAIJson<GradeAnswersResponse>(
    "/api/ai/grade",
    {
      provider: input.providerSettings.provider,
      model: input.providerSettings.model,
      ollamaBaseUrl: input.providerSettings.ollamaBaseUrl,
      book: input.book,
      chapter: input.chapter,
      answers: input.answers,
    },
    input.providerApiKey
  );
}
