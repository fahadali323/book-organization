import { useMemo, useState } from "react";
import type { Book, ChapterEntry, QA, UserData } from "../types";
import { compareChapterEntries } from "../utils";

export function useLibraryData(data: UserData) {
  const booksSorted = useMemo(() => [...data.books].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)), [data.books]);

  const bookById = useMemo(() => {
    const map = new Map<string, Book>();
    for (const book of data.books) map.set(book.id, book);
    return map;
  }, [data.books]);

  const chaptersByBook = useMemo(() => {
    const map = new Map<string, ChapterEntry[]>();
    for (const chapter of data.chapters) {
      const list = map.get(chapter.bookId) ?? [];
      list.push(chapter);
      map.set(chapter.bookId, list);
    }
    for (const [bookId, chapters] of map) {
      chapters.sort(compareChapterEntries);
      map.set(bookId, chapters);
    }
    return map;
  }, [data.chapters]);

  const qasByChapter = useMemo(() => {
    const map = new Map<string, QA[]>();
    for (const qa of data.qas) {
      const list = map.get(qa.chapterId) ?? [];
      list.push(qa);
      map.set(qa.chapterId, list);
    }
    for (const [chapterId, qas] of map) {
      qas.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
      map.set(chapterId, qas);
    }
    return map;
  }, [data.qas]);

  const [search, setSearch] = useState("");
  const filteredBooks = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return booksSorted;
    return booksSorted.filter((book) => {
      return (
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        (book.genre ?? "").toLowerCase().includes(query)
      );
    });
  }, [booksSorted, search]);

  return {
    booksSorted,
    bookById,
    chaptersByBook,
    qasByChapter,
    search,
    setSearch,
    filteredBooks,
  };
}
