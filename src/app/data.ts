import type {
  AICoachConfig,
  AICoachData,
  AIDifficulty,
  AIDraftAnswer,
  AIFeedbackEntry,
  AIGeneratedQuestion,
  AIGradeResult,
  AIQuestionStyle,
  UserData,
} from "./types";
import { clampInt, clampStr, nowISO } from "./utils";

export const KEY_USERS = "bo_users_v1";
export const KEY_SESSION = "bo_session_v1";

export function userDataKey(userId: string) {
  return `bo_user_${userId}_data_v1`;
}

export const defaultAICoachConfig: AICoachConfig = {
  count: 6,
  difficulty: "mixed",
  style: "comprehension",
};

export function createEmptyAICoachData(): AICoachData {
  return {
    selectedBookId: undefined,
    selectedChapterId: undefined,
    lastConfig: { ...defaultAICoachConfig },
    generatedQuestions: [],
    draftAnswers: [],
    feedbackHistory: [],
  };
}

export function createEmptyUserData(): UserData {
  return {
    books: [],
    chapters: [],
    qas: [],
    history: [],
    aiCoach: createEmptyAICoachData(),
  };
}

export function isAIDifficulty(value: unknown): value is AIDifficulty {
  return value === "easy" || value === "medium" || value === "hard" || value === "mixed";
}

export function isAIQuestionStyle(value: unknown): value is AIQuestionStyle {
  return value === "comprehension" || value === "critical_thinking" || value === "mixed";
}

function isKnownHistoryType(value: unknown): value is UserData["history"][number]["type"] {
  return (
    value === "book_created" ||
    value === "book_updated" ||
    value === "book_deleted" ||
    value === "chapter_created" ||
    value === "chapter_updated" ||
    value === "chapter_deleted" ||
    value === "qa_created" ||
    value === "qa_updated" ||
    value === "qa_deleted" ||
    value === "ai_questions_generated" ||
    value === "ai_answers_graded" ||
    value === "export"
  );
}

export function normalizeUserData(raw: Partial<UserData> | null | undefined): UserData {
  const books = Array.isArray(raw?.books) ? raw.books : [];
  const bookIds = new Set(books.map((b) => b.id));
  const chapters = Array.isArray(raw?.chapters) ? raw.chapters.filter((ch) => bookIds.has(ch.bookId)) : [];
  const chapterIds = new Set(chapters.map((ch) => ch.id));
  const history = Array.isArray(raw?.history)
    ? raw.history.filter(
        (entry): entry is UserData["history"][number] =>
          !!entry &&
          typeof entry === "object" &&
          isKnownHistoryType((entry as { type?: unknown }).type)
      )
    : [];
  const aiCoachRaw = (raw as { aiCoach?: Partial<AICoachData> } | null | undefined)?.aiCoach;

  const generatedQuestions = Array.isArray(aiCoachRaw?.generatedQuestions)
    ? aiCoachRaw.generatedQuestions
        .filter(
          (q): q is AIGeneratedQuestion =>
            !!q &&
            typeof q.id === "string" &&
            typeof q.chapterId === "string" &&
            chapterIds.has(q.chapterId) &&
            typeof q.question === "string" &&
            q.question.trim().length > 0
        )
        .map((q) => ({
          id: q.id,
          chapterId: q.chapterId,
          question: clampStr(q.question, 500),
          rubric: clampStr(q.rubric ?? "", 2000),
          createdAt: q.createdAt ?? nowISO(),
          difficulty: isAIDifficulty(q.difficulty) ? q.difficulty : defaultAICoachConfig.difficulty,
          style: isAIQuestionStyle(q.style) ? q.style : defaultAICoachConfig.style,
        }))
    : [];

  const generatedQuestionIds = new Set(generatedQuestions.map((q) => q.id));

  const draftAnswers = Array.isArray(aiCoachRaw?.draftAnswers)
    ? aiCoachRaw.draftAnswers
        .filter(
          (a): a is AIDraftAnswer =>
            !!a &&
            typeof a.chapterId === "string" &&
            chapterIds.has(a.chapterId) &&
            typeof a.questionId === "string" &&
            generatedQuestionIds.has(a.questionId) &&
            typeof a.answer === "string" &&
            a.answer.trim().length > 0
        )
        .map((a) => ({
          chapterId: a.chapterId,
          questionId: a.questionId,
          answer: clampStr(a.answer, 10000),
          updatedAt: a.updatedAt ?? nowISO(),
        }))
    : [];

  const feedbackHistory = Array.isArray(aiCoachRaw?.feedbackHistory)
    ? aiCoachRaw.feedbackHistory
        .filter(
          (entry): entry is AIFeedbackEntry =>
            !!entry &&
            typeof entry.id === "string" &&
            typeof entry.bookId === "string" &&
            bookIds.has(entry.bookId) &&
            typeof entry.chapterId === "string" &&
            chapterIds.has(entry.chapterId) &&
            Array.isArray(entry.results)
        )
        .map((entry) => ({
          id: entry.id,
          bookId: entry.bookId,
          chapterId: entry.chapterId,
          createdAt: entry.createdAt ?? nowISO(),
          difficulty: isAIDifficulty(entry.difficulty) ? entry.difficulty : defaultAICoachConfig.difficulty,
          style: isAIQuestionStyle(entry.style) ? entry.style : defaultAICoachConfig.style,
          averageScore: clampInt(entry.averageScore, 0, 100, 0),
          results: entry.results
            .filter(
              (result): result is AIGradeResult =>
                !!result &&
                typeof result.questionId === "string" &&
                typeof result.question === "string" &&
                typeof result.studentAnswer === "string"
            )
            .map((result) => ({
              questionId: result.questionId,
              question: clampStr(result.question, 500),
              studentAnswer: clampStr(result.studentAnswer, 10000),
              score: clampInt(result.score, 0, 100, 0),
              feedback: clampStr(result.feedback ?? "", 2000),
              idealAnswer: clampStr(result.idealAnswer ?? "", 2000),
            })),
        }))
        .filter((entry) => entry.results.length > 0)
        .slice(0, 500)
    : [];

  const selectedBookId =
    typeof aiCoachRaw?.selectedBookId === "string" && bookIds.has(aiCoachRaw.selectedBookId) ? aiCoachRaw.selectedBookId : undefined;
  const selectedChapterIdRaw = typeof aiCoachRaw?.selectedChapterId === "string" ? aiCoachRaw.selectedChapterId : undefined;
  const selectedChapterId =
    selectedBookId && selectedChapterIdRaw && chapters.some((ch) => ch.bookId === selectedBookId && ch.id === selectedChapterIdRaw)
      ? selectedChapterIdRaw
      : selectedBookId
      ? chapters.find((ch) => ch.bookId === selectedBookId)?.id
      : undefined;
  const lastConfigRaw = (aiCoachRaw?.lastConfig ?? {}) as Partial<AICoachConfig>;

  return {
    books,
    chapters,
    qas: Array.isArray(raw?.qas) ? raw.qas.filter((qa) => chapterIds.has(qa.chapterId)) : [],
    history,
    aiCoach: {
      selectedBookId,
      selectedChapterId,
      lastConfig: {
        count: clampInt(lastConfigRaw.count, 1, 15, defaultAICoachConfig.count),
        difficulty: isAIDifficulty(lastConfigRaw.difficulty) ? lastConfigRaw.difficulty : defaultAICoachConfig.difficulty,
        style: isAIQuestionStyle(lastConfigRaw.style) ? lastConfigRaw.style : defaultAICoachConfig.style,
      },
      generatedQuestions,
      draftAnswers,
      feedbackHistory,
    },
  };
}
