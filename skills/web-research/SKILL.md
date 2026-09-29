---
name: web-research
description: How to research a topic on the web with web_fetch - sources, extraction, synthesis.
---

# Web research

When the user asks you to research something:

1. Start with the most authoritative URL you know (official docs > reputable press > blogs).
2. Call `web_fetch` with the URL. If the page is thin, follow links found in the text.
3. Fetch at least 2 independent sources for any claim you will state as fact.
4. If a fetch fails or is paywalled, move on - do not retry the same URL more than once.
5. Answer format:
   - One-line bottom line first
   - Bulleted findings
   - Sources as plain URLs at the end
6. Mark anything uncertain with "unverified".

Never invent URLs. Only cite pages you actually fetched in this conversation.
