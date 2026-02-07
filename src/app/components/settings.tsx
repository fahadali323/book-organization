import { ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MODEL_PRESETS_BY_PROVIDER, type AIProvider } from "../ai/ollama";
import type { User, UserData } from "../types";
import { formatDate } from "../utils";
import { Button, Card, CardContent, CardHeader, Divider, Input } from "../ui/primitives";
import { InfoStat } from "./common";

type CloudProvider = Exclude<AIProvider, "ollama">;

const PROVIDER_LABEL: Record<AIProvider, string> = {
  ollama: "Ollama (local)",
  openai: "OpenAI",
  anthropic: "Anthropic (Claude)",
};

const CUSTOM_MODEL_OPTION = "__custom_model__";

function modelSelectValue(provider: AIProvider, model: string) {
  return MODEL_PRESETS_BY_PROVIDER[provider].includes(model) ? model : CUSTOM_MODEL_OPTION;
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, "");
}

export function SettingsView(props: {
  user: User;
  data: UserData;
  aiProvider: AIProvider;
  aiModel: string;
  ollamaBaseUrl: string;
  hasOpenAIKey: boolean;
  hasAnthropicKey: boolean;
  onSaveAISettings: (settings: { provider: AIProvider; model: string; ollamaBaseUrl: string }) => void;
  onSetSessionApiKey: (provider: CloudProvider, apiKey: string) => void;
  onClearSessionApiKey: (provider: CloudProvider) => void;
  onDangerReset: () => void;
}) {
  const counts = {
    books: props.data.books.length,
    chapters: props.data.chapters.length,
    qas: props.data.qas.length,
    aiQuestions: props.data.aiCoach.generatedQuestions.length,
    aiFeedbackRuns: props.data.aiCoach.feedbackHistory.length,
    history: props.data.history.length,
  };

  const [providerDraft, setProviderDraft] = useState<AIProvider>(props.aiProvider);
  const [modelDraft, setModelDraft] = useState(props.aiModel);
  const [modelPresetDraft, setModelPresetDraft] = useState(modelSelectValue(props.aiProvider, props.aiModel));
  const [ollamaBaseUrlDraft, setOllamaBaseUrlDraft] = useState(props.ollamaBaseUrl);
  const [openAIKeyDraft, setOpenAIKeyDraft] = useState("");
  const [anthropicKeyDraft, setAnthropicKeyDraft] = useState("");

  useEffect(() => {
    setProviderDraft(props.aiProvider);
    setModelDraft(props.aiModel);
    setModelPresetDraft(modelSelectValue(props.aiProvider, props.aiModel));
    setOllamaBaseUrlDraft(props.ollamaBaseUrl);
  }, [props.aiModel, props.aiProvider, props.ollamaBaseUrl]);

  const aiSettingsDirty = useMemo(() => {
    return (
      providerDraft !== props.aiProvider ||
      modelDraft.trim() !== props.aiModel ||
      normalizeBaseUrl(ollamaBaseUrlDraft) !== props.ollamaBaseUrl
    );
  }, [modelDraft, ollamaBaseUrlDraft, props.aiModel, props.aiProvider, props.ollamaBaseUrl, providerDraft]);

  function resetAIDrafts() {
    setProviderDraft(props.aiProvider);
    setModelDraft(props.aiModel);
    setModelPresetDraft(modelSelectValue(props.aiProvider, props.aiModel));
    setOllamaBaseUrlDraft(props.ollamaBaseUrl);
  }

  function saveAISettings() {
    props.onSaveAISettings({
      provider: providerDraft,
      model: modelDraft,
      ollamaBaseUrl: ollamaBaseUrlDraft,
    });
  }

  const keyStatusText =
    providerDraft === "openai"
      ? props.hasOpenAIKey
        ? "OpenAI key loaded for this browser session."
        : "No OpenAI session key set."
      : providerDraft === "anthropic"
      ? props.hasAnthropicKey
        ? "Anthropic key loaded for this browser session."
        : "No Anthropic session key set."
      : "Ollama does not require a cloud API key.";

  return (
    <div className="mt-6 space-y-4">
      <Card>
        <CardHeader title="Settings" subtitle="Manage your local data, AI provider, and security controls." />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <InfoStat label="Books" value={String(counts.books)} />
            <InfoStat label="Chapters" value={String(counts.chapters)} />
            <InfoStat label="Q&A" value={String(counts.qas)} />
            <InfoStat label="AI Questions" value={String(counts.aiQuestions)} />
            <InfoStat label="AI Feedback" value={String(counts.aiFeedbackRuns)} />
            <InfoStat label="History events" value={String(counts.history)} />
          </div>

          <Divider />

          <div className="text-sm text-zinc-600 dark:text-zinc-300">
            <div className="font-medium text-zinc-900 dark:text-zinc-100">Account</div>
            <div className="mt-1">Email: {props.user.email}</div>
            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Created {formatDate(props.user.createdAt)}</div>
          </div>

          <Divider />

          <div className="space-y-3">
            <div className="font-medium text-zinc-900 dark:text-zinc-100">AI provider setup</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="block">
                <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-1">Provider</div>
                <select
                  value={providerDraft}
                  onChange={(e) => {
                    const nextProvider = e.target.value as AIProvider;
                    setProviderDraft(nextProvider);
                    const nextModel = MODEL_PRESETS_BY_PROVIDER[nextProvider][0] ?? modelDraft;
                    setModelDraft(nextModel);
                    setModelPresetDraft(modelSelectValue(nextProvider, nextModel));
                  }}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm outline-none"
                >
                  <option value="ollama">{PROVIDER_LABEL.ollama}</option>
                  <option value="openai">{PROVIDER_LABEL.openai}</option>
                  <option value="anthropic">{PROVIDER_LABEL.anthropic}</option>
                </select>
              </label>
              <label className="block">
                <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-1">Model preset</div>
                <select
                  value={modelPresetDraft}
                  onChange={(e) => {
                    const next = e.target.value;
                    setModelPresetDraft(next);
                    if (next !== CUSTOM_MODEL_OPTION) {
                      setModelDraft(next);
                    }
                  }}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm outline-none"
                >
                  {MODEL_PRESETS_BY_PROVIDER[providerDraft].map((model) => (
                    <option key={`${providerDraft}_${model}`} value={model}>
                      {model}
                    </option>
                  ))}
                  <option value={CUSTOM_MODEL_OPTION}>Custom model</option>
                </select>
              </label>
            </div>

            <Input
              label="Model name"
              value={modelDraft}
              onChange={(e) => {
                const next = e.target.value;
                setModelDraft(next);
                setModelPresetDraft(modelSelectValue(providerDraft, next.trim()));
              }}
              placeholder="Enter model id exactly as your provider expects"
            />

            {providerDraft === "ollama" ? (
              <Input
                label="Ollama base URL"
                value={ollamaBaseUrlDraft}
                onChange={(e) => setOllamaBaseUrlDraft(e.target.value)}
                placeholder="http://127.0.0.1:11434"
              />
            ) : null}

            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={resetAIDrafts} disabled={!aiSettingsDirty}>
                Revert
              </Button>
              <Button
                onClick={saveAISettings}
                disabled={!aiSettingsDirty || !modelDraft.trim() || (providerDraft === "ollama" && !ollamaBaseUrlDraft.trim())}
              >
                Save AI settings
              </Button>
            </div>
          </div>

          <Divider />

          <div className="space-y-3">
            <div className="font-medium text-zinc-900 dark:text-zinc-100">Cloud API keys (session only)</div>
            {providerDraft === "openai" ? (
              <div className="space-y-2">
                <Input
                  type="password"
                  label="OpenAI API key"
                  value={openAIKeyDraft}
                  onChange={(e) => setOpenAIKeyDraft(e.target.value)}
                  placeholder="sk-..."
                  autoComplete="off"
                />
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      props.onSetSessionApiKey("openai", openAIKeyDraft);
                      setOpenAIKeyDraft("");
                    }}
                    disabled={!openAIKeyDraft.trim()}
                  >
                    Set OpenAI key
                  </Button>
                  <Button variant="secondary" onClick={() => props.onClearSessionApiKey("openai")} disabled={!props.hasOpenAIKey}>
                    Clear key
                  </Button>
                </div>
              </div>
            ) : null}

            {providerDraft === "anthropic" ? (
              <div className="space-y-2">
                <Input
                  type="password"
                  label="Anthropic API key"
                  value={anthropicKeyDraft}
                  onChange={(e) => setAnthropicKeyDraft(e.target.value)}
                  placeholder="sk-ant-..."
                  autoComplete="off"
                />
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      props.onSetSessionApiKey("anthropic", anthropicKeyDraft);
                      setAnthropicKeyDraft("");
                    }}
                    disabled={!anthropicKeyDraft.trim()}
                  >
                    Set Anthropic key
                  </Button>
                  <Button variant="secondary" onClick={() => props.onClearSessionApiKey("anthropic")} disabled={!props.hasAnthropicKey}>
                    Clear key
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="text-xs text-zinc-500 dark:text-zinc-400">{keyStatusText}</div>
          </div>

          <Divider />

          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 p-4">
            <div className="inline-flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="w-4 h-4" />
              Security controls
            </div>
            <div className="text-sm text-emerald-700/90 dark:text-emerald-300/90 mt-2 space-y-1">
              <div>{"- Cloud keys are session-only and are not saved to localStorage."}</div>
              <div>{"- Requests go through a local backend proxy with origin checks, rate limiting, and schema validation."}</div>
              <div>{"- Ollama can be used without any cloud key."}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 p-4">
            <div className="font-semibold text-red-700 dark:text-red-300">Danger Zone</div>
            <div className="text-sm text-red-700/90 dark:text-red-300/90 mt-1">Reset wipes all data for this account in this browser.</div>
            <div className="mt-3">
              <Button variant="danger" onClick={props.onDangerReset}>
                <Trash2 className="w-4 h-4" />
                Reset my data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Production next steps" subtitle="If you want real auth + sync across devices." />
        <CardContent className="text-sm text-zinc-600 dark:text-zinc-300 space-y-2">
          <div>{"- Replace localStorage with backend auth + DB (Postgres/MySQL)."}</div>
          <div>{"- Move provider keys to server env or encrypted secret storage."}</div>
          <div>{`- Current AI target: ${PROVIDER_LABEL[props.aiProvider]} / ${props.aiModel}`}</div>
        </CardContent>
      </Card>
    </div>
  );
}
