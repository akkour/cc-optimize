/**
 * Scanner — Reads all Claude Code configuration files from a project
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve, basename, sep } from 'path';

export function scan(projectPath) {
  const root = resolve(projectPath);
  const resolvedRoot = resolve(root);

  if (resolvedRoot.indexOf('\0') !== -1) {
    throw new Error('Invalid path: null byte detected');
  }

  if (!existsSync(resolvedRoot)) {
    throw new Error(`Project path not found: ${resolvedRoot}`);
  }

  const safeSub = (sub) => {
    const p = resolve(resolvedRoot, sub);
    if (!p.startsWith(resolvedRoot + sep)) return false;
    return existsSync(p);
  };

  return {
    root: resolvedRoot,
    claudeMd: readOptional(resolvedRoot, 'CLAUDE.md'),
    settingsLocal: readOptional(resolvedRoot, '.claude/settings.local.json'),
    settingsProject: readOptional(resolvedRoot, '.claude/settings.json'),
    claudeignore: readOptional(resolvedRoot, '.claudeignore'),
    designSystem: readOptional(resolvedRoot, 'DESIGN_SYSTEM.md'),
    dbSchema: findFile(resolvedRoot, [
      'supabase/DB_SCHEMA.md',
      'docs/DATABASE_SCHEMA_REFERENCE.md',
      'docs/DB_SCHEMA.md',
    ]),
    skills: scanSkills(resolvedRoot),
    gitignore: readOptional(resolvedRoot, '.gitignore'),
    packageJson: readOptionalJson(resolvedRoot, 'package.json'),
    hasNodeModules: safeSub('node_modules'),
    hasSrc: safeSub('src'),
    hasSupabase: safeSub('supabase'),
    hasDocs: safeSub('docs'),
  };
}

function readOptional(root, relativePath) {
  const resolvedRoot = resolve(root);
  const resolvedPath = resolve(resolvedRoot, relativePath);
  if (!resolvedPath.startsWith(resolvedRoot + sep) && resolvedPath !== resolvedRoot) {
    throw new Error('Path traversal attempt detected');
  }
  if (!existsSync(resolvedPath)) return null;
  try {
    const content = readFileSync(resolvedPath, 'utf-8');
    const size = statSync(resolvedPath).size;
    return {
      path: relativePath,
      content,
      lines: content.split('\n').length,
      bytes: size,
    };
  } catch { return null; }
}

function readOptionalJson(root, relativePath) {
  const file = readOptional(root, relativePath);
  if (!file) return null;
  try {
    return { ...file, parsed: JSON.parse(file.content) };
  } catch { return file; }
}

function findFile(root, candidates) {
  for (const c of candidates) {
    const result = readOptional(root, c);
    if (result) return result;
  }
  return null;
}

function scanSkills(root) {
  const resolvedRoot = resolve(root);
  const skillDirs = [
    '.claude/skills',
    '.claude/skills/',
  ];

  for (const dir of skillDirs) {
    const fullDir = resolve(root, dir);
    if (!fullDir.startsWith(resolvedRoot + sep) && fullDir !== resolvedRoot) {
      throw new Error('Invalid directory path');
    }
    if (!existsSync(fullDir)) continue;
    const resolvedFullDir = resolve(fullDir);
    try {
      const entries = readdirSync(fullDir, { withFileTypes: true });
      const safeEntries = entries
        .filter(entry => entry.isFile() || entry.isDirectory())
        .filter(entry => {
          const safe = basename(entry.name);
          const resolvedEntry = resolve(resolvedFullDir, safe);
          return safe === entry.name && resolvedEntry.startsWith(resolvedFullDir + sep);
        });
      const skills = [];
      for (const e of safeEntries) {
        const safeName = basename(e.name);
        if (e.isFile() && safeName.endsWith('.md')) {
          const filePath = resolve(resolvedFullDir, safeName);
          if (!filePath.startsWith(resolvedFullDir + sep)) continue;
          const content = readFileSync(filePath, 'utf-8');
          skills.push({
            name: safeName.replace('.md', ''),
            path: join(dir, basename(safeName)),
            lines: content.split('\n').length,
            bytes: content.length,
          });
        }
        if (e.isDirectory()) {
          const safeDirName = basename(safeName);
          const targetDir = resolve(resolvedFullDir, safeDirName);
          if (!targetDir.startsWith(resolvedFullDir + sep)) continue;
          const skillMd = resolve(targetDir, 'SKILL.md');
          if (!skillMd.startsWith(resolvedFullDir + sep)) continue;
          if (existsSync(skillMd)) {
            const content = readFileSync(skillMd, 'utf-8');
            skills.push({
              name: basename(safeDirName),
              path: join(dir, basename(safeDirName), 'SKILL.md'),
              lines: content.split('\n').length,
              bytes: content.length,
            });
          }
        }
      }
      return skills;
    } catch { continue; }
  }
  return [];
}
