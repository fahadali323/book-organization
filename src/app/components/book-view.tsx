import { Calendar, ChevronLeft, ChevronRight, Download, Edit3, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";
import type { Book, ChapterEntry, QA } from "../types";
import { formatDate, formatDay } from "../utils";
import { Button, Card, CardContent, CardHeader, Chip } from "../ui/primitives";
import { chapterLabel, InfoStat, statusChip } from "./common";

export function BookView(props: {
  book: Book | null;
  chapters: ChapterEntry[];
  qasByChapter: Map<string, QA[]>;
  onBack: () => void;
  onEditBook: () => void;
  onExport: () => void;
  onOpenChapter: (chapterId: string) => void;
  onCreateChapter: () => void;
  onDeleteChapter: (chapterId: string) => void;
}) {
  if (!props.book) {
    return (
      <div className="mt-6">
        <Button variant="secondary" onClick={props.onBack}>
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>
        <Card className="mt-4">
          <CardContent>Book not found.</CardContent>
        </Card>
      </div>
    );
  }

  const b = props.book;

  const progress = useMemo(() => {
    const total = props.chapters.length;
    const completed = props.chapters.filter((c) => !!c.completedAt).length;
    return { total, completed };
  }, [props.chapters]);

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={props.onBack}>
          <ChevronLeft className="w-4 h-4" />
          Library
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="secondary" onClick={props.onExport} title="Export this book to Markdown">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button variant="secondary" onClick={props.onEditBook}>
            <Edit3 className="w-4 h-4" />
            Edit
          </Button>
          <Button onClick={props.onCreateChapter}>
            <Plus className="w-4 h-4" />
            Add Chapter Entry
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader
          title={b.title}
          subtitle={
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm">by {b.author}</span>
              {b.genre ? <Chip>{b.genre}</Chip> : null}
              {statusChip(b.status)}
              <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                <Calendar className="w-4 h-4" />
                Updated {formatDate(b.updatedAt)}
              </span>
            </div>
          }
          right={<div className="text-sm text-zinc-600 dark:text-zinc-300">{progress.completed}/{progress.total} chapters completed</div>}
        />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <InfoStat label="Started" value={formatDay(b.startedAt)} />
            <InfoStat label="Finished" value={formatDay(b.finishedAt)} />
            <InfoStat label="Status" value={b.status.replaceAll("_", " ")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Chapters" subtitle="Create one entry per chapter (or section). Write summaries, takeaways, quotes, reflection, and Q&A." />
        <CardContent>
          {props.chapters.length === 0 ? (
            <div className="text-sm text-zinc-600 dark:text-zinc-300">
              No chapters yet. Click <span className="font-medium">Add Chapter Entry</span> to start.
            </div>
          ) : (
            <div className="space-y-3">
              {props.chapters.map((ch) => {
                const qas = props.qasByChapter.get(ch.id) ?? [];
                return (
                  <div key={ch.id} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 md:p-4">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold truncate">{chapterLabel(ch)}</div>
                          {ch.completedAt ? <Chip tone="ok">Completed</Chip> : <Chip>In progress</Chip>}
                        </div>
                        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Updated {formatDate(ch.updatedAt)} • Q&A: {qas.length}</div>
                        <div className="mt-3 line-clamp-2 text-sm text-zinc-700 dark:text-zinc-200">{ch.summary.trim() ? ch.summary.trim() : "(No summary yet)"}</div>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <Button variant="secondary" onClick={() => props.onOpenChapter(ch.id)}>
                          Open
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                        <Button variant="danger" onClick={() => props.onDeleteChapter(ch.id)} title="Delete chapter">
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
