import { HelpCircle } from "lucide-react";
import { useMemo } from "react";
import type { AIProvider } from "../ai/ollama";
import type { AICoachConfig, AIDifficulty, AIFeedbackEntry, AIGeneratedQuestion, AIQuestionStyle, Book, ChapterEntry } from "../types";
import { formatDate } from "../utils";
import { Button, Card, CardContent, CardHeader, Chip, Input, TextArea } from "../ui/primitives";
import { chapterLabel } from "./common";

export function AICoachView(props: {
  books: Book[];
  chaptersByBook: Map<string, ChapterEntry[]>;
  selectedBookId?: string;
  selectedChapterId?: string;
  config: AICoachConfig;
  questions: AIGeneratedQuestion[];
  answers: Map<string, string>;
  feedbackHistory: AIFeedbackEntry[];
  busy: "generate" | "grade" | null;
  error: string | null;
  aiProvider: AIProvider;
  aiModel: string;
  ollamaBaseUrl: string;
  onSelectBook: (bookId: string) => void;
  onSelectChapter: (chapterId: string) => void;
  onConfigChange: (patch: Partial<AICoachConfig>) => void;
  onGenerate: () => void;
  onGrade: () => void;
  onAnswerChange: (questionId: string, answer: string) => void;
  onOpenBook: (bookId: string) => void;
}) {
  const selectedBook = props.selectedBookId ? props.books.find((book) => book.id === props.selectedBookId) ?? null : null;
  const chapterOptions = selectedBook ? props.chaptersByBook.get(selectedBook.id) ?? [] : [];
  const selectedChapter =
    props.selectedChapterId && chapterOptions.some((chapter) => chapter.id === props.selectedChapterId)
      ? chapterOptions.find((chapter) => chapter.id === props.selectedChapterId) ?? null
      : chapterOptions[0] ?? null;

  const answeredCount = useMemo(
    () => props.questions.filter((question) => (props.answers.get(question.id) ?? "").trim().length > 0).length,
    [props.answers, props.questions]
  );
  const providerLabel =
    props.aiProvider === "openai" ? "OpenAI" : props.aiProvider === "anthropic" ? "Anthropic (Claude)" : "Ollama";
  const subtitle =
    props.aiProvider === "ollama"
      ? `Provider: ${providerLabel} (${props.aiModel}) via ${props.ollamaBaseUrl}`
      : `Provider: ${providerLabel} (${props.aiModel}) via secure backend proxy`;

  return (
    <div className="mt-6 space-y-4">
      <Card>
        <CardHeader
          title={
            <span className="inline-flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              AI Coach
            </span>
          }
          subtitle={subtitle}
          right={
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={props.onGenerate} disabled={props.busy !== null || !selectedChapter}>
                {props.busy === "generate" ? "Generating..." : "Generate questions"}
              </Button>
              <Button onClick={props.onGrade} disabled={props.busy !== null || props.questions.length === 0}>
                {props.busy === "grade" ? "Grading..." : "Grade answers"}
              </Button>
            </div>
          }
        />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-1">Book</div>
              <select
                value={selectedBook?.id ?? ""}
                onChange={(e) => props.onSelectBook(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm outline-none"
              >
                <option value="">Select a book</option>
                {props.books.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-1">Chapter</div>
              <select
                value={selectedChapter?.id ?? ""}
                onChange={(e) => props.onSelectChapter(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm outline-none disabled:opacity-50"
                disabled={!selectedBook || chapterOptions.length === 0}
              >
                <option value="">Select a chapter</option>
                {chapterOptions.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapterLabel(chapter)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              label="Question count"
              type="number"
              min={1}
              max={15}
              value={String(props.config.count)}
              onChange={(e) => props.onConfigChange({ count: Number(e.target.value) })}
            />

            <label className="block">
              <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-1">Difficulty</div>
              <select
                value={props.config.difficulty}
                onChange={(e) => props.onConfigChange({ difficulty: e.target.value as AIDifficulty })}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm outline-none"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="mixed">Mixed</option>
              </select>
            </label>

            <label className="block">
              <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-1">Question style</div>
              <select
                value={props.config.style}
                onChange={(e) => props.onConfigChange({ style: e.target.value as AIQuestionStyle })}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm outline-none"
              >
                <option value="comprehension">Comprehension</option>
                <option value="critical_thinking">Critical thinking</option>
                <option value="mixed">Mixed</option>
              </select>
            </label>
          </div>

          {props.error ? <div className="text-sm text-red-600 dark:text-red-300">{props.error}</div> : null}

          {props.books.length === 0 ? <div className="text-sm text-zinc-600 dark:text-zinc-300">Add a book and chapter first, then come back to AI Coach.</div> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title={`AI Questions (${props.questions.length})`}
          subtitle={props.questions.length > 0 ? `${answeredCount}/${props.questions.length} answered` : "Generate questions to start."}
          right={
            props.questions.length > 0 ? (
              <Button onClick={props.onGrade} disabled={props.busy !== null}>
                {props.busy === "grade" ? "Grading..." : "Grade now"}
              </Button>
            ) : null
          }
        />
        <CardContent>
          {props.questions.length === 0 ? (
            <div className="text-sm text-zinc-600 dark:text-zinc-300">No generated questions yet.</div>
          ) : (
            <div className="space-y-3">
              {props.questions.map((question, idx) => (
                <div key={question.id} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 md:p-4">
                  <div className="text-sm font-semibold">
                    Q{idx + 1}. {question.question}
                  </div>
                  {question.rubric.trim() ? <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Rubric: {question.rubric}</div> : null}
                  <TextArea
                    label="Your answer"
                    value={props.answers.get(question.id) ?? ""}
                    onChange={(e) => props.onAnswerChange(question.id, e.target.value)}
                    placeholder="Answer in complete sentences."
                    className="mt-3"
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Feedback history" subtitle="Latest grading runs for this chapter." />
        <CardContent>
          {props.feedbackHistory.length === 0 ? (
            <div className="text-sm text-zinc-600 dark:text-zinc-300">No feedback yet. Grade your answers to create history.</div>
          ) : (
            <div className="space-y-3">
              {props.feedbackHistory.slice(0, 12).map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 md:p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip tone={entry.averageScore >= 70 ? "ok" : "warn"}>Avg score: {entry.averageScore}</Chip>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{formatDate(entry.createdAt)}</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {entry.difficulty} • {entry.style.replace("_", " ")}
                    </span>
                    <button onClick={() => props.onOpenBook(entry.bookId)} className="ml-auto text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:underline">
                      Open book
                    </button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {entry.results.map((result) => (
                      <div key={`${entry.id}_${result.questionId}`} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-2.5">
                        <div className="text-sm font-medium">{result.question}</div>
                        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Score: {result.score}</div>
                        {result.feedback.trim() ? <div className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">{result.feedback}</div> : null}
                        {result.idealAnswer.trim() ? <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Ideal answer: {result.idealAnswer}</div> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
