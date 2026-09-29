---
name: voice
description: Speak replies aloud (TTS) and take voice dictation (STT) on Termux or desktop.
---

# Voice interaction

## Speaking (TTS)

Fastest path: `exec` a single command with the reply text:

```bash
termcrab say "your reply here"
```

`termcrab say` auto-picks: termux-tts-speak → espeak-ng → espeak → spd-say → say.
If it reports "no TTS backend", tell the user: `pkg install termux-api` on Termux.

## Listening (STT, Termux only)

To capture a spoken command from the user:

```bash
timeout 60 termux-speech-to-text
```

It prints the recognized text to stdout and exits when the user stops talking.

## Transcribing recordings (offline, optional)

If the user has an audio file (voice memo, recording) and whisper.cpp is
installed, turn it into text:

```bash
termcrab transcribe /path/to/audio.wav
```

It prints the transcript (and how long it took). If the engine is missing it
prints exact install steps — relay them to the user, never fail silently.
Recordings on Termux: `termux-microphone-record -f note.wav` (Termux:API).

## When to use

- User asks you to "say it", "read this aloud", "voice reply"
- User shares an audio file / voice memo to summarize (use `termcrab transcribe`)
- User says "I'll dictate" or asks for voice input
- Accessibility requests

Rules:
- Keep spoken replies short (< ~4 sentences) unless asked otherwise
- Never speak secrets, API keys, or private memory contents aloud
- On failure, fall back to plain text reply - never block the conversation
