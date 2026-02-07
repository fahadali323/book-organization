# Docker + CI/CD Guide

This project now supports:
- Running the app in a single Docker container (frontend + API proxy).
- CI build validation on every PR/push.
- Docker image publishing to Docker Hub on push to `main`/`master` and tags.

## Local Docker Run

Build:

```bash
docker build -t book-organizer:local .
```

Run:

```bash
docker run --rm -p 8787:8787 book-organizer:local
```

Open:

`http://localhost:8787`

## Docker Hub Publishing (GitHub Actions)

Workflow file:

`.github/workflows/ci-dockerhub.yml`

Set these repository secrets in GitHub:
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN` (Docker Hub access token)

The workflow will:
1. Install dependencies and run `npm run build` as the test/build check.
2. Build and push Docker images to:
   - `<DOCKERHUB_USERNAME>/book-organizer`

Generated tags include:
- branch name
- git tag (`v*`)
- commit SHA
- `latest` (default branch)

## Optional Runtime Env Vars

- `PORT` (default `8787`)
- `AI_PROXY_PORT` (default `8787`)
- `SERVE_WEB_APP` (default `1`)
- `AI_ALLOWED_ORIGINS` (comma-separated list)
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`
