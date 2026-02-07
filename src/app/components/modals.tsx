import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, CheckCircle2, Download, Info, Quote, Upload, X, XCircle } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Book, BookDraft } from "../types";
import { Button, Card, CardContent, CardHeader, Input } from "../ui/primitives";

export function BookModal(props: {
  open: boolean;
  onClose: () => void;
  book: Book | null;
  onSave: (payload: BookDraft) => void;
}) {
  const [draft, setDraft] = useState<BookDraft>({
    title: "",
    author: "",
    genre: "",
    coverDataUrl: undefined,
    status: "in_progress",
    startedAt: undefined,
    finishedAt: undefined,
  });

  useEffect(() => {
    if (!props.open) return;
    if (props.book) {
      setDraft({
        title: props.book.title,
        author: props.book.author,
        genre: props.book.genre ?? "",
        coverDataUrl: props.book.coverDataUrl,
        status: props.book.status,
        startedAt: props.book.startedAt,
        finishedAt: props.book.finishedAt,
      });
    } else {
      setDraft({ title: "", author: "", genre: "", coverDataUrl: undefined, status: "in_progress", startedAt: undefined, finishedAt: undefined });
    }
  }, [props.open, props.book?.id]);

  const fileRef = useRef<HTMLInputElement | null>(null);

  async function handleFile(file: File) {
    const reader = new FileReader();
    const dataUrl: string = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
    setDraft((d) => ({ ...d, coverDataUrl: dataUrl }));
  }

  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full max-w-2xl">
        <Card className="overflow-hidden">
          <CardHeader
            title={props.book ? "Edit book" : "Add a book"}
            subtitle="Track the book, then write chapter summaries + comprehension Q&A."
            right={
              <Button variant="ghost" onClick={props.onClose}>
                <X className="w-4 h-4" />
                Close
              </Button>
            }
          />
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Title" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} placeholder="Book title" />
              <Input label="Author" value={draft.author} onChange={(e) => setDraft((d) => ({ ...d, author: e.target.value }))} placeholder="Author name" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input label="Genre" value={draft.genre ?? ""} onChange={(e) => setDraft((d) => ({ ...d, genre: e.target.value }))} placeholder="Optional" />

              <label className="block">
                <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-1">Status</div>
                <select
                  value={draft.status}
                  onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as BookDraft["status"] }))}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm outline-none"
                >
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                  <option value="abandoned">Abandoned</option>
                </select>
              </label>

              <div className="flex items-end gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFile(f);
                  }}
                />
                <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                  <Upload className="w-4 h-4" />
                  Cover
                </Button>
                {draft.coverDataUrl ? (
                  <Button variant="ghost" onClick={() => setDraft((d) => ({ ...d, coverDataUrl: undefined }))}>
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>

            {draft.coverDataUrl ? (
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 flex items-center gap-3">
                <img src={draft.coverDataUrl} alt="cover" className="w-16 h-20 rounded-xl object-cover border border-zinc-200 dark:border-zinc-800" />
                <div className="text-sm text-zinc-600 dark:text-zinc-300">Cover preview</div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Start date"
                type="date"
                value={draft.startedAt ? draft.startedAt.slice(0, 10) : ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, startedAt: e.target.value ? new Date(e.target.value + "T00:00:00").toISOString() : undefined }))
                }
              />
              <Input
                label="Finish date"
                type="date"
                value={draft.finishedAt ? draft.finishedAt.slice(0, 10) : ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, finishedAt: e.target.value ? new Date(e.target.value + "T00:00:00").toISOString() : undefined }))
                }
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() =>
                  props.onSave({
                    title: draft.title,
                    author: draft.author,
                    genre: draft.genre,
                    coverDataUrl: draft.coverDataUrl,
                    status: draft.status,
                    startedAt: draft.startedAt,
                    finishedAt: draft.finishedAt,
                  })
                }
                disabled={!draft.title.trim() || !draft.author.trim()}
                className="flex-1"
              >
                <Check className="w-4 h-4" />
                Save
              </Button>
              <Button variant="secondary" onClick={props.onClose}>
                Cancel
              </Button>
            </div>

            <div className="text-xs text-zinc-500 dark:text-zinc-400">Tip: After saving, open the book, then add a chapter entry, then write summary + Q&A.</div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export function ExportModal(props: {
  open: boolean;
  filename: string;
  content: string;
  error: string | null;
  onClose: () => void;
  onDownload: () => void;
  onNotify?: (tone: ToastTone, message: string) => void;
}) {
  const textRef = useRef<HTMLTextAreaElement | null>(null);

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(props.content);
        props.onNotify?.("success", "Copied export text to clipboard.");
        return;
      }
    } catch {
      // fall back below
    }
    const el = textRef.current;
    if (!el) return;
    el.focus();
    el.select();
    try {
      document.execCommand("copy");
      props.onNotify?.("success", "Copied export text to clipboard.");
    } catch {
      props.onNotify?.("error", "Could not copy text. Select it manually and copy.");
    }
  }

  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full max-w-3xl">
        <Card className="overflow-hidden">
          <CardHeader
            title="Export"
            subtitle={
              <span className="text-sm text-zinc-600 dark:text-zinc-300">
                File: <span className="font-medium">{props.filename}</span>
              </span>
            }
            right={
              <Button variant="ghost" onClick={props.onClose}>
                <X className="w-4 h-4" />
                Close
              </Button>
            }
          />
          <CardContent className="space-y-3">
            {props.error ? <div className="text-sm text-amber-700 dark:text-amber-200">{props.error}</div> : null}

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={copy}>
                <Quote className="w-4 h-4" />
                Copy
              </Button>
              <Button onClick={props.onDownload}>
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>

            <textarea
              ref={textRef}
              readOnly
              value={props.content}
              className="w-full min-h-[420px] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none"
            />

            <div className="text-xs text-zinc-500 dark:text-zinc-400">If your browser blocks automatic downloads in the preview, use Copy or the Download button here.</div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export function ConfirmModal(props: {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full max-w-lg">
        <Card className="overflow-hidden">
          <CardHeader
            title={
              <span className="inline-flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-300" />
                {props.title}
              </span>
            }
            right={
              <Button variant="ghost" onClick={props.onClose}>
                <X className="w-4 h-4" />
                Close
              </Button>
            }
          />
          <CardContent className="space-y-4">
            {props.description ? <div className="text-sm text-zinc-700 dark:text-zinc-300">{props.description}</div> : null}
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={props.onClose}>
                {props.cancelLabel ?? "Cancel"}
              </Button>
              <Button variant={props.tone === "danger" ? "danger" : "primary"} onClick={props.onConfirm}>
                {props.confirmLabel ?? "Confirm"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export type ToastTone = "success" | "error" | "info";

export type ToastMessage = {
  id: string;
  tone: ToastTone;
  message: string;
};

export function ToastViewport(props: { toasts: ToastMessage[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed right-4 top-4 z-[60] flex w-[min(92vw,420px)] flex-col gap-2 pointer-events-none">
      <AnimatePresence initial={false}>
        {props.toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            className="pointer-events-auto"
          >
            <ToastCard toast={toast} onDismiss={props.onDismiss} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastCard(props: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  const tone = props.toast.tone;
  const icon =
    tone === "success" ? (
      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
    ) : tone === "error" ? (
      <XCircle className="w-4 h-4 text-red-600 dark:text-red-300" />
    ) : (
      <Info className="w-4 h-4 text-blue-600 dark:text-blue-300" />
    );

  const bodyClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30"
      : tone === "error"
        ? "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30"
        : "border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/30";

  return (
    <div className={`rounded-xl border p-3 shadow-sm ${bodyClass}`}>
      <div className="flex items-start gap-2">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div className="text-sm text-zinc-900 dark:text-zinc-100 min-w-0 flex-1">{props.toast.message}</div>
        <button
          type="button"
          className="shrink-0 rounded-md p-1 text-zinc-500 hover:bg-black/5 dark:hover:bg-white/10"
          onClick={() => props.onDismiss(props.toast.id)}
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
