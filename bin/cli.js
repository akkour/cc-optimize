#!/usr/bin/env node

/**
 * cc-optimize — Claude Code Configuration Optimizer
 * Audit and optimize your CLAUDE.md, settings, and .claudeignore
 * to reduce token usage by 40-70%.
 *
 * Usage:
 *   cc-optimize [path-to-project]               Local project
 *   cc-optimize --repo user/project              GitHub (public)
 *   cc-optimize --repo user/project --token xxx  GitHub (private)
 *   cc-optimize --repo https://gitlab.com/u/p    GitLab
 *   cc-optimize --repo user/proj --provider gitlab --token xxx
 *
 * Eva Technology Services LLC — https://github.com/akkour/cc-optimize
 */

// scanivy-ignore: CWE-532 — CLI output, non-sensitive data
import { run } from '../src/index.js';

function parseArgs(args) {
  const parsed = {
    path: null,
    repo: null,
    provider: null,
    token: null,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg === '--repo' || arg === '-r') {
      parsed.repo = args[++i];
    } else if (arg === '--provider' || arg === '-p') {
      parsed.provider = args[++i];
    } else if (arg === '--token' || arg === '-t') {
      parsed.token = args[++i];
    } else if (!arg.startsWith('-')) {
      parsed.path = arg;
    }
  }

  return parsed;
}

function showHelp() {
  console.log(`
  cc-optimize — Claude Code Configuration Optimizer

  Usage:
    cc-optimize [path]                          Scan a local project
    cc-optimize --repo user/project             Scan a GitHub repo (public)
    cc-optimize --repo user/project --token xxx Scan a private repo
    cc-optimize --repo https://gitlab.com/u/p   Scan any git URL

  Options:
    --repo, -r      Remote repository (user/repo or full URL)
    --provider, -p  Git provider: github, gitlab, bitbucket (default: github)
    --token, -t     Personal access token for private repos
    --help, -h      Show this help

  Examples:
    cc-optimize .                               Current directory
    cc-optimize /path/to/project                Local path
    cc-optimize --repo juice-shop/juice-shop    Public GitHub repo
    cc-optimize --repo my-org/private-app -t ghp_xxx  Private repo
    cc-optimize --repo https://gitlab.com/team/project -t glpat_xxx

  https://github.com/akkour/cc-optimize
`);
}

const parsed = parseArgs(process.argv.slice(2));

if (parsed.help) {
  showHelp();
  process.exit(0);
}

const options = {
  repo: parsed.repo,
  provider: parsed.provider,
  token: parsed.token,
};

const target = parsed.repo || parsed.path || process.cwd();

run(target, options).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
