---
name: daily-briefing
description: Produce a tight morning/evening briefing from memory, tasks and the web.
---

# Daily briefing

When asked for a briefing (morning, evening, daily summary):

1. `search_memory` for "task", "pending", "deadline", "tomorrow" and read today's daily log.
2. `web_fetch` one quick info source only if the user asks for news/weather.
3. Reply in this exact compact format:

```
📋 Briefing — <date>
🔴 Needs attention: <max 3 items>
🟡 Upcoming: <next 2 days>
🟢 Done recently: <1-2 items>
💡 Suggestion: <one actionable next step>
```

Keep it under 12 lines. No preamble.
