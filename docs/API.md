# Gateway HTTP API

Base URL: `http://127.0.0.1:7788` (config: `gateway.host` / `gateway.port`)

Auth: `Authorization: Bearer <gateway.token>` — or `?token=` for EventSource/SSE.
Get the token: `termcrab config get gateway.token`

## Endpoints

### `GET /api/health` (no auth)
```json
{ "ok": true, "name": "termcrab", "version": "0.1.0", "uptimeSec": 12, "provider": "mock:mock-1", "telegram": false }
```

### `GET /api/events` (SSE)
Server-sent events for live UIs. Query token required.
Events: `run:start`, `delta`, `tool:start`, `tool:end`, `run:end`, `error` (agent shapes),
plus `heartbeat`-related log lines. Comment pings every 25s keep proxies alive.

```bash
curl -N "http://127.0.0.1:7788/api/events?token=$TOKEN"
```

### `POST /api/chat`
```json
{ "message": "list files in my workspace", "sessionId": "web:main" }
```
→ `200 { "text": "<final reply>", "sessionId": "web:main" }` (runs the full agent loop)

### `GET /api/sessions`
→ `{ "sessions": [ { "id": "web:main", "messages": 12, "modified": 1790000000, "bytes": 4096 } ] }`
→ `{ "sessions": [ { "id": "web:main", "messages": 12, "modified": 1790000000 } ] }`

### `GET /api/sessions/:id`
→ `{ "messages": [ …transcript entries… ] }`

### `DELETE /api/sessions/:id`
Resets the session (backs up the JSONL file).

### `GET /api/sessions/:id/export`
→ `{ "id": "web:main", "markdown": "# Chat: web:main…" }` (404 if unknown)

### `POST /api/sessions/:id/rename` — body `{ "to": "new-id" }`
→ `{ "ok": true }` · 404 unknown · 409 taken · 400 bad characters

### `POST /api/sessions/purge` — body `{ "olderThanDays": 30 }`
→ `{ "removed": 3, "freedBytes": 12345 }` (really deletes old chats)

### `GET /api/dreams`
→ `{ "lastDreamAt": 1790000000000, "history": [ { "day": "2026-09-29", "line": "…" } ] }`

### `GET /api/skills`
→ `{ "skills": [ { "name": "web-research", "description": "…", "origin": "builtin" } ] }`

### `GET /api/memory`
→ `{ "head": "…MEMORY.md head…", "stats": { "memoryBytes": 512, "dailyFiles": 3 } }`

### `POST /api/heartbeat`
Runs one proactive tick now (battery-aware).
→ `{ "ran": true, "reason": "battery 88% (charging)", "output": "…" }`

### `GET /api/crons`
→ `{ "crons": [ { "id", "name", "schedule", "prompt", "enabled", "critical", "nextRun": "ISO" } ] }`

### `POST /api/crons`
Body: `{ "name": "weekday", "schedule": "0 8 * * 1-5", "prompt": "briefing", "critical": false }`
→ `200 { "cron": { … } }` or `400 { "error": "<schedule explanation>" }`

### `DELETE /api/crons/:id`
### `POST /api/crons/:id/run` — fire the job now → `{ "output": "…" }`
### `POST /api/crons/:id/enable` / `.../disable`

SSE also emits a `cron` event when a scheduled job fires.

## Errors

Non-2xx responses: `{ "error": "message" }`. `401` = missing/invalid token.

## Example session

```bash
TOKEN=$(node dist/src/bin/termcrab.js config get gateway.token)
curl -s localhost:7788/api/health
curl -s -X POST localhost:7788/api/chat \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"message":"remember that I love masala chai"}'
curl -s localhost:7788/api/memory -H "authorization: Bearer $TOKEN"
```
