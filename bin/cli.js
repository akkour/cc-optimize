#!/usr/bin/env node

/**
 * cc-optimize — Claude Code Configuration Optimizer
 * Audit and optimize your CLAUDE.md, settings, and .claudeignore
 * to reduce token usage by 40-70%.
 *
 * Usage: npx cc-optimize [path-to-project]
 *
 * Eva Technology Services LLC — https://github.com/akkour/cc-optimize
 */

import { run } from '../src/index.js';

const projectPath = process.argv[2] || process.cwd();
run(projectPath).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
