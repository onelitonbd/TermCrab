# Gateway HTTP API

Base URL: `http://127.0.0.1:7788` (config: `gateway.host` / `gateway.port`)

Auth: `Authorization: Bearer <gateway.token>` — or `?token=` for EventSource/SSE.
Get the token: `termcrab config get gateway.token`.
A paired device may send its **own** token instead (`termcrab pair` prints a
5-minute code; `POST /api/pair` exchanges it for a token shown once and stored
only as a hash). Revoke one device without touching the others:
`termcrab devices revoke <id|name>`.

## Endpoints

### `GET /api/health` (no auth)
```json
{ "ok": true, "name": "termcrab", "version": "0.1.0", "uptimeSec": 12, "provider": "mock:mock-1", "telegram": false }
```

### `GET /api/events` (SSE)
Server-sent events for live UIs. Query token required. Comment pings every 25s
keep proxies alive.

**Wire version `v: 1`.** Every frame is the event object plus `v` and a
monotonic `seq`, and its `type` is a safe token (letters, digits, `._:-`):

```json
{ "v": 1, "seq": 42, "ts": 1759500000000, "type": "tool:start", "name": "read_file", "args": { "path": "notes.md" } }
```

The families a client can rely on:

| Family | Types | When | Payload |
|---|---|---|---|
| `turn` | `delta`, `draft`, `error`, `approval`, `steer`, `stop` | a turn streams, wants a yes/no, or is stopped | text, or approval `{id, tool, args}` |
| `tool` | `tool:start`, `tool:end` | one tool call begins and finishes | `name`, `args`, `toolCallId`, `ok`, `result` (trimmed to 200 chars on the wire) |
| `run` | `run:start`, `run:end` | a run starts and ends | `runId`, `sessionId`, `text`, `iterations`, `usage`, `costUsd` |
| `thinking` | `thinking:delta`, `thinkingCaps` | the model thinks out loud, or the model list changes | text, or per-model caps |
| `voice` | `wake`, `tts:chunk`, `stt:result` | the wake loop hears, speaks or transcribes | text, reason |
| `canvas` | `canvas:update`, `canvas:remove` | a canvas document changes | canvas id, patch |
| `channel` | `discord:message`, `matrix:message`, `signal:message`, `slack:message`, `sms:message` | a message arrives on a channel | channel, chat, userId, text |
| `schedule` | `cron` | a scheduled job fires or is edited | job id, name, next run |
| `memory` | `dream` | memory is consolidated | file, count, by |
| `panel` | `update`, `tasks`, `ask` | the panel reloads config, suggests a task, or asks a question | section, suggestions, question |
| `session` | `session:reset` | a conversation's working context starts over (the transcript is archived, not deleted) | sessionId, reason |

Unknown *types* may appear later and a client must ignore what it does not
know; an unknown `v` may not be ignored — refuse it rather than mis-read it.
A test walks the source, so a new event type cannot ship undocumented.

```bash
curl -N "http://127.0.0.1:7788/api/events?token=$TOKEN"
```

### `POST /api/pair` (no token needed)
```json
{ "code": "K7M2QX", "name": "pixel" }
```
→ `200 { "ok": true, "v": 1, "device": { "id": "9f3a1c02", "name": "pixel" }, "token": "tc_dev_…" }`
The code is printed by `termcrab pair`, lives 5 minutes and is single use.
Wrong or expired codes answer `401` with a reason (`expired` / `unknown`), and
the route is rate limited per IP, so a code cannot be brute-forced.

### Approvals
A gated tool (any name in `security.approvals.tools`) pauses the turn *before*
it runs and emits an `approval` event over SSE (`{id, tool, args, sessionId,
createdAt, timeoutSec}`). Answer it with `POST /api/approvals/:id/approve` (or `.../deny`) — the panel
button and `termcrab approvals approve|deny <id>` both call it, and `termcrab
agent` asks `y/N` right in the terminal when that is the surface in front of
you (a non-interactive run is told which command to use instead). Nobody answering means the configured
`security.approvals.onTimeout` default (deny), and the decision is written into
the transcript as a `[approval] <tool> <decision> by <who>` line.

### `GET /api/devices`
```json
{ "ok": true, "v": 1, "count": 1, "devices": [ { "id": "9f3a1c02", "name": "pixel", "createdAt": "…", "lastSeenAt": "…", "seenCount": 12, "current": true } ] }
```
Token hashes are never returned. `POST /api/devices/revoke {id|name}` removes
one device; its token stops working on the next request.

### `POST /api/chat`
```json
{ "message": "list files in my workspace", "sessionId": "web:main" }
```
Headers: `authorization: Bearer <token>`, optional `idempotency-key: <any string>`.
→ `202 { "turnId": "…", "sessionId": "web:main", "status": "queued" }` (runs the full agent loop)
Conversation history: `GET /api/sessions` lists chats; each session's working
context can start over by policy (`agent.sessionReset` = `never` | `daily` |
`idle:<minutes>`), which archives the live transcript into
`<session>.archive.jsonl` — nothing is deleted, and `termcrab sessions search`
still finds it.
Retrying with the same `idempotency-key` (day-long memory) returns the same run
with `"replayed": true` instead of starting a second turn — a phone that loses
the answer must not pay for the question twice.
A bad body answers `400 { "error": "message required", "field": "message" }`;
too many requests answer `429 { "error": "Too many messages at once — try again in 4s.", "retryAfterMs": 3600, "limit": { "perMinute": 60, "burst": 10 } }`
with a `retry-after` header.

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

Non-2xx responses: `{ "error": "message" }` (plus `field` when a body was wrong).
`401` = missing/invalid token (or a bad pairing code), `404` = unknown id,
`429` = rate limited (`retryAfterMs` says when to try again).

## Rate limits

Every key — a device token, the master token, or a peer address — has a token
bucket (`gateway.rateLimit = { perMinute, burst }`, default 60/minute with a
burst of 10). Chat submissions, webhooks and each channel chat share the same
rule; a full bucket answers immediately instead of queueing more turns.

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
