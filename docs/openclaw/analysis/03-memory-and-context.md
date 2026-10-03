# Memory and context

**Their pages** ([`../sections/04-agents.md`](../sections/04-agents.md), [`../sections/05-capabilities.md`](../sections/05-capabilities.md)):
`/concepts/memory` · `/concepts/memory-builtin` · `/concepts/memory-search` · `/concepts/active-memory` · `/concepts/memory-honcho` · `/concepts/compaction` · `/concepts/context` · `/concepts/context-engine` · `/concepts/session-pruning` · `/concepts/dreaming` · `/reference/session-management-compaction`

---

## 1. The two-sentence version

This is TermCrab's **lowest-scoring area (23%)** and the one that decides whether the product is an agent or a toy. Two defects make the agent forget *by construction*: the prompt reads the **head** of `MEMORY.md` while new facts are **appended** to the tail, and "compaction" **deletes** history instead of summarising it.

## 2. What they document

- **A memory store with tiers**: `MEMORY.md` (long-term facts), `USER.md` (the user model), `memory/YYYY-MM-DD.md` (daily logs), JSONL transcripts, `DREAMS.md` (consolidation output).
- **Bootstrap injection that is budgeted and refreshed per turn** — the memory is re-read and re-selected every turn, not read once at boot.
- **Provenance**: every memory write carries `owner | agent | untrusted | system`; untrusted content (a fetched web page, a stranger's message) cannot be laundered into long-term memory. They have a whole page on the "plan/memory-provenance" design.
- **Search that ranks**: hybrid vector + BM25, `relevance × recency decay × importance`, MMR for diversity, filename ranking, and *trigger injection* (score ≥ 0.72, at most 3 pulls per turn).
- **Compaction as summarisation**, with `mode: safeguard`, identifier preservation, `keepRecentTokens 20000`, a separate cheap `compaction.model`, and a pre-compaction memory flush. The load-bearing sentence: *"The full conversation history stays on disk. Compaction only changes what the model sees."*
- **Pluggable context engine**: `info / ingest / assemble / compact / maintain`, `commitTurn` idempotency, `ownsCompaction` — third parties can own context assembly.
- **Dreaming**: idle-time consolidation of session logs into long-term memory.
- **`/context list|detail|map`** — introspection of exactly what is in the prompt.

## 3. What TermCrab has

**Real and worth keeping:**
- `MEMORY.md` + `daily/*.md` + `compacted/*.md` (`src/agent/memory.ts`), all human-editable Markdown — the right call, and the same choice they made.
- Optional local embeddings via transformers.js (`src/agent/embed.ts`, `embed-setup.ts`) with a no-network path — genuinely nice on a phone.
- **Dreaming already exists** (`src/agent/dream.ts`, `termcrab dream`, `/api/dream`) — one of the 13 BETTER rows, and it predates your knowledge of their dreaming page.
- Hybrid search plumbing (`search_memory`, `/api/memory/search`) with a lexical + optional cosine score.
- `remember` tool so the agent can write memory itself.

**Broken:**
- `src/agent/prompt.ts` injects `readHead(3000)` of `MEMORY.md`. `remember()` **appends** (`memory.ts:56`). So the newest facts — the ones the user just taught it — are the ones guaranteed to be outside the 3,000-character window. **The agent forgets deliberately, and the newest memory is the first casualty.**
- `src/agent/sessions.ts:154,187`: compaction rewrites the `.jsonl` keeping only the tail, and `buildDigest` truncates each dropped entry to 200 chars and concatenates. History is destroyed; the digest is a stub, not a summary.

**Absent:** `USER.md`, provenance/taint, BM25/decay/MMR, trigger injection, `/context`, pluggable context engine, prompt-cache-aware pruning.

## 4. The gap, sized

| Capability | Theirs | Ours | Days |
|---|---|---|---:|
| Memory injection | budgeted, refreshed, search-selected | head-only, append-blind | 2 |
| Compaction | summary, history preserved, separate model | destructive truncation | 2 + 2 |
| User model (`USER.md`) | separate file, imperative, superseded in place | none (only in the migration reader) | 3 |
| Provenance / taint | 4 tags, gated writes, recall-loop prevention | none | 10 |
| Search quality | hybrid + decay + MMR + injection | substring + optional cosine | 8 |
| `/context` introspection | list/detail/map | none | 3 |
| Context engine plugin | full interface | inline assembly | 10 |

## 5. The move (in this order)

1. **Fix injection first (2 days).** Read a *budgeted tail*, then add the top-scoring search hits, with the newest memory always inside the budget. This is the highest user-visible payoff per line in the entire codebase: the agent stops forgetting what you told it yesterday.
2. **Stop destroying history (2 days).** Keep the `.jsonl`; write `compacted/<session>.md` summaries beside it. Their sentence — "history stays on disk" — is the acceptance test.
3. **Make the digest a summary (2 days).** Reuse the dreaming pattern (`dream.ts` already calls a provider to write prose summaries) for compaction. Extractively is fine as a fallback; it just must not be a 200-char cut.
4. **`USER.md` (3 days),** because a personal agent that keeps a separate model of its person is the single most "agentic" behaviour a user notices.
5. **Provenance (6 days, simplified).** Do not port the 4-tag system. Do the load-bearing part: anything fetched from the network or received from a non-owner is written to daily logs, never to `MEMORY.md`, without an explicit approval. That one rule is what stops a web page from permanently poisoning the agent.
6. **Retrieval quality (6 days)** only after 1–5: BM25 + recency decay + score-threshold injection.
7. **`/context` (3 days)** — you cannot fix what you cannot see. This is also the single best debugging tool for point 1.

Skip the pluggable context engine. It is 10 days of interface design for a project that does not yet have a plugin API; the hooks design in the roadmap will absorb the need.

## 6. Done tests

1. `termcrab memory remember "my sister's name is X"` → restart the gateway → ask "what's my sister's name?" → correct answer.
2. Compact a session three times, then `grep` the original text in `sessions/` — still present.
3. `/api/context` (or `--context`) lists, per turn: which files and which memory lines entered the prompt, and their character cost.
