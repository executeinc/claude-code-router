# Claude Code Router - Quick Reference

## Test Results

| Endpoint | Backend | Simple Requests | Claude Code |
|----------|---------|----------------|-------------|
| spark1 | http://spark1:8001 | ✅ Working | ⚠️ Tool Error |
| zurgs7 | http://zurgs7:8000 | ✅ Working | ⚠️ Tool Error |
| spark1-traefik | http://localLB.executeinc.com/vllm | ✅ Working | ⚠️ Tool Error |
| zurgs7-traefik | http://localLB.executeinc.com/vllm | ✅ Working | ⚠️ Tool Error |

**Router Status:** ✅ All routing working correctly
**Backend Issue:** ⚠️ vLLM instances need `--enable-auto-tool-choice` and `--tool-call-parser` flags for Claude Code tool support

## Using CCR Code Sessions

### Use `-m` Flag to Select Provider ⭐ (NEW)
```bash
ccr code -m zurgs7 "your prompt"
ccr code -m spark1-traefik "your prompt"
ccr code --model zurgs7-traefik "your prompt"
```

**Available providers:**
- `spark1` - Direct to spark1:8001
- `zurgs7` - Direct to zurgs7:8000
- `spark1-traefik` - Via load balancer (spark)
- `zurgs7-traefik` - Via load balancer (zurgs7)

### Change Default (Permanent)
Edit `.claude-code-router/config.json`:
```json
"Router": {
  "default": "zurgs7,Qwen/Qwen2.5-3B-Instruct"
}
```
Then: `ccr restart`

### Direct API Testing
```bash
# Test spark1
curl -X POST http://127.0.0.1:3456/v1/messages \
  -H "Content-Type: application/json" \
  -d '{"model":"spark1,Qwen/Qwen2.5-3B-Instruct","messages":[{"role":"user","content":"Hello"}],"max_tokens":50}'

# Test zurgs7
curl -X POST http://127.0.0.1:3456/v1/messages \
  -H "Content-Type: application/json" \
  -d '{"model":"zurgs7,Qwen/Qwen2.5-3B-Instruct","messages":[{"role":"user","content":"Hello"}],"max_tokens":50}'

# Test traefik endpoints (same pattern)
curl -X POST http://127.0.0.1:3456/v1/messages \
  -H "Content-Type: application/json" \
  -d '{"model":"spark1-traefik,Qwen/Qwen2.5-3B-Instruct","messages":[{"role":"user","content":"Hello"}],"max_tokens":50}'
```

## Configuration Summary

Router listens on: `http://127.0.0.1:3456`

**Provider Endpoints:**
- `spark1` → http://spark1:8001/v1/chat/completions
- `zurgs7` → http://zurgs7:8000/v1/chat/completions
- `spark1-traefik` → http://localLB.executeinc.com/vllm/v1/chat/completions
- `zurgs7-traefik` → http://localLB.executeinc.com/vllm/v1/chat/completions

**Router Configuration:** `.claude-code-router/config.json` (local project config)

## Common Commands

```bash
ccr start      # Start the router service
ccr stop       # Stop the router service
ccr restart    # Restart to reload config
ccr status     # Check service status
ccr code       # Start Claude Code session
```

## Model Format

Always use: `provider_name,model_name`

Example: `spark1,Qwen/Qwen2.5-3B-Instruct`

## Enabling Claude Code Tool Support

To use Claude Code with these endpoints, vLLM servers must be started with tool support:

```bash
vllm serve Qwen/Qwen2.5-3B-Instruct \
  --enable-auto-tool-choice \
  --tool-call-parser hermes \
  --port 8001
```

**Current Error:** `"auto" tool choice requires --enable-auto-tool-choice and --tool-call-parser to be set`

**Impact:**
- ✅ Direct API calls work fine
- ⚠️ Claude Code sessions fail (they require tool support for file operations, bash commands, etc.)

**Verified Tests:**
```bash
# These work (simple requests without tools):
curl -X POST http://127.0.0.1:3456/v1/messages \
  -H "Content-Type: application/json" \
  -d '{"model":"spark1,Qwen/Qwen2.5-3B-Instruct","messages":[{"role":"user","content":"What is 3+3?"}],"max_tokens":50}'
# Response: "6" ✅

# These fail (Claude Code with tools):
ccr code -m spark1 "echo hello"
# Error: tool choice requires --enable-auto-tool-choice ❌
```
