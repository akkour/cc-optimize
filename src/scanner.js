/**
 * Scanner — Reads all Claude Code configuration files from a project
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

export function scan(projectPath) {
  const root = resolve(projectPath);

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
    hasNodeModules: existsSync(join(root, 'node_modules')),
    hasSrc: existsSync(join(root, 'src')),
    hasSupabase: existsSync(join(root, 'supabase')),
    hasDocs: existsSync(join(root, 'docs')),
  };
}

function readOptional(root, relativePath) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) return null;
  try {
    return {
      path: relativePath,
      content: readFileSync(fullPath, 'utf-8'),
      lines: readFileSync(fullPath, 'utf-8').split('\n').length,
      bytes: statSync(fullPath).size,
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
  const skillDirs = [
    '.claude/skills',
    '.claude/skills/',
  ];

  for (const dir of skillDirs) {
    const fullDir = join(root, dir);
    if (!existsSync(fullDir)) continue;
    try {
      const entries = readdirSync(fullDir, { withFileTypes: true });
      const skills = [];
      for (const e of entries) {
        if (e.isFile() && e.name.endsWith('.md')) {
          const content = readFileSync(join(fullDir, e.name), 'utf-8');
          skills.push({
            name: e.name.replace('.md', ''),
            path: join(dir, e.name),
            lines: content.split('\n').length,
            bytes: content.length,
          });
        }
        if (e.isDirectory()) {
          const skillMd = join(fullDir, e.name, 'SKILL.md');
          if (existsSync(skillMd)) {
            const content = readFileSync(skillMd, 'utf-8');
            skills.push({
              name: e.name,
              path: join(dir, e.name, 'SKILL.md'),
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
