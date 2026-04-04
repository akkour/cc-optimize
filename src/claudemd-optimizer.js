/**
 * CLAUDE.md Optimizer — Auto-generates optimized CLAUDE.md
 * 
 * 1. Scans filesystem to build Architecture Map
 * 2. Parses existing CLAUDE.md into sections
 * 3. Keeps essential sections, moves detail to docs/
 * 4. Generates optimized version with Architecture Map
 */

import { readdirSync, existsSync, statSync, readFileSync } from 'fs';
import { join, basename, extname, relative, resolve, sep } from 'path';

// ─── Filesystem Scanner for Architecture Map ───────────────────

export function buildArchitectureMap(root) {
  const map = {
    pages: [],
    components: [],
    lib: [],
    hooks: [],
    services: [],
    stores: [],
    edgeFunctions: [],
    config: [],
    types: [],
  };

  // Scan pages
  for (const dir of ['src/pages', 'src/app', 'app', 'pages']) {
    map.pages.push(...scanDir(root, dir, ['.tsx', '.ts', '.jsx', '.js']));
  }

  // Scan components (group by subfolder)
  for (const dir of ['src/components', 'components']) {
    map.components.push(...scanComponentsGrouped(root, dir));
  }

  // Scan lib/utils
  for (const dir of ['src/lib', 'src/utils', 'lib', 'utils']) {
    map.lib.push(...scanDir(root, dir, ['.ts', '.tsx', '.js']));
  }

  // Scan hooks
  for (const dir of ['src/hooks', 'hooks']) {
    map.hooks.push(...scanDir(root, dir, ['.ts', '.tsx']));
  }

  // Scan services
  for (const dir of ['src/services', 'services']) {
    map.services.push(...scanDir(root, dir, ['.ts', '.tsx', '.js']));
  }

  // Scan stores
  for (const dir of ['src/stores', 'stores', 'src/store']) {
    map.stores.push(...scanDir(root, dir, ['.ts', '.tsx', '.js']));
  }

  // Scan Edge Functions
  for (const dir of ['supabase/functions']) {
    map.edgeFunctions.push(...scanEdgeFunctions(root, dir));
  }

  // Scan config
  for (const dir of ['src/config', 'config']) {
    map.config.push(...scanDir(root, dir, ['.ts', '.tsx', '.js', '.json']));
  }

  // Scan types
  for (const dir of ['src/types', 'types']) {
    map.types.push(...scanDir(root, dir, ['.ts', '.tsx']));
  }

  return map;
}

function scanDir(root, relDir, extensions) {
  const resolvedRoot = resolve(root);
  const fullDir = resolve(resolvedRoot, relDir);
  if (!fullDir.startsWith(resolvedRoot + sep) && fullDir !== resolvedRoot) {
    throw new Error('Invalid directory path: traversal detected');
  }
  const resolvedFullDir = resolve(fullDir);
  if (!existsSync(resolvedFullDir)) return [];

  const results = [];
  try {
    const entries = readdirSync(resolvedFullDir, { withFileTypes: true });
    const safeEntries = entries.filter(entry => {
      const safe = basename(entry.name);
      return safe === entry.name && resolve(resolvedFullDir, safe).startsWith(resolvedFullDir + sep);
    });
    for (const e of safeEntries) {
      const safeName = basename(e.name);
      if (e.isFile() && extensions.some(ext => safeName.endsWith(ext))) {
        if (safeName.startsWith('.') || safeName === 'index.ts' || safeName === 'index.tsx') continue;
        const filePath = resolve(resolvedFullDir, safeName);
        if (!filePath.startsWith(resolvedFullDir + sep)) continue;
        results.push({
          name: safeName.replace(/\.(tsx?|jsx?|json)$/, ''),
          path: join(relDir, basename(safeName)),
        });
      }
    }
  } catch { /* ignore permission errors */ }
  return results;
}

function scanComponentsGrouped(root, relDir) {
  const resolvedRoot = resolve(root);
  const fullDir = resolve(resolvedRoot, relDir);
  if (!fullDir.startsWith(resolvedRoot + sep) && fullDir !== resolvedRoot) {
    throw new Error('Invalid directory path: traversal detected');
  }
  const resolvedFullDir = resolve(fullDir);
  if (!existsSync(resolvedFullDir)) return [];

  const results = [];
  try {
    const entries = readdirSync(resolvedFullDir, { withFileTypes: true });
    const safeEntries = entries.filter(entry => {
      const safe = basename(entry.name);
      return safe === entry.name && resolve(resolvedFullDir, safe).startsWith(resolvedFullDir + sep);
    });
    for (const e of safeEntries) {
      const safeName = basename(e.name);
      if (e.isDirectory()) {
        const targetPath = join(relDir, basename(safeName));
        const resolvedTarget = resolve(resolvedRoot, targetPath);
        if (!resolvedTarget.startsWith(resolvedRoot + sep)) continue;
        const subFiles = scanDir(root, targetPath, ['.tsx', '.ts', '.jsx']);
        if (subFiles.length > 0) {
          const topFiles = subFiles.slice(0, 3).map(f => f.name);
          const suffix = subFiles.length > 3 ? `, +${subFiles.length - 3} more` : '';
          results.push({
            name: `${safeName}/`,
            path: join(relDir, basename(safeName), '/'),
            description: topFiles.join(', ') + suffix,
            count: subFiles.length,
          });
        }
      } else if (e.isFile() && ['.tsx', '.ts', '.jsx'].some(ext => safeName.endsWith(ext))) {
        if (!safeName.startsWith('.')) {
          const filePath = resolve(resolvedFullDir, safeName);
          if (!filePath.startsWith(resolvedFullDir + sep)) continue;
          results.push({
            name: safeName.replace(/\.(tsx?|jsx?)$/, ''),
            path: join(relDir, basename(safeName)),
          });
        }
      }
    }
  } catch { /* ignore */ }
  return results;
}

function scanEdgeFunctions(root, relDir) {
  const resolvedRoot = resolve(root);
  const fullDir = resolve(resolvedRoot, relDir);
  if (!fullDir.startsWith(resolvedRoot + sep) && fullDir !== resolvedRoot) {
    throw new Error('Invalid directory path: traversal detected');
  }
  const resolvedFullDir = resolve(fullDir);
  if (!existsSync(resolvedFullDir)) return [];

  const results = [];
  try {
    const entries = readdirSync(resolvedFullDir, { withFileTypes: true });
    const safeEntries = entries.filter(entry => {
      const safe = basename(entry.name);
      return safe === entry.name && resolve(resolvedFullDir, safe).startsWith(resolvedFullDir + sep);
    });
    for (const e of safeEntries) {
      const safeName = basename(e.name);
      if (e.isDirectory() && !safeName.startsWith('_') && !safeName.startsWith('.')) {
        const targetDir = resolve(resolvedFullDir, safeName);
        if (!targetDir.startsWith(resolvedFullDir + sep)) continue;
        const indexFile = resolve(targetDir, 'index.ts');
        if (!indexFile.startsWith(resolvedFullDir + sep)) continue;
        if (existsSync(indexFile)) {
          results.push({
            name: basename(safeName),
            path: join(relDir, basename(safeName), 'index.ts'),
          });
        }
      }
    }
  } catch { /* ignore */ }
  return results;
}

// ─── Format Architecture Map as Markdown ───────────────────────

export function formatArchitectureMap(map) {
  const lines = ['## Architecture Map', '```'];

  if (map.pages.length > 0) {
    lines.push('Pages :');
    // Show up to 10 most important pages
    const pages = map.pages.slice(0, 12);
    for (const p of pages) {
      const label = p.name.padEnd(22);
      lines.push(`  ${label} → ${p.path}`);
    }
    if (map.pages.length > 12) {
      lines.push(`  ... +${map.pages.length - 12} more pages`);
    }
    lines.push('');
  }

  if (map.components.length > 0) {
    lines.push('Components :');
    const comps = map.components.slice(0, 10);
    for (const c of comps) {
      if (c.description) {
        lines.push(`  ${c.name.padEnd(22)} → ${c.path} (${c.description})`);
      } else {
        lines.push(`  ${c.name.padEnd(22)} → ${c.path}`);
      }
    }
    if (map.components.length > 10) {
      lines.push(`  ... +${map.components.length - 10} more component groups`);
    }
    lines.push('');
  }

  if (map.lib.length > 0 || map.services.length > 0) {
    lines.push('Lib / Services :');
    const items = [...map.lib, ...map.services].slice(0, 12);
    for (const item of items) {
      lines.push(`  ${item.name.padEnd(22)} → ${item.path}`);
    }
    if (map.lib.length + map.services.length > 12) {
      lines.push(`  ... +${map.lib.length + map.services.length - 12} more`);
    }
    lines.push('');
  }

  if (map.hooks.length > 0) {
    lines.push('Hooks :');
    const hooks = map.hooks.slice(0, 8);
    for (const h of hooks) {
      lines.push(`  ${h.name.padEnd(22)} → ${h.path}`);
    }
    if (map.hooks.length > 8) {
      lines.push(`  ... +${map.hooks.length - 8} more hooks`);
    }
    lines.push('');
  }

  if (map.stores.length > 0) {
    lines.push('Stores :');
    for (const s of map.stores) {
      lines.push(`  ${s.name.padEnd(22)} → ${s.path}`);
    }
    lines.push('');
  }

  if (map.edgeFunctions.length > 0) {
    lines.push(`Edge Functions : ${map.edgeFunctions.length} EFs in supabase/functions/`);
    // List top 5 only
    const efs = map.edgeFunctions.slice(0, 5);
    for (const ef of efs) {
      lines.push(`  ${ef.name.padEnd(22)} → ${ef.path}`);
    }
    if (map.edgeFunctions.length > 5) {
      lines.push(`  ... +${map.edgeFunctions.length - 5} more EFs`);
    }
    lines.push('');
  }

  if (map.config.length > 0) {
    lines.push('Config :');
    for (const c of map.config.slice(0, 5)) {
      lines.push(`  ${c.name.padEnd(22)} → ${c.path}`);
    }
    lines.push('');
  }

  lines.push('```');
  return lines.join('\n');
}

// ─── Parse Existing CLAUDE.md ──────────────────────────────────

export function parseClaudeMd(content) {
  const lines = content.split('\n');
  const sections = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(#{1,3})\s+(.+)/);

    if (match) {
      if (current) {
        current.endLine = i - 1;
        current.content = lines.slice(current.startLine, i).join('\n');
        sections.push(current);
      }
      current = {
        level: match[1].length,
        title: match[2].trim(),
        startLine: i,
        endLine: null,
        content: '',
        category: categorizeSection(match[2].trim()),
      };
    }
  }

  if (current) {
    current.endLine = lines.length - 1;
    current.content = lines.slice(current.startLine).join('\n');
    sections.push(current);
  }

  return sections;
}

function categorizeSection(title) {
  const lower = title.toLowerCase().replace(/[^a-z0-9\s]/g, '');

  // KEEP — essential for every session
  if (/^(projet|project|contexte|context|repo)/.test(lower)) return 'keep';
  if (/stack|tech/.test(lower)) return 'keep';
  if (/r[eè]gle|rule|c1|qualit/.test(lower)) return 'keep';
  if (/ne jamais|interdi|never|do not/.test(lower)) return 'keep';
  if (/branch|branche/.test(lower)) return 'keep';
  if (/commit|convention/.test(lower)) return 'keep';
  if (/rapport|report|session/.test(lower)) return 'keep';
  if (/mode autonome|autonomous/.test(lower)) return 'keep';
  if (/architecture.*map/.test(lower)) return 'keep';
  if (/s[eé]curit[eé]|security/.test(lower)) return 'keep';
  if (/focus|mvp|priorit/.test(lower)) return 'keep';
  if (/ux|user experience/.test(lower)) return 'keep';
  if (/performance|latence|latency/.test(lower)) return 'keep';

  // MOVE — detailed docs that should be loaded on-demand
  if (/test|jest|vitest|pytest/.test(lower)) return 'move';
  if (/ci.?cd|pipeline|gate|github action/.test(lower)) return 'move';
  if (/frontend.*rule|^f\d|design.*system/.test(lower)) return 'move';
  if (/responsive|breakpoint/.test(lower)) return 'move';
  if (/i18n|internation|traduction/.test(lower)) return 'move';
  if (/edge.*function.*standard|migration.*standard/.test(lower)) return 'move';
  if (/checklist.*commit|checklist.*avant/.test(lower)) return 'move';
  if (/pattern.*layout|composant.*ui/.test(lower)) return 'move';
  if (/skill|competence/.test(lower)) return 'compact';
  if (/validation.*obligat/.test(lower)) return 'keep';

  // Default: keep if short, move if long
  return 'auto';
}

// ─── Strip Code Blocks from Section ────────────────────────────

function compactSection(content) {
  // Remove code blocks but keep the section header and key text
  return content
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/\n{3,}/g, '\n\n')     // Collapse multiple blank lines
    .trim();
}

function countCodeBlockLines(content) {
  const blocks = content.match(/```[\s\S]*?```/g) || [];
  return blocks.reduce((sum, b) => sum + b.split('\n').length, 0);
}

// ─── Generate Optimized CLAUDE.md ──────────────────────────────

export function generateOptimizedClaudeMd(data, archMap) {
  const existingContent = data.claudeMd?.content || '';
  const sections = existingContent ? parseClaudeMd(existingContent) : [];

  const kept = [];
  const moved = [];
  const compacted = [];

  for (const section of sections) {
    const lines = section.content.split('\n').length;
    const codeLines = countCodeBlockLines(section.content);

    if (section.category === 'keep') {
      // Keep but strip excessive code blocks
      if (codeLines > 15) {
        kept.push(compactSection(section.content));
      } else {
        kept.push(section.content);
      }
    } else if (section.category === 'move') {
      moved.push(section);
    } else if (section.category === 'compact') {
      compacted.push(compactSection(section.content));
    } else {
      // 'auto' — keep if < 20 lines, move if >= 20
      if (lines < 20) {
        if (codeLines > 10) {
          kept.push(compactSection(section.content));
        } else {
          kept.push(section.content);
        }
      } else {
        moved.push(section);
      }
    }
  }

  // Build the optimized CLAUDE.md
  const output = [];

  // Kept sections
  for (const section of kept) {
    output.push(section);
    output.push('');
  }

  // Architecture Map (auto-generated)
  const existingMapSection = sections.find(s => /architecture.*map/i.test(s.title));
  if (!existingMapSection) {
    output.push(formatArchitectureMap(archMap));
    output.push('');
  }

  // Rule 0 injection (if not already present)
  const hasRule0 = existingContent.includes('Règle 0') || existingContent.includes('Rule 0') ||
    existingContent.includes('Architecture Map à jour');
  if (!hasRule0) {
    // Find the rules section and inject Rule 0
    // We'll add it as a note at the end instead of modifying kept sections
    output.push('> **Règle 0** : Après création d\'un nouveau fichier clé, mettre à jour l\'Architecture Map ci-dessus.');
    output.push('');
  }

  // Compacted sections (skills, etc.)
  for (const section of compacted) {
    output.push(section);
    output.push('');
  }

  // "Docs détaillées" section — pointers to moved content
  if (moved.length > 0) {
    output.push('## Docs détaillées (charger à la demande)');
    for (const section of moved) {
      const slug = section.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      output.push(`- ${section.title} → \`docs/${slug}.md\``);
    }

    // Add common doc references
    if (data.designSystem) {
      output.push(`- Design System → \`DESIGN_SYSTEM.md\``);
    }
    if (data.dbSchema) {
      output.push(`- DB Schema → \`${data.dbSchema.path}\``);
    }
    output.push('');
  }

  // Session report (compact version if not already present)
  const hasReport = kept.some(s => /rapport|report/i.test(s));
  if (!hasReport) {
    output.push('## Rapport de session (obligatoire)');
    output.push('```');
    output.push('═══════════════════════════════════════════════════');
    output.push('RAPPORT SESSION — [date] — [branche]');
    output.push('═══════════════════════════════════════════════════');
    output.push('COMMITS : [hash] [type] [description]');
    output.push('FICHIERS : [chemins complets]');
    output.push('VALIDATIONS : tsc ✅/❌ · tests ✅/❌ · build ✅/❌');
    output.push('RÉGRESSIONS : Aucune / [description]');
    output.push('PROCHAINES ÉTAPES : 1. ... 2. ...');
    output.push('═══════════════════════════════════════════════════');
    output.push('```');
  }

  const optimized = output.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';

  return {
    optimized,
    moved,
    stats: {
      originalLines: existingContent.split('\n').length,
      optimizedLines: optimized.split('\n').length,
      movedSections: moved.length,
      movedLines: moved.reduce((s, sec) => s + sec.content.split('\n').length, 0),
    },
  };
}

// ─── Generate Moved Section Files ──────────────────────────────

export function generateMovedDocs(moved) {
  const docs = [];
  for (const section of moved) {
    const slug = section.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    docs.push({
      path: `docs/${slug}.md`,
      content: `# ${section.title}\n\n> Moved from CLAUDE.md by cc-optimize. Load on-demand when needed.\n\n${section.content}`,
    });
  }
  return docs;
}
