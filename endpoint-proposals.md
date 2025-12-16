# Proposals for Endpoint Selection in CCR

## Current State
- Default endpoint set in `Router.default` config
- Must restart service after config changes
- No runtime endpoint selection in `ccr code`

## Proposals (Ranked by Implementation Difficulty)

### 1. Environment Variable Override ⭐ (EASIEST)
**Command:**
```bash
CCR_MODEL="zurgs7,Qwen/Qwen2.5-3B-Instruct" ccr code "your prompt"
```

**Implementation:**
- Read `CCR_MODEL` env var in `src/utils/router.ts`
- Override default if set
- ~10 lines of code

**Pros:** Simple, no CLI changes, works immediately
**Cons:** Verbose for repeated use

---

### 2. CLI Flag ⭐⭐ (EASY)
**Command:**
```bash
ccr code --model zurgs7,Qwen/Qwen2.5-3B-Instruct "your prompt"
# or short form:
ccr code -m zurgs7,Qwen/Qwen2.5-3B-Instruct "your prompt"
```

**Implementation:**
- Parse `--model/-m` flag in `src/cli.ts`
- Pass to `executeCodeCommand()`
- Set as env var for Claude Code session
- ~30 lines of code

**Pros:** Clean, discoverable, standard CLI pattern
**Cons:** Requires parsing args, updating help text

---

### 3. Interactive Selector ⭐⭐⭐ (MEDIUM)
**Command:**
```bash
ccr code --select
# Shows:
# ? Select endpoint:
#   > spark1 (direct)
#     zurgs7 (direct)
#     spark1-traefik (load balancer)
#     zurgs7-traefik (load balancer)
```

**Implementation:**
- Use `@inquirer/prompts` (already a dependency)
- Read providers from config
- Set selected model as override
- ~50 lines of code

**Pros:** User-friendly, no need to remember provider names
**Cons:** Adds interaction step, not scriptable

---

### 4. Config Profiles ⭐⭐⭐⭐ (HARDER)
**Command:**
```bash
ccr code --profile production "your prompt"
# or
ccr use production
ccr code "your prompt"
```

**Config:**
```json
{
  "profiles": {
    "dev": {"default": "zurgs7,Qwen/Qwen2.5-3B-Instruct"},
    "production": {"default": "spark1-traefik,Qwen/Qwen2.5-3B-Instruct"}
  }
}
```

**Implementation:**
- Add profile config structure
- Add profile selection logic
- Persist active profile
- ~100 lines of code

**Pros:** Clean for different environments, reusable
**Cons:** More complex, requires profile management

---

### 5. Session-Based Override ⭐⭐⭐⭐⭐ (HARDEST)
**Command:**
```bash
ccr set-model zurgs7,Qwen/Qwen2.5-3B-Instruct  # Persists for session
ccr code "your prompt"  # Uses zurgs7
ccr reset-model  # Back to default
```

**Implementation:**
- Store override in session file (like existing session configs)
- Check override before default
- Add set/reset commands
- ~80 lines of code

**Pros:** Convenient for extended work, no repeated flags
**Cons:** State management complexity, may confuse users

---

## Recommended Approach: Combined #1 + #2

Implement both environment variable AND CLI flag:

```bash
# Quick override with env:
CCR_MODEL="zurgs7,Qwen/Qwen2.5-3B-Instruct" ccr code "prompt"

# Or CLI flag for cleaner syntax:
ccr code -m zurgs7,Qwen/Qwen2.5-3B-Instruct "prompt"
```

**Why:**
- Covers both scripting (env var) and interactive (flag) use cases
- Minimal code changes (~40 lines total)
- No breaking changes
- Maintains simplicity

## Implementation Priority

1. **Phase 1:** Environment variable (10 min)
2. **Phase 2:** CLI flag (30 min)
3. **Phase 3:** Interactive selector (optional, if user feedback demands it)
