import { BarChart3, Clock3, MessageSquare, PieChart, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import type { Book, BookStatus, ChapterEntry, HistoryEvent, QA } from "../types";
import { completedBookDate, recentMonths, toMonthKey, toTimestamp } from "../utils";
import { Card, CardContent, CardHeader, Chip, Divider } from "../ui/primitives";
import { InfoStat } from "./common";

type AnalyticsMonthlyPoint = {
  key: string;
  label: string;
  booksCompleted: number;
  chaptersCompleted: number;
  qaCreated: number;
  qaUpdated: number;
  qaDeleted: number;
};

type RankedItem = { label: string; count: number };

export function AnalyticsView(props: {
  books: Book[];
  chapters: ChapterEntry[];
  qas: QA[];
  history: HistoryEvent[];
  onOpenBook: (bookId: string) => void;
}) {
  const metrics = useMemo(() => {
    const monthBuckets = recentMonths(6);
    const monthMap = new Map<string, AnalyticsMonthlyPoint>();
    for (const m of monthBuckets) {
      monthMap.set(m.key, {
        key: m.key,
        label: m.label,
        booksCompleted: 0,
        chaptersCompleted: 0,
        qaCreated: 0,
        qaUpdated: 0,
        qaDeleted: 0,
      });
    }

    const chapterTimesByBook = new Map<string, { completed: number[]; created: number[] }>();
    for (const ch of props.chapters) {
      const existing = chapterTimesByBook.get(ch.bookId) ?? { completed: [], created: [] };
      const completedTs = toTimestamp(ch.completedAt);
      if (completedTs !== null) existing.completed.push(completedTs);
      const createdTs = toTimestamp(ch.createdAt);
      if (createdTs !== null) existing.created.push(createdTs);
      chapterTimesByBook.set(ch.bookId, existing);

      const completionMonth = toMonthKey(ch.completedAt);
      if (completionMonth) {
        const bucket = monthMap.get(completionMonth);
        if (bucket) bucket.chaptersCompleted += 1;
      }
    }

    for (const b of props.books) {
      if (b.status !== "completed") continue;
      const completionMonth = toMonthKey(b.finishedAt ?? b.updatedAt);
      if (!completionMonth) continue;
      const bucket = monthMap.get(completionMonth);
      if (bucket) bucket.booksCompleted += 1;
    }

    for (const h of props.history) {
      const month = toMonthKey(h.ts);
      if (!month) continue;
      const bucket = monthMap.get(month);
      if (!bucket) continue;
      if (h.type === "qa_created") bucket.qaCreated += 1;
      if (h.type === "qa_updated") bucket.qaUpdated += 1;
      if (h.type === "qa_deleted") bucket.qaDeleted += 1;
    }

    const nowTs = Date.now();
    const readingTime = props.books
      .map((book) => {
        const chapterTimes = chapterTimesByBook.get(book.id) ?? { completed: [], created: [] };
        const startCandidates: number[] = [];
        const startedTs = toTimestamp(book.startedAt);
        if (startedTs !== null) startCandidates.push(startedTs);
        startCandidates.push(...chapterTimes.completed, ...chapterTimes.created);
        if (startCandidates.length === 0) return null;

        const startTs = Math.min(...startCandidates);
        const finishedTs = toTimestamp(book.finishedAt);
        let endTs: number = nowTs;
        if (book.status !== "in_progress") {
          if (finishedTs !== null) endTs = finishedTs;
          else if (chapterTimes.completed.length > 0) endTs = Math.max(...chapterTimes.completed);
          else endTs = toTimestamp(book.updatedAt) ?? nowTs;
        }
        if (endTs < startTs) endTs = startTs;

        const days = Math.max(1, Math.ceil((endTs - startTs) / 86400000));
        return { bookId: book.id, title: book.title, status: book.status, days };
      })
      .filter((row): row is { bookId: string; title: string; status: BookStatus; days: number } => row !== null)
      .sort((a, b) => b.days - a.days)
      .slice(0, 8);

    function rankBooks(by: (book: Book) => string): RankedItem[] {
      const countByLabel = new Map<string, number>();
      for (const b of props.books) {
        const label = by(b).trim() || "Uncategorized";
        countByLabel.set(label, (countByLabel.get(label) ?? 0) + 1);
      }
      return Array.from(countByLabel.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
        .slice(0, 6);
    }

    const topGenres = rankBooks((b) => b.genre ?? "Uncategorized");
    const topAuthors = rankBooks((b) => b.author || "Unknown author");
    const monthly = monthBuckets.map((m) => monthMap.get(m.key)!);
    const totalReadingDays = readingTime.reduce((sum, row) => sum + row.days, 0);
    const completedBooks = props.books.filter((b) => b.status === "completed").length;
    const completedChapters = props.chapters.filter((ch) => !!ch.completedAt).length;
    const answeredQas = props.qas.filter((qa) => qa.answer.trim().length > 0).length;

    return {
      monthly,
      readingTime,
      totalReadingDays,
      completedBooks,
      completedChapters,
      topGenres,
      topAuthors,
      totalQas: props.qas.length,
      answeredQas,
    };
  }, [props.books, props.chapters, props.qas, props.history]);

  const readingMax = Math.max(1, ...metrics.readingTime.map((x) => x.days));
  const completionMax = Math.max(1, ...metrics.monthly.map((m) => Math.max(m.booksCompleted, m.chaptersCompleted)));
  const qaMax = Math.max(1, ...metrics.monthly.map((m) => Math.max(m.qaCreated, m.qaUpdated, m.qaDeleted)));
  const genreMax = Math.max(1, ...metrics.topGenres.map((x) => x.count));
  const authorMax = Math.max(1, ...metrics.topAuthors.map((x) => x.count));
  const answerRate = metrics.totalQas ? Math.round((metrics.answeredQas / metrics.totalQas) * 100) : 0;
  const completionEvents = metrics.monthly.reduce((sum, m) => sum + m.booksCompleted + m.chaptersCompleted, 0);
  const qaEvents = metrics.monthly.reduce((sum, m) => sum + m.qaCreated + m.qaUpdated + m.qaDeleted, 0);

  return (
    <div className="mt-6 space-y-4">
      <Card>
        <CardHeader
          title={
            <span className="inline-flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Analytics Dashboard
            </span>
          }
          subtitle="Reading time, completion trends, top genres/authors, and Q&A activity."
        />
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <InfoStat label="Books tracked" value={String(props.books.length)} />
            <InfoStat label="Estimated reading days" value={String(metrics.totalReadingDays)} />
            <InfoStat label="Completed books" value={String(metrics.completedBooks)} />
            <InfoStat label="Answered Q&A" value={`${metrics.answeredQas}/${metrics.totalQas}`} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader
            title={
              <span className="inline-flex items-center gap-2">
                <Clock3 className="w-5 h-5" />
                Reading Time (Estimated)
              </span>
            }
            subtitle="Top books by elapsed reading days, based on book dates and chapter activity."
          />
          <CardContent>
            {metrics.readingTime.length === 0 ? (
              <div className="text-sm text-zinc-600 dark:text-zinc-300">Add a start date or chapter entries to see reading-time analytics.</div>
            ) : (
              <div className="space-y-3">
                {metrics.readingTime.map((row) => {
                  const widthPct = Math.round((row.days / readingMax) * 100);
                  return (
                    <div key={row.bookId}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => props.onOpenBook(row.bookId)}
                          className="min-w-0 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:underline"
                          title={row.title}
                        >
                          {row.title}
                        </button>
                        <Chip tone={row.status === "completed" ? "ok" : row.status === "abandoned" ? "warn" : "neutral"} className="text-[10px]">
                          {row.status.replaceAll("_", " ")}
                        </Chip>
                        <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">{row.days}d</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                        <div className="h-full rounded-full bg-sky-500 dark:bg-sky-400" style={{ width: `${Math.max(8, widthPct)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title={
              <span className="inline-flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Completion Trends
              </span>
            }
            subtitle="Last 6 months of completed chapters and completed books."
            right={<div className="text-xs text-zinc-500 dark:text-zinc-400">{completionEvents} completion events</div>}
          />
          <CardContent className="space-y-3">
            <div className="overflow-x-auto">
              <div className="min-w-[520px]">
                <div className="h-40 flex items-end gap-3">
                  {metrics.monthly.map((month) => {
                    const chapterHeight = month.chaptersCompleted === 0 ? 0 : Math.max(8, Math.round((month.chaptersCompleted / completionMax) * 100));
                    const bookHeight = month.booksCompleted === 0 ? 0 : Math.max(8, Math.round((month.booksCompleted / completionMax) * 100));
                    return (
                      <div key={month.key} className="flex-1 min-w-[68px]">
                        <div className="h-28 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 px-2 py-2 flex items-end justify-center gap-1">
                          <div className="w-4 rounded-t-md bg-emerald-500 dark:bg-emerald-400" style={{ height: `${chapterHeight}%` }} title={`Chapters: ${month.chaptersCompleted}`} />
                          <div className="w-4 rounded-t-md bg-indigo-500 dark:bg-indigo-400" style={{ height: `${bookHeight}%` }} title={`Books: ${month.booksCompleted}`} />
                        </div>
                        <div className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400 text-center">{month.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 dark:bg-emerald-400" />
                Chapters
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 dark:bg-indigo-400" />
                Books
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader
            title={
              <span className="inline-flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Top Genres & Authors
              </span>
            }
            subtitle="Ranked by number of books in your library."
          />
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Genres</div>
              {metrics.topGenres.length === 0 ? (
                <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">No genre data yet.</div>
              ) : (
                <div className="mt-2 space-y-2">
                  {metrics.topGenres.map((row) => {
                    const widthPct = Math.round((row.count / genreMax) * 100);
                    return (
                      <div key={`genre_${row.label}`}>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="min-w-0 truncate">{row.label}</span>
                          <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">{row.count}</span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                          <div className="h-full rounded-full bg-violet-500 dark:bg-violet-400" style={{ width: `${Math.max(8, widthPct)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Divider />

            <div>
              <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Authors</div>
              {metrics.topAuthors.length === 0 ? (
                <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">No author data yet.</div>
              ) : (
                <div className="mt-2 space-y-2">
                  {metrics.topAuthors.map((row) => {
                    const widthPct = Math.round((row.count / authorMax) * 100);
                    return (
                      <div key={`author_${row.label}`}>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="min-w-0 truncate">{row.label}</span>
                          <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">{row.count}</span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                          <div className="h-full rounded-full bg-teal-500 dark:bg-teal-400" style={{ width: `${Math.max(8, widthPct)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title={
              <span className="inline-flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Q&A Activity
              </span>
            }
            subtitle="Question quality signals and activity trend from your timeline."
            right={<div className="text-xs text-zinc-500 dark:text-zinc-400">{qaEvents} QA events</div>}
          />
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3">
              <div className="flex items-center justify-between text-sm">
                <span>Answer completion</span>
                <span className="font-medium">{answerRate}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 dark:bg-emerald-400" style={{ width: `${answerRate}%` }} />
              </div>
              <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                {metrics.answeredQas} answered of {metrics.totalQas} total questions
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[540px]">
                <div className="h-40 flex items-end gap-3">
                  {metrics.monthly.map((month) => {
                    const createdHeight = month.qaCreated === 0 ? 0 : Math.max(8, Math.round((month.qaCreated / qaMax) * 100));
                    const updatedHeight = month.qaUpdated === 0 ? 0 : Math.max(8, Math.round((month.qaUpdated / qaMax) * 100));
                    const deletedHeight = month.qaDeleted === 0 ? 0 : Math.max(8, Math.round((month.qaDeleted / qaMax) * 100));
                    return (
                      <div key={`qa_${month.key}`} className="flex-1 min-w-[70px]">
                        <div className="h-28 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 px-2 py-2 flex items-end justify-center gap-1">
                          <div className="w-3 rounded-t-md bg-emerald-500 dark:bg-emerald-400" style={{ height: `${createdHeight}%` }} title={`Created: ${month.qaCreated}`} />
                          <div className="w-3 rounded-t-md bg-amber-500 dark:bg-amber-400" style={{ height: `${updatedHeight}%` }} title={`Updated: ${month.qaUpdated}`} />
                          <div className="w-3 rounded-t-md bg-rose-500 dark:bg-rose-400" style={{ height: `${deletedHeight}%` }} title={`Deleted: ${month.qaDeleted}`} />
                        </div>
                        <div className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400 text-center">{month.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 dark:bg-emerald-400" />
                Created
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 dark:bg-amber-400" />
                Updated
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 dark:bg-rose-400" />
                Deleted
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
