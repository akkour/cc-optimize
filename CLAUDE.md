# CLAUDE.md — cc-optimize

## Projet
- **Repo** : akkour/cc-optimize
- **Description** : CLI open source qui audite et optimise la configuration Claude Code (CLAUDE.md, settings, .claudeignore)
- **Stack** : Node.js (ESM), chalk, ora, boxen — zero TypeScript, zero build step
- **Branche** : `master` (push direct OK — projet solo)
- **License** : MIT — Eva Technology Services LLC

## Architecture Map
```
Entry point :
  CLI                   → bin/cli.js (shebang, parse args, appel run())

Core modules :
  Orchestrateur         → src/index.js (scan → analyze → optimize → confirm → backup → apply → report)
  Scanner               → src/scanner.js (lit CLAUDE.md, settings, .claudeignore, skills, package.json)
  Analyseur             → src/analyzer.js (score 0-100, 5 dimensions, issues, recommandations)
  Optimiseur settings   → src/optimizer.js (settings.json, .claudeignore, plan de génération)
  Optimiseur CLAUDE.md  → src/claudemd-optimizer.js (parse sections, Architecture Map auto, move to docs/)
  Rapport HTML          → src/report.js (dashboard SVG gauge, barres, architecture map, escapeHtml)
  Affichage terminal    → src/display.js (chalk, boxen, ora, barres de progression, confirmation)

Docs :
  README.md             → documentation publique GitHub
  REMEDIATION_NOTES.md  → rapport du dernier scan ScanIvy
  LICENSE               → MIT
```

## Règles
0. **Architecture Map à jour** — après création d'un nouveau fichier, ajouter son entrée ci-dessus
1. **Fichier complet** — jamais de "..." ou fragments
2. **Zéro régression** — l'outil doit continuer à fonctionner sur tous les projets testés
3. **Zéro dépendance nouvelle** — chalk, ora, boxen uniquement. Pas de framework, pas de TypeScript
4. **ESM obligatoire** — `import/export`, pas de `require()` (sauf dans les commentaires README)
5. **Cross-platform** — Windows (cmd + PowerShell), macOS, Linux. Tester les chemins avec `path.join/resolve`
6. **escapeHtml()** — toute valeur dynamique injectée dans le rapport HTML doit passer par `escapeHtml()`
7. **Path validation** — tout chemin construit depuis une entrée utilisateur doit être validé avec `resolve() + startsWith()`

## Validation avant commit
```bash
node -c src/*.js bin/cli.js    # Syntax check (pas de tsc — c'est du JS pur)
node bin/cli.js .              # Test sur le projet lui-même
```

## Ne JAMAIS modifier
- `.claude/settings.local.json` — config locale, pas dans le repo
- `REMEDIATION_NOTES.md` — généré par ScanIvy, pas manuellement

## Conventions commit
Format : `type(scope): description`
Types : feat | fix | chore | docs | refactor
Scopes : core | scanner | analyzer | optimizer | report | display | cli | security

## Skills (charger selon la tâche)
- Remédiation sécurité : `.claude/skills/remediation.md`
- Release/publication : `.claude/skills/release.md`

## Rapport de session (obligatoire)
```
═══════════════════════════════════════════════════
RAPPORT SESSION — [date] — cc-optimize
═══════════════════════════════════════════════════
COMMITS : [hash] [type] [description]
FICHIERS : [chemins complets + lignes avant → après]
VALIDATIONS : node -c ✅/❌ · test self-scan ✅/❌
RÉGRESSIONS : Aucune / [description]
═══════════════════════════════════════════════════
```
