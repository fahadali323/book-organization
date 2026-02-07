import { describe, expect, it } from "vitest";
import {
  createEmptyAICoachData,
  createEmptyUserData,
  isAIDifficulty,
  isAIQuestionStyle,
  normalizeUserData,
  userDataKey,
} from "../src/app/data";
import type { UserData } from "../src/app/types";

describe("data helpers", () => {
  it("creates empty structures safely", () => {
    const userData = createEmptyUserData();
    const aiData = createEmptyAICoachData();

    expect(userData.books).toEqual([]);
    expect(userData.chapters).toEqual([]);
    expect(userData.qas).toEqual([]);
    expect(userData.history).toEqual([]);
    expect(userData.aiCoach.generatedQuestions).toEqual([]);
    expect(aiData.lastConfig).toEqual({ count: 6, difficulty: "mixed", style: "comprehension" });
    expect(userDataKey("u1")).toBe("bo_user_u1_data_v1");
  });

  it("validates AI enums", () => {
    expect(isAIDifficulty("easy")).toBe(true);
    expect(isAIDifficulty("invalid")).toBe(false);
    expect(isAIQuestionStyle("critical_thinking")).toBe(true);
    expect(isAIQuestionStyle("invalid")).toBe(false);
  });

  it("normalizes and filters invalid relational data", () => {
    const raw: Partial<UserData> = {
      books: [
        {
          id: "b1",
          title: "Book 1",
          author: "Author 1",
          status: "in_progress",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        },
      ],
      chapters: [
        {
          id: "ch1",
          bookId: "b1",
          summary: "summary",
          takeaways: "",
          quotes: "",
          reflection: "",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        },
        {
          id: "ch2",
          bookId: "missing-book",
          summary: "drop me",
          takeaways: "",
          quotes: "",
          reflection: "",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        },
      ],
      qas: [
        {
          id: "qa1",
          chapterId: "ch1",
          question: "Q",
          answer: "A",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        },
        {
          id: "qa2",
          chapterId: "missing-chapter",
          question: "drop",
          answer: "drop",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        },
      ],
      history: [
        {
          id: "h1",
          type: "book_created",
          ts: "2025-01-01T00:00:00.000Z",
          userId: "u1",
          label: "ok",
        },
        {
          id: "h2",
          type: "not_real" as never,
          ts: "2025-01-01T00:00:00.000Z",
          userId: "u1",
          label: "drop",
        },
      ],
      aiCoach: {
        selectedBookId: "b1",
        selectedChapterId: "missing-chapter",
        lastConfig: {
          count: 99,
          difficulty: "nope" as never,
          style: "nope" as never,
        },
        generatedQuestions: [
          {
            id: "g1",
            chapterId: "ch1",
            question: "What happened?",
            rubric: "Good answer includes key events.",
            createdAt: "2025-01-01T00:00:00.000Z",
            difficulty: "easy",
            style: "comprehension",
          },
          {
            id: "bad-g",
            chapterId: "missing-chapter",
            question: "drop me",
            rubric: "",
            createdAt: "2025-01-01T00:00:00.000Z",
            difficulty: "easy",
            style: "comprehension",
          },
        ],
        draftAnswers: [
          {
            chapterId: "ch1",
            questionId: "g1",
            answer: "It happened like this.",
            updatedAt: "2025-01-01T00:00:00.000Z",
          },
          {
            chapterId: "ch1",
            questionId: "missing-question",
            answer: "drop",
            updatedAt: "2025-01-01T00:00:00.000Z",
          },
        ],
        feedbackHistory: [
          {
            id: "f1",
            bookId: "b1",
            chapterId: "ch1",
            createdAt: "2025-01-01T00:00:00.000Z",
            difficulty: "easy",
            style: "comprehension",
            averageScore: 150,
            results: [
              {
                questionId: "g1",
                question: "What happened?",
                studentAnswer: "It happened like this.",
                score: 120,
                feedback: "Good",
                idealAnswer: "Ideal",
              },
              {
                questionId: 123 as never,
                question: "drop",
                studentAnswer: "drop",
                score: 50,
                feedback: "",
                idealAnswer: "",
              },
            ],
          },
          {
            id: "bad-feedback",
            bookId: "missing-book",
            chapterId: "ch1",
            createdAt: "2025-01-01T00:00:00.000Z",
            difficulty: "easy",
            style: "comprehension",
            averageScore: 10,
            results: [],
          },
        ],
      },
    };

    const normalized = normalizeUserData(raw);

    expect(normalized.books).toHaveLength(1);
    expect(normalized.chapters.map((x) => x.id)).toEqual(["ch1"]);
    expect(normalized.qas.map((x) => x.id)).toEqual(["qa1"]);
    expect(normalized.history.map((x) => x.id)).toEqual(["h1"]);

    expect(normalized.aiCoach.selectedBookId).toBe("b1");
    expect(normalized.aiCoach.selectedChapterId).toBe("ch1");
    expect(normalized.aiCoach.lastConfig).toEqual({
      count: 15,
      difficulty: "mixed",
      style: "comprehension",
    });

    expect(normalized.aiCoach.generatedQuestions.map((x) => x.id)).toEqual(["g1"]);
    expect(normalized.aiCoach.draftAnswers).toHaveLength(1);
    expect(normalized.aiCoach.feedbackHistory).toHaveLength(1);
    expect(normalized.aiCoach.feedbackHistory[0].averageScore).toBe(100);
    expect(normalized.aiCoach.feedbackHistory[0].results).toHaveLength(1);
    expect(normalized.aiCoach.feedbackHistory[0].results[0].score).toBe(100);
  });
});
