import { spawn, type StdioOptions } from "child_process";
import { existsSync } from "fs";
import path from "path";
import os from "os";
import { readConfigFile } from ".";
import { closeService } from "./close";
import {
  decrementReferenceCount,
  incrementReferenceCount,
} from "./processCheck";
import { createEnvVariables } from "./createEnvVariables";

export async function executeCodeCommand(args: string[] = [], providerOverride?: string, stripSystem?: boolean) {
  // Set environment variables using shared function
  const config = await readConfigFile();

  // Handle provider override
  if (providerOverride) {
    const provider = config.Providers?.find((p: any) => p.name === providerOverride);
    if (!provider) {
      console.error(`Error: Provider '${providerOverride}' not found in config.`);
      console.log("\nAvailable providers:");
      config.Providers?.forEach((p: any) => console.log(`  - ${p.name}`));
      process.exit(1);
    }
    const model = provider.models?.[0];
    if (!model) {
      console.error(`Error: Provider '${providerOverride}' has no models configured.`);
      process.exit(1);
    }
    // Write override to temp file for router to read
    const overrideFile = path.join(process.cwd(), ".model-override.json");
    const overrideData = {
      provider: providerOverride,
      model: model,
      timestamp: Date.now()
    };
    try {
      await require("fs/promises").writeFile(overrideFile, JSON.stringify(overrideData));
      console.log(`🎯 Using provider: ${providerOverride} (${model})`);
    } catch (err) {
      console.error(`Warning: Could not write override file: ${err}`);
    }
  }

  const env = await createEnvVariables();

  // Write strip-system flag to file for router to read
  if (stripSystem) {
    const flagFile = path.join(process.cwd(), ".strip-system.json");
    const flagData = {
      enabled: true,
      timestamp: Date.now()
    };
    try {
      await require("fs/promises").writeFile(flagFile, JSON.stringify(flagData));
      console.log(`🔓 System context will be stripped for this session`);
    } catch (err) {
      console.error(`Warning: Could not write strip-system flag: ${err}`);
    }
  }

  const settingsFlag: any = {
    env,
    // Force API key mode instead of Claude Max subscription auth
    primaryProvider: "api-key"
  };
  if (config?.StatusLine?.enabled) {
    settingsFlag.statusLine = {
      type: "command",
      command: "ccr statusline",
      padding: 0,
    }
  }

  // Non-interactive mode for automation environments
  if (config.NON_INTERACTIVE_MODE) {
    env.CI = "true";
    env.FORCE_COLOR = "0";
    env.NODE_NO_READLINE = "1";
    env.TERM = "dumb";
  }

  // Set ANTHROPIC_SMALL_FAST_MODEL if it exists in config
  if (config?.ANTHROPIC_SMALL_FAST_MODEL) {
    env.ANTHROPIC_SMALL_FAST_MODEL = config.ANTHROPIC_SMALL_FAST_MODEL;
  }

  // Detect MCP config file path
  let mcpConfigPath: string | null = null;
  if (config?.MCP_CONFIG_PATH && existsSync(config.MCP_CONFIG_PATH)) {
    mcpConfigPath = config.MCP_CONFIG_PATH;
  } else {
    // Default MCP config locations by platform
    const platform = process.platform;
    let defaultPath: string;
    if (platform === 'win32') {
      defaultPath = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json');
    } else if (platform === 'darwin') {
      defaultPath = path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
    } else {
      defaultPath = path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'Claude', 'claude_desktop_config.json');
    }
    if (existsSync(defaultPath)) {
      mcpConfigPath = defaultPath;
    }
  }

  // Increment reference count when command starts
  incrementReferenceCount();

  // Execute claude command
  const claudePath = config?.CLAUDE_PATH || process.env.CLAUDE_PATH || "claude";

  const stdioConfig: StdioOptions = config.NON_INTERACTIVE_MODE
    ? ["pipe", "inherit", "inherit"] // Pipe stdin for non-interactive
    : "inherit"; // Default inherited behavior

  // Build args array directly - avoid minimist which corrupts JSON
  // Escape JSON for Windows shell - use double quotes and escape internal quotes
  const settingsJson = JSON.stringify(settingsFlag);
  const isWindows = process.platform === 'win32';
  const escapedSettings = isWindows
    ? `"${settingsJson.replace(/"/g, '\\"')}"`
    : `'${settingsJson}'`;
  const finalArgs = [...args, '--settings', escapedSettings];

  // Add MCP config if found
  if (mcpConfigPath) {
    finalArgs.push('--mcp-config', mcpConfigPath);
  }

  // Merge env vars - our overrides take precedence over process.env
  const mergedEnv = { ...process.env, ...env };

  // Debug: show key config being passed to Claude
  console.log("🔧 Router config:");
  console.log(`   ANTHROPIC_BASE_URL: ${mergedEnv.ANTHROPIC_BASE_URL}`);
  console.log(`   ANTHROPIC_API_KEY: ${mergedEnv.ANTHROPIC_API_KEY ? mergedEnv.ANTHROPIC_API_KEY.substring(0, 20) + '...' : 'not set'}`);
  console.log(`   primaryProvider: api-key`);
  if (mcpConfigPath) {
    console.log(`   MCP config: ${mcpConfigPath}`);
  }

  const claudeProcess = spawn(
    claudePath,
    finalArgs,
    {
      env: mergedEnv,
      stdio: stdioConfig,
      shell: true,
    }
  );

  // Close stdin for non-interactive mode
  if (config.NON_INTERACTIVE_MODE) {
    claudeProcess.stdin?.end();
  }

  claudeProcess.on("error", (error) => {
    console.error("Failed to start claude command:", error.message);
    console.log(
      "Make sure Claude Code is installed: npm install -g @anthropic-ai/claude-code"
    );
    decrementReferenceCount();
    process.exit(1);
  });

  claudeProcess.on("close", async (code) => {
    // Clean up override file if it exists
    if (providerOverride) {
      const overrideFile = path.join(process.cwd(), ".model-override.json");
      try {
        await require("fs/promises").unlink(overrideFile);
      } catch (err) {
        // Ignore cleanup errors
      }
    }
    // Clean up strip-system flag if it exists
    if (stripSystem) {
      const flagFile = path.join(process.cwd(), ".strip-system.json");
      try {
        await require("fs/promises").unlink(flagFile);
      } catch (err) {
        // Ignore cleanup errors
      }
    }
    decrementReferenceCount();
    closeService();
    process.exit(code || 0);
  });
}
