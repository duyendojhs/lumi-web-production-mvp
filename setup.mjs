#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { existsSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const rootDir = dirname(fileURLToPath(import.meta.url));
const webDir = join(rootDir, "frontend", "web_app");
const envExamplePath = join(webDir, ".env.example");
const envLocalPath = join(webDir, ".env.local");
const isWindows = process.platform === "win32";

main().catch((error) => {
  console.error(`\nSetup failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

async function main() {
  console.log("Lumi Web Production MVP setup\n");
  checkNode();
  const npmVersion = checkCommand("npm", ["--version"]);
  console.log(`npm: ${npmVersion}`);

  if (!existsSync(webDir)) {
    throw new Error("Missing frontend/web_app. Run setup from the repository root.");
  }
  if (!existsSync(envExamplePath)) {
    throw new Error("Missing frontend/web_app/.env.example.");
  }

  console.log("\nWeb app: frontend/web_app");
  console.log("This script never asks for or writes real secrets.");

  const rl = readline.createInterface({ input, output });
  try {
    await maybeCreateEnv(rl);
    await maybeRun(rl, "Run npm install now?", ["install"]);
    await maybeRun(rl, "Run npm run build now?", ["run", "build"]);
    const startDev = await confirm(rl, "Run npm run dev now? This keeps the terminal busy.");
    if (startDev) {
      console.log("\nStarting dev server. Open the local URL printed by Next.js.");
      await run("npm", ["run", "dev"], { interactive: true });
    } else {
      printManualNextSteps();
    }
  } finally {
    rl.close();
  }
}

function checkNode() {
  const version = process.versions.node;
  const major = Number(version.split(".")[0]);
  console.log(`Node.js: ${version}`);
  if (!Number.isFinite(major) || major < 20) {
    console.warn("Recommended Node.js version is 20 or newer.");
  }
}

function checkCommand(command, args) {
  const result = spawnSync(commandForPlatform(command), args, {
    cwd: rootDir,
    encoding: "utf8",
    shell: false,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} is not available. Install Node.js/npm first.`);
  }
  return result.stdout.trim();
}

async function maybeCreateEnv(rl) {
  if (existsSync(envLocalPath)) {
    console.log("\n.env.local already exists. Leaving it unchanged.");
    return;
  }

  console.log("\nCreate frontend/web_app/.env.local from .env.example?");
  console.log("The file contains empty placeholders only. Add real secrets manually after setup.");
  if (await confirm(rl, "Create .env.local now?")) {
    copyFileSync(envExamplePath, envLocalPath);
    console.log("Created frontend/web_app/.env.local with placeholder values.");
  } else {
    console.log("Skipped .env.local creation.");
  }
}

async function maybeRun(rl, question, args) {
  if (!(await confirm(rl, question))) return;
  await run("npm", args, { interactive: true });
}

async function confirm(rl, question) {
  const answer = await rl.question(`${question} [y/N] `);
  return ["y", "yes"].includes(answer.trim().toLowerCase());
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(commandForPlatform(command), args, {
      cwd: webDir,
      stdio: options.interactive ? "inherit" : "pipe",
      shell: false,
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

function commandForPlatform(command) {
  return isWindows && command === "npm" ? "npm.cmd" : command;
}

function printManualNextSteps() {
  console.log("\nManual commands:");
  console.log("  cd frontend/web_app");
  console.log("  npm install");
  console.log("  npm run lint");
  console.log("  npm run build");
  console.log("  npm run dev");
}
