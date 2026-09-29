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
→ `{ "sessions": [ { "id": "web:main", "messages": 12, "modified": 1790000000 } ] }`

### `GET /api/sessions/:id`
→ `{ "messages": [ …transcript entries… ] }`

### `DELETE /api/sessions/:id`
Resets the session (backs up the JSONL file).

### `GET /api/skills`
→ `{ "skills": [ { "name": "web-research", "description": "…", "origin": "builtin" } ] }`

### `GET /api/memory`
→ `{ "head": "…MEMORY.md head…", "stats": { "memoryBytes": 512, "dailyFiles": 3 } }`

### `POST /api/heartbeat`
Runs one proactive tick now (battery-aware).
→ `{ "ran": true, "reason": "battery 88% (charging)", "output": "…" }`

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
