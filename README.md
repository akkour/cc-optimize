# cc-optimize

**Audit and optimize your Claude Code configuration. Reduce token usage by 40-70%.**

> "People are hitting usage limits in Claude Code way faster than expected. We're actively investigating."
> — Anthropic, March 2026

Claude Code burns through tokens fast. A single "edit this file" command can consume 50,000-150,000 tokens. Most of that waste comes from bloated `CLAUDE.md`, missing `.claudeignore`, and default model settings.

`cc-optimize` scans your project, scores your setup, fixes it automatically, and generates a visual HTML dashboard — all with one command.

## Quick Start

```bash
git clone https://github.com/akkour/cc-optimize.git
cd cc-optimize
npm install
node bin/cli.js /path/to/your/project
```

## What It Does

```
Scan → Analyze → Score → Auto-generate Architecture Map →
Optimize CLAUDE.md → Fix settings → Create .claudeignore →
Show before/after → Confirm → Backup → Apply → Open HTML dashboard
```

1. Scans your `CLAUDE.md`, `settings.json`, `.claudeignore`, and skills
2. Scores your setup (0-100) across 5 dimensions
3. Identifies token waste, security issues, and missing optimizations
4. **Auto-generates an Architecture Map** by scanning your filesystem
5. **Auto-optimizes CLAUDE.md** — keeps essentials, moves detail sections to `docs/`
6. Fixes settings (model, thinking budget, subagent routing)
7. Shows before/after diff for every file
8. Backs up originals before any change
9. Applies with your approval
10. **Opens a visual HTML dashboard** in your browser

## The 5 Optimization Levers

| # | Lever | What it checks | Typical savings |
|---|-------|---------------|-----------------|
| 1 | **CLAUDE.md** | Line count, Architecture Map, code examples, detail sections | 40-80% context reduction |
| 2 | **Settings** | Default model, thinking budget, subagent model, exposed secrets | 60-70% cost reduction |
| 3 | **.claudeignore** | Essential exclusions (node_modules, dist, coverage, lock files) | Reduces scanning overhead |
| 4 | **Skills** | On-demand loading vs embedded in CLAUDE.md | 15K+ tokens per session |
| 5 | **Discipline** | /compact reminders, model switching guidance | Behavioral optimization |

## Example: Before & After

```
BEFORE                              AFTER
─────────────────────────           ─────────────────────────
CLAUDE.md    484 lines (5.5K tok)   CLAUDE.md    102 lines (1.3K tok)
Settings     no model config        Settings     Sonnet + thinking cap
.claudeignore missing               .claudeignore 23 entries
Arch Map     none                   Arch Map     32 files discovered

Score: F — 25/100                   Score: B — 84/100
```

## Visual HTML Dashboard

After each run, cc-optimize generates and opens a visual report in your browser:

- **Score gauge** with animated SVG
- **Section scores** with progress bars
- **Issues & recommendations** with severity colors
- **Architecture Map** auto-discovered from your codebase
- **Optimization plan** with file-by-file actions

## What Gets Optimized

### CLAUDE.md (fully automated)

- **Parses** your existing CLAUDE.md into sections
- **Identifies** detail sections that should be loaded on-demand (tests, CI/CD, frontend rules, code examples)
- **Auto-generates an Architecture Map** from your filesystem (pages, components, lib, hooks, services, stores, Edge Functions)
- **Injects Rule 0**: "After creating a new key file, update the Architecture Map"
- **Moves** detail sections to `docs/` with proper references
- **Strips** excessive code blocks (Claude reads real files, not examples)
- **Target**: <150 lines, with everything else available on-demand

### settings.local.json

- Sets `"model": "sonnet"` as default (80% of tasks don't need Opus)
- Caps `MAX_THINKING_TOKENS` at 10,000 (default 32K is overkill)
- Routes subagents to `haiku` (80% cheaper for file reads)
- **Removes exposed secrets** from permissions (critical security fix)
- Consolidates redundant permissions (`Bash(git add:*)` + `Bash(git commit:*)` → `Bash(git:*)`)

### .claudeignore

Creates or updates with essential exclusions:

```
node_modules/
dist/
build/
coverage/
*.lock
*.min.js
*.map
```

## Security

cc-optimize detects hardcoded secrets in your `settings.local.json` permissions:

- API tokens (EXPO_TOKEN, API_KEY, etc.)
- Bearer tokens
- Passwords
- Long alphanumeric strings that look like credentials

These are flagged as **CRITICAL** and removed during optimization.

## Backup & Restore

Every optimization creates a timestamped backup:

```
.claude/backups/cc-optimize-2026-04-04T14-30-00/
├── CLAUDE.md
├── settings.local.json
└── .claudeignore
```

To restore:

```bash
cp .claude/backups/cc-optimize-{timestamp}/* .
```

## Why This Matters

99.4% of Claude Code tokens are **input** (reading), not output (writing). Every message reloads your entire `CLAUDE.md`, all MCP tools, and conversation history.

A bloated CLAUDE.md of 500 lines adds ~5,500 tokens to **every single message**.
For a typical session of 50 messages: **275,000 wasted tokens**.

This tool fixes that.

## Built With Real Pain

This tool was born from optimizing 3 production projects at [Eva Technology Services LLC](https://evatechservices.com):

- **ScanIvy** ([scanivy.com](https://scanivy.com)) — 484→102 lines, −79% context
- **FluentCopilot** — 95→99 lines (already lean, added Architecture Map)
- **LeadIvy** — multi-project optimization, F→B score improvement

## Complementary Tools

cc-optimize fixes your **configuration**. For ongoing **usage monitoring**:

- Track token usage: `npm install -g ccusage && ccusage daily --breakdown`
- Check session cost: `/cost` in Claude Code
- Monitor billing windows: `ccusage blocks --live`

## Contributing

PRs welcome. The main areas for contribution:

- Additional analyzers (MCP tools, hooks, custom commands)
- Improved Architecture Map for monorepos and multi-package projects
- Support for `.claude/commands/` optimization
- Token estimation improvements
- More section categorization patterns for CLAUDE.md parsing

## License

MIT — [Eva Technology Services LLC](https://evatechservices.com)

---

**Stop paying for tokens you don't need.** Run cc-optimize and see your score.

Your code is optimized for Claude Code. Check its security too → [scanivy.com](https://scanivy.com)