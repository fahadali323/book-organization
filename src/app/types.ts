export type ISODate = string;

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: ISODate;
};

export type BookStatus = "in_progress" | "completed" | "abandoned";

export type Book = {
  id: string;
  title: string;
  author: string;
  genre?: string;
  coverDataUrl?: string;
  status: BookStatus;
  startedAt?: ISODate;
  finishedAt?: ISODate;
  createdAt: ISODate;
  updatedAt: ISODate;
};

export type ChapterEntry = {
  id: string;
  bookId: string;
  number?: number;
  title?: string;
  completedAt?: ISODate;
  summary: string;
  takeaways: string;
  quotes: string;
  reflection: string;
  createdAt: ISODate;
  updatedAt: ISODate;
};

export type QA = {
  id: string;
  chapterId: string;
  question: string;
  answer: string;
  createdAt: ISODate;
  updatedAt: ISODate;
};

export type HistoryEventType =
  | "book_created"
  | "book_updated"
  | "book_deleted"
  | "chapter_created"
  | "chapter_updated"
  | "chapter_deleted"
  | "qa_created"
  | "qa_updated"
  | "qa_deleted"
  | "ai_questions_generated"
  | "ai_answers_graded"
  | "export";

export type HistoryEvent = {
  id: string;
  type: HistoryEventType;
  ts: ISODate;
  userId: string;
  bookId?: string;
  chapterId?: string;
  qaId?: string;
  label: string;
  meta?: Record<string, string>;
};

export type AIDifficulty = "easy" | "medium" | "hard" | "mixed";
export type AIQuestionStyle = "comprehension" | "critical_thinking" | "mixed";

export type AICoachConfig = {
  count: number;
  difficulty: AIDifficulty;
  style: AIQuestionStyle;
};

export type AIGeneratedQuestion = {
  id: string;
  chapterId: string;
  question: string;
  rubric: string;
  createdAt: ISODate;
  difficulty: AIDifficulty;
  style: AIQuestionStyle;
};

export type AIDraftAnswer = {
  chapterId: string;
  questionId: string;
  answer: string;
  updatedAt: ISODate;
};

export type AIGradeResult = {
  questionId: string;
  question: string;
  studentAnswer: string;
  score: number;
  feedback: string;
  idealAnswer: string;
};

export type AIFeedbackEntry = {
  id: string;
  bookId: string;
  chapterId: string;
  createdAt: ISODate;
  difficulty: AIDifficulty;
  style: AIQuestionStyle;
  averageScore: number;
  results: AIGradeResult[];
};

export type AICoachData = {
  selectedBookId?: string;
  selectedChapterId?: string;
  lastConfig: AICoachConfig;
  generatedQuestions: AIGeneratedQuestion[];
  draftAnswers: AIDraftAnswer[];
  feedbackHistory: AIFeedbackEntry[];
};

export type GenerateQuestionsResponse = {
  questions?: Array<{
    id?: string;
    question?: string;
    rubric?: string;
  }>;
};

export type GradeAnswersResponse = {
  results?: Array<{
    questionId?: string;
    score?: number;
    feedback?: string;
    idealAnswer?: string;
  }>;
};

export type UserData = {
  books: Book[];
  chapters: ChapterEntry[];
  qas: QA[];
  history: HistoryEvent[];
  aiCoach: AICoachData;
};

export type Theme = "light" | "dark";

export type View =
  | { name: "library" }
  | { name: "book"; bookId: string }
  | { name: "chapter"; bookId: string; chapterId: string }
  | { name: "ai" }
  | { name: "analytics" }
  | { name: "history" }
  | { name: "settings" };

export type BookDraft = {
  title: string;
  author: string;
  genre?: string;
  coverDataUrl?: string;
  status: BookStatus;
  startedAt?: ISODate;
  finishedAt?: ISODate;
};
