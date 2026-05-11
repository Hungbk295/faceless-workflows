# Faceless Studio (TS rewrite)

Rewrite của `faceless_studio_v3.html` sang TypeScript với SQLite + Bun + React.

## Architecture

- **Server:** Bun + Hono + Drizzle ORM + SQLite (single file at `~/.faceless-studio/faceless.db`)
- **Client:** Vite + React 18 + TypeScript strict + CSS Modules
- **Shared:** types + zod schemas dùng chung
- **Voice clips:** stored as `.mp3` files at `~/.faceless-studio/clips/<channel-id>/<num>.mp3`

## Setup

```bash
cd faceless-studio
bun install
bun run db:push      # apply Drizzle schema → ~/.faceless-studio/faceless.db
bun run dev          # starts both server (:3007) and client (:5177)
```

Open http://localhost:5177

## Scripts

- `bun run dev` — start both server + client in parallel
- `bun run dev:server` — server only on :3007 (override với `PORT=...`)
- `bun run dev:client` — Vite client only on :5177
- `bun run build` — production build (client static + server bundle)
- `bun run db:push` — apply schema changes to DB
- `bun run db:generate` — generate migration files from schema
- `bun run typecheck` — tsc --noEmit across all workspaces

## Data location

```
~/.faceless-studio/
├── faceless.db          # SQLite — channels, scripts, scenes, ...
├── clips/               # voice mp3 files
│   └── <channel-id>/
│       └── 001.mp3
└── exports/             # downloaded backups (.faceless.json, .db)
```

⚠️ **Security note:** `faceless.db` chứa TTS API keys (ElevenLabs, etc.) plaintext. File chỉ readable bởi user (mode 600). Backup và share cẩn thận.

## See also

- `../PLAN_TS_REWRITE.md` — full architecture decisions + 14-stage type definitions
- `../faceless_studio_v3.html` — primary reference (1:1 port target)
# faceless-workflow
