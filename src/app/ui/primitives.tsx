import type React from "react";
import { cn } from "../utils";

export function Card(props: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white/70 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 shadow-sm",
        props.className
      )}
    >
      {props.children}
    </div>
  );
}

export function CardHeader(props: { title: React.ReactNode; subtitle?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="p-4 md:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-start gap-3">
      <div className="min-w-0">
        <div className="text-base md:text-lg font-semibold text-zinc-900 dark:text-zinc-100 truncate">{props.title}</div>
        {props.subtitle ? <div className="text-sm text-zinc-600 dark:text-zinc-300 mt-1">{props.subtitle}</div> : null}
      </div>
      <div className="ml-auto shrink-0 flex items-center gap-2">{props.right}</div>
    </div>
  );
}

export function CardContent(props: { className?: string; children: React.ReactNode }) {
  return <div className={cn("p-4 md:p-5", props.className)}>{props.children}</div>;
}

export function Button(props: {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
  type?: "button" | "submit";
}) {
  const v = props.variant ?? "primary";
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";
  const styles: Record<string, string> = {
    primary: "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100",
    secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700",
    ghost: "bg-transparent text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800",
    danger: "bg-red-600 text-white hover:bg-red-500 dark:bg-red-600 dark:hover:bg-red-500",
  };
  return (
    <button
      type={props.type ?? "button"}
      title={props.title}
      disabled={props.disabled}
      onClick={props.onClick}
      className={cn(base, styles[v], props.className)}
    >
      {props.children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block">
      {props.label ? <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-1">{props.label}</div> : null}
      <input
        {...props}
        className={cn(
          "w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10",
          props.className
        )}
      />
    </label>
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: string }) {
  return (
    <label className="block">
      {props.label ? (
        <div className="flex items-end justify-between gap-3 mb-1">
          <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{props.label}</div>
          {props.hint ? <div className="text-xs text-zinc-500 dark:text-zinc-400">{props.hint}</div> : null}
        </div>
      ) : null}
      <textarea
        {...props}
        className={cn(
          "w-full min-h-[120px] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10",
          props.className
        )}
      />
    </label>
  );
}

export function Chip(props: { children: React.ReactNode; tone?: "neutral" | "ok" | "warn"; className?: string }) {
  const tone = props.tone ?? "neutral";
  const styles: Record<string, string> = {
    neutral: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
    ok: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200",
    warn: "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", styles[tone], props.className)}>{props.children}</span>;
}

export function Divider() {
  return <div className="h-px bg-zinc-200 dark:bg-zinc-800" />;
}
