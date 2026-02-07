import { Calendar, Check, ChevronLeft, HelpCircle, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Book, ChapterEntry, QA } from "../types";
import { clampStr, formatDate } from "../utils";
import { Button, Card, CardContent, CardHeader, TextArea, Input } from "../ui/primitives";
import { chapterLabel } from "./common";

export function ChapterView(props: {
  book: Book | null;
  chapter: ChapterEntry | null;
  qas: QA[];
  onBack: () => void;
  onSaveChapter: (patch: Partial<ChapterEntry>) => void;
  onCreateQA: () => void;
  onSaveQA: (qaId: string, patch: Partial<QA>) => void;
  onDeleteQA: (qaId: string) => void;
}) {
  const [local, setLocal] = useState<ChapterEntry | null>(props.chapter);

  useEffect(() => {
    setLocal(props.chapter);
  }, [props.chapter?.id]);

  if (!props.book || !props.chapter || !local) {
    return (
      <div className="mt-6">
        <Button variant="secondary" onClick={props.onBack}>
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>
        <Card className="mt-4">
          <CardContent>Chapter not found.</CardContent>
        </Card>
      </div>
    );
  }

  const chapter = props.chapter;
  const localChapter = local;

  const dirty =
    (chapter.number ?? null) !== (localChapter.number ?? null) ||
    (chapter.title ?? "") !== (localChapter.title ?? "") ||
    (chapter.completedAt ?? "") !== (localChapter.completedAt ?? "") ||
    chapter.summary !== localChapter.summary ||
    chapter.takeaways !== localChapter.takeaways ||
    chapter.quotes !== localChapter.quotes ||
    chapter.reflection !== localChapter.reflection;

  function save() {
    props.onSaveChapter({
      number: localChapter.number,
      title: localChapter.title,
      completedAt: localChapter.completedAt,
      summary: clampStr(localChapter.summary, 10000),
      takeaways: clampStr(localChapter.takeaways, 10000),
      quotes: clampStr(localChapter.quotes, 10000),
      reflection: clampStr(localChapter.reflection, 10000),
    });
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={props.onBack}>
          <ChevronLeft className="w-4 h-4" />
          {props.book.title}
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="secondary" onClick={() => setLocal(props.chapter)} disabled={!dirty}>
            <X className="w-4 h-4" />
            Discard
          </Button>
          <Button onClick={save} disabled={!dirty}>
            <Check className="w-4 h-4" />
            Save
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader
          title={chapterLabel(localChapter)}
          subtitle={
            <span className="inline-flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Updated {formatDate(chapter.updatedAt)}
            </span>
          }
        />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              label="Chapter number"
              inputMode="numeric"
              placeholder="e.g., 1"
              value={localChapter.number ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                const n = v === "" ? undefined : Number(v);
                setLocal((s) => (s ? { ...s, number: Number.isFinite(n) ? n : s.number } : s));
              }}
            />
            <Input label="Chapter title" placeholder="Optional title" value={localChapter.title ?? ""} onChange={(e) => setLocal((s) => (s ? { ...s, title: e.target.value } : s))} />
            <Input
              label="Completed date"
              type="date"
              value={localChapter.completedAt ? localChapter.completedAt.slice(0, 10) : ""}
              onChange={(e) => {
                const v = e.target.value;
                setLocal((s) => (s ? { ...s, completedAt: v ? new Date(v + "T00:00:00").toISOString() : undefined } : s));
              }}
            />
          </div>

          <TextArea
            label="Summary"
            hint="Write what happened + why it matters"
            value={localChapter.summary}
            onChange={(e) => setLocal((s) => (s ? { ...s, summary: e.target.value } : s))}
            placeholder="What are the key events or ideas in this chapter?"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TextArea
              label="Key Takeaways"
              hint="Bullets work well"
              value={localChapter.takeaways}
              onChange={(e) => setLocal((s) => (s ? { ...s, takeaways: e.target.value } : s))}
              placeholder="- Big concept 1; - Big concept 2; - Big concept 3"
            />
            <TextArea
              label="Quotes"
              hint="Favorite lines + page #"
              value={localChapter.quotes}
              onChange={(e) => setLocal((s) => (s ? { ...s, quotes: e.target.value } : s))}
              placeholder='"Quote" - page 42'
            />
          </div>

          <TextArea
            label="Reflection"
            hint="How did it connect to your life or other books?"
            value={localChapter.reflection}
            onChange={(e) => setLocal((s) => (s ? { ...s, reflection: e.target.value } : s))}
            placeholder="What did you think or feel? What questions does it raise?"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title={
            <span className="inline-flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Comprehension Q&A
            </span>
          }
          subtitle="Write your own questions for this chapter, then answer them in full sentences."
          right={
            <Button onClick={props.onCreateQA}>
              <Plus className="w-4 h-4" />
              Add Question
            </Button>
          }
        />
        <CardContent>
          {props.qas.length === 0 ? (
            <div className="text-sm text-zinc-600 dark:text-zinc-300">No questions yet. Add one to test understanding.</div>
          ) : (
            <div className="space-y-3">
              {props.qas.map((qa) => (
                <QAEditor key={qa.id} qa={qa} onSave={(patch) => props.onSaveQA(qa.id, patch)} onDelete={() => props.onDeleteQA(qa.id)} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function QAEditor(props: { qa: QA; onSave: (patch: Partial<QA>) => void; onDelete: () => void }) {
  const [q, setQ] = useState(props.qa.question);
  const [a, setA] = useState(props.qa.answer);

  useEffect(() => {
    setQ(props.qa.question);
    setA(props.qa.answer);
  }, [props.qa.id, props.qa.question, props.qa.answer]);

  const dirty = q !== props.qa.question || a !== props.qa.answer;

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 md:p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-3">
          <label className="block">
            <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-1">Question</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ask something specific about this chapter"
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm outline-none"
            />
          </label>

          <label className="block">
            <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-1">Answer</div>
            <textarea
              value={a}
              onChange={(e) => setA(e.target.value)}
              placeholder="Answer in complete sentences"
              className="w-full min-h-[110px] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm outline-none"
            />
          </label>

          <div className="text-xs text-zinc-500 dark:text-zinc-400">Updated {formatDate(props.qa.updatedAt)}</div>
        </div>
        <div className="shrink-0 flex flex-col gap-2">
          <Button onClick={() => props.onSave({ question: clampStr(q, 500), answer: clampStr(a, 10000) })} disabled={!dirty}>
            <Check className="w-4 h-4" />
            Save
          </Button>
          <Button variant="danger" onClick={props.onDelete}>
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
