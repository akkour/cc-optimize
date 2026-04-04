/**
 * Optimizer — Generates optimized versions of Claude Code configuration files
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// ─── Settings Optimizer ────────────────────────────────────────

export function optimizeSettings(data) {
  const existing = data.settingsLocal || data.settingsProject;
  let parsed = {};

  if (existing) {
    try { parsed = JSON.parse(existing.content); } catch { parsed = {}; }
  }

  // Ensure model is set
  if (!parsed.model) parsed.model = 'sonnet';

  // Ensure env optimizations
  if (!parsed.env) parsed.env = {};
  if (!parsed.env.MAX_THINKING_TOKENS) parsed.env.MAX_THINKING_TOKENS = '10000';
  if (!parsed.env.CLAUDE_CODE_SUBAGENT_MODEL) parsed.env.CLAUDE_CODE_SUBAGENT_MODEL = 'haiku';

  // Clean permissions: remove exposed secrets
  if (parsed.permissions?.allow) {
    parsed.permissions.allow = parsed.permissions.allow
      .filter(p => !looksLikeExposedSecret(p))
      .map(p => simplifyPermission(p));

    // Deduplicate
    parsed.permissions.allow = [...new Set(parsed.permissions.allow)];
  }

  return JSON.stringify(parsed, null, 2);
}

function looksLikeExposedSecret(permission) {
  // Matches patterns like EXPO_TOKEN=xxxxx, Bearer xxx, API_KEY=xxx
  return /[A-Z_]+(TOKEN|KEY|SECRET|PASSWORD)=[A-Za-z0-9_\-"]{10,}/.test(permission);
}

function simplifyPermission(permission) {
  // Bash(git add:*) → Bash(git:*) if we have multiple git sub-commands
  // This is done at the array level, not per-item
  return permission;
}

export function simplifyPermissions(permissions) {
  // Group Bash permissions by tool prefix
  const groups = {};
  const nonBash = [];

  for (const p of permissions) {
    const match = p.match(/^Bash\((\w+)[\s:]/);
    if (match) {
      const tool = match[1];
      if (!groups[tool]) groups[tool] = [];
      groups[tool].push(p);
    } else {
      nonBash.push(p);
    }
  }

  // If a tool has multiple sub-permissions, consolidate to Bash(tool:*)
  const simplified = [];
  for (const [tool, perms] of Object.entries(groups)) {
    if (perms.length > 2 || perms.some(p => p === `Bash(${tool}:*)`)) {
      simplified.push(`Bash(${tool}:*)`);
    } else {
      simplified.push(...perms);
    }
  }

  return [...simplified, ...nonBash];
}

// ─── .claudeignore Optimizer ───────────────────────────────────

export function optimizeClaudeignore(data) {
  const existing = data.claudeignore?.content || '';
  const lines = existing.split('\n').filter(l => l.trim());

  const essentials = [
    '# Build artifacts',
    'node_modules/',
    'dist/',
    'build/',
    '.next/',
    'out/',
    '',
    '# Test & coverage',
    'coverage/',
    '.nyc_output/',
    '',
    '# Lock files & maps',
    '*.lock',
    'package-lock.json',
    '*.min.js',
    '*.min.css',
    '*.map',
    '',
    '# IDE & OS',
    '.idea/',
    '.vscode/',
    '.DS_Store',
    '',
    '# Logs',
    '*.log',
    'npm-debug.log*',
  ];

  // Merge existing entries with essentials (no duplicates)
  const merged = new Set();
  for (const line of essentials) {
    merged.add(line);
  }
  for (const line of lines) {
    if (line.startsWith('#')) continue; // Skip existing comments
    if (!essentials.includes(line)) {
      merged.add(line); // Keep custom entries
    }
  }

  return Array.from(merged).join('\n');
}

// ─── CLAUDE.md Analyzer for Optimization ───────────────────────

export function analyzeClaudeMdForOptimization(content) {
  if (!content) return { sections: [], codeBlocks: 0, codeBlockLines: 0 };

  const lines = content.split('\n');
  const sections = [];
  let currentSection = null;
  let codeBlockCount = 0;
  let codeBlockLines = 0;
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeBlockCount++;
      }
      if (inCodeBlock) codeBlockLines++;
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines++;
      continue;
    }

    const headerMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headerMatch) {
      if (currentSection) {
        currentSection.endLine = i - 1;
        currentSection.lines = currentSection.endLine - currentSection.startLine + 1;
        sections.push(currentSection);
      }
      currentSection = {
        level: headerMatch[1].length,
        title: headerMatch[2].trim(),
        startLine: i,
        endLine: null,
        lines: 0,
        isMoveable: isDetailSection(headerMatch[2].trim()),
      };
    }
  }

  if (currentSection) {
    currentSection.endLine = lines.length - 1;
    currentSection.lines = currentSection.endLine - currentSection.startLine + 1;
    sections.push(currentSection);
  }

  return { sections, codeBlockCount, codeBlockLines };
}

function isDetailSection(title) {
  const detailPatterns = [
    /test/i, /ci.?cd/i, /pipeline/i, /gate/i,
    /frontend.*rule/i, /^F\d/i, /design.*system/i,
    /responsive/i, /i18n/i, /internation/i,
    /convention.*code/i, /pattern.*layout/i,
    /edge.*function.*standard/i, /migration.*standard/i,
    /checklist.*commit/i,
  ];
  return detailPatterns.some(p => p.test(title));
}

// ─── Optimization Summary ──────────────────────────────────────

export function generateOptimizationPlan(data, analysis) {
  const plan = {
    files: [],
    estimatedSavings: {
      tokensPerMessage: 0,
      percentReduction: 0,
    },
  };

  // Settings optimization
  const optimizedSettings = optimizeSettings(data);
  const currentSettings = (data.settingsLocal || data.settingsProject)?.content || '{}';
  if (optimizedSettings !== currentSettings) {
    plan.files.push({
      path: '.claude/settings.local.json',
      action: data.settingsLocal ? 'UPDATE' : 'CREATE',
      current: currentSettings,
      optimized: optimizedSettings,
      reason: 'Add model/token optimization + remove exposed secrets',
    });
  }

  // .claudeignore optimization
  const optimizedIgnore = optimizeClaudeignore(data);
  const currentIgnore = data.claudeignore?.content || '';
  if (optimizedIgnore !== currentIgnore) {
    plan.files.push({
      path: '.claudeignore',
      action: data.claudeignore ? 'UPDATE' : 'CREATE',
      current: currentIgnore,
      optimized: optimizedIgnore,
      reason: 'Add essential exclusions for node_modules, dist, coverage, lock files',
    });
  }

  // CLAUDE.md optimization suggestions
  if (data.claudeMd && data.claudeMd.lines > 200) {
    const mdAnalysis = analyzeClaudeMdForOptimization(data.claudeMd.content);
    const moveableSections = mdAnalysis.sections.filter(s => s.isMoveable);
    const moveableLines = moveableSections.reduce((s, sec) => s + sec.lines, 0);

    plan.files.push({
      path: 'CLAUDE.md',
      action: 'OPTIMIZE',
      current: `${data.claudeMd.lines} lines (${estimateTokens(data.claudeMd.content)} tokens)`,
      optimized: `~${data.claudeMd.lines - moveableLines - mdAnalysis.codeBlockLines} lines (~${estimateTokens(data.claudeMd.content) - estimateTokens('x'.repeat((moveableLines + mdAnalysis.codeBlockLines) * 40))} tokens)`,
      reason: `Move ${moveableSections.length} detail sections (${moveableLines} lines) to separate docs + remove ${mdAnalysis.codeBlockLines} lines of code examples`,
      moveableSections: moveableSections.map(s => `${s.title} (${s.lines} lines)`),
      codeBlockLines: mdAnalysis.codeBlockLines,
    });

    plan.estimatedSavings.tokensPerMessage = estimateTokens('x'.repeat((moveableLines + mdAnalysis.codeBlockLines) * 40));
  }

  // Calculate total savings
  if (data.claudeMd) {
    const currentTokens = estimateTokens(data.claudeMd.content);
    plan.estimatedSavings.tokensPerMessage = Math.max(
      plan.estimatedSavings.tokensPerMessage,
      currentTokens > 1500 ? currentTokens - 1300 : 0
    );
    plan.estimatedSavings.percentReduction = currentTokens > 0
      ? Math.round((plan.estimatedSavings.tokensPerMessage / currentTokens) * 100)
      : 0;
  }

  return plan;
}

function estimateTokens(text) {
  return Math.ceil((text?.length || 0) / 4);
}
