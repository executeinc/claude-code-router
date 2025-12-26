import path from "node:path";
import os from "node:os";
import { existsSync } from "node:fs";

// All paths are relative to current working directory
export const HOME_DIR = process.cwd();

// Get config file path - looks for config.json in current directory
export const getConfigFilePath = (): string => {
  return path.join(process.cwd(), "config.json");
};

// Config file in current directory
export const CONFIG_FILE = path.join(process.cwd(), "config.json");

export const PLUGINS_DIR = path.join(process.cwd(), "plugins");

export const PID_FILE = path.join(process.cwd(), '.ccr.pid');

export const REFERENCE_COUNT_FILE = path.join(os.tmpdir(), "claude-code-reference-count.txt");

// Claude projects directory
export const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), ".claude", "projects");


export const DEFAULT_CONFIG = {
  LOG: false,
  OPENAI_API_KEY: "",
  OPENAI_BASE_URL: "",
  OPENAI_MODEL: "",
};
