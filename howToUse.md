# Claude Code Router - Quick Reference

## Remote/SSH Setup (Headless)

When running on a remote server via SSH, additional configuration is required:

### Requirements
- **Node.js 20+** (Node 18 has `File is not defined` error with undici)
- **nvm** recommended for managing Node versions

### Setup Steps

1. **Install nvm and Node 22:**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.nvm/nvm.sh
nvm install 22
nvm alias default 22
```

2. **Add nvm to .profile** (for non-interactive shells):
```bash
# Add BEFORE the .bashrc source line in ~/.profile:
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

3. **Create config file** in the project directory:

```json
{
  "CLAUDE_PATH": "/home/YOUR_USER/.nvm/versions/node/v22.21.1/bin/claude",
  "NON_INTERACTIVE_MODE": true,
  "PORT": 3456,
  "Providers": [...],
  "Router": {...}
}
```

4. **Install Claude Code globally:**
```bash
npm install -g @anthropic-ai/claude-code
```

### Verify Setup
```bash
bash -l -c "node --version"  # Should show v22.x
bash -l -c "which claude"     # Should show nvm path
ccr status                    # Should show service running
ccr code "test prompt"        # Should work
```

---

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

### Use `-m` Flag to Select Provider
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

### Use `--strip-system` Flag to Remove System Context
When using local LLMs that don't need or can't handle the full Claude Code system prompt:
```bash
ccr code --strip-system "your prompt"
ccr code --strip-system -m spark1llama3.18b "your prompt"
```

**What it does:**
- Removes the Claude Code system context from requests
- Useful for local models with smaller context windows
- Reduces token usage when system instructions aren't needed

### Change Default (Permanent)
Edit `config.json`:
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

**Router Configuration:** `./config.json` (current directory)

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
