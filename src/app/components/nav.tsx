import type React from "react";
import { BarChart3, BookOpen, HelpCircle, History, LogOut, Shield } from "lucide-react";
import type { Theme, User, View } from "../types";
import { Button, Card, CardContent, CardHeader, Chip, Input } from "../ui/primitives";
import { cn } from "../utils";

function NavBtn(props: { active?: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      onClick={props.onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
        props.active
          ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
          : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900",
        props.className
      )}
    >
      {props.children}
    </button>
  );
}

export function TopNav(props: {
  theme: Theme;
  setTheme: (t: Theme) => void;
  user: User | null;
  onLogout: () => void;
  view: View;
  setView: (v: View) => void;
}) {
  return (
    <header className="sticky top-0 z-20 backdrop-blur bg-white/70 dark:bg-zinc-950/60 border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center shadow-sm">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="leading-tight">
            <div className="font-semibold">Book Organizer</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Reading journal for chapters, summaries, and Q&A</div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" onClick={() => props.setTheme(props.theme === "dark" ? "light" : "dark")} title="Toggle light/dark">
            {props.theme === "dark" ? "Light" : "Dark"}
          </Button>

          {props.user ? (
            <>
              <nav className="hidden md:flex items-center gap-1">
                <NavBtn active={props.view.name === "library"} onClick={() => props.setView({ name: "library" })}>
                  Library
                </NavBtn>
                <NavBtn active={props.view.name === "analytics"} onClick={() => props.setView({ name: "analytics" })}>
                  <BarChart3 className="w-4 h-4" />
                  Analytics
                </NavBtn>
                <NavBtn active={props.view.name === "ai"} onClick={() => props.setView({ name: "ai" })}>
                  <HelpCircle className="w-4 h-4" />
                  AI Coach
                </NavBtn>
                <NavBtn active={props.view.name === "history"} onClick={() => props.setView({ name: "history" })}>
                  <History className="w-4 h-4" />
                  History
                </NavBtn>
                <NavBtn active={props.view.name === "settings"} onClick={() => props.setView({ name: "settings" })}>
                  Settings
                </NavBtn>
              </nav>

              <div className="hidden md:block w-px h-7 bg-zinc-200 dark:bg-zinc-800 mx-1" />

              <div className="hidden md:flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                <span className="truncate max-w-[220px]">{props.user.email}</span>
              </div>

              <Button variant="secondary" onClick={props.onLogout}>
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </>
          ) : (
            <Chip>Sign in to start</Chip>
          )}
        </div>
      </div>

      {props.user ? (
        <div className="md:hidden px-4 pb-3 max-w-6xl mx-auto">
          <div className="grid grid-cols-5 items-center gap-2">
            <NavBtn active={props.view.name === "library"} onClick={() => props.setView({ name: "library" })} className="flex-1 justify-center">
              Library
            </NavBtn>
            <NavBtn active={props.view.name === "analytics"} onClick={() => props.setView({ name: "analytics" })} className="flex-1 justify-center">
              Analytics
            </NavBtn>
            <NavBtn active={props.view.name === "ai"} onClick={() => props.setView({ name: "ai" })} className="flex-1 justify-center">
              AI
            </NavBtn>
            <NavBtn active={props.view.name === "history"} onClick={() => props.setView({ name: "history" })} className="flex-1 justify-center">
              History
            </NavBtn>
            <NavBtn active={props.view.name === "settings"} onClick={() => props.setView({ name: "settings" })} className="flex-1 justify-center">
              Settings
            </NavBtn>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function AuthPanel(props: {
  mode: "login" | "register";
  setMode: (m: "login" | "register") => void;
  email: string;
  setEmail: (s: string) => void;
  password: string;
  setPassword: (s: string) => void;
  error: string | null;
  busy: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="max-w-xl mx-auto mt-10">
      <Card>
        <CardHeader
          title={props.mode === "login" ? "Welcome back" : "Create your account"}
          subtitle={
            <span className="inline-flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Passwords are hashed locally (demo). For production, use a backend.
            </span>
          }
          right={
            <Button variant="ghost" onClick={() => props.setMode(props.mode === "login" ? "register" : "login")}>
              {props.mode === "login" ? "Register" : "Login"}
            </Button>
          }
        />
        <CardContent className="space-y-4">
          <Input label="Email" value={props.email} onChange={(e) => props.setEmail(e.target.value)} placeholder="you@example.com" />
          <Input
            label="Password"
            type="password"
            value={props.password}
            onChange={(e) => props.setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
          {props.error ? <div className="text-sm text-red-600 dark:text-red-400">{props.error}</div> : null}

          <Button className="w-full" onClick={props.onSubmit} disabled={props.busy}>
            {props.busy ? "Please wait..." : props.mode === "login" ? "Login" : "Create account"}
          </Button>

          <div className="text-xs text-zinc-500 dark:text-zinc-400">Tip: Once logged in, add a book, then create a chapter entry and write your summary + Q&A.</div>
        </CardContent>
      </Card>
    </div>
  );
}
