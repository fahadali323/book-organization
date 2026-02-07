import type { BookStatus, ChapterEntry } from "../types";
import { Chip } from "../ui/primitives";

export function statusChip(status: BookStatus) {
  switch (status) {
    case "completed":
      return <Chip tone="ok">Completed</Chip>;
    case "abandoned":
      return <Chip tone="warn">Abandoned</Chip>;
    default:
      return <Chip>In progress</Chip>;
  }
}

export function InfoStat(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{props.label}</div>
      <div className="mt-1 font-semibold">{props.value}</div>
    </div>
  );
}

export function chapterLabel(ch: ChapterEntry) {
  const num = typeof ch.number === "number" && !Number.isNaN(ch.number) ? `Chapter ${ch.number}` : "Chapter";
  const title = ch.title?.trim();
  if (title) return `${num}: ${title}`;
  return num;
}
