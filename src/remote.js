/**
 * Remote — Clone remote repositories for scanning
 * 
 * Supports:
 * - GitHub (public + private with token)
 * - GitLab (public + private with token)
 * - Bitbucket (public + private with token)
 * - Any HTTPS git URL
 * 
 * Usage:
 *   cc-optimize --repo user/project
 *   cc-optimize --repo https://github.com/user/project
 *   cc-optimize --repo user/project --provider github --token ghp_xxx
 */

import { execSync } from 'child_process';
import { mkdtempSync, rmSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';

// ─── Parse repo identifier ─────────────────────────────────────

export function parseRepoArg(repoArg, provider) {
  // Full URL: https://github.com/user/repo or https://github.com/user/repo.git
  if (repoArg.startsWith('https://') || repoArg.startsWith('http://')) {
    const url = new URL(repoArg);
    const detectedProvider = detectProvider(url.hostname);
    const parts = url.pathname.split('/').filter(Boolean);
    const owner = parts[0] || '';
    const name = (parts[1] || '').replace(/\.git$/, '');
    return {
      url: repoArg.endsWith('.git') ? repoArg : repoArg + '.git',
      provider: provider || detectedProvider,
      owner,
      name,
      fullName: `${owner}/${name}`,
    };
  }

  // Short form: user/repo
  if (repoArg.includes('/') && !repoArg.includes(' ')) {
    const [owner, name] = repoArg.split('/');
    const resolvedProvider = provider || 'github';
    const hostMap = {
      github: 'github.com',
      gitlab: 'gitlab.com',
      bitbucket: 'bitbucket.org',
    };
    const host = hostMap[resolvedProvider] || 'github.com';
    return {
      url: `https://${host}/${owner}/${name}.git`,
      provider: resolvedProvider,
      owner,
      name,
      fullName: `${owner}/${name}`,
    };
  }

  throw new Error(
    `Invalid repo format: "${repoArg}"\n` +
    `Expected: user/repo, https://github.com/user/repo, or a local path`
  );
}

function detectProvider(hostname) {
  if (hostname.includes('github')) return 'github';
  if (hostname.includes('gitlab')) return 'gitlab';
  if (hostname.includes('bitbucket')) return 'bitbucket';
  return 'git';
}

// ─── Build authenticated URL ────────────────────────────────────

function buildAuthUrl(repoInfo, token) {
  if (!token) return repoInfo.url;

  const url = new URL(repoInfo.url);

  switch (repoInfo.provider) {
    case 'github':
      url.username = 'x-access-token';
      url.password = token;
      break;
    case 'gitlab':
      url.username = 'oauth2';
      url.password = token;
      break;
    case 'bitbucket':
      url.username = 'x-token-auth';
      url.password = token;
      break;
    default:
      url.username = token;
      break;
  }

  return url.toString();
}

// ─── Clone repo to temp directory ───────────────────────────────

export function cloneRepo(repoInfo, token) {
  const tempDir = mkdtempSync(join(tmpdir(), 'cc-optimize-'));
  const destDir = join(tempDir, repoInfo.name);
  const authUrl = buildAuthUrl(repoInfo, token);

  // Mask token in error messages
  const safeUrl = repoInfo.url;

  try {
    execSync(
      `git clone --depth 1 --single-branch ${authUrl} "${destDir}"`,
      {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 120_000, // 2 minutes max
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: '0', // Never prompt for credentials
        },
      }
    );
  } catch (err) {
    // Clean up on failure
    cleanupTemp(tempDir);

    const stderr = err.stderr?.toString() || '';
    // Mask any token that might appear in error output
    const safeStderr = token
      ? stderr.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '***')
      : stderr;

    if (safeStderr.includes('not found') || safeStderr.includes('404')) {
      throw new Error(`Repository not found: ${safeUrl}\nCheck the URL and ensure the repo exists.`);
    }
    if (safeStderr.includes('Authentication') || safeStderr.includes('403') || safeStderr.includes('401')) {
      throw new Error(
        `Authentication failed for ${safeUrl}\n` +
        `Use --token to provide a personal access token:\n` +
        `  cc-optimize --repo ${repoInfo.fullName} --token ghp_xxxxx`
      );
    }
    throw new Error(`Git clone failed for ${safeUrl}: ${safeStderr.slice(0, 200)}`);
  }

  return { tempDir, destDir };
}

// ─── Cleanup temp directory ─────────────────────────────────────

export function cleanupTemp(tempDir) {
  if (tempDir && existsSync(tempDir)) {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Best effort — temp dir will be cleaned by OS eventually
    }
  }
}

// ─── Check if input is a local path or remote repo ──────────────

export function isRemoteRepo(input) {
  // URLs
  if (input.startsWith('https://') || input.startsWith('http://')) return true;
  if (input.startsWith('git@')) return true;

  // Short form: owner/repo (no path separators beyond one /)
  if (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(input)) return true;

  // Everything else is a local path
  return false;
}
