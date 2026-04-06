# cc-optimize

**Audit and optimize your Claude Code configuration. Reduce token usage by 40-70%.**

Claude Code burns through tokens fast. A single "edit this file" command can consume 50,000-150,000 tokens. Most of that waste comes from misconfigured `CLAUDE.md`, missing `.claudeignore`, and default model settings.

`cc-optimize` scans your project, scores your setup, and fixes it — automatically.

## Quick Start

```bash
npx cc-optimize
```

Or specify a project path:

```bash
npx cc-optimize /path/to/your/project
```

## What It Does

```
┌─────────────────────────────────────────────────┐
│  Scan → Analyze → Score → Recommend → Apply     │
│                                                   │
│  1. Scans CLAUDE.md, settings.json, .claudeignore │
│  2. Scores your setup (0-100)                     │
│  3. Identifies token waste and security issues    │
│  4. Shows before/after for each file              │
│  5. Backs up originals before any change          │
│  6. Applies optimizations with your approval      │
└─────────────────────────────────────────────────┘
```

## The 5 Optimization Levers

| # | Lever | What it checks | Typical savings |
|---|-------|---------------|-----------------|
| 1 | **CLAUDE.md** | Line count, Architecture Map, code examples, detail sections | 40-80% context reduction |
| 2 | **Settings** | Default model, thinking budget, subagent model, exposed secrets | 60-70% cost reduction |
| 3 | **.claudeignore** | Essential exclusions (node_modules, dist, coverage, lock files) | Reduces scanning overhead |
| 4 | **Skills** | On-demand loading vs embedded in CLAUDE.md | 15K+ tokens per session |
| 5 | **Discipline** | /compact reminders, model switching guidance | Behavioral optimization |

## Example Output

```
  ╭──────────────────────────────────────────╮
  │  cc-optimize  v1.0.0                     │
  │  Claude Code Configuration Optimizer     │
  │  Reduce token usage by 40-70%            │
  ╰──────────────────────────────────────────╯

  ✔ Project scanned
  ✔ Analysis complete

  Current Configuration
  ─────────────────────────────────────
  CLAUDE.md        484 lines (22KB)
  Settings         .claude/settings.local.json
  .claudeignore    missing
  Skills           3 skill(s)

  ╭────────── Score ──────────╮
  │  D   35/100               │
  │  ████████░░░░░░░░░░░░░░░  │
  ╰───────────────────────────╯

  Issues
  ─────────────────────────────────────
  ✗ CLAUDE.md is 484 lines (5,500 tokens) — target is <150
  ✗ 3 SECRET(S) EXPOSED in settings.json!
  ⚠ No .claudeignore — indexing node_modules, dist
  ⚠ MAX_THINKING_TOKENS not set — default 32K
  ⚠ No Architecture Map — blind file exploration

  ? Apply optimizations? (backup will be created first) (y/N)
```

## What Gets Optimized

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

### CLAUDE.md (manual review)
The tool identifies what to optimize but doesn't auto-rewrite CLAUDE.md (it requires understanding your project). Instead, it tells you:
- Which sections to move to separate docs
- How many code example lines to remove
- Whether an Architecture Map is missing
- The estimated token savings

Run the suggested prompt in Claude Code to get an optimized version.

## Security

`cc-optimize` detects hardcoded secrets in your `settings.local.json` permissions:
- API tokens
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

> "People are hitting usage limits in Claude Code way faster than expected."
> — Anthropic, March 2026

The root cause: **context bloat**. Every message in Claude Code reloads your entire `CLAUDE.md`, all MCP tools, and conversation history. A bloated CLAUDE.md of 500 lines adds ~5,500 tokens to *every single message*.

For a typical session of 50 messages: **275,000 wasted tokens**.

This tool fixes that.

## Built With Real Pain

This tool was born from optimizing 3 production projects at [Eva Technology Services LLC](https://evatechservices.com):
- **ScanIvy** (scanivy.com) — 484→102 lines, −79% context
- **FluentCopilot** — 95→99 lines (already lean, added Architecture Map)
- **LeadIvy** — multi-project optimization

## Contributing

PRs welcome. The main areas for contribution:
- Additional analyzers (MCP tools, hooks, custom commands)
- Auto-generation of Architecture Map from source files
- Support for `.claude/commands/` optimization
- Token estimation improvements

## License

MIT — Eva Technology Services LLC

---

**Stop paying for tokens you don't need.** Run `npx cc-optimize` and see your score.
