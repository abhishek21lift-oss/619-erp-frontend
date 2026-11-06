// Printable Postural Assessment report. Same window.open + document.write +
// print path as the fitness report — no PDF dependency, and every value is
// escaped at the boundary because this HTML is written into a same-origin
// popup that inherits the app's inline-script CSP.
import { printWindowCloseButtonHtml } from './printWindowChrome';
import { escapeHtml as e, escapeImageDataUrl } from './escapeHtml';

type Row = Record<string, unknown>;

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function object(value: unknown): Row {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Row;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Row : {};
    } catch { return {}; }
  }
  return {};
}

function arrayOfObjects(value: unknown): Row[] {
  if (Array.isArray(value)) return value.filter((v) => v && typeof v === 'object') as Row[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((v) => v && typeof v === 'object') as Row[] : [];
    } catch { return []; }
  }
  return [];
}

function v(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Not recorded';
  return e(value);
}

function statusLabel(value: unknown): string {
  const s = String(value || 'completed');
  return s === 'draft' ? 'Draft' : 'Completed';
}

function typeLabel(value: unknown): string {
  const s = String(value || '');
  const map: Record<string, string> = {
    initial: 'Initial assessment',
    follow_up: 'Follow-up',
    re_assessment: 'Re-assessment',
    progress: 'Progress check',
  };
  return map[s] || (s ? e(s) : 'Not recorded');
}

function section(title: string, body: string): string {
  return `<section><h2>${title}</h2>${body}</section>`;
}

function findingsBlock(items: string[], notes: unknown): string {
  const chips = items.length
    ? `<div class="chips">${items.map((i) => `<span class="chip">${e(i)}</span>`).join('')}</div>`
    : '<p class="muted">Not assessed — no observations recorded for this view.</p>';
  const note = notes && String(notes).trim() ? `<p class="note">${e(notes)}</p>` : '';
  return `${chips}${note}`;
}

function exerciseList(entries: Row[], fields: [string, string][]): string {
  if (!entries.length) return '<p class="muted">No exercises recorded.</p>';
  return `<ol class="exercises">${entries.map((entry) => {
    const name = e(entry.exercise || 'Untitled exercise');
    const details = fields
      .map(([key, label]) => (entry[key] ? `<span><strong>${label}:</strong> ${e(entry[key])}</span>` : ''))
      .filter(Boolean)
      .join(' ');
    const instructions = entry.instructions ? `<p class="note">${e(entry.instructions)}</p>` : '';
    return `<li><p class="ex-name">${name}</p><p class="ex-meta">${details}</p>${instructions}</li>`;
  }).join('')}</ol>`;
}

export function generatePostureReportHTML(row: Row, clientName: string): string {
  const summary = object(row.assessment_summary);
  const coach = object(row.coach_notes);
  const plan = object(row.corrective_plan);
  const recommendations = object(plan.recommendations);
  const muscles = arrayOfObjects(row.muscle_imbalances);
  const resolved = list(row.resolved_findings);

  const front = list(row.front_issues);
  const side = list(row.side_issues);
  const back = list(row.back_issues);
  const viewNotes = object(row.view_notes);

  const trainerRemarks = summary.trainer_assessment || coach.initial_observations || '';
  const clientRecommendations = summary.client_recommendations || coach.corrective_strategy || '';

  const photo = (src: unknown, alt: string): string => {
    const safe = escapeImageDataUrl(src);
    return safe
      ? `<figure><img src="${safe}" alt="${e(alt)}"><figcaption>${e(alt)}</figcaption></figure>`
      : `<figure class="empty"><div>No ${e(alt.toLowerCase())}</div><figcaption>${e(alt)}</figcaption></figure>`;
  };

  const muscleRows = muscles.length
    ? `<table><thead><tr><th>Muscle</th><th>Status</th><th>Side</th><th>Notes</th></tr></thead><tbody>
        ${muscles.map((m) => `<tr><td>${e(m.muscle)}</td><td>${e(m.status)}</td><td>${e(m.side)}</td><td>${e(m.notes) || '—'}</td></tr>`).join('')}
      </tbody></table>`
    : '<p class="muted">No muscle findings confirmed.</p>';

  return `<!doctype html><html><head><meta charset="utf-8"><title>Postural Assessment — ${e(clientName)}</title>
<style>
  :root{color-scheme:light}
  *{box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;margin:0;background:#f8fafc;color:#0f172a}
  .page{max-width:900px;margin:0 auto;background:#fff;min-height:100vh;padding:34px 38px 48px}
  .brand{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-bottom:16px;border-bottom:3px solid #A33757}
  .brand h1{font-size:22px;letter-spacing:-.03em;margin:0}
  .brand p{margin:3px 0 0;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#A33757;font-weight:800}
  .badge{border-radius:999px;padding:6px 12px;background:#FFF7F3;color:#A33757;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}
  .meta{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:18px 0 24px;padding:14px;border-radius:12px;background:#f8fafc;border:1px solid #E2E8F0}
  .meta label{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;font-weight:800;margin-bottom:3px}
  .meta p{font-size:12px;font-weight:700;margin:0}
  section{margin:0 0 20px;break-inside:avoid}
  h2{font-size:12px;text-transform:uppercase;letter-spacing:.09em;color:#A33757;margin:0 0 9px;padding-bottom:6px;border-bottom:1px solid #E2E8F0}
  h3{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin:12px 0 5px}
  p{font-size:12px;line-height:1.55;margin:4px 0}
  .muted{color:#94a3b8;font-style:italic}
  .note{color:#64748b;font-size:11px;line-height:1.5;margin:5px 0 0}
  .chips{display:flex;flex-wrap:wrap;gap:5px}
  .chip{font-size:10.5px;font-weight:700;padding:4px 9px;border-radius:999px;background:#FFF7F3;color:#852E4E;border:1px solid #FFD0C6}
  .photos{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
  figure{margin:0;border:1px solid #E2E8F0;border-radius:10px;overflow:hidden;background:#f8fafc}
  figure img{display:block;width:100%;aspect-ratio:3/4;object-fit:cover}
  figure.empty div{display:flex;align-items:center;justify-content:center;aspect-ratio:3/4;color:#cbd5e1;font-size:10px}
  figcaption{font-size:9px;font-weight:750;text-transform:uppercase;letter-spacing:.07em;color:#64748b;padding:5px 7px;border-top:1px solid #eee}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th{text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;padding:5px 6px;border-bottom:1px solid #e2e8f0}
  td{padding:6px;border-bottom:1px solid #f1f5f9;vertical-align:top}
  .exercises{margin:0;padding-left:18px}
  .exercises li{margin-bottom:8px}
  .ex-name{font-size:12px;font-weight:750;margin:0}
  .ex-meta{display:flex;flex-wrap:wrap;gap:3px 12px;font-size:10.5px;color:#64748b;margin:2px 0 0}
  .two{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .callout{border-left:3px solid #A33757;background:#FFF7F3;padding:9px 12px;border-radius:0 8px 8px 0}
  .disclaimer{margin-top:24px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:9.5px;line-height:1.55;color:#94a3b8}
  @media print{body{background:#fff}.page{padding:0;max-width:none}@page{margin:14mm}}
</style></head><body><div class="page">
${printWindowCloseButtonHtml()}
<header class="brand">
  <div><p>My PT Studio</p><h1>Postural Assessment Report</h1></div>
  <span class="badge">${statusLabel(row.status)}</span>
</header>

<div class="meta">
  <div><label>Client</label><p>${e(clientName)}</p></div>
  <div><label>Assessment date</label><p>${e(String(row.assessment_date || '—').slice(0, 10))}</p></div>
  <div><label>Assessment type</label><p>${typeLabel(row.assessment_type)}</p></div>
  <div><label>Assessment number</label><p>${row.assessment_number ? `#${e(row.assessment_number)}` : '—'}</p></div>
</div>

${section('Anterior View Findings', findingsBlock(front, viewNotes.front))}
${section('Lateral View Findings', findingsBlock(side, viewNotes.side))}
${section('Posterior View Findings', findingsBlock(back, viewNotes.back))}

${section('Posture Photographs', `<div class="photos">${photo(row.front_photo_url, 'Front view')}${photo(row.side_photo_url, 'Side view')}${photo(row.back_photo_url, 'Back view')}</div>`)}

${section('Muscle Imbalance Findings', muscleRows)}

${section('Corrective Exercise Plan', `
  <h3>Mobility &amp; Flexibility</h3>
  ${exerciseList(arrayOfObjects(plan.mobility), [['target_muscle', 'Target'], ['region', 'Region'], ['duration', 'Duration'], ['sets', 'Sets'], ['reps', 'Reps'], ['frequency', 'Frequency']])}
  <h3>Muscle Activation</h3>
  ${exerciseList(arrayOfObjects(plan.activation), [['target_muscle', 'Target'], ['sets', 'Sets'], ['reps', 'Reps'], ['hold', 'Hold'], ['frequency', 'Frequency']])}
  <h3>Strengthening</h3>
  ${exerciseList(arrayOfObjects(plan.strengthening), [['target_muscle', 'Target'], ['sets', 'Sets'], ['reps', 'Reps'], ['resistance', 'Resistance'], ['tempo', 'Tempo'], ['rest', 'Rest'], ['frequency', 'Frequency']])}
`)}

${section('Trainer Remarks', `
  ${summary.primary_concern ? `<p><strong>Primary concern:</strong> ${e(summary.primary_concern)}</p>` : ''}
  ${summary.secondary_concern ? `<p><strong>Secondary concern:</strong> ${e(summary.secondary_concern)}</p>` : ''}
  <div class="callout"><p>${trainerRemarks ? e(trainerRemarks) : 'No overall assessment recorded.'}</p></div>
  ${clientRecommendations ? `<p><strong>Client recommendations:</strong> ${e(clientRecommendations)}</p>` : ''}
  ${row.other_issue_notes ? `<p><strong>Additional observations:</strong> ${e(row.other_issue_notes)}</p>` : ''}
`)}

${section('Follow-up Recommendations', `
  <div class="two">
    <div>
      <h3>General</h3><p>${recommendations.general ? e(recommendations.general) : '<span class="muted">Not recorded.</span>'}</p>
      <h3>Movement modifications</h3><p>${recommendations.modifications ? e(recommendations.modifications) : '<span class="muted">Not recorded.</span>'}</p>
      <h3>Precautions</h3><p>${recommendations.precautions ? e(recommendations.precautions) : '<span class="muted">Not recorded.</span>'}</p>
    </div>
    <div>
      <h3>Follow-up</h3><p>${recommendations.follow_up ? e(recommendations.follow_up) : '<span class="muted">Not recorded.</span>'}</p>
      <h3>Additional comments</h3><p>${recommendations.additional ? e(recommendations.additional) : '<span class="muted">Not recorded.</span>'}</p>
      ${resolved.length ? `<h3>Explicitly resolved</h3><p>${resolved.map((r) => e(r)).join(' · ')}</p>` : ''}
    </div>
  </div>
`)}

<p class="disclaimer">This report records a static postural screen and the trainer's observations. It is not a medical diagnosis. Photographs and findings are private to the studio. Suspected scoliosis or any red flag requires referral for medical assessment.</p>
</div></body></html>`;
}

export function downloadPosturePdf(row: Row, clientName: string): void {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(generatePostureReportHTML(row, clientName));
  w.document.close();
  w.focus();
  w.print();
}
