# SoporteWhatsApp

WhatsApp support-ticket app. Two independent npm packages; no root workspace scripts and the root `package-lock.json` is empty. Install and run each side from its own directory.

## Commands

```sh
# backend  (Express 5, CommonJS, port 3000)
cd backend && npm install
npm run dev          # nodemon src/app.js
npm start            # production start
npm run seed         # prisma seed (needs DB up)
npm run cleanup      # manual run of uploads cleanup (also runs nightly via cron)

# frontend (Vue 3 + Vite, port 5173)
cd frontend && npm install
npm run dev
npm run build
```

- No tests (`npm test` is a stub). No linter/typecheck configured. Verify by running servers and hitting `/api/health`.
- Schema changes: there is **no `prisma/migrations/` folder**. Apply via `npx prisma db push` against the local PostgreSQL DB `soporte_whatsapp` (`DATABASE_URL` in `backend/.env`). Root `*.sql` dumps are gitignored — `schema.prisma` is the only versioned schema source.

## Architecture

- **Backend** (`backend/src/app.js` is the entry): Express + Prisma + Socket.IO. All route mounting in `app.js`. Spanish API paths: `/api/auth`, `/api/tickets`, `/api/contactos`, `/api/users`, `/api/stats`, `/api/excluidos`, `/api/chat-directo`, `/api/webhooks`. Server listens on `server`, not `app` (Socket.IO requirement).
- **Frontend**: Vue 3 `<script setup>`, Pinia, Vue Router, Tailwind 4, Chart.js. `@` alias → `src`. JWT persisted in localStorage. `VITE_API_URL` defaults to `http://localhost:3000/api`.
- **Auth**: JWT Bearer; roles `supervisor` / `tecnico`. Supervisor-only routes gated by `checkSupervisorRole` middleware and router `meta.requiresSupervisor`. Socket.IO authenticates via `handshake.auth.token`.
- **Webhook** `POST /api/webhooks/whatsapp` is public (OpenWA callback). Dedupes on `whatsappMessageId`; ignores groups (`@g.us`); excluded numbers are ignored, `chat_privado` numbers route to direct chat instead of tickets. Incoming media is downloaded to `backend/uploads/` and served at `/uploads`.

## Database (Prisma, PostgreSQL)

- Spanish model names mapped to Spanish tables: `usuarios`, `tickets`, `mensajes`, `auditoria`, `numeros_excluidos`, `mensajes_directos`, `contactos`. Fields are Spanish too (`contraseñaHash`, `numeroCliente`).
- Ticket `estado` values: `nuevo`, `asignado`, `esperando`, `resuelto`, `cerrado`. Open states live in `ESTADOS_ABIERTOS` in `backend/src/services/ticketService.js`.
- Seed creds: `supervisor@empresa.com` / `admin123`, `tecnico@empresa.com` / `tecnico123` (other techs also `tecnico123`).

## Env / secrets

- `backend/.env` is gitignored and holds real secrets (DATABASE_URL, JWT_SECRET, OPENWA_API_KEY). Never commit it. Local DB user/pass: `postgres:admin@localhost:5432`.
- No backend `.env.example` exists; use `backend/.env` as the reference for required vars.

## WhatsApp integration (OpenWA)

- External gateway at `OPENWA_API_URL` (default `http://localhost:2785`), needs its own session (`OPENWA_INSTANCE_ID`).
- `openwaService.formatPhoneNumber` assumes Mexico (`52`/`521`) unless the number starts with `34` (Spain).

## Conventions

- Codebase language is Spanish: comments, logs, and UI strings. Match it.
- Backend is CommonJS (`require`); frontend is ESM (`import`).
- Branch workflow: feature branches `rama-<name>`, merged into `main` via PR.
- `backend/uploads/*` and `backend/generated/` are gitignored (stale custom Prisma client output — runtime uses `@prisma/client` default output).
- Cron deletes old uploads nightly at 2 AM (`backend/src/cron/cleanupCron.js`).
