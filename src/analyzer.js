/**
 * Analyzer — Scores Claude Code configuration across 5 dimensions
 * Returns a detailed audit report with scores, issues, and recommendations.
 */

// Rough token estimation: ~1 token per 4 characters
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

// ─── CLAUDE.md Analysis ────────────────────────────────────────

function analyzeClaudeMd(data) {
  const result = {
    score: 0,
    maxScore: 40,
    issues: [],
    recommendations: [],
    stats: {},
  };

  if (!data.claudeMd) {
    result.issues.push({ severity: 'critical', message: 'No CLAUDE.md found — Claude Code has no project context' });
    result.recommendations.push({
      action: 'Create CLAUDE.md with project context, architecture map, and rules',
      impact: 'HIGH — Claude Code rediscovers your project structure every session',
      tokens: '~2,000 tokens saved per session',
    });
    return result;
  }

  const md = data.claudeMd;
  const content = md.content;
  const lines = md.lines;
  const tokens = estimateTokens(content);

  result.stats = { lines, tokens, bytes: md.bytes };

  // Score: line count (target < 150)
  if (lines <= 120) {
    result.score += 15;
  } else if (lines <= 200) {
    result.score += 10;
  } else if (lines <= 350) {
    result.score += 5;
    result.issues.push({
      severity: 'warning',
      message: `CLAUDE.md is ${lines} lines (${tokens} tokens) — target is <150 lines`,
    });
    result.recommendations.push({
      action: `Reduce CLAUDE.md from ${lines} to <150 lines — move detailed docs to separate files`,
      impact: `HIGH — saves ~${tokens - 1300} tokens per message`,
      tokens: `${tokens} → ~1,300 tokens`,
    });
  } else {
    result.issues.push({
      severity: 'critical',
      message: `CLAUDE.md is ${lines} lines (${tokens} tokens) — SEVERE bloat, target is <150 lines`,
    });
    result.recommendations.push({
      action: `URGENT: Reduce CLAUDE.md from ${lines} to <150 lines`,
      impact: `CRITICAL — wastes ~${tokens - 1300} tokens on EVERY message`,
      tokens: `${tokens} → ~1,300 tokens`,
    });
  }

  // Score: Architecture Map present?
  const hasArchMap = /architecture\s*map/i.test(content) ||
    /## (architecture|map|structure.*map)/i.test(content);
  if (hasArchMap) {
    result.score += 10;
  } else {
    result.issues.push({
      severity: 'warning',
      message: 'No Architecture Map — Claude Code explores files blindly each session',
    });
    result.recommendations.push({
      action: 'Add an Architecture Map section listing key files by feature',
      impact: 'HIGH — eliminates file exploration tokens (~5,000-15,000 per session)',
      tokens: '+25 lines, saves 5,000+ tokens of exploration',
    });
  }

  // Score: Code examples embedded?
  const codeBlocks = (content.match(/```[\s\S]*?```/g) || []);
  const codeBlockLines = codeBlocks.reduce((sum, b) => sum + b.split('\n').length, 0);
  if (codeBlockLines > 30) {
    result.issues.push({
      severity: 'warning',
      message: `${codeBlocks.length} code blocks (${codeBlockLines} lines) embedded — Claude reads real files, not examples`,
    });
    result.recommendations.push({
      action: `Remove ${codeBlockLines} lines of code examples — Claude reads actual source files`,
      impact: `MEDIUM — saves ~${estimateTokens(codeBlocks.join(''))} tokens per message`,
      tokens: `−${codeBlockLines} lines of redundant examples`,
    });
  } else {
    result.score += 5;
  }

  // Score: Auto-update rule (Rule 0)?
  const hasRule0 = /architecture.*map.*à jour|auto.?update.*map|rule\s*0|règle\s*0/i.test(content);
  if (hasRule0) {
    result.score += 5;
  } else if (hasArchMap) {
    result.issues.push({
      severity: 'info',
      message: 'Architecture Map exists but no auto-update rule — map will get stale',
    });
    result.recommendations.push({
      action: 'Add Rule 0: "After creating a new key file, update the Architecture Map"',
      impact: 'LOW — keeps the map accurate without manual work',
      tokens: '+1 line',
    });
  }

  // Score: References to detailed docs?
  const hasDocRefs = /charger.*demande|load.*demand|docs?\//i.test(content) ||
    /DESIGN_SYSTEM|DATABASE_SCHEMA|SKILL\.md/i.test(content);
  if (hasDocRefs) {
    result.score += 5;
  } else if (lines > 200) {
    result.recommendations.push({
      action: 'Add "Docs détaillées" section pointing to separate files loaded on-demand',
      impact: 'MEDIUM — prevents bloat from growing back',
      tokens: '+5 lines, prevents future bloat',
    });
  }

  return result;
}

// ─── Settings Analysis ─────────────────────────────────────────

function analyzeSettings(data) {
  const result = {
    score: 0,
    maxScore: 25,
    issues: [],
    recommendations: [],
    stats: {},
  };

  const settings = data.settingsLocal || data.settingsProject;

  if (!settings) {
    result.issues.push({
      severity: 'critical',
      message: 'No settings.json found — using defaults (Opus, full thinking budget)',
    });
    result.recommendations.push({
      action: 'Create .claude/settings.local.json with model + token optimization',
      impact: 'CRITICAL — Sonnet default + thinking cap saves 60-70% of tokens',
      tokens: 'Saves ~60% token budget',
    });
    return result;
  }

  let parsed;
  try {
    parsed = JSON.parse(settings.content);
  } catch {
    result.issues.push({ severity: 'critical', message: 'settings.json is not valid JSON' });
    return result;
  }

  result.stats = { path: settings.path };

  // Model check
  const model = parsed.model || parsed.defaultModel;
  if (model === 'sonnet') {
    result.score += 8;
  } else if (model === 'opusplan') {
    result.score += 5;
    result.issues.push({
      severity: 'info',
      message: 'opusplan mode — known bug may route all traffic to Opus (issue #27183)',
    });
  } else if (!model) {
    result.issues.push({
      severity: 'warning',
      message: 'No default model set — may default to Opus (expensive)',
    });
    result.recommendations.push({
      action: 'Add "model": "sonnet" — use /model opus only when needed',
      impact: 'HIGH — Sonnet is 60% cheaper than Opus for 80% of tasks',
      tokens: '~60% cost reduction',
    });
  }

  // Thinking tokens
  const env = parsed.env || {};
  const thinkingTokens = env.MAX_THINKING_TOKENS;
  if (thinkingTokens && parseInt(thinkingTokens) <= 15000) {
    result.score += 7;
  } else {
    result.issues.push({
      severity: 'warning',
      message: `MAX_THINKING_TOKENS ${thinkingTokens ? `= ${thinkingTokens}` : 'not set'} — default is 32K, most tasks need <10K`,
    });
    result.recommendations.push({
      action: 'Set MAX_THINKING_TOKENS to "10000" in env',
      impact: 'HIGH — reduces hidden thinking cost by ~70%',
      tokens: '32K → 10K thinking tokens per request',
    });
  }

  // Subagent model
  const subagentModel = env.CLAUDE_CODE_SUBAGENT_MODEL;
  if (subagentModel === 'haiku') {
    result.score += 5;
  } else {
    result.issues.push({
      severity: 'warning',
      message: `Subagent model ${subagentModel ? `= ${subagentModel}` : 'not set'} — defaults to same model (expensive for file reads)`,
    });
    result.recommendations.push({
      action: 'Set CLAUDE_CODE_SUBAGENT_MODEL to "haiku" in env',
      impact: 'MEDIUM — subagents (explore, read files) run 80% cheaper on Haiku',
      tokens: '~80% cheaper subagent calls',
    });
  }

  // Security: exposed secrets in permissions
  const permissions = parsed.permissions?.allow || [];
  const secretPatterns = [
    /token[=:]/i, /key[=:]/i, /secret[=:]/i, /password[=:]/i,
    /Bearer\s+[A-Za-z0-9_-]+/i,
    /[A-Za-z0-9_-]{20,}/, // long alphanumeric strings that look like tokens
  ];

  const exposedSecrets = [];
  for (const perm of permissions) {
    for (const pattern of secretPatterns) {
      if (pattern.test(perm) && /[A-Za-z0-9_-]{15,}/.test(perm)) {
        // Check it's not just a pattern like "Bash(export:*)"
        if (perm.includes('=') && perm.length > 30) {
          exposedSecrets.push(perm.substring(0, 60) + '...');
        }
      }
    }
  }

  if (exposedSecrets.length > 0) {
    result.score -= 5;
    result.issues.push({
      severity: 'critical',
      message: `🔴 ${exposedSecrets.length} SECRET(S) EXPOSED in settings.json permissions!`,
      details: exposedSecrets,
    });
    result.recommendations.push({
      action: 'URGENT: Remove hardcoded tokens/keys from settings.json — use environment variables',
      impact: 'SECURITY — exposed secrets are a critical vulnerability',
      tokens: 'N/A — security fix',
    });
  } else {
    result.score += 5;
  }

  // Permission simplification
  const canSimplify = countSimplifiablePermissions(permissions);
  if (canSimplify > 5) {
    result.issues.push({
      severity: 'info',
      message: `${permissions.length} permissions — ${canSimplify} can be consolidated (e.g., Bash(git add:*) + Bash(git commit:*) → Bash(git:*))`,
    });
  }

  return result;
}

function countSimplifiablePermissions(permissions) {
  const prefixes = {};
  for (const p of permissions) {
    const match = p.match(/^Bash\((\w+)\s/);
    if (match) {
      prefixes[match[1]] = (prefixes[match[1]] || 0) + 1;
    }
  }
  return Object.values(prefixes).filter(v => v > 1).reduce((a, b) => a + b, 0);
}

// ─── .claudeignore Analysis ────────────────────────────────────

function analyzeClaudeignore(data) {
  const result = {
    score: 0,
    maxScore: 15,
    issues: [],
    recommendations: [],
  };

  if (!data.claudeignore) {
    result.issues.push({
      severity: 'warning',
      message: 'No .claudeignore — Claude Code may index node_modules, dist, coverage, lock files',
    });

    const suggestedEntries = [];
    if (data.hasNodeModules) suggestedEntries.push('node_modules/');
    suggestedEntries.push('dist/', '.next/', 'build/', 'coverage/', '*.lock', '*.min.js', '*.map');

    result.recommendations.push({
      action: `Create .claudeignore with: ${suggestedEntries.join(', ')}`,
      impact: 'MEDIUM — prevents indexing large irrelevant directories',
      tokens: 'Reduces context scanning overhead',
    });
    return result;
  }

  const content = data.claudeignore.content;
  const entries = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));

  // Check essential exclusions
  const essentials = ['node_modules', 'dist', 'coverage', '.lock', '.min.js'];
  const missing = essentials.filter(e =>
    !entries.some(entry => entry.includes(e))
  );

  if (missing.length === 0) {
    result.score += 15;
  } else if (missing.length <= 2) {
    result.score += 10;
    result.issues.push({
      severity: 'info',
      message: `.claudeignore missing: ${missing.join(', ')}`,
    });
  } else {
    result.score += 5;
    result.issues.push({
      severity: 'warning',
      message: `.claudeignore missing essential entries: ${missing.join(', ')}`,
    });
    result.recommendations.push({
      action: `Add to .claudeignore: ${missing.join(', ')}`,
      impact: 'MEDIUM — reduces unnecessary file indexing',
      tokens: 'Variable — depends on excluded file sizes',
    });
  }

  return result;
}

// ─── Skills Analysis ───────────────────────────────────────────

function analyzeSkills(data) {
  const result = {
    score: 0,
    maxScore: 10,
    issues: [],
    recommendations: [],
    stats: {},
  };

  if (data.skills.length === 0) {
    result.score += 5; // No skills = no bloat (neutral)
    return result;
  }

  result.stats = {
    count: data.skills.length,
    totalLines: data.skills.reduce((s, sk) => s + sk.lines, 0),
    totalTokens: data.skills.reduce((s, sk) => s + estimateTokens(sk.name), 0),
  };

  // Check if skills are embedded in CLAUDE.md
  if (data.claudeMd) {
    const mdContent = data.claudeMd.content;
    const embeddedSkills = data.skills.filter(sk =>
      mdContent.includes(sk.name) && mdContent.length > 5000
    );

    // Check if skills content is copy-pasted into CLAUDE.md
    const skillLines = data.skills.reduce((s, sk) => s + sk.lines, 0);
    if (data.claudeMd.lines > 300 && skillLines > 100) {
      result.issues.push({
        severity: 'info',
        message: `${data.skills.length} skills detected (${skillLines} lines total) — ensure they're loaded on-demand, not embedded in CLAUDE.md`,
      });
    }
  }

  // Skills are separate files = good
  result.score += 10;

  return result;
}

// ─── Session Discipline Analysis ───────────────────────────────

function analyzeSessionDiscipline(data) {
  const result = {
    score: 0,
    maxScore: 10,
    issues: [],
    recommendations: [],
  };

  if (!data.claudeMd) return result;

  const content = data.claudeMd.content;

  // Check for /compact mention
  if (/compact/i.test(content)) {
    result.score += 3;
  } else {
    result.recommendations.push({
      action: 'Add a reminder to use /compact after each milestone in CLAUDE.md',
      impact: 'LOW — helps developers remember to purge context',
      tokens: '+1 line',
    });
  }

  // Check for session report format
  if (/rapport.*session|session.*report/i.test(content)) {
    result.score += 4;
  }

  // Check for model switching guidance
  if (/\/model|sonnet.*opus|opusplan/i.test(content)) {
    result.score += 3;
  } else {
    result.recommendations.push({
      action: 'Document model switching strategy (Sonnet default, Opus for architecture)',
      impact: 'LOW — guides developers to use cheaper models for routine work',
      tokens: '+2 lines',
    });
  }

  return result;
}

// ─── Main Analysis ─────────────────────────────────────────────

export function analyze(data) {
  const claudeMd = analyzeClaudeMd(data);
  const settings = analyzeSettings(data);
  const claudeignore = analyzeClaudeignore(data);
  const skills = analyzeSkills(data);
  const discipline = analyzeSessionDiscipline(data);

  const totalScore = Math.max(0,
    claudeMd.score + settings.score + claudeignore.score + skills.score + discipline.score
  );
  const maxScore = claudeMd.maxScore + settings.maxScore + claudeignore.maxScore + skills.maxScore + discipline.maxScore;
  const percentage = Math.round((totalScore / maxScore) * 100);

  const allIssues = [
    ...claudeMd.issues,
    ...settings.issues,
    ...claudeignore.issues,
    ...skills.issues,
    ...discipline.issues,
  ];

  const allRecommendations = [
    ...claudeMd.recommendations,
    ...settings.recommendations,
    ...claudeignore.recommendations,
    ...skills.recommendations,
    ...discipline.recommendations,
  ];

  // Sort: critical first
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  allIssues.sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));

  return {
    score: percentage,
    grade: percentage >= 85 ? 'A' : percentage >= 70 ? 'B' : percentage >= 50 ? 'C' : percentage >= 30 ? 'D' : 'F',
    sections: { claudeMd, settings, claudeignore, skills, discipline },
    issues: allIssues,
    recommendations: allRecommendations,
    stats: {
      claudeMdLines: data.claudeMd?.lines || 0,
      claudeMdTokens: data.claudeMd ? estimateTokens(data.claudeMd.content) : 0,
      settingsPath: (data.settingsLocal || data.settingsProject)?.path || 'none',
      skillsCount: data.skills.length,
      hasClaudeignore: !!data.claudeignore,
    },
  };
}
