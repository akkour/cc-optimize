/**
 * Report Generator — Creates a self-contained HTML dashboard
 * with score gauge, section bars, issues, recommendations, and architecture map.
 * Opens automatically in the default browser.
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function generateHtmlReport(root, data, analysis, archMap, claudeMdResult, plan) {
  const timestamp = new Date().toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const projectName = data.packageJson?.parsed?.name || root.split(/[/\\]/).pop() || 'Project';

  const scoreColor = analysis.score >= 85 ? '#22c55e' :
    analysis.score >= 70 ? '#84cc16' :
    analysis.score >= 50 ? '#eab308' :
    analysis.score >= 30 ? '#f97316' : '#ef4444';

  const gradeEmoji = { A: '🏆', B: '✅', C: '⚠️', D: '🔴', F: '💀' }[analysis.grade] || '';

  // Build sections data
  const sections = [
    { name: 'CLAUDE.md', score: analysis.sections.claudeMd.score, max: analysis.sections.claudeMd.maxScore },
    { name: 'Settings', score: Math.max(0, analysis.sections.settings.score), max: analysis.sections.settings.maxScore },
    { name: '.claudeignore', score: analysis.sections.claudeignore.score, max: analysis.sections.claudeignore.maxScore },
    { name: 'Skills', score: analysis.sections.skills.score, max: analysis.sections.skills.maxScore },
    { name: 'Discipline', score: analysis.sections.discipline.score, max: analysis.sections.discipline.maxScore },
  ];

  // Architecture map entries
  const mapEntries = [];
  const categories = [
    { key: 'pages', label: 'Pages', icon: '📄' },
    { key: 'components', label: 'Components', icon: '🧩' },
    { key: 'lib', label: 'Lib / Utils', icon: '📚' },
    { key: 'services', label: 'Services', icon: '⚙️' },
    { key: 'hooks', label: 'Hooks', icon: '🪝' },
    { key: 'stores', label: 'Stores', icon: '🗄️' },
    { key: 'edgeFunctions', label: 'Edge Functions', icon: '⚡' },
    { key: 'config', label: 'Config', icon: '🔧' },
  ];
  for (const cat of categories) {
    const items = archMap[cat.key] || [];
    if (items.length > 0) {
      mapEntries.push({ ...cat, items: items.slice(0, 8), total: items.length });
    }
  }

  const issuesHtml = analysis.issues.map(i => {
    const color = i.severity === 'critical' ? '#ef4444' : i.severity === 'warning' ? '#eab308' : '#60a5fa';
    const icon = i.severity === 'critical' ? '✗' : i.severity === 'warning' ? '⚠' : 'ℹ';
    const details = i.details ? i.details.map(d => `<div style="color:#94a3b8;font-size:12px;margin-left:24px;">→ ${escapeHtml(d)}</div>`).join('') : '';
    return `<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid #1e293b;">
      <span style="color:${color};font-weight:bold;font-size:16px;line-height:1;">${icon}</span>
      <div><div style="color:#e2e8f0;font-size:13px;">${escapeHtml(i.message)}</div>${details}</div>
    </div>`;
  }).join('');

  const recsHtml = analysis.recommendations.map((r, i) => {
    const impactColor = r.impact?.startsWith('CRITICAL') || r.impact?.startsWith('SECURITY') ? '#ef4444' :
      r.impact?.startsWith('HIGH') ? '#f97316' :
      r.impact?.startsWith('MEDIUM') ? '#eab308' : '#60a5fa';
    return `<div style="padding:12px;margin-bottom:8px;background:#0f172a;border-radius:8px;border-left:3px solid ${impactColor};">
      <div style="color:#e2e8f0;font-size:13px;font-weight:600;">${i + 1}. ${escapeHtml(r.action)}</div>
      <div style="color:#94a3b8;font-size:12px;margin-top:4px;">Impact: ${escapeHtml(r.impact || '')}</div>
      ${r.tokens ? `<div style="color:#94a3b8;font-size:12px;">Tokens: ${escapeHtml(r.tokens)}</div>` : ''}
    </div>`;
  }).join('');

  const sectionsHtml = sections.map(s => {
    const pct = s.max > 0 ? Math.max(0, Math.round((s.score / s.max) * 100)) : 0;
    const barColor = pct >= 70 ? '#22c55e' : pct >= 50 ? '#eab308' : '#ef4444';
    return `<div style="display:flex;align-items:center;gap:12px;padding:6px 0;">
      <span style="color:#94a3b8;font-size:13px;width:120px;">${escapeHtml(s.name)}</span>
      <div style="flex:1;background:#1e293b;border-radius:4px;height:20px;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:${barColor};border-radius:4px;transition:width 1s ease;"></div>
      </div>
      <span style="color:#e2e8f0;font-size:12px;width:50px;text-align:right;">${s.score}/${s.max}</span>
    </div>`;
  }).join('');

  const mapHtml = mapEntries.map(cat => {
    const itemsHtml = cat.items.map(item => {
      const desc = item.description ? ` <span style="color:#64748b;font-size:11px;">(${escapeHtml(item.description)})</span>` : '';
      return `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:12px;">
        <span style="color:#64748b;">→</span>
        <code style="color:#38bdf8;font-size:11px;">${escapeHtml(item.path)}</code>${desc}
      </div>`;
    }).join('');
    const moreHtml = cat.total > 8 ? `<div style="color:#64748b;font-size:11px;padding:2px 0;">... +${cat.total - 8} more</div>` : '';
    return `<div style="margin-bottom:16px;">
      <div style="color:#e2e8f0;font-size:13px;font-weight:600;margin-bottom:4px;">${cat.icon} ${escapeHtml(cat.label)} <span style="color:#64748b;font-weight:normal;">(${cat.total})</span></div>
      ${itemsHtml}${moreHtml}
    </div>`;
  }).join('');

  // CLAUDE.md stats
  const mdBefore = claudeMdResult?.stats?.originalLines || data.claudeMd?.lines || 0;
  const mdAfter = claudeMdResult?.stats?.optimizedLines || mdBefore;
  const mdReduction = mdBefore > 0 ? Math.round(((mdBefore - mdAfter) / mdBefore) * 100) : 0;

  // Plan summary
  const planHtml = plan.files.map(f => {
    const actionColor = f.action === 'CREATE' ? '#22c55e' : f.action === 'OPTIMIZE' ? '#eab308' : '#38bdf8';
    return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #1e293b;">
      <span style="color:${actionColor};font-size:11px;font-weight:bold;padding:2px 6px;border:1px solid ${actionColor};border-radius:4px;">${f.action}</span>
      <code style="color:#e2e8f0;font-size:12px;">${escapeHtml(f.path)}</code>
    </div>`;
  }).join('');

  // SVG Gauge
  const gaugeRadius = 70;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeOffset = gaugeCircumference - (analysis.score / 100) * gaugeCircumference;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>cc-optimize — ${escapeHtml(projectName)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #020617; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .container { max-width: 1100px; margin: 0 auto; padding: 24px 16px; }
    .header { text-align: center; padding: 32px 0 24px; }
    .header h1 { font-size: 28px; font-weight: 700; color: #f1f5f9; }
    .header h1 span { color: #06b6d4; }
    .header p { color: #64748b; font-size: 14px; margin-top: 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .card { background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; }
    .card-title { color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
    .score-card { display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .gauge-container { position: relative; width: 180px; height: 180px; }
    .gauge-label { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
    .gauge-grade { font-size: 36px; font-weight: 800; color: ${scoreColor}; }
    .gauge-score { font-size: 14px; color: #94a3b8; }
    .stat-value { font-size: 32px; font-weight: 700; color: #f1f5f9; }
    .stat-label { font-size: 12px; color: #64748b; margin-top: 4px; }
    .stat-card { text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .footer { text-align: center; padding: 32px 0; border-top: 1px solid #1e293b; margin-top: 24px; }
    .footer a { color: #06b6d4; text-decoration: none; }
    .footer a:hover { text-decoration: underline; }
    code { background: #1e293b; padding: 1px 5px; border-radius: 3px; font-size: 12px; }
    @media (max-width: 768px) { .grid, .grid-3 { grid-template-columns: 1fr; } }
    @keyframes fillGauge { from { stroke-dashoffset: ${gaugeCircumference}; } to { stroke-dashoffset: ${gaugeOffset}; } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .card { animation: fadeIn 0.5s ease forwards; opacity: 0; }
    .card:nth-child(1) { animation-delay: 0.1s; }
    .card:nth-child(2) { animation-delay: 0.2s; }
    .card:nth-child(3) { animation-delay: 0.3s; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1><span>cc-optimize</span> report</h1>
      <p>${escapeHtml(projectName)} — ${timestamp}</p>
    </div>

    <!-- Score + Stats -->
    <div class="grid-3">
      <div class="card score-card" style="animation-delay:0.1s;">
        <div class="card-title">Optimization Score</div>
        <div class="gauge-container">
          <svg viewBox="0 0 180 180" width="180" height="180">
            <circle cx="90" cy="90" r="${gaugeRadius}" fill="none" stroke="#1e293b" stroke-width="12" />
            <circle cx="90" cy="90" r="${gaugeRadius}" fill="none" stroke="${scoreColor}" stroke-width="12"
              stroke-dasharray="${gaugeCircumference}" stroke-dashoffset="${gaugeOffset}"
              stroke-linecap="round" transform="rotate(-90 90 90)"
              style="animation: fillGauge 1.5s ease forwards;" />
          </svg>
          <div class="gauge-label">
            <div class="gauge-grade">${gradeEmoji} ${analysis.grade}</div>
            <div class="gauge-score">${analysis.score}/100</div>
          </div>
        </div>
      </div>

      <div class="card stat-card" style="animation-delay:0.2s;">
        <div class="card-title">CLAUDE.md</div>
        <div class="stat-value">${data.claudeMd?.lines || 0}</div>
        <div class="stat-label">lines${mdReduction > 0 ? ` → ${mdAfter} (−${mdReduction}%)` : ''}</div>
        <div style="margin-top:8px;font-size:12px;color:#64748b;">~${analysis.stats.claudeMdTokens.toLocaleString()} tokens per message</div>
      </div>

      <div class="card stat-card" style="animation-delay:0.3s;">
        <div class="card-title">Architecture Map</div>
        <div class="stat-value">${Object.values(archMap).reduce((s, a) => s + a.length, 0)}</div>
        <div class="stat-label">key files discovered</div>
        <div style="margin-top:8px;font-size:12px;color:#64748b;">${mapEntries.length} categories</div>
      </div>
    </div>

    <!-- Section Scores -->
    <div class="card" style="animation-delay:0.4s;">
      <div class="card-title">Section Scores</div>
      ${sectionsHtml}
    </div>

    <!-- Issues + Recommendations -->
    <div class="grid" style="margin-top:16px;">
      <div class="card" style="animation-delay:0.5s;">
        <div class="card-title">Issues (${analysis.issues.length})</div>
        ${analysis.issues.length > 0 ? issuesHtml : '<div style="color:#22c55e;font-size:13px;padding:12px 0;">✓ No issues found</div>'}
      </div>
      <div class="card" style="animation-delay:0.6s;">
        <div class="card-title">Recommendations (${analysis.recommendations.length})</div>
        ${analysis.recommendations.length > 0 ? recsHtml : '<div style="color:#22c55e;font-size:13px;padding:12px 0;">✓ Fully optimized</div>'}
      </div>
    </div>

    <!-- Architecture Map -->
    <div class="card" style="margin-top:16px;animation-delay:0.7s;">
      <div class="card-title">Architecture Map (auto-discovered)</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        ${mapHtml || '<div style="color:#64748b;font-size:13px;">No source files discovered</div>'}
      </div>
    </div>

    <!-- Optimization Plan -->
    ${plan.files.length > 0 ? `
    <div class="card" style="margin-top:16px;animation-delay:0.8s;">
      <div class="card-title">Optimization Plan (${plan.files.length} files)</div>
      ${planHtml}
    </div>` : ''}

    <div class="footer">
      <p style="color:#64748b;font-size:13px;">
        cc-optimize v1.1.0 — by <a href="https://evatechservices.com">Eva Technology Services LLC</a>
      </p>
      <p style="color:#475569;font-size:12px;margin-top:8px;">
        Your code is optimized for Claude Code. Check its security too → <a href="https://scanivy.com">scanivy.com</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  const reportPath = join(root, '.claude', 'cc-optimize-report.html');
  writeFileSync(reportPath, html, 'utf-8');
  return reportPath;
}
