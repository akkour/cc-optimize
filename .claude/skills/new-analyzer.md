# Skill: New Analyzer — Ajouter une dimension d'analyse

## Quand utiliser
Quand on ajoute un nouvel aspect à auditer (ex: MCP tools, hooks, commands, .env).

## Architecture existante

Le scoring est organisé en 5 sections dans `src/analyzer.js` :
1. `analyzeClaudeMd()` → 40 points max
2. `analyzeSettings()` → 25 points max
3. `analyzeClaudeignore()` → 15 points max
4. `analyzeSkills()` → 10 points max
5. `analyzeSessionDiscipline()` → 10 points max

Total = 100 points. Si on ajoute une section, il faut redistribuer les points.

## Process pour ajouter un analyzer

### 1. Scanner (src/scanner.js)
Ajouter la lecture du nouveau fichier/dossier dans `scan()` :
```javascript
// Dans la fonction scan()
return {
  ...existingFields,
  newThing: readOptional(root, '.claude/new-thing'),
};
```

### 2. Analyzer (src/analyzer.js)
Créer la fonction d'analyse :
```javascript
function analyzeNewThing(data) {
  const result = {
    score: 0,
    maxScore: X, // Redistribuer les points
    issues: [],
    recommendations: [],
  };
  // Logique d'analyse
  return result;
}
```

Ajouter dans `analyze()` :
```javascript
const newThing = analyzeNewThing(data);
// Ajouter au totalScore et au retour
```

### 3. Display (src/display.js)
Ajouter la ligne dans `displaySectionScores()` et `displayCurrentState()`.

### 4. Report (src/report.js)
Ajouter la section dans le HTML dashboard :
- Barre de progression dans "Section Scores"
- Ligne dans "Current Configuration"

### 5. Redistribuer les points
Ajuster les `maxScore` pour que le total reste 100.

## Validation
```bash
node -c src/*.js                # Syntax
node bin/cli.js .               # Self-scan — le nouveau score doit être cohérent
node bin/cli.js /autre/projet   # Test externe
```

## Commit
```
feat(analyzer): add {name} analysis — {X} points, {N} checks
```