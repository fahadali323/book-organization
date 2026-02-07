import { BookOpen, ChevronRight, Edit3, ListChecks, Trash2 } from "lucide-react";
import type { Book } from "../types";
import { Button, Card } from "../ui/primitives";
import { statusChip } from "./common";

export function BookCard(props: {
  book: Book;
  chapterCount: number;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="p-4 md:p-5 flex gap-3">
        <div className="w-14 h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
          {props.book.coverDataUrl ? <img src={props.book.coverDataUrl} alt="cover" className="w-full h-full object-cover" /> : <BookOpen className="w-6 h-6 text-zinc-500" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0">
              <div className="font-semibold truncate">{props.book.title}</div>
              <div className="text-sm text-zinc-600 dark:text-zinc-300 truncate">{props.book.author}</div>
            </div>
            <div className="ml-auto">{statusChip(props.book.status)}</div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 items-center text-xs text-zinc-600 dark:text-zinc-300">
            {props.book.genre ? <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">{props.book.genre}</span> : null}
            <span className="inline-flex items-center gap-1">
              <ListChecks className="w-4 h-4" />
              {props.chapterCount} chapters
            </span>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button onClick={props.onOpen} className="flex-1">
              Open
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="secondary" onClick={props.onEdit} title="Edit book">
              <Edit3 className="w-4 h-4" />
            </Button>
            <Button variant="danger" onClick={props.onDelete} title="Delete book">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
