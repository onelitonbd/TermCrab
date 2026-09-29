# Local models (offline / private)

TermCrab talks to any **OpenAI-compatible** endpoint, so local inference plugs in
without any code changes. Recommended tiers for phones:

| Tier | Runtime | Endpoint | Good for |
|---|---|---|---|
| Phone | **llama.cpp** (`llama-server`) | `http://127.0.0.1:8080/v1` | summarize, classify, short replies, STT-adjacent tasks |
| Phone | Ollama (if packaged for your device) | `http://127.0.0.1:11434/v1` | same, if it runs on your hardware |
| LAN server | llama.cpp / Ollama / vLLM on a PC | `http://<lan-ip>:8080/v1` | full agent duty with bigger models |

## Quick setup (llama.cpp on Termux)

```bash
pkg install llama.cpp -y          # if available for your Termux build
llama-server -hf <tool-capable-model> --port 8080 &   # or -m your-model.gguf

termcrab config set provider.type openai
termcrab config set provider.baseUrl http://127.0.0.1:8080/v1
termcrab config set provider.model <model-name>        # must match the server
termcrab config set provider.apiKey local              # dummy value accepted
termcrab doctor                                        # probes localhost endpoints now
```

## The tool-calling caveat (important)

The agent loop uses **function calling**. Many small models (≤3B) cannot call tools
reliably — the agent will chat but won't execute shell/files/skills. Pick models that
advertise tool/function calling, verify with:

```bash
termcrab agent "what time is it? use a tool to check"
```

If tools don't fire, either switch model or keep a **tiered setup**: cloud model for
agent work (default), local model for privacy-sensitive summarize/rewrite via the
`exec`-free skills.

## Hybrid pattern

```bash
# main gateway stays on a cloud model...
termcrab config set provider.type anthropic
termcrab config set provider.apiKey sk-ant-...
# ...and you can flip to local anytime (airplane mode, privacy):
termcrab config set provider.baseUrl http://127.0.0.1:8080/v1
termcrab config set provider.type openai
termcrab config set provider.model local-model
```

Config is one JSON file — script it, git it (without keys!), flip it back.
