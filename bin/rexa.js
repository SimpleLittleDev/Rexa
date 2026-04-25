#!/usr/bin/env node
"use strict";

/**
 * Rexa global launcher.
 *
 * Resolution order:
 *   1. Built output:   <pkg>/dist/src/index.js
 *   2. Dev fallback:   <pkg>/src/index.ts via tsx (only when source is
 *      available; useful for `npm link` from a clone).
 *
 * This wrapper makes `rexa <command>` work after `npm install -g rexa`,
 * `npm install -g .`, or `npm link` — on Linux, macOS, Windows, and Termux.
 */

const { existsSync } = require("node:fs");
const { join } = require("node:path");

const pkgRoot = join(__dirname, "..");
const distEntry = join(pkgRoot, "dist", "src", "index.js");
const srcEntry = join(pkgRoot, "src", "index.ts");

if (existsSync(distEntry)) {
  require(distEntry);
} else if (existsSync(srcEntry)) {
  try {
    // Loading tsx/cjs lets us require() .ts files directly.
    require("tsx/cjs");
    require(srcEntry);
  } catch (error) {
    console.error("Rexa is not built yet and tsx is unavailable.");
    console.error("Run `npm run build` from the Rexa directory, or reinstall with dev dependencies.");
    process.exit(1);
  }
} else {
  console.error("Rexa launcher could not find dist/src/index.js or src/index.ts.");
  console.error("Reinstall Rexa: npm install -g rexa");
  process.exit(1);
}
