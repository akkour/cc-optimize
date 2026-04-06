/**
 * cc-optimize — Main Orchestrator
 * Scan → Analyze → Display → Optimize CLAUDE.md → Confirm → Backup → Apply
 * 
 * v2.0: Supports remote repositories (GitHub, GitLab, Bitbucket)
 */

import { existsSync, mkdirSync, writeFileSync, copyFileSync } from 'fs';
import { join, resolve, basename } from 'path';
import ora from 'ora';
import chalk from 'chalk';
import { scan } from './scanner.js';
import { analyze } from './analyzer.js';
import { optimizeSettings, optimizeClaudeignore, generateOptimizationPlan } from './optimizer.js';
import { buildArchitectureMap, generateOptimizedClaudeMd, generateMovedDocs } from './claudemd-optimizer.js';
import { generateHtmlReport } from './report.js';
import { isRemoteRepo, parseRepoArg, cloneRepo, cleanupTemp } from './remote.js';
import {
  displayHeader,
  displayScore,
  displaySectionScores,
  displayCurrentState,
  displayIssues,
  displayRecommendations,
  displayOptimizationPlan,
  displayDiff,
  askConfirmation,
  displayBackupInfo,
  displayApplied,
  displayFooter,
} from './display.js';

export async function run(projectPath, options = {}) {
  displayHeader();

  let root;
  let tempDir = null;
  let isRemote = false;
  let repoInfo = null;

  const spinner = ora({ text: '', indent: 2 });

  // ─── Detect local vs remote ──────────────────────────────────
  if (options.repo || isRemoteRepo(projectPath)) {
    isRemote = true;
    const repoArg = options.repo || projectPath;

    spinner.start(`Parsing repository: ${repoArg}...`);
    repoInfo = parseRepoArg(repoArg, options.provider);
    spinner.succeed(`Repository: ${repoInfo.fullName} (${repoInfo.provider})`);

    spinner.start(`Cloning ${repoInfo.fullName}...`);
    try {
      const cloneResult = cloneRepo(repoInfo, options.token);
      tempDir = cloneResult.tempDir;
      root = resolve(cloneResult.destDir);
      spinner.succeed(`Cloned ${repoInfo.fullName} (shallow, single-branch)`);
    } catch (err) {
      spinner.fail(`Clone failed: ${err.message}`);
      process.exit(1);
    }
  } else {
    root = resolve(projectPath);
  }

  // ─── Step 1: Scan ────────────────────────────────────────────
  // ─── Step 1: Scan ────────────────────────────────────────────
  spinner.start('Scanning project...');

  let data;
  try {
    data = scan(root);
    const label = isRemote ? `Project scanned: ${repoInfo.fullName}` : 'Project scanned';
    spinner.succeed(label);
  } catch (err) {
    spinner.fail(`Scan failed: ${err.message}`);
    if (tempDir) cleanupTemp(tempDir);
    process.exit(1);
  }

  // ─── Step 2: Analyze ─────────────────────────────────────────
  spinner.start('Analyzing configuration...');
  const analysis = analyze(data);
  spinner.succeed('Analysis complete');
  console.log('');

  // ─── Step 3: Display Current State ───────────────────────────
  displayCurrentState(data);

  // ─── Step 4: Display Score ───────────────────────────────────
  displayScore(analysis);
  displaySectionScores(analysis);

  // ─── Step 5: Display Issues ──────────────────────────────────
  displayIssues(analysis.issues);

  // ─── Step 6: Display Recommendations ─────────────────────────
  displayRecommendations(analysis.recommendations);

  // ─── Step 7: Build Architecture Map ──────────────────────────
  spinner.start('Scanning filesystem for Architecture Map...');
  const archMap = buildArchitectureMap(root);
  const totalFiles = Object.values(archMap).reduce((s, arr) => s + arr.length, 0);
  spinner.succeed(`Architecture Map: ${totalFiles} key files discovered`);
  console.log('');

  // ─── Step 8: Generate Optimization Plan ──────────────────────
  const plan = generateOptimizationPlan(data, analysis);

  // ─── Step 9: Generate optimized CLAUDE.md ────────────────────
  let claudeMdResult = null;
  let movedDocs = [];

  if (data.claudeMd) {
    spinner.start('Generating optimized CLAUDE.md...');
    claudeMdResult = generateOptimizedClaudeMd(data, archMap);
    movedDocs = generateMovedDocs(claudeMdResult.moved);
    spinner.succeed(
      `CLAUDE.md: ${claudeMdResult.stats.originalLines} → ${claudeMdResult.stats.optimizedLines} lines ` +
      `(${claudeMdResult.stats.movedSections} sections moved to docs/)`
    );
    console.log('');

    // Add CLAUDE.md to the plan
    plan.files.unshift({
      path: 'CLAUDE.md',
      action: 'OPTIMIZE',
      current: data.claudeMd.content,
      optimized: claudeMdResult.optimized,
      reason: `Reduce from ${claudeMdResult.stats.originalLines} to ${claudeMdResult.stats.optimizedLines} lines — ` +
        `Architecture Map added, ${claudeMdResult.stats.movedSections} detail sections moved to docs/`,
    });

    // Add moved docs to the plan
    for (const doc of movedDocs) {
      plan.files.push({
        path: doc.path,
        action: 'CREATE',
        current: '',
        optimized: doc.content,
        reason: `Moved from CLAUDE.md — loaded on-demand by Claude Code`,
      });
    }
  } else {
    console.log(chalk.yellow('  ⚠ No CLAUDE.md found — consider creating one with Claude Code'));
    console.log('');
  }

  displayOptimizationPlan(plan);

  // If nothing to do, exit
  if (plan.files.length === 0) {
    displayFooter();
    return;
  }

  // ─── Step 10: Show Diffs ─────────────────────────────────────
  for (const file of plan.files) {
    if (file.optimized && file.current !== undefined) {
      if (file.path === 'CLAUDE.md') {
        displayDiff('CLAUDE.md (before → after)', file.current, file.optimized);
      } else if (file.action === 'CREATE' && file.path.startsWith('docs/')) {
        // Don't show full diff for moved docs — just mention them
        continue;
      } else {
        displayDiff(file.path, file.current || '(empty)', file.optimized);
      }
    }
  }

  // ─── Remote repos: audit-only mode (no apply) ────────────────
  if (isRemote) {
    console.log(chalk.cyan('  ℹ Remote repository — audit-only mode (no files modified)'));
    console.log('');

    // Generate report in current working directory (not temp clone)
    spinner.start('Generating visual report...');
    try {
      const reportDir = join(process.cwd(), '.cc-optimize-reports');
      mkdirSync(reportDir, { recursive: true });
      const reportPath = join(reportDir, `${repoInfo.name}-report.html`);
      // Temporarily override root for report generation
      const reportContent = generateHtmlReport(root, data, analysis, archMap, claudeMdResult, plan);
      // Copy report to local directory
      const { readFileSync } = await import('fs');
      const htmlContent = readFileSync(join(root, '.claude', 'cc-optimize-report.html'), 'utf-8');
      writeFileSync(reportPath, htmlContent, 'utf-8');
      spinner.succeed(`Report saved: ${reportPath}`);

      const { exec } = await import('child_process');
      const openInBrowser = (filePath) => {
        switch (process.platform) {
          case 'win32':
            return exec(`cmd /c start "" "${filePath}"`);
          case 'darwin':
            return exec(`open "${filePath}"`);
          default:
            return exec(`xdg-open "${filePath}"`);
        }
      };
      openInBrowser(reportPath);
      console.log(chalk.cyan('  📊 Report opened in your browser'));
    } catch (err) {
      spinner.warn(`Report generation failed: ${err.message}`);
    }

    // Cleanup temp clone
    cleanupTemp(tempDir);
    console.log('');
    console.log(chalk.dim(`  Temp clone cleaned up`));

    console.log('');
    console.log(chalk.green.bold('  To apply fixes, clone the repo locally and run:'));
    console.log(chalk.dim(`    git clone ${repoInfo.url}`));
    console.log(chalk.dim(`    cd ${repoInfo.name}`));
    console.log(chalk.dim(`    cc-optimize .`));
    console.log('');
    displayFooter();
    return;
  }

  // ─── Step 11: Ask Confirmation (local repos only) ─────────────
  const confirmed = await askConfirmation('Apply all optimizations? (backup will be created first)');

  if (!confirmed) {
    console.log('');
    console.log('  Aborted. No changes applied.');

    // Still generate the report for the current state
    spinner.start('Generating visual report...');
    try {
      const reportPath = generateHtmlReport(root, data, analysis, archMap, claudeMdResult, plan);
      spinner.succeed(`Report saved: ${reportPath}`);
      const { exec } = await import('child_process');
      const openInBrowser = (filePath) => {
        switch (process.platform) {
          case 'win32':
            return exec(`cmd /c start "" "${filePath}"`);
          case 'darwin':
            return exec(`open "${filePath}"`);
          default:
            return exec(`xdg-open "${filePath}"`);
        }
      };
      openInBrowser(reportPath);
      console.log(chalk.cyan('  📊 Report opened in your browser (no changes made)'));
    } catch (err) {
      spinner.warn(`Report generation failed: ${err.message}`);
    }
    console.log('');
    displayFooter();
    return;
  }

  // ─── Step 12: Backup ─────────────────────────────────────────
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = join(root, '.claude', 'backups', `cc-optimize-${timestamp}`);

  spinner.start('Creating backup...');
  try {
    mkdirSync(backupDir, { recursive: true });

    // Backup all existing files that will be modified
    const filesToBackup = ['CLAUDE.md', '.claudeignore'];
    const settingsPath = (data.settingsLocal || data.settingsProject)?.path;
    if (settingsPath) filesToBackup.push(settingsPath);

    for (const relPath of filesToBackup) {
      const srcPath = join(root, relPath);
      if (existsSync(srcPath)) {
        const backupPath = join(backupDir, basename(relPath));
        copyFileSync(srcPath, backupPath);
      }
    }

    spinner.succeed('Backup created');
    displayBackupInfo(backupDir);
  } catch (err) {
    spinner.fail(`Backup failed: ${err.message}`);
    process.exit(1);
  }

  // ─── Step 13: Apply ──────────────────────────────────────────
  spinner.start('Applying optimizations...');
  const applied = [];

  try {
    for (const file of plan.files) {
      if (!file.optimized) continue;

      const targetPath = join(root, file.path);
      const targetDir = join(targetPath, '..');
      mkdirSync(targetDir, { recursive: true });
      writeFileSync(targetPath, file.optimized, 'utf-8');
      applied.push(file.path);
    }

    spinner.succeed('Optimizations applied');
  } catch (err) {
    spinner.fail(`Apply failed: ${err.message} — restore from ${backupDir}`);
    process.exit(1);
  }

  // ─── Step 14: Summary ────────────────────────────────────────
  console.log('');
  displayApplied(applied);

  // ─── Step 15: Generate HTML Report ───────────────────────────
  spinner.start('Generating visual report...');
  try {
    const reportPath = generateHtmlReport(root, data, analysis, archMap, claudeMdResult, plan);
    spinner.succeed(`Report saved: ${reportPath}`);

    // Auto-open in browser (cross-platform)
    const { exec } = await import('child_process');
    const openInBrowser = (filePath) => {
      switch (process.platform) {
        case 'win32':
          // cmd /c start works in both cmd.exe and PowerShell
          return exec(`cmd /c start "" "${filePath}"`);
        case 'darwin':
          return exec(`open "${filePath}"`);
        default:
          return exec(`xdg-open "${filePath}"`);
      }
    };
    openInBrowser(reportPath);
    console.log(chalk.cyan('  📊 Report opened in your browser'));
  } catch (err) {
    spinner.warn(`Report generation failed: ${err.message}`);
  }
  console.log('');

  // Final recommendation
  if (claudeMdResult) {
    console.log(chalk.cyan('  💡 Review the optimized CLAUDE.md and adjust the Architecture Map'));
    console.log(chalk.cyan('     if needed. The auto-generated map may need fine-tuning.'));
    console.log('');
  }

  console.log(chalk.green.bold('  Re-run cc-optimize to see your new score!'));
  console.log('');

  displayFooter();
}
