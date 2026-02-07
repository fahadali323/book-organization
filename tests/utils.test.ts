import { describe, expect, it } from "vitest";
import {
  apiErrorMessage,
  clampInt,
  clampStr,
  cn,
  compareChapterEntries,
  completedBookDate,
  dayIndexFromKey,
} from "../src/app/utils";
import type { Book, ChapterEntry } from "../src/app/types";

function book(overrides: Partial<Book> = {}): Book {
  return {
    id: "b1",
    title: "Book",
    author: "Author",
    status: "in_progress",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-02T00:00:00.000Z",
    ...overrides,
  };
}

function chapter(overrides: Partial<ChapterEntry> = {}): ChapterEntry {
  return {
    id: "ch1",
    bookId: "b1",
    summary: "",
    takeaways: "",
    quotes: "",
    reflection: "",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("utils", () => {
  it("clamps strings and integers", () => {
    expect(clampStr("abcdef", 3)).toBe("abc");
    expect(clampStr("", 3)).toBe("");

    expect(clampInt("42.6", 0, 100, 10)).toBe(43);
    expect(clampInt("999", 0, 100, 10)).toBe(100);
    expect(clampInt("oops", 0, 100, 10)).toBe(10);
  });

  it("formats error message from payload safely", () => {
    expect(apiErrorMessage({ error: "  Bad input  " }, 400)).toBe("Bad input");
    expect(apiErrorMessage({ anything: "else" }, 500)).toBe("Request failed (500)");
  });

  it("chooses completed book date correctly", () => {
    expect(completedBookDate(book({ finishedAt: "2025-02-01T00:00:00.000Z" }))).toBe("2025-02-01T00:00:00.000Z");
    expect(completedBookDate(book({ status: "completed" }))).toBe("2025-01-02T00:00:00.000Z");
    expect(completedBookDate(book())).toBeUndefined();
  });

  it("sorts chapters by number then creation time", () => {
    const first = chapter({ id: "a", number: 1, createdAt: "2025-01-01T00:00:00.000Z" });
    const second = chapter({ id: "b", number: 2, createdAt: "2025-01-01T00:00:00.000Z" });
    expect(compareChapterEntries(first, second)).toBeLessThan(0);

    const noNumberEarly = chapter({ id: "c", number: undefined, createdAt: "2025-01-01T00:00:00.000Z" });
    const noNumberLate = chapter({ id: "d", number: undefined, createdAt: "2025-01-02T00:00:00.000Z" });
    expect(compareChapterEntries(noNumberEarly, noNumberLate)).toBeLessThan(0);
  });

  it("handles date-key indexing and class joining", () => {
    expect(dayIndexFromKey("2025-01-01")).toBe(20089);
    expect(dayIndexFromKey("invalid")).toBeNull();
    expect(cn("a", false, "b", undefined, null, "c")).toBe("a b c");
  });
});
