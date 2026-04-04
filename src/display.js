/**
 * Display — Rich terminal output for cc-optimize
 */

import chalk from 'chalk';
import boxen from 'boxen';

const SEVERITY_ICON = {
  critical: chalk.red('✗'),
  warning: chalk.yellow('⚠'),
  info: chalk.blue('ℹ'),
};

const GRADE_COLOR = {
  A: chalk.green.bold,
  B: chalk.green,
  C: chalk.yellow,
  D: chalk.red,
  F: chalk.red.bold,
};

// ─── Header ────────────────────────────────────────────────────

export function displayHeader() {
  // scanivy-ignore: CWE-532 — False positive validated by AI
  console.log('');
  // scanivy-ignore: CWE-532 — False positive validated by AI
  console.log(boxen(
    chalk.bold.cyan('  cc-optimize  ') + chalk.dim('v1.0.0\n') +
    chalk.white('  Claude Code Configuration Optimizer\n') +
    chalk.dim('  Reduce token usage by 40-70%'),
    {
      padding: { top: 0, bottom: 0, left: 1, right: 1 },
      borderColor: 'cyan',
      borderStyle: 'round',
    }
  ));
  // scanivy-ignore: CWE-532 — False positive validated by AI
  console.log('');
}

// ─── Score ──────────────────────────────────────────────────────

export function displayScore(analysis) {
  const { score, grade } = analysis;
  const colorFn = GRADE_COLOR[grade] || chalk.white;
  const bar = generateBar(score);

  // scanivy-ignore: CWE-532 — False positive validated by AI
  console.log(boxen(
    colorFn(`  ${grade}  `) + chalk.bold.white(` ${score}/100 `) + chalk.dim('optimization score\n\n') +
    `  ${bar}`,
    {
      padding: { top: 0, bottom: 0, left: 1, right: 1 },
      borderColor: score >= 70 ? 'green' : score >= 50 ? 'yellow' : 'red',
      borderStyle: 'round',
      title: '  Score  ',
      titleAlignment: 'center',
    }
  ));
  // scanivy-ignore: CWE-532 — False positive validated by AI
  console.log('');
}

function generateBar(score) {
  const width = 40;
  const safeScore = Math.max(0, Math.min(100, score));
  const filled = Math.round((safeScore / 100) * width);
  const empty = width - filled;
  const color = safeScore >= 70 ? chalk.green : safeScore >= 50 ? chalk.yellow : chalk.red;
  return color('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
}

// ─── Section Scores ────────────────────────────────────────────

export function displaySectionScores(analysis) {
  const sections = [
    { name: 'CLAUDE.md', ...analysis.sections.claudeMd },
    { name: 'Settings', ...analysis.sections.settings },
    { name: '.claudeignore', ...analysis.sections.claudeignore },
    { name: 'Skills', ...analysis.sections.skills },
    { name: 'Discipline', ...analysis.sections.discipline },
  ];

  console.log(chalk.bold.white('  Section Scores'));
  console.log(chalk.dim('  ─────────────────────────────────────'));

  for (const s of sections) {
    const pct = s.maxScore > 0 ? Math.max(0, Math.round((s.score / s.maxScore) * 100)) : 0;
    const bar = generateMiniBar(pct);
    const label = s.name.padEnd(16);
    const scoreStr = `${s.score}/${s.maxScore}`.padStart(6);
    console.log(`  ${label} ${bar} ${chalk.dim(scoreStr)}`);
  }
  console.log('');
}

function generateMiniBar(pct) {
  const width = 20;
  const safePct = Math.max(0, Math.min(100, pct));
  const filled = Math.round((safePct / 100) * width);
  const empty = width - filled;
  const color = safePct >= 70 ? chalk.green : safePct >= 50 ? chalk.yellow : safePct < 30 ? chalk.red : chalk.yellow;
  return color('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
}

// ─── Issues ────────────────────────────────────────────────────

export function displayIssues(issues) {
  if (issues.length === 0) {
    console.log(chalk.green('  ✓ No issues found'));
    console.log('');
    return;
  }

  console.log(chalk.bold.white('  Issues'));
  console.log(chalk.dim('  ─────────────────────────────────────'));

  for (const issue of issues) {
    const icon = SEVERITY_ICON[issue.severity] || chalk.dim('•');
    console.log(`  ${icon} ${issue.message}`);
    if (issue.details) {
      for (const d of issue.details) {
        console.log(chalk.dim(`    → ${d}`));
      }
    }
  }
  console.log('');
}

// ─── Recommendations ───────────────────────────────────────────

export function displayRecommendations(recommendations) {
  if (recommendations.length === 0) return;

  console.log(chalk.bold.white('  Recommendations'));
  console.log(chalk.dim('  ─────────────────────────────────────'));

  for (let i = 0; i < recommendations.length; i++) {
    const r = recommendations[i];
    const num = chalk.cyan(`${i + 1}.`);
    console.log(`  ${num} ${chalk.white(r.action)}`);
    console.log(chalk.dim(`     Impact: ${r.impact}`));
    if (r.tokens) console.log(chalk.dim(`     Tokens: ${r.tokens}`));
    console.log('');
  }
}

// ─── Current State ─────────────────────────────────────────────

export function displayCurrentState(data) {
  console.log(chalk.bold.white('  Current Configuration'));
  console.log(chalk.dim('  ─────────────────────────────────────'));

  const rows = [
    ['CLAUDE.md', data.claudeMd ? `${data.claudeMd.lines} lines (${Math.ceil(data.claudeMd.bytes / 1024)}KB)` : chalk.red('missing')],
    ['Settings', (data.settingsLocal || data.settingsProject)?.path || chalk.red('missing')],
    ['.claudeignore', data.claudeignore ? `${data.claudeignore.content.split('\n').filter(l => l.trim()).length} entries` : chalk.red('missing')],
    ['Skills', data.skills.length > 0 ? `${data.skills.length} skill(s)` : chalk.dim('none')],
    ['Design System', data.designSystem ? chalk.green('found') : chalk.dim('none')],
    ['DB Schema', data.dbSchema ? chalk.green('found') : chalk.dim('none')],
  ];

  for (const [label, value] of rows) {
    console.log(`  ${chalk.dim(label.padEnd(16))} ${value}`);
  }
  console.log('');
}

// ─── Optimization Plan ─────────────────────────────────────────

export function displayOptimizationPlan(plan) {
  if (plan.files.length === 0) {
    console.log(chalk.green('  ✓ All files are already optimized'));
    console.log('');
    return;
  }

  console.log(chalk.bold.white('  Optimization Plan'));
  console.log(chalk.dim('  ─────────────────────────────────────'));

  for (const file of plan.files) {
    const actionColor = file.action === 'CREATE' ? chalk.green : file.action === 'OPTIMIZE' ? chalk.yellow : chalk.cyan;
    console.log(`  ${actionColor(`[${file.action}]`)} ${chalk.white(file.path)}`);
    console.log(chalk.dim(`    ${file.reason}`));

    if (file.action === 'OPTIMIZE' && file.moveableSections) {
      console.log(chalk.dim('    Sections to move out:'));
      for (const s of file.moveableSections) {
        console.log(chalk.dim(`      → ${s}`));
      }
    }
    console.log('');
  }

  if (plan.estimatedSavings.tokensPerMessage > 0) {
    console.log(boxen(
      chalk.green.bold(`  ~${plan.estimatedSavings.tokensPerMessage.toLocaleString()} tokens saved per message\n`) +
      chalk.green(`  ~${plan.estimatedSavings.percentReduction}% reduction in CLAUDE.md context`),
      {
        padding: { top: 0, bottom: 0, left: 1, right: 1 },
        borderColor: 'green',
        borderStyle: 'round',
        title: '  Estimated Savings  ',
        titleAlignment: 'center',
      }
    ));
    console.log('');
  }
}

// ─── Diff Display ──────────────────────────────────────────────

export function displayDiff(label, current, optimized) {
  console.log(chalk.bold.white(`  ${label}`));
  console.log(chalk.dim('  ─────────────────────────────────────'));

  const currentLines = current.split('\n').length;
  const optimizedLines = optimized.split('\n').length;

  console.log(chalk.red(`  - Current:   ${currentLines} lines`));
  console.log(chalk.green(`  + Optimized: ${optimizedLines} lines`));
  console.log('');

  // Show first 20 lines of optimized
  const preview = optimized.split('\n').slice(0, 25);
  for (const line of preview) {
    console.log(chalk.green(`  + ${line}`));
  }
  if (optimized.split('\n').length > 25) {
    console.log(chalk.dim(`  ... (${optimized.split('\n').length - 25} more lines)`));
  }
  console.log('');
}

// ─── Confirmation Prompt ───────────────────────────────────────

export async function askConfirmation(question) {
  const { createInterface } = await import('readline');
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  return new Promise(resolve => {
    rl.question(chalk.cyan(`  ? ${question} (y/N) `), answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// ─── Backup Confirmation ───────────────────────────────────────

export function displayBackupInfo(backupDir) {
  console.log(boxen(
    chalk.green('  ✓ Backup created\n') +
    chalk.dim(`  Location: ${backupDir}\n`) +
    chalk.dim('  To restore: copy files back from backup directory'),
    {
      padding: { top: 0, bottom: 0, left: 1, right: 1 },
      borderColor: 'green',
      borderStyle: 'round',
    }
  ));
  console.log('');
}

// ─── Applied Changes ───────────────────────────────────────────

export function displayApplied(files) {
  console.log(chalk.bold.green('  ✓ Optimization applied'));
  console.log(chalk.dim('  ─────────────────────────────────────'));
  for (const f of files) {
    console.log(chalk.green(`  ✓ ${f}`));
  }
  console.log('');
}

// ─── Footer ────────────────────────────────────────────────────

export function displayFooter() {
  console.log(chalk.dim('  ─────────────────────────────────────'));
  console.log(chalk.dim('  cc-optimize by Eva Technology Services LLC'));
  console.log(chalk.dim('  https://github.com/akkour/cc-optimize'));
  console.log('');
}
