# Agent / LLM Instructions (Project Reference)

This document is designed to be used as a **retrieval + grounding** guide for an agentic workflow (Cursor, Claude, GPT, Copilot, etc.). It explains the project structure, data model, key flows, and safe extension patterns.

---

## 1) Repository structure

```
book-organizer/
  index.html
  package.json
  postcss.config.cjs
  tailwind.config.cjs
  tsconfig.json
  tsconfig.node.json
  vite.config.ts
  src/
    main.tsx
    index.css
    App.tsx
```

**Single-file application:** The entire application logic and UI lives in `src/App.tsx`.

---

## 2) Runtime model

- The app is **local-first** and **client-only**.
- Persistence: `localStorage` (JSON).
- Authentication: demo-only, uses **SHA-256** hashing via Web Crypto to store a password hash per email.

### Storage keys

| Purpose | Key |
|---|---|
| All users list | `bo_users_v1` |
| Current session user id | `bo_session_v1` |
| Per-user data blob | `bo_user_<USER_ID>_data_v1` |
| Theme selection | `bo_theme_v1` |

> Agents should search for: `KEY_USERS`, `KEY_SESSION`, `userDataKey()`, `bo_theme_v1`.

### Theme

- UI toggles between light/dark using:
  - `document.documentElement.classList.toggle("dark", theme === "dark")`
  - `document.documentElement.setAttribute("data-theme", theme)`
- Tailwind config supports: `darkMode: ["class", '[data-theme="dark"]']`.

---

## 3) Data model (TypeScript types)

Defined in `src/App.tsx`:

- `User { id, email, passwordHash, createdAt }`
- `Book { id, title, author, genre?, coverDataUrl?, status, startedAt?, finishedAt?, createdAt, updatedAt }`
- `ChapterEntry { id, bookId, number?, title?, completedAt?, summary, takeaways, quotes, reflection, createdAt, updatedAt }`
- `QA { id, chapterId, question, answer, createdAt, updatedAt }`
- `HistoryEvent { id, type, ts, userId, bookId?, chapterId?, qaId?, label, meta? }`
- `UserData { books[], chapters[], qas[], history[] }`

> Agents should search for: `type Book`, `type ChapterEntry`, `type QA`, `type HistoryEvent`.

---

## 4) Views (navigation state machine)

`type View`:
- `library`
- `book` (bookId)
- `chapter` (bookId, chapterId)
- `history`
- `settings`

Navigation is controlled by `view` state in `App()` and rendered via conditional blocks.

> Agents should search for: `type View`, `setView({ name: ... })`.

---

## 5) Core flows

### Auth flow

- Register/Login handled by `handleAuth()`:
  - Email normalized to lowercase.
  - Password hash computed: `sha256(\`\${email}::\${password}\`)`.
  - Users stored in `bo_users_v1`.
  - Session stored in `bo_session_v1`.
- On session change, per-user data is loaded/saved with `userDataKey(sessionUserId)`.

**Important:** This is not production auth. Treat as demo only.

---

### Book flow

- Add/Edit handled by `BookModal` + `onSave`.
- Delete book: removes related chapters and QAs in a single state update.
- Book list sorted by `updatedAt` desc.

---

### Chapter flow

- Chapters grouped by book in `chaptersByBook` memo.
- Create chapter: inserts a blank `ChapterEntry` and navigates to it.
- Save chapter: updates chapter + bumps parent book `updatedAt`.
- Delete chapter: removes chapter + its QAs.

---

### Q&A flow

- Create QA: inserts `QA` for current chapter.
- Save QA: updates QA + bumps parent book `updatedAt`.
- Delete QA: removes QA by id + bumps parent book `updatedAt`.

---

### History flow

All major actions call `pushHistory()` with an event type and label.

Event types: `book_created`, `book_updated`, `book_deleted`, `chapter_created`, `chapter_updated`, `chapter_deleted`, `qa_created`, `qa_updated`, `qa_deleted`, `export`.

---

### Export flow

`exportMarkdown()` generates Markdown for:
- entire library OR
- one book (via `{ bookId }`)

Download uses `downloadText()` (Blob URL + delayed cleanup).

---

## 6) Development guidelines for agents

### When adding new features

Prefer to:
1. Add/extend **types** near the top of `App.tsx`.
2. Extend `UserData` shape and initialize `emptyUserData`.
3. Update `load/save` behavior (it’s automatic via `useEffect` persisting `data`).
4. Add UI blocks in the correct view.

### Avoid breaking localStorage schema

- Any schema change should include a safe migration in `loadJson()` usage or a version bump in storage keys.
- If you must change schema:
  - Add a new versioned key (e.g., `bo_user_<id>_data_v2`)
  - Provide a migration routine that reads v1 and writes v2

---

## 7) Adding LLM / agentic features (recommended architecture)

### ⚠️ Do NOT call LLMs directly from the browser in production

Reasons:
- API keys would be exposed to end-users
- No rate limiting / abuse prevention
- No audit logs or policy controls

### Recommended: Backend proxy pattern

Add a backend service with these endpoints:

#### `POST /api/ai/generate-questions`
**Input**
```json
{
  "book": { "title": "...", "author": "..." },
  "chapter": { "label": "Chapter 3: ...", "summary": "...", "takeaways": "...", "reflection": "..." },
  "count": 8,
  "difficulty": "mixed",
  "style": "comprehension"
}
```

**Output**
```json
{
  "questions": [
    { "id": "q1", "question": "...", "rubric": "..." }
  ]
}
```

#### `POST /api/ai/grade`
**Input**
```json
{
  "book": { "title": "...", "author": "..." },
  "chapter": { "label": "...", "summary": "...", "takeaways": "..." },
  "answers": [
    { "questionId": "q1", "question": "...", "studentAnswer": "..." }
  ]
}
```

**Output**
```json
{
  "results": [
    { "questionId": "q1", "score": 0-100, "feedback": "...", "idealAnswer": "..." }
  ]
}
```

### Prompting specification (server-side)

- Use **strict JSON output** (no markdown).
- Temperature low (0.1–0.3).
- Enforce validation:
  - score is `0..100`
  - feedback max length (e.g., 1–2k)
  - questions non-empty

### Guardrails

- Rate limit per user (e.g., 10 req/min).
- Add request logging (hashed user id) for observability.
- Validate payload sizes to avoid huge prompts.
- Consider adding content filters depending on age group.

### Mapping AI outputs into app data

If you add an "AI Coach" tab later, likely additions:
- `GeneratedQuestion` list per chapter (store in `UserData`)
- `GradeResult` history per chapter
- UI to trigger generation and grading

Search keywords for agents:
- `type UserData`, `exportMarkdown`, `pushHistory`, `ChapterView`, `QAEditor`.

---

## 8) Agent instructions: how to answer "Where should I change X?"

**Theme toggle not working?**
- Check `applyTheme()` and the root `div` styles.
- Check `tailwind.config.cjs` for darkMode.
- Ensure `src/index.css` is imported in `main.tsx`.

**Export/Download not working?**
- Check `downloadText()` implementation.
- Some sandboxes block downloads; implement copy-to-clipboard fallback (already present in ExportModal).

**Delete QA not working?**
- Confirm the state update filters by `qa.id !== qaId`.
- Ensure `qasByChapter` memo depends on `data.qas`.

---

## 9) Known limitations

- No real backend, no multi-device sync
- localStorage can be cleared by browser
- Demo auth only
- No AI features in this repo yet (only extension guidance)

---

## 10) “Prompt pack” for agents (copy/paste)

### A) Implement AI Coach tab (frontend)
> Add a new `View` called `"ai"`, a nav button, and an `AIView` component. Store AI config and results in `UserData`. The UI should allow: select book+chapter, generate questions, answer questions, grade answers, display rubric/feedback, and persist to localStorage. Use a backend proxy (`/api/ai/*`) — do not store API keys in the browser.

### B) Implement backend proxy (Node/Express)
> Build endpoints `/api/ai/generate-questions` and `/api/ai/grade`. Call the chosen LLM provider server-side (OpenAI/Anthropic). Enforce strict JSON schema, validate inputs/outputs, add rate limiting, and include structured logs per request. Return normalized JSON to the frontend.

