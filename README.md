# Book Organizer (Reading Journal)

A local-first React + TypeScript app for tracking books, writing chapter summaries, and creating comprehension Q&A.

> Data is stored in your browser (`localStorage`) for app content.
> AI requests go through a local backend proxy (`/api/ai/*`) with provider routing and security controls.

## Features

- Basic demo auth (register/login) using SHA-256 hashing via Web Crypto
- Per-user data isolation (separate localStorage keys per user id)
- Book library: add/edit/delete books (title, author, genre, status, start/finish dates, cover image)
- Chapter entries per book:
  - Summary, Key Takeaways, Quotes, Reflection
  - Completion date
- Comprehension Q&A per chapter (create/edit/delete questions + answers)
- History timeline (create/update/delete actions)
- Export to Markdown (library-wide or per-book)
- AI Coach with selectable providers:
  - Ollama (local)
  - OpenAI
  - Anthropic (Claude)

## Docs

- Docker + CI/CD: `docs/docker-cicd.md`
- Agent/project reference: `docs/agent-reference.md`

## Tech

- Vite + React 18 + TypeScript
- Tailwind CSS (utility classes)
- Framer Motion (page transitions)
- lucide-react icons
- Local Node/Express AI proxy for provider calls and request validation

## Quickstart

### Prereqs
- Node.js 18+ (recommended: 20+)
- npm (or pnpm/yarn if you prefer)

### Install
```bash
npm install
```

### Run dev
Terminal 1 (AI proxy):
```bash
npm run dev:server
```

Terminal 2 (frontend):
```bash
npm run dev
```

Open the printed URL (usually `http://localhost:5173`).

Optional combined command:
```bash
npm run dev:full
```

### AI provider setup

Configure UI defaults in `.env.local` (optional):
```bash
cp .env.example .env.local
```

Configure backend proxy defaults and policies (optional):
```bash
cp .env.server.example .env.server.local
```

### Use AI Coach with Ollama (local model)
1. Install and run Ollama (`ollama serve`).
2. Pull at least one model, for example:
```bash
ollama pull tinyllama:latest
```
3. In app, go to `Settings -> AI provider setup`.
4. Select `Ollama`, set model/base URL, then save.

### Use AI Coach with OpenAI or Anthropic
1. In app, go to `Settings -> AI provider setup`.
2. Select `OpenAI` or `Anthropic`, choose model, and save.
3. Set API key in `Cloud API keys (session only)`.
   - Keys are kept in memory only for the current tab session by default.
4. Generate/grade from the AI Coach tab.

### Build
```bash
npm run build
npm run preview
```

## Security model

- Password auth in this project is demo-only and localStorage-based.
- AI requests are sent to a local backend proxy (`server/index.mjs`) that adds:
  - allowlist-based origin checks
  - request size limit
  - in-memory rate limiting
  - strict provider/input normalization
  - unified error responses (no key echoing)
- Cloud API keys can be provided:
  - as server env vars (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) or
  - via Settings UI as session-only keys (sent to proxy per request, not persisted in localStorage).

## Suggested production architecture

- Backend: Node/Express, NestJS, Spring Boot, etc.
- DB: Postgres/MySQL
- Auth: sessions or JWT + refresh tokens, password hashing on server (bcrypt/argon2)
- Storage: S3/GCS for cover images
- Export: server endpoint for generating PDF/MD, or signed URL downloads
- AI: server-side proxy to OpenAI/Anthropic/Ollama with audit logs, rate limiting, and secret management

## License

MIT (add/change as you prefer).
