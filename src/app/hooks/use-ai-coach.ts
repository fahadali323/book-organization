import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  defaultAICoachConfig,
  isAIDifficulty,
  isAIQuestionStyle,
} from "../data";
import { generateQuestionsWithAI, gradeAnswersWithAI, type AIProviderSettings } from "../ai/ollama";
import { chapterLabel } from "../components/common";
import type {
  AICoachConfig,
  AIFeedbackEntry,
  AIGeneratedQuestion,
  AIGradeResult,
  Book,
  ChapterEntry,
  HistoryEvent,
  UserData,
} from "../types";
import {
  clampInt,
  clampStr,
  compareChapterEntries,
  nowISO,
  uid,
} from "../utils";

type UseAICoachArgs = {
  data: UserData;
  setData: Dispatch<SetStateAction<UserData>>;
  sessionUserId: string | null;
  bookById: Map<string, Book>;
  chaptersByBook: Map<string, ChapterEntry[]>;
  providerSettings: AIProviderSettings;
  providerApiKey?: string;
  pushHistory: (event: Omit<HistoryEvent, "id" | "ts">) => void;
};

export function useAICoach({
  data,
  setData,
  sessionUserId,
  bookById,
  chaptersByBook,
  providerSettings,
  providerApiKey,
  pushHistory,
}: UseAICoachArgs) {
  const [aiBusy, setAiBusy] = useState<"generate" | "grade" | null>(null);
  const [aiErr, setAiErr] = useState<string | null>(null);

  const aiSelectedBook = useMemo(() => {
    if (!data.aiCoach.selectedBookId) return null;
    return bookById.get(data.aiCoach.selectedBookId) ?? null;
  }, [bookById, data.aiCoach.selectedBookId]);

  const aiChapterOptions = useMemo(() => {
    if (!aiSelectedBook) return [];
    return chaptersByBook.get(aiSelectedBook.id) ?? [];
  }, [aiSelectedBook, chaptersByBook]);

  const aiSelectedChapter = useMemo(() => {
    if (!aiSelectedBook) return null;
    const selectedId = data.aiCoach.selectedChapterId;
    if (!selectedId) return aiChapterOptions[0] ?? null;
    return aiChapterOptions.find((chapter) => chapter.id === selectedId) ?? aiChapterOptions[0] ?? null;
  }, [aiChapterOptions, aiSelectedBook, data.aiCoach.selectedChapterId]);

  const aiQuestionsForSelectedChapter = useMemo(() => {
    if (!aiSelectedChapter) return [];
    return data.aiCoach.generatedQuestions
      .filter((question) => question.chapterId === aiSelectedChapter.id)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [data.aiCoach.generatedQuestions, aiSelectedChapter]);

  const aiAnswerMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!aiSelectedChapter) return map;
    for (const draft of data.aiCoach.draftAnswers) {
      if (draft.chapterId === aiSelectedChapter.id) {
        map.set(draft.questionId, draft.answer);
      }
    }
    return map;
  }, [data.aiCoach.draftAnswers, aiSelectedChapter]);

  const aiFeedbackHistory = useMemo(() => {
    if (!aiSelectedChapter) return [];
    return data.aiCoach.feedbackHistory
      .filter((entry) => entry.chapterId === aiSelectedChapter.id)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [data.aiCoach.feedbackHistory, aiSelectedChapter]);

  function selectAIBook(bookId: string) {
    setAiErr(null);
    setData((prev) => {
      const nextBookId = bookId || undefined;
      const chapterOptions = nextBookId
        ? prev.chapters.filter((chapter) => chapter.bookId === nextBookId).sort(compareChapterEntries)
        : [];
      const nextChapterId =
        chapterOptions.find((chapter) => chapter.id === prev.aiCoach.selectedChapterId)?.id ??
        chapterOptions[0]?.id;

      return {
        ...prev,
        aiCoach: {
          ...prev.aiCoach,
          selectedBookId: nextBookId,
          selectedChapterId: nextChapterId,
        },
      };
    });
  }

  function selectAIChapter(chapterId: string) {
    setAiErr(null);
    setData((prev) => ({
      ...prev,
      aiCoach: {
        ...prev.aiCoach,
        selectedChapterId: chapterId || undefined,
      },
    }));
  }

  function updateAIConfig(patch: Partial<AICoachConfig>) {
    setData((prev) => ({
      ...prev,
      aiCoach: {
        ...prev.aiCoach,
        lastConfig: {
          count:
            patch.count !== undefined
              ? clampInt(patch.count, 1, 15, prev.aiCoach.lastConfig.count)
              : prev.aiCoach.lastConfig.count,
          difficulty:
            patch.difficulty && isAIDifficulty(patch.difficulty)
              ? patch.difficulty
              : prev.aiCoach.lastConfig.difficulty,
          style:
            patch.style && isAIQuestionStyle(patch.style)
              ? patch.style
              : prev.aiCoach.lastConfig.style,
        },
      },
    }));
  }

  function updateAIDraftAnswer(questionId: string, answer: string) {
    if (!aiSelectedChapter) return;
    const chapterId = aiSelectedChapter.id;
    const nextAnswer = clampStr(answer, 10000);

    setData((prev) => {
      const index = prev.aiCoach.draftAnswers.findIndex(
        (draft) => draft.chapterId === chapterId && draft.questionId === questionId
      );
      const nextDraftAnswers = [...prev.aiCoach.draftAnswers];
      if (index >= 0) {
        if (!nextAnswer.trim()) {
          nextDraftAnswers.splice(index, 1);
        } else {
          nextDraftAnswers[index] = {
            ...nextDraftAnswers[index],
            answer: nextAnswer,
            updatedAt: nowISO(),
          };
        }
      } else if (nextAnswer.trim()) {
        nextDraftAnswers.unshift({
          chapterId,
          questionId,
          answer: nextAnswer,
          updatedAt: nowISO(),
        });
      }

      return {
        ...prev,
        aiCoach: {
          ...prev.aiCoach,
          draftAnswers: nextDraftAnswers,
        },
      };
    });
  }

  async function generateAIQuestions() {
    if (!sessionUserId) return;
    if (!aiSelectedBook || !aiSelectedChapter) {
      setAiErr("Select a book and chapter first.");
      return;
    }

    const config = data.aiCoach.lastConfig;
    setAiBusy("generate");
    setAiErr(null);

    try {
      const response = await generateQuestionsWithAI({
        providerSettings,
        providerApiKey,
        book: {
          title: aiSelectedBook.title,
          author: aiSelectedBook.author,
        },
        chapter: {
          label: chapterLabel(aiSelectedChapter),
          summary: clampStr(aiSelectedChapter.summary, 6000),
          takeaways: clampStr(aiSelectedChapter.takeaways, 4000),
          reflection: clampStr(aiSelectedChapter.reflection, 4000),
        },
        count: clampInt(config.count, 1, 15, defaultAICoachConfig.count),
        difficulty: config.difficulty,
        style: config.style,
      });

      const rawQuestions = Array.isArray(response.questions) ? response.questions : [];
      const ts = nowISO();
      const seenIds = new Set<string>();
      const normalized: AIGeneratedQuestion[] = [];

      for (const item of rawQuestions) {
        const text = typeof item?.question === "string" ? clampStr(item.question.trim(), 500) : "";
        if (!text) continue;
        const candidateId = typeof item?.id === "string" ? item.id.trim() : "";
        let id = candidateId || uid("gq");
        if (seenIds.has(id)) id = uid("gq");
        seenIds.add(id);
        normalized.push({
          id,
          chapterId: aiSelectedChapter.id,
          question: text,
          rubric: typeof item?.rubric === "string" ? clampStr(item.rubric, 2000) : "",
          createdAt: ts,
          difficulty: config.difficulty,
          style: config.style,
        });
      }

      if (normalized.length === 0) {
        throw new Error("The AI service returned no usable questions.");
      }

      setData((prev) => ({
        ...prev,
        aiCoach: {
          ...prev.aiCoach,
          selectedBookId: aiSelectedBook.id,
          selectedChapterId: aiSelectedChapter.id,
          generatedQuestions: [
            ...normalized,
            ...prev.aiCoach.generatedQuestions.filter((question) => question.chapterId !== aiSelectedChapter.id),
          ],
          draftAnswers: prev.aiCoach.draftAnswers.filter((answer) => answer.chapterId !== aiSelectedChapter.id),
        },
      }));

      pushHistory({
        type: "ai_questions_generated",
        userId: sessionUserId,
        bookId: aiSelectedBook.id,
        chapterId: aiSelectedChapter.id,
        label: `Generated ${normalized.length} AI question${normalized.length === 1 ? "" : "s"}`,
        meta: {
          difficulty: config.difficulty,
          style: config.style,
          count: String(normalized.length),
        },
      });
    } catch (error) {
      setAiErr(error instanceof Error ? error.message : "Failed to generate AI questions.");
    } finally {
      setAiBusy(null);
    }
  }

  async function gradeAIAnswers() {
    if (!sessionUserId) return;
    if (!aiSelectedBook || !aiSelectedChapter) {
      setAiErr("Select a book and chapter first.");
      return;
    }
    if (aiQuestionsForSelectedChapter.length === 0) {
      setAiErr("Generate questions before grading answers.");
      return;
    }

    const answerRows = aiQuestionsForSelectedChapter
      .map((question) => ({
        questionId: question.id,
        question: question.question,
        studentAnswer: (aiAnswerMap.get(question.id) ?? "").trim(),
      }))
      .filter((row) => row.studentAnswer.length > 0);

    if (answerRows.length === 0) {
      setAiErr("Write at least one answer before grading.");
      return;
    }

    setAiBusy("grade");
    setAiErr(null);

    try {
      const response = await gradeAnswersWithAI({
        providerSettings,
        providerApiKey,
        book: {
          title: aiSelectedBook.title,
          author: aiSelectedBook.author,
        },
        chapter: {
          label: chapterLabel(aiSelectedChapter),
          summary: clampStr(aiSelectedChapter.summary, 6000),
          takeaways: clampStr(aiSelectedChapter.takeaways, 4000),
        },
        answers: answerRows,
      });

      const answerById = new Map(answerRows.map((row) => [row.questionId, row]));
      const rawResults = Array.isArray(response.results) ? response.results : [];
      const normalizedResults: AIGradeResult[] = [];

      for (const result of rawResults) {
        const questionId = typeof result?.questionId === "string" ? result.questionId : "";
        if (!questionId || !answerById.has(questionId)) continue;
        const row = answerById.get(questionId)!;
        normalizedResults.push({
          questionId,
          question: row.question,
          studentAnswer: row.studentAnswer,
          score: clampInt(result.score, 0, 100, 0),
          feedback: typeof result?.feedback === "string" ? clampStr(result.feedback, 2000) : "",
          idealAnswer: typeof result?.idealAnswer === "string" ? clampStr(result.idealAnswer, 2000) : "",
        });
      }

      if (normalizedResults.length === 0) {
        throw new Error("The AI service returned no usable grade results.");
      }

      const averageScore = Math.round(
        normalizedResults.reduce((sum, result) => sum + result.score, 0) / normalizedResults.length
      );
      const feedbackEntry: AIFeedbackEntry = {
        id: uid("aif"),
        bookId: aiSelectedBook.id,
        chapterId: aiSelectedChapter.id,
        createdAt: nowISO(),
        difficulty: data.aiCoach.lastConfig.difficulty,
        style: data.aiCoach.lastConfig.style,
        averageScore,
        results: normalizedResults,
      };

      setData((prev) => ({
        ...prev,
        aiCoach: {
          ...prev.aiCoach,
          feedbackHistory: [feedbackEntry, ...prev.aiCoach.feedbackHistory].slice(0, 500),
        },
      }));

      pushHistory({
        type: "ai_answers_graded",
        userId: sessionUserId,
        bookId: aiSelectedBook.id,
        chapterId: aiSelectedChapter.id,
        label: `Graded ${normalizedResults.length} AI answer${normalizedResults.length === 1 ? "" : "s"}`,
        meta: {
          averageScore: String(averageScore),
        },
      });
    } catch (error) {
      setAiErr(error instanceof Error ? error.message : "Failed to grade answers.");
    } finally {
      setAiBusy(null);
    }
  }

  return {
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
  };
}
