import path from "node:path";
import os from "node:os";
import { existsSync } from "node:fs";

export const HOME_DIR = path.join(os.homedir(), ".claude-code-router");

// Local project config directory name
export const LOCAL_CONFIG_DIR = ".claude-code-router";

// Get config file path - checks local first, then global
// Search order: ./config.json -> ./.claude-code-router/config.json -> ~/.claude-code-router/config.json
export const getConfigFilePath = (): string => {
  // 1. Check current directory for config.json
  const cwdConfig = path.join(process.cwd(), "config.json");
  if (existsSync(cwdConfig)) {
    return cwdConfig;
  }
  // 2. Check .claude-code-router subdirectory in current directory
  const localConfigPath = path.join(process.cwd(), LOCAL_CONFIG_DIR, "config.json");
  if (existsSync(localConfigPath)) {
    return localConfigPath;
  }
  // 3. Global fallback
  return path.join(HOME_DIR, "config.json");
};

// Default global config file (for backwards compatibility)
export const CONFIG_FILE = path.join(HOME_DIR, "config.json");

export const PLUGINS_DIR = path.join(HOME_DIR, "plugins");

export const PID_FILE = path.join(HOME_DIR, '.claude-code-router.pid');

export const REFERENCE_COUNT_FILE = path.join(os.tmpdir(), "claude-code-reference-count.txt");

// Claude projects directory
export const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), ".claude", "projects");


export const DEFAULT_CONFIG = {
  LOG: false,
  OPENAI_API_KEY: "",
  OPENAI_BASE_URL: "",
  OPENAI_MODEL: "",
};
