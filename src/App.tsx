import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Plus, Search, Shield } from "lucide-react";
import {
  type Book,
  type ChapterEntry,
  type HistoryEvent,
  type QA,
  type Theme,
  type UserData,
  type View,
} from "./app/types";
import {
  createEmptyUserData,
  normalizeUserData,
  userDataKey,
} from "./app/data";
import {
  compareChapterEntries,
  downloadText,
  loadJson,
  nowISO,
  saveJson,
  uid,
} from "./app/utils";
import { Button, Card, CardContent } from "./app/ui/primitives";
import { chapterLabel } from "./app/components/common";
import { TopNav, AuthPanel } from "./app/components/nav";
import { BookCard } from "./app/components/library";
import { BookView } from "./app/components/book-view";
import { ChapterView } from "./app/components/chapter-view";
import { AICoachView } from "./app/components/ai-coach";
import { HistoryView } from "./app/components/history";
import { AnalyticsView } from "./app/components/analytics";
import { SettingsView } from "./app/components/settings";
import { BookModal, ConfirmModal, ExportModal, ToastViewport, type ToastMessage, type ToastTone } from "./app/components/modals";
import { useAICoach } from "./app/hooks/use-ai-coach";
import { useAuth } from "./app/hooks/use-auth";
import { useLibraryData } from "./app/hooks/use-library-data";
import { useMarkdownExport } from "./app/hooks/use-markdown-export";
import {
  getAIProviderSettings,
  updateAIProviderSettings,
  type AIProvider,
  type AIProviderSettings,
} from "./app/ai/ollama";

type ConfirmState = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  onConfirm: () => void;
};

function getInitialTheme(): Theme {
  const stored = localStorage.getItem("bo_theme_v1");
  if (stored === "light" || stored === "dark") return stored;
  return "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.classList.toggle("dark", theme === "dark");
  localStorage.setItem("bo_theme_v1", theme);
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());
  const [view, setView] = useState<View>({ name: "library" });
  const [aiProviderSettings, setAIProviderSettings] = useState<AIProviderSettings>(() => getAIProviderSettings());
  const [sessionApiKeys, setSessionApiKeys] = useState<{ openai: string; anthropic: string }>({
    openai: "",
    anthropic: "",
  });

  const activeProviderApiKey =
    aiProviderSettings.provider === "openai"
      ? sessionApiKeys.openai
      : aiProviderSettings.provider === "anthropic"
      ? sessionApiKeys.anthropic
      : undefined;

  const {
    sessionUserId,
    currentUser,
    authMode,
    setAuthMode,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    authErr,
    authBusy,
    handleAuth,
    logout,
  } = useAuth();

  const [data, setData] = useState<UserData>(() => {
    if (!sessionUserId) return createEmptyUserData();
    return normalizeUserData(loadJson<Partial<UserData>>(userDataKey(sessionUserId), createEmptyUserData()));
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!sessionUserId) {
      setData(createEmptyUserData());
      setView({ name: "library" });
      setSessionApiKeys({ openai: "", anthropic: "" });
      return;
    }
    setData(normalizeUserData(loadJson<Partial<UserData>>(userDataKey(sessionUserId), createEmptyUserData())));
    setView({ name: "library" });
  }, [sessionUserId]);

  useEffect(() => {
    if (!sessionUserId) return;
    saveJson(userDataKey(sessionUserId), data);
  }, [data, sessionUserId]);

  function pushHistory(event: Omit<HistoryEvent, "id" | "ts">) {
    const nextEvent: HistoryEvent = { ...event, id: uid("h"), ts: nowISO() };
    setData((prev) => ({ ...prev, history: [nextEvent, ...prev.history].slice(0, 2000) }));
  }

  const {
    booksSorted,
    bookById,
    chaptersByBook,
    qasByChapter,
    search,
    setSearch,
    filteredBooks,
  } = useLibraryData(data);

  const {
    aiBusy,
    aiErr,
    aiSelectedBook,
    aiSelectedChapter,
    aiQuestionsForSelectedChapter,
    aiAnswerMap,
    aiFeedbackHistory,
    selectAIBook,
    selectAIChapter,
    updateAIConfig,
    updateAIDraftAnswer,
    generateAIQuestions,
    gradeAIAnswers,
  } = useAICoach({
    data,
    setData,
    sessionUserId,
    bookById,
    chaptersByBook,
    providerSettings: aiProviderSettings,
    providerApiKey: activeProviderApiKey,
    pushHistory,
  });

  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [bookEditId, setBookEditId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastTimerIdsRef = useRef<Map<string, number>>(new Map());

  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timerId = toastTimerIdsRef.current.get(id);
    if (typeof timerId === "number") {
      window.clearTimeout(timerId);
      toastTimerIdsRef.current.delete(id);
    }
  }

  function notify(tone: ToastTone, message: string) {
    const id = uid("toast");
    setToasts((prev) => [{ id, tone, message }, ...prev].slice(0, 4));
    const timerId = window.setTimeout(() => dismissToast(id), 4200);
    toastTimerIdsRef.current.set(id, timerId);
  }

  useEffect(() => {
    return () => {
      for (const timerId of toastTimerIdsRef.current.values()) {
        window.clearTimeout(timerId);
      }
      toastTimerIdsRef.current.clear();
    };
  }, []);

  function openNewBook() {
    setBookEditId(null);
    setBookModalOpen(true);
  }

  function openEditBook(bookId: string) {
    setBookEditId(bookId);
    setBookModalOpen(true);
  }

  const {
    exportOpen,
    setExportOpen,
    exportName,
    exportText,
    exportErr,
    exportMarkdown,
  } = useMarkdownExport({
    data,
    booksSorted,
    chaptersByBook,
    qasByChapter,
    sessionUserId,
    pushHistory,
  });
  return (
    <div
      className="min-h-screen text-zinc-900"
      style={{
        background:
          theme === "dark"
            ? "linear-gradient(to bottom, #09090b, #09090b)"
            : "linear-gradient(to bottom, #fafafa, #ffffff)",
        color: theme === "dark" ? "#fafafa" : "#09090b",
      }}
    >
      <TopNav
        theme={theme}
        setTheme={setTheme}
        user={currentUser}
        onLogout={logout}
        view={view}
        setView={setView}
      />

      <main className="max-w-6xl mx-auto px-4 md:px-6 pb-10">
        {!currentUser ? (
          <AuthPanel
            mode={authMode}
            setMode={setAuthMode}
            email={authEmail}
            setEmail={setAuthEmail}
            password={authPassword}
            setPassword={setAuthPassword}
            error={authErr}
            busy={authBusy}
            onSubmit={handleAuth}
          />
        ) : (
          <AnimatePresence mode="wait">
            {view.name === "library" ? (
              <motion.div key="library" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="flex flex-col md:flex-row md:items-center gap-3 mt-6">
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 bg-white/70 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                      <Search className="w-4 h-4 text-zinc-500" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by title, author, genre..."
                        className="bg-transparent outline-none text-sm w-60 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500"
                      />
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const result = exportMarkdown();
                        if (!result.ok) {
                          notify("error", result.error ?? "Failed to prepare export.");
                          return;
                        }
                        if (result.downloaded) {
                          notify("success", "Export generated and download started.");
                        } else {
                          notify("info", result.error ?? "Export generated. Use Copy or Download in the modal.");
                        }
                      }}
                      title="Export all books to Markdown"
                    >
                      <Download className="w-4 h-4" />
                      Export
                    </Button>
                  </div>
                  <div className="md:ml-auto">
                    <Button onClick={openNewBook}>
                      <Plus className="w-4 h-4" />
                      Add Book
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                  {filteredBooks.map((b) => (
                    <BookCard
                      key={b.id}
                      book={b}
                      chapterCount={(chaptersByBook.get(b.id) ?? []).length}
                      onOpen={() => setView({ name: "book", bookId: b.id })}
                      onEdit={() => openEditBook(b.id)}
                      onDelete={() => {
                        setConfirmState({
                          title: `Delete "${b.title}"?`,
                          description: "This will remove its chapters and Q&A too.",
                          confirmLabel: "Delete book",
                          tone: "danger",
                          onConfirm: () => {
                            setData((d) => {
                              const chaptersToDelete = d.chapters.filter((c) => c.bookId === b.id).map((c) => c.id);
                              const chaptersToDeleteSet = new Set(chaptersToDelete);
                              return {
                                ...d,
                                books: d.books.filter((x) => x.id !== b.id),
                                chapters: d.chapters.filter((c) => c.bookId !== b.id),
                                qas: d.qas.filter((qa) => !chaptersToDelete.includes(qa.chapterId)),
                                aiCoach: {
                                  ...d.aiCoach,
                                  selectedBookId: d.aiCoach.selectedBookId === b.id ? undefined : d.aiCoach.selectedBookId,
                                  selectedChapterId: chaptersToDeleteSet.has(d.aiCoach.selectedChapterId ?? "")
                                    ? undefined
                                    : d.aiCoach.selectedChapterId,
                                  generatedQuestions: d.aiCoach.generatedQuestions.filter((q) => !chaptersToDeleteSet.has(q.chapterId)),
                                  draftAnswers: d.aiCoach.draftAnswers.filter((a) => !chaptersToDeleteSet.has(a.chapterId)),
                                  feedbackHistory: d.aiCoach.feedbackHistory.filter((entry) => !chaptersToDeleteSet.has(entry.chapterId)),
                                },
                              };
                            });
                            pushHistory({ type: "book_deleted", userId: sessionUserId!, bookId: b.id, label: `Deleted book: ${b.title}` });
                            notify("success", `Deleted "${b.title}".`);
                          },
                        });
                      }}
                    />
                  ))}
                </div>

                {filteredBooks.length === 0 ? (
                  <Card className="mt-6">
                    <CardContent>
                      <div className="text-sm text-zinc-600 dark:text-zinc-300">No books yet. Add one to start your reading journal.</div>
                    </CardContent>
                  </Card>
                ) : null}
              </motion.div>
            ) : null}

            {view.name === "book" ? (
              <motion.div key="book" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <BookView
                  book={bookById.get(view.bookId) ?? null}
                  chapters={chaptersByBook.get(view.bookId) ?? []}
                  qasByChapter={qasByChapter}
                  onBack={() => setView({ name: "library" })}
                  onEditBook={() => openEditBook(view.bookId)}
                  onExport={() => {
                    const result = exportMarkdown({ bookId: view.bookId });
                    if (!result.ok) {
                      notify("error", result.error ?? "Failed to prepare export.");
                      return;
                    }
                    if (result.downloaded) {
                      notify("success", "Book export generated and download started.");
                    } else {
                      notify("info", result.error ?? "Book export generated. Use Copy or Download in the modal.");
                    }
                  }}
                  onOpenChapter={(chapterId) => setView({ name: "chapter", bookId: view.bookId, chapterId })}
                  onCreateChapter={() => {
                    const id = uid("ch");
                    const newCh: ChapterEntry = {
                      id,
                      bookId: view.bookId,
                      number: undefined,
                      title: "",
                      completedAt: undefined,
                      summary: "",
                      takeaways: "",
                      quotes: "",
                      reflection: "",
                      createdAt: nowISO(),
                      updatedAt: nowISO(),
                    };
                    setData((d) => ({ ...d, chapters: [newCh, ...d.chapters] }));
                    pushHistory({ type: "chapter_created", userId: sessionUserId!, bookId: view.bookId, chapterId: id, label: `Created new chapter entry` });
                    notify("success", "Created a new chapter entry.");
                    setView({ name: "chapter", bookId: view.bookId, chapterId: id });
                  }}
                  onDeleteChapter={(chapterId) => {
                    const ch = data.chapters.find((x) => x.id === chapterId);
                    const label = ch ? chapterLabel(ch) : "this chapter";
                    setConfirmState({
                      title: `Delete ${label}?`,
                      description: "This will remove its Q&A too.",
                      confirmLabel: "Delete chapter",
                      tone: "danger",
                      onConfirm: () => {
                        setData((d) => {
                          const nextChapters = d.chapters.filter((x) => x.id !== chapterId);
                          const nextSelectedChapterId =
                            d.aiCoach.selectedChapterId === chapterId
                              ? d.aiCoach.selectedBookId
                                ? nextChapters.filter((entry) => entry.bookId === d.aiCoach.selectedBookId).sort(compareChapterEntries)[0]?.id
                                : undefined
                              : d.aiCoach.selectedChapterId;
                          return {
                            ...d,
                            chapters: nextChapters,
                            qas: d.qas.filter((qa) => qa.chapterId !== chapterId),
                            aiCoach: {
                              ...d.aiCoach,
                              selectedChapterId: nextSelectedChapterId,
                              generatedQuestions: d.aiCoach.generatedQuestions.filter((q) => q.chapterId !== chapterId),
                              draftAnswers: d.aiCoach.draftAnswers.filter((a) => a.chapterId !== chapterId),
                              feedbackHistory: d.aiCoach.feedbackHistory.filter((entry) => entry.chapterId !== chapterId),
                            },
                          };
                        });
                        pushHistory({ type: "chapter_deleted", userId: sessionUserId!, bookId: view.bookId, chapterId, label: `Deleted chapter: ${label}` });
                        notify("success", `Deleted ${label}.`);
                      },
                    });
                  }}
                />
              </motion.div>
            ) : null}

            {view.name === "chapter" ? (
              <motion.div key="chapter" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <ChapterView
                  book={bookById.get(view.bookId) ?? null}
                  chapter={data.chapters.find((c) => c.id === view.chapterId) ?? null}
                  qas={qasByChapter.get(view.chapterId) ?? []}
                  onBack={() => setView({ name: "book", bookId: view.bookId })}
                  onSaveChapter={(patch) => {
                    const ts = nowISO();
                    setData((d) => ({
                      ...d,
                      chapters: d.chapters.map((c) => (c.id === view.chapterId ? { ...c, ...patch, updatedAt: ts } : c)),
                      books: d.books.map((b) => (b.id === view.bookId ? { ...b, updatedAt: ts } : b)),
                    }));
                    pushHistory({
                      type: "chapter_updated",
                      userId: sessionUserId!,
                      bookId: view.bookId,
                      chapterId: view.chapterId,
                      label: `Updated chapter entry`,
                    });
                    notify("success", "Saved chapter entry.");
                  }}
                  onCreateQA={() => {
                    const id = uid("qa");
                    const ts = nowISO();
                    const newQA: QA = {
                      id,
                      chapterId: view.chapterId,
                      question: "",
                      answer: "",
                      createdAt: ts,
                      updatedAt: ts,
                    };
                    setData((d) => ({
                      ...d,
                      qas: [newQA, ...d.qas],
                      books: d.books.map((b) => (b.id === view.bookId ? { ...b, updatedAt: ts } : b)),
                    }));
                    pushHistory({
                      type: "qa_created",
                      userId: sessionUserId!,
                      bookId: view.bookId,
                      chapterId: view.chapterId,
                      qaId: id,
                      label: `Created question`,
                    });
                    notify("success", "Added a question.");
                  }}
                  onSaveQA={(qaId, patch) => {
                    const ts = nowISO();
                    setData((d) => ({
                      ...d,
                      qas: d.qas.map((qa) => (qa.id === qaId ? { ...qa, ...patch, updatedAt: ts } : qa)),
                      books: d.books.map((b) => (b.id === view.bookId ? { ...b, updatedAt: ts } : b)),
                    }));
                    pushHistory({
                      type: "qa_updated",
                      userId: sessionUserId!,
                      bookId: view.bookId,
                      chapterId: view.chapterId,
                      qaId,
                      label: `Updated Q&A`,
                    });
                    notify("success", "Saved Q&A.");
                  }}
                  onDeleteQA={(qaId) => {
                    setConfirmState({
                      title: "Delete this question?",
                      description: "This action cannot be undone.",
                      confirmLabel: "Delete question",
                      tone: "danger",
                      onConfirm: () => {
                        const ts = nowISO();

                        setData((d) => {
                          const before = d.qas.length;
                          const nextQas = d.qas.filter((qa) => qa.id !== qaId);
                          if (nextQas.length === before) return d;
                          return {
                            ...d,
                            qas: nextQas,
                            books: d.books.map((b) => (b.id === view.bookId ? { ...b, updatedAt: ts } : b)),
                          };
                        });

                        pushHistory({
                          type: "qa_deleted",
                          userId: sessionUserId!,
                          bookId: view.bookId,
                          chapterId: view.chapterId,
                          qaId,
                          label: `Deleted question`,
                        });
                        notify("success", "Deleted question.");
                      },
                    });
                  }}
                />
              </motion.div>
            ) : null}

            {view.name === "ai" ? (
              <motion.div key="ai" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <AICoachView
                  books={booksSorted}
                  chaptersByBook={chaptersByBook}
                  selectedBookId={aiSelectedBook?.id}
                  selectedChapterId={aiSelectedChapter?.id}
                  config={data.aiCoach.lastConfig}
                  questions={aiQuestionsForSelectedChapter}
                  answers={aiAnswerMap}
                  feedbackHistory={aiFeedbackHistory}
                  busy={aiBusy}
                  error={aiErr}
                  aiProvider={aiProviderSettings.provider}
                  aiModel={aiProviderSettings.model}
                  ollamaBaseUrl={aiProviderSettings.ollamaBaseUrl}
                  onSelectBook={selectAIBook}
                  onSelectChapter={selectAIChapter}
                  onConfigChange={updateAIConfig}
                  onGenerate={generateAIQuestions}
                  onGrade={gradeAIAnswers}
                  onAnswerChange={updateAIDraftAnswer}
                  onOpenBook={(bookId) => setView({ name: "book", bookId })}
                />
              </motion.div>
            ) : null}

            {view.name === "analytics" ? (
              <motion.div key="analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <AnalyticsView
                  books={data.books}
                  chapters={data.chapters}
                  qas={data.qas}
                  history={data.history}
                  onOpenBook={(bookId) => setView({ name: "book", bookId })}
                />
              </motion.div>
            ) : null}

            {view.name === "history" ? (
              <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <HistoryView
                  history={data.history}
                  books={bookById}
                  chapters={data.chapters}
                  onOpenBook={(bookId) => setView({ name: "book", bookId })}
                />
              </motion.div>
            ) : null}

            {view.name === "settings" ? (
              <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <SettingsView
                  user={currentUser}
                  data={data}
                  aiProvider={aiProviderSettings.provider}
                  aiModel={aiProviderSettings.model}
                  ollamaBaseUrl={aiProviderSettings.ollamaBaseUrl}
                  hasOpenAIKey={sessionApiKeys.openai.trim().length > 0}
                  hasAnthropicKey={sessionApiKeys.anthropic.trim().length > 0}
                  onSaveAISettings={(settings) => {
                    const next = updateAIProviderSettings(settings);
                    setAIProviderSettings(next);
                    notify("success", `Saved AI settings: ${next.provider} / ${next.model}`);
                  }}
                  onSetSessionApiKey={(provider: Exclude<AIProvider, "ollama">, apiKey: string) => {
                    setSessionApiKeys((prev) => ({
                      ...prev,
                      [provider]: apiKey.trim(),
                    }));
                    notify("success", `Saved ${provider} key for this session only.`);
                  }}
                  onClearSessionApiKey={(provider: Exclude<AIProvider, "ollama">) => {
                    setSessionApiKeys((prev) => ({
                      ...prev,
                      [provider]: "",
                    }));
                    notify("info", `Cleared ${provider} session key.`);
                  }}
                  onDangerReset={() => {
                    setConfirmState({
                      title: "Reset all account data?",
                      description: "This will delete ALL your books, chapters, Q&A, and history for this account.",
                      confirmLabel: "Reset data",
                      tone: "danger",
                      onConfirm: () => {
                        const resetData = createEmptyUserData();
                        saveJson(userDataKey(currentUser.id), resetData);
                        setData(resetData);
                        notify("success", "Account data reset.");
                      },
                    });
                  }}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        )}
      </main>

      <BookModal
        open={bookModalOpen}
        onClose={() => setBookModalOpen(false)}
        book={bookEditId ? data.books.find((b) => b.id === bookEditId) ?? null : null}
        onSave={(payload) => {
          if (!sessionUserId) {
            notify("error", "Sign in first to save books.");
            return;
          }
          const nextTitle = payload.title.trim();
          const nextAuthor = payload.author.trim();
          if (!nextTitle || !nextAuthor) {
            notify("error", "Title and author are required.");
            return;
          }

          if (bookEditId) {
            setData((d) => ({
              ...d,
              books: d.books.map((b) =>
                b.id === bookEditId
                  ? {
                      ...b,
                      ...payload,
                      title: nextTitle,
                      author: nextAuthor,
                      genre: payload.genre?.trim() || undefined,
                      updatedAt: nowISO(),
                    }
                  : b
              ),
            }));
            pushHistory({ type: "book_updated", userId: sessionUserId, bookId: bookEditId, label: `Updated book: ${nextTitle}` });
            notify("success", `Updated "${nextTitle}".`);
          } else {
            const id = uid("b");
            const book: Book = {
              id,
              title: nextTitle,
              author: nextAuthor,
              genre: payload.genre?.trim() || undefined,
              coverDataUrl: payload.coverDataUrl || undefined,
              status: payload.status,
              startedAt: payload.startedAt || undefined,
              finishedAt: payload.finishedAt || undefined,
              createdAt: nowISO(),
              updatedAt: nowISO(),
            };
            setData((d) => ({ ...d, books: [book, ...d.books] }));
            pushHistory({ type: "book_created", userId: sessionUserId, bookId: id, label: `Added book: ${book.title}` });
            notify("success", `Added "${book.title}".`);
          }

          setBookModalOpen(false);
          setBookEditId(null);
        }}
      />

      <ExportModal
        open={exportOpen}
        filename={exportName}
        content={exportText}
        error={exportErr}
        onClose={() => setExportOpen(false)}
        onDownload={() => {
          try {
            downloadText(exportName, exportText);
            notify("success", `Downloaded ${exportName}.`);
          } catch {
            notify("error", "Download failed. Use Copy to export manually.");
          }
        }}
        onNotify={notify}
      />

      <ConfirmModal
        open={!!confirmState}
        title={confirmState?.title ?? ""}
        description={confirmState?.description}
        confirmLabel={confirmState?.confirmLabel}
        cancelLabel={confirmState?.cancelLabel}
        tone={confirmState?.tone}
        onClose={() => setConfirmState(null)}
        onConfirm={() => {
          if (!confirmState) return;
          const action = confirmState.onConfirm;
          setConfirmState(null);
          try {
            action();
          } catch {
            notify("error", "Action failed. Please try again.");
          }
        }}
      />

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />

      <footer className="max-w-6xl mx-auto px-4 md:px-6 pb-10 pt-4">
        <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
          <Shield className="w-3.5 h-3.5" />
          Client-only demo: your data is stored locally in this browser (localStorage). For production, connect a backend + database.
        </div>
      </footer>
    </div>
  );
}
