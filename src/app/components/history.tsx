import { BookOpen, Check, ChevronRight, Download, Edit3, HelpCircle, History, Plus, Trash2 } from "lucide-react";
import type { Book, ChapterEntry, HistoryEvent, HistoryEventType } from "../types";
import { formatDate } from "../utils";
import { Card, CardContent, CardHeader } from "../ui/primitives";

export function iconForHistory(type: HistoryEventType) {
  const cls = "w-5 h-5 text-zinc-500";
  switch (type) {
    case "book_created":
      return <Plus className={cls} />;
    case "book_updated":
      return <Edit3 className={cls} />;
    case "book_deleted":
      return <Trash2 className={cls} />;
    case "chapter_created":
      return <Plus className={cls} />;
    case "chapter_updated":
      return <Edit3 className={cls} />;
    case "chapter_deleted":
      return <Trash2 className={cls} />;
    case "qa_created":
      return <HelpCircle className={cls} />;
    case "qa_updated":
      return <Edit3 className={cls} />;
    case "qa_deleted":
      return <Trash2 className={cls} />;
    case "ai_questions_generated":
      return <HelpCircle className={cls} />;
    case "ai_answers_graded":
      return <Check className={cls} />;
    case "export":
      return <Download className={cls} />;
    default:
      return <History className={cls} />;
  }
}

export function HistoryView(props: {
  history: HistoryEvent[];
  books: Map<string, Book>;
  chapters: ChapterEntry[];
  onOpenBook: (bookId: string) => void;
}) {
  return (
    <div className="mt-6">
      <Card>
        <CardHeader
          title={
            <span className="inline-flex items-center gap-2">
              <History className="w-5 h-5" />
              History
            </span>
          }
          subtitle="A timeline of edits and activity (stored locally)."
        />
        <CardContent>
          {props.history.length === 0 ? (
            <div className="text-sm text-zinc-600 dark:text-zinc-300">No history yet.</div>
          ) : (
            <div className="space-y-2">
              {props.history.slice(0, 200).map((h) => {
                const book = h.bookId ? props.books.get(h.bookId) : null;
                return (
                  <div key={h.id} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 md:p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{iconForHistory(h.type)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{h.label}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{formatDate(h.ts)}</div>
                        {book ? (
                          <button
                            onClick={() => props.onOpenBook(book.id)}
                            className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:underline"
                          >
                            <BookOpen className="w-4 h-4" />
                            {book.title}
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
