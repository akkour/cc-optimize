/**
 * Scanner — Reads all Claude Code configuration files from a project
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve, basename, sep } from 'path';

export function scan(projectPath) {
  const root = resolve(projectPath);

  if (root.indexOf('\0') !== -1) {
    throw new Error('Invalid path: null byte detected');
  }

  if (!existsSync(root)) {
    throw new Error(`Project path not found: ${root}`);
  }

  return {
    root,
    claudeMd: readOptional(root, 'CLAUDE.md'),
    settingsLocal: readOptional(root, '.claude/settings.local.json'),
    settingsProject: readOptional(root, '.claude/settings.json'),
    claudeignore: readOptional(root, '.claudeignore'),
    designSystem: readOptional(root, 'DESIGN_SYSTEM.md'),
    dbSchema: findFile(root, [
      'supabase/DB_SCHEMA.md',
      'docs/DATABASE_SCHEMA_REFERENCE.md',
      'docs/DB_SCHEMA.md',
    ]),
    skills: scanSkills(root),
    gitignore: readOptional(root, '.gitignore'),
    packageJson: readOptionalJson(root, 'package.json'),
    hasNodeModules: (() => { const p = resolve(root, 'node_modules'); return p.startsWith(resolve(root) + sep) && existsSync(p); })(),
    hasSrc: (() => { const p = resolve(root, 'src'); return p.startsWith(resolve(root) + sep) && existsSync(p); })(),
    hasSupabase: (() => { const p = resolve(root, 'supabase'); return p.startsWith(resolve(root) + sep) && existsSync(p); })(),
    hasDocs: (() => { const p = resolve(root, 'docs'); return p.startsWith(resolve(root) + sep) && existsSync(p); })(),
  };
}

function readOptional(root, relativePath) {
  const resolvedRoot = resolve(root);
  const fullPath = resolve(root, relativePath);
  if (!fullPath.startsWith(resolvedRoot + sep) && fullPath !== resolvedRoot) {
    throw new Error('Path traversal attempt detected');
  }
  if (!existsSync(fullPath)) return null;
  try {
    const content = readFileSync(fullPath, 'utf-8');
    const size = statSync(fullPath).size;
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
      const safeEntries = entries.filter(entry => {
        const safe = basename(entry.name);
        return safe === entry.name && resolve(fullDir, safe).startsWith(resolvedFullDir + sep);
      });
      const skills = [];
      for (const e of safeEntries) {
        const safeName = basename(e.name);
        if (e.isFile() && safeName.endsWith('.md')) {
          const filePath = resolve(fullDir, safeName);
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
          const targetDir = resolve(fullDir, safeDirName);
          if (!targetDir.startsWith(resolvedFullDir + sep)) continue;
          const skillMd = resolve(targetDir, 'SKILL.md');
          if (!skillMd.startsWith(resolvedFullDir + sep)) continue;
          if (existsSync(skillMd)) {
            const content = readFileSync(skillMd, 'utf-8');
            skills.push({
              name: safeDirName,
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
