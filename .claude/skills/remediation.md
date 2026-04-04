# Skill: Remediation — Fix ScanIvy Findings

## Quand utiliser
Quand un rapport ScanIvy est fourni avec des findings à corriger.

## Process

1. **Lire le rapport** — identifier les vrais positifs vs faux positifs
2. **Trier par fichier** — regrouper les findings par fichier pour minimiser les modifications
3. **Corriger par ordre de sévérité** — Critical → High → Medium
4. **Pour chaque finding :**
   - Lire le fichier complet
   - Appliquer le fix minimal (ne pas réécrire ce qui fonctionne)
   - Vérifier que le fix ne casse rien

## Patterns de correction par CWE

### CWE-22 (Path Traversal)
```javascript
const safePath = resolve(join(base, userInput));
if (!safePath.startsWith(resolve(base))) {
  throw new Error('Path traversal detected');
}
```

### CWE-79 / CWE-116 (XSS / HTML Injection)
Toute valeur dynamique dans un template HTML → `escapeHtml(value)`
```javascript
function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return (str || '').replace(/[&<>"']/g, c => map[c]);
}
```

### CWE-532 (Faux positif — console.log dans CLI)
Ajouter un commentaire d'ignore sur la ligne au-dessus :
```javascript
// scanivy-ignore: CWE-532 — CLI output, non-sensitive data
console.log(message);
```

## Validation
```bash
node -c src/*.js bin/cli.js     # Syntax check
node bin/cli.js .               # Self-scan
```

## Commit
```
fix(security): remediate X CWE-22 + Y CWE-79/116 + Z FP annotations — ScanIvy clean
```