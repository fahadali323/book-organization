import { useState } from "react";
import { chapterLabel } from "../components/common";
import type { Book, ChapterEntry, HistoryEvent, QA, UserData } from "../types";
import { downloadText, formatDate, formatDay, nowISO } from "../utils";

type UseMarkdownExportArgs = {
  data: UserData;
  booksSorted: Book[];
  chaptersByBook: Map<string, ChapterEntry[]>;
  qasByChapter: Map<string, QA[]>;
  sessionUserId: string | null;
  pushHistory: (event: Omit<HistoryEvent, "id" | "ts">) => void;
};

export function useMarkdownExport({
  data,
  booksSorted,
  chaptersByBook,
  qasByChapter,
  sessionUserId,
  pushHistory,
}: UseMarkdownExportArgs) {
  const [exportOpen, setExportOpen] = useState(false);
  const [exportName, setExportName] = useState("book-organizer-export.md");
  const [exportText, setExportText] = useState("");
  const [exportErr, setExportErr] = useState<string | null>(null);

  function exportMarkdown(opts?: { bookId?: string }) {
    if (!sessionUserId) {
      return { ok: false, downloaded: false, error: "Sign in first to export your reading data." };
    }

    const bookId = opts?.bookId;
    const books = bookId ? data.books.filter((book) => book.id === bookId) : booksSorted;

    let out = "# Book Organizer Export\n\n";
    out += `Exported: ${formatDate(nowISO())}\n\n`;

    for (const book of books) {
      out += "---\n\n";
      out += `## ${book.title}\n\n`;
      out += `**Author:** ${book.author}\n\n`;
      if (book.genre) out += `**Genre:** ${book.genre}\n\n`;
      out += `**Status:** ${book.status.replaceAll("_", " ")}\n\n`;
      out += `**Started:** ${formatDay(book.startedAt)}\n\n`;
      out += `**Finished:** ${formatDay(book.finishedAt)}\n\n`;

      const chapters = chaptersByBook.get(book.id) ?? [];
      out += `### Chapters (${chapters.length})\n\n`;
      for (const chapter of chapters) {
        out += `#### ${chapterLabel(chapter)}\n\n`;
        if (chapter.completedAt) out += `Completed: ${formatDay(chapter.completedAt)}\n\n`;
        if (chapter.summary.trim()) out += `**Summary**\n\n${chapter.summary.trim()}\n\n`;
        if (chapter.takeaways.trim()) out += `**Key Takeaways**\n\n${chapter.takeaways.trim()}\n\n`;
        if (chapter.quotes.trim()) out += `**Quotes**\n\n${chapter.quotes.trim()}\n\n`;
        if (chapter.reflection.trim()) out += `**Reflection**\n\n${chapter.reflection.trim()}\n\n`;

        const qas = qasByChapter.get(chapter.id) ?? [];
        if (qas.length) {
          out += `**Comprehension Q&A (${qas.length})**\n\n`;
          for (const qa of qas) {
            out += `- Q: ${qa.question.trim()}\n\n`;
            out += `  A: ${qa.answer.trim() || "(no answer yet)"}\n\n`;
          }
        }
      }
    }

    pushHistory({
      type: "export",
      userId: sessionUserId,
      label: bookId ? "Exported markdown for a book" : "Exported markdown for library",
      meta: { scope: bookId ? "book" : "library" },
      bookId,
    });

    const filename = `book-organizer-export_${new Date().toISOString().slice(0, 10)}${bookId ? "_book" : ""}.md`;
    setExportName(filename);
    setExportText(out);
    setExportErr(null);
    setExportOpen(true);

    try {
      downloadText(filename, out);
      return { ok: true, downloaded: true as const, error: null };
    } catch {
      const err = "Download was blocked. Use Copy or Download in the modal.";
      setExportErr(err);
      return { ok: true, downloaded: false as const, error: err };
    }
  }

  return {
    exportOpen,
    setExportOpen,
    exportName,
    exportText,
    exportErr,
    exportMarkdown,
  };
}
