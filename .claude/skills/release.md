# Skill: Release — Publier une nouvelle version

## Quand utiliser
Quand une nouvelle version est prête à être publiée sur GitHub (et npm si applicable).

## Checklist pré-release

1. **Validation syntaxe** : `node -c src/*.js bin/cli.js`
2. **Self-scan** : `node bin/cli.js .` → doit fonctionner sans erreur
3. **Test sur projet externe** : `node bin/cli.js /path/to/autre/projet` → score cohérent
4. **ScanIvy clean** : 0 Critical, 0 High
5. **Version bumped** dans `package.json`
6. **README à jour** avec les nouvelles features

## Process

### 1. Bump version
```bash
# Dans package.json, mettre à jour "version"
# Format semver : MAJOR.MINOR.PATCH
# PATCH : fix bugs, corrections sécurité
# MINOR : nouvelle feature (nouveau analyzer, nouveau format)
# MAJOR : breaking change (structure CLI, format config)
```

### 2. Commit release
```bash
git add -A
git commit -m "release: v{X.Y.Z} — {description courte}"
git tag v{X.Y.Z}
git push && git push --tags
```

### 3. GitHub Release (optionnel)
Créer une release sur GitHub avec :
- Tag : `v{X.Y.Z}`
- Title : `cc-optimize v{X.Y.Z}`
- Description : changelog des modifications

### 4. npm publish (quand prêt)
```bash
npm login
npm publish
# Vérifie : npx cc-optimize fonctionne
```

## Versioning actuel
- v1.0.0 — CLI de base (scanner + analyzer + optimizer + display)
- v1.1.0 — Auto-optimisation CLAUDE.md + Architecture Map
- v1.2.0 — Dashboard HTML visuel
- v1.2.1 — Fix cross-platform browser open + remédiation sécurité