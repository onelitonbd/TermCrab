# Gateway, auth and security

**Their pages** ([`../sections/08-gateway-and-ops.md`](../sections/08-gateway-and-ops.md), [`../sections/05-capabilities.md`](../sections/05-capabilities.md)):
`/gateway` · `/gateway/authentication` · `/gateway/security` (16 pages) · `/gateway/protocol` (13 pages) · `/gateway/configuration` · `/gateway/sandboxing` · `/channels/pairing` · `/security` · `/auth-credential-semantics` · `/start/why-openclaw` (the trust-boundary essay)

---

## 1. Why this is the most urgent section

ThermCrab has a working gateway with **77 route handlers** and a written auth module that **nothing imports**. The code says it in a comment at `src/gateway/server.ts:702`: *"Everything else under `/api` is open (login system removed for now)."* The webhook route repeats it at `:691`: *"Validate hook token (login system removed — hooks are open)"*.

Today, any process (or any device on the same LAN if the bind guard is bypassed) can read your memory, run tools, send messages as you, and trigger agent turns. Every other security property in the project — root-bounded file tools, `exec` allow/deny, secret redaction, zero dependencies — is undermined by that one gap, because the attacker never needs to break in; the front door is a doorway with no door.

## 2. What they document — and what it cost them to learn

- **Token + device pairing**: device identity, challenge nonce, explicit approval, a pairing store. A device is not trusted because it is on the network.
- **Typed wire protocol** (TypeBox → JSON Schema → generated Swift models) with idempotency keys for side effects — the protocol enforces safety, not just documents it.
- **Trust boundary** as an explicit architecture: *trusted gateway, untrusted execution, deterministic policy, versioned state*. They wrote an 8-page essay about the boundary (`/start/why-openclaw` and its children).
- **Sandboxing** with workspace roots and install policies; **provenance-gated** memory writes; **operator scopes** and named roles.
- **And the scars**: CVE-2026-25253 (zero-click WebSocket hijacking, CVSS 8.8) and "ClawHavoc" (1,467 malicious skills in the registry within weeks). Their docs are this careful because they were this careless once, in public, at 390k stars.

## 3. Where TermCrab is — the honest audit

**Real:**
- `src/gateway/auth.ts:16` `checkToken` — constant-time comparison, header or query, tested.
- Bind guard at `src/gateway/server.ts:257-262`: refuses to start on a non-loopback bind without a token.
- File tools are root-bounded (`tools.ts:22,97`) with a helpful refusal message.
- `exec` is off unless `agent.allowExec=true` (`tools.ts:271`).
- Zero runtime dependencies → no `npm install` attack surface and no lockfile drift.
- No skill registry → nothing to poison. This is a *by-construction* security property that OpenClaw cannot have.

**Broken:**
1. `checkToken` is exported and imported **nowhere**. Every `/api/*` route is open.
2. `POST /api/hooks/:id` accepts unauthenticated requests and enqueues an agent turn (validated against `config.hooks` only by id — the id is in the URL, the token check is commented out).
3. The approvals module (`src/core/approvals.ts`) has zero call sites, so dangerous tools have no human gate; `GET /api/approvals` always returns `[]`.
4. No sandbox: `exec` is allow/deny only; a run has your whole home directory.
5. No rate limiting / loop protection — a Telegram bot loop or a malicious hook can drain API credit.

## 4. The gap, sized

| Item | Effort | Note |
|---|---:|---|
| Enforce `checkToken` on `/api/*` | **0.5d** | one place: the prefix check at `server.ts:702` |
| Re-enable webhook token validation | **0.5d** | the TODO at `server.ts:691` |
| Token rotation + `termcrab token show/rotate` | 0.5d | make it operable, not just present |
| Approvals gating dangerous tools | 5d | the module is written; wire it into the tool dispatch in `loop.ts` |
| Device pairing (challenge + approval) | 4d | needed the day you expose this beyond loopback |
| Sandboxing (workspace roots for runs) | 8d | can be deferred; document it honestly first |
| Rate limiting / loop protection | 2d | protects your API bill, not just your data |

**Total to remove every outright hole: ~6.5 days.** Pairing and sandboxing can wait; the first three rows cannot, and together they are **one day**.

## 5. The move

Week one of the roadmap, in this order:

1. Enforce the token on the `/api/*` prefix (`server.ts:702`). Add a test that every route under `/api/` returns 401 without a bearer token — a loop over a route table, so new routes are covered by default.
2. Re-enable the hook token check (`server.ts:691`) and make `hooks[].token` mandatory in config validation.
3. Add `termcrab token show|rotate` so a user can actually operate it.
4. Then wire approvals into the tool dispatch so `exec`, `write_file` outside the allowed roots, and channel sends can require a human decision (with a timeout that denies, not allows).
5. Write it down: `docs/SECURITY.md` should state, in one page, exactly what is protected and what is not — including "there is no sandbox yet". An honest threat model is a feature; their CVEs are what a dishonest one costs.

## 6. The strategic framing to keep

Their security architecture is expensive: pairing, scopes, sandboxes, policy-by-code, signed everything. Yours can be *simpler and still defensible* because of two facts only you have: **the device is loopback-first**, and **there is no registry**. A single-owner phone agent does not need operator roles. It needs the door locked and the list of what is behind it written down.

When you write the launch post for this project, the sentence to be able to say is: *"There is no telemetry, no registry, no dependencies, and the API answers only to a token that lives on the device."* Three of those four are already true. The fourth is a one-day change.
