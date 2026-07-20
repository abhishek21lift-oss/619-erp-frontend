// Zero-dependency "print to PDF" report for a saved Fitness Testing
// assessment. Mirrors the invoices page's window.open + document.write +
// window.print() trick (src/app/finance/invoices/page.tsx) rather than
// pulling in a PDF library — no charts are rendered (Recharts'
// ResponsiveContainer measures 0x0 in a freshly document.write()'d popup),
// just plain HTML/CSS tables, which print reliably.

import type { AiFitnessTestAnalysis } from './api';

type Row = Record<string, unknown>;

const CATEGORY_BY_SCORE: Record<number, string> = { 95: 'Excellent', 80: 'Good', 60: 'Average', 40: 'Below Average', 20: 'Poor' };

function v(val: unknown, unit = ''): string {
  if (val === null || val === undefined || val === '') return '—';
  return `${val}${unit}`;
}

function scoreLabel(score: unknown): string {
  const n = typeof score === 'number' ? score : parseFloat(String(score ?? ''));
  if (!Number.isFinite(n)) return '—';
  return `${n} (${CATEGORY_BY_SCORE[n] || '—'})`;
}

function field(label: string, value: string): string {
  return `<div class="field"><label>${label}</label><p>${value}</p></div>`;
}

function section(title: string, bodyHtml: string): string {
  return `<div class="section"><h2>${title}</h2><div class="grid">${bodyHtml}</div></div>`;
}

function list(items: string[]): string {
  return `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
}

function generateAssessmentReportHTML(assessment: Row, clientName: string, aiAnalysis?: AiFitnessTestAnalysis | null): string {
  const date = String(assessment.assessment_date ?? '').slice(0, 10) || '—';
  const type = String(assessment.assessment_type ?? '').replace(/_/g, ' ') || '—';
  const number = assessment.assessment_number != null ? `#${assessment.assessment_number}` : '—';
  const coach = String(assessment.trainer_name ?? '') || '—';

  const vitals = section('Blood Pressure', [
    field('Systolic', v(assessment.bp_systolic, ' mmHg')),
    field('Diastolic', v(assessment.bp_diastolic, ' mmHg')),
    field('Resting Heart Rate', v(assessment.resting_heart_rate, ' bpm')),
    field('Resting SpO₂', v(assessment.resting_spo2, '%')),
    field('Classification', v(assessment.bp_category)),
  ].join(''));

  const anthro = section('Anthropometric', [
    field('Weight', v(assessment.weight, ' kg')),
    field('Height', v(assessment.height_cm, ' cm')),
    field('BMI', v(assessment.bmi)),
    field('Waist Narrowest', v(assessment.waist_cm, ' cm')),
    field('Waist Iliac', v(assessment.waist_iliac_cm, ' cm')),
    field('Hips', v(assessment.hips_cm, ' cm')),
    field('Waist-Hip Ratio', v(assessment.waist_hip_ratio)),
    field('Neck', v(assessment.neck_cm, ' cm')),
    field('Chest', v(assessment.chest_cm, ' cm')),
    field('Right / Left Arm', `${v(assessment.arm_right_cm)} / ${v(assessment.arm_left_cm)} cm`),
    field('Right / Left Thigh', `${v(assessment.thigh_right_cm)} / ${v(assessment.thigh_left_cm)} cm`),
    field('Right / Left Calf', `${v(assessment.calf_right_cm)} / ${v(assessment.calf_left_cm)} cm`),
  ].join(''));

  const bodyComp = section('Body Composition', [
    field('Method', v(assessment.body_comp_method)),
    field('Body Fat %', v(assessment.body_fat_pct, '%')),
    field('Muscle Mass %', v(assessment.muscle_mass_pct, '%')),
    field('Lean Body Mass', v(assessment.lean_body_mass_kg, ' kg')),
    field('Fat Mass', v(assessment.fat_mass_kg, ' kg')),
    field('Visceral Fat', v(assessment.visceral_fat)),
    field('Subcutaneous Fat %', v(assessment.subcutaneous_fat_pct, '%')),
    field('Body Water %', v(assessment.body_water_pct, '%')),
    field('Bone Mass', v(assessment.bone_mass_kg, ' kg')),
    field('BMR', v(assessment.bmr, ' kcal')),
    field('Metabolic Age', v(assessment.metabolic_age)),
  ].join(''));

  const cardio = section('Cardiorespiratory Endurance', [
    field('Test', v(assessment.cardio_test_type)),
    field('VO₂ Max', v(assessment.vo2_max, ' mL/kg/min')),
    field('Classification', v(assessment.cardio_category)),
  ].join(''));

  const strength = section('Muscular Strength', [
    field('Strength Score', scoreLabel(assessment.strength_score_computed)),
  ].join(''));

  const endurance = section('Muscular Endurance', [
    field('Test 1', v(assessment.endurance_test_type)),
    field('Test 1 Classification', v(assessment.endurance_category)),
    field('Test 2', v(assessment.endurance_test_type_2)),
    field('Test 2 Classification', v(assessment.endurance_category_2)),
    field('Combined Endurance Score', scoreLabel(assessment.endurance_score_computed)),
  ].join(''));

  const flexibility = section('Flexibility &amp; Mobility', [
    field('Classification', v(assessment.flexibility_category)),
    field('Asymmetry Detected', assessment.has_asymmetry ? 'Yes' : 'No'),
    field('Mobility Score', scoreLabel(assessment.mobility_score_computed)),
  ].join(''));

  const dashboard = `<div class="dashboard">
    <div class="dscore"><label>Overall Fitness Score</label><div class="big">${v(assessment.overall_fitness_score)}</div></div>
    <div class="dgrid">
      ${field('Body Composition', scoreLabel(assessment.body_composition_score))}
      ${field('Health Risk', scoreLabel(assessment.health_risk_score))}
      ${field('Cardio', scoreLabel(assessment.cardio_score_computed))}
      ${field('Strength', scoreLabel(assessment.strength_score_computed))}
      ${field('Endurance', scoreLabel(assessment.endurance_score_computed))}
      ${field('Mobility', scoreLabel(assessment.mobility_score_computed))}
    </div>
  </div>`;

  const notesParts: string[] = [];
  if (assessment.posture_notes) notesParts.push(field('Posture Notes', String(assessment.posture_notes)));
  if (assessment.health_notes) notesParts.push(field('Health Notes', String(assessment.health_notes)));
  if (assessment.trainer_notes) notesParts.push(field('Assessment Notes', String(assessment.trainer_notes)));
  const notes = notesParts.length ? section('Notes', notesParts.join('')) : '';

  const ai = aiAnalysis ? `<div class="section ai">
    <h2>AI Recommendations</h2>
    <p>${aiAnalysis.summary}</p>
    <p class="muted">${aiAnalysis.overall_assessment}</p>
    ${aiAnalysis.strengths.length ? `<h3>Strengths</h3>${list(aiAnalysis.strengths)}` : ''}
    ${aiAnalysis.areas_to_improve.length ? `<h3>Areas to Improve</h3>${list(aiAnalysis.areas_to_improve)}` : ''}
    ${aiAnalysis.risk_flags.length ? `<h3>Risk Flags</h3>${list(aiAnalysis.risk_flags.map((r) => `<strong>${r.flag}</strong> (${r.severity}) — ${r.action}`))}` : ''}
    ${aiAnalysis.recommendations.length ? `<h3>Recommendations</h3>${list([...aiAnalysis.recommendations].sort((a, b) => a.priority - b.priority).map((r) => `<strong>${r.priority}. ${r.focus_area}</strong> — ${r.action}`))}` : ''}
    ${aiAnalysis.suggested_next_test_focus ? `<p class="muted"><em>Next test focus: ${aiAnalysis.suggested_next_test_focus}</em></p>` : ''}
  </div>` : '';

  return `<!DOCTYPE html><html><head><title>Fitness Assessment ${number}</title>
<style>
body{font-family:sans-serif;padding:40px;color:#0f172a;max-width:820px;margin:0 auto}
h1{font-size:24px;margin-bottom:4px;letter-spacing:-0.02em}
h2{font-size:14px;text-transform:uppercase;letter-spacing:.05em;color:#0f172a;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid #e2e8f0}
h3{font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#475569;margin:14px 0 6px}
.top{display:flex;flex-wrap:wrap;gap:24px;margin-bottom:28px}
.field{min-width:120px}
label{font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;font-weight:700}
p{font-size:14px;font-weight:600;margin:4px 0}
.section{margin-bottom:24px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px 24px}
.dashboard{background:#0f172a;border-radius:16px;padding:24px;color:#fff;margin-bottom:24px;display:flex;gap:32px;flex-wrap:wrap;align-items:center}
.dscore label{color:rgba(255,255,255,0.5)}
.dscore .big{font-size:40px;font-weight:800;color:#F59E0B}
.dgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px 24px;flex:1}
.dgrid label{color:rgba(255,255,255,0.5)}
.dgrid p{color:#fff}
.ai p{font-weight:400;font-size:13px;line-height:1.5}
.ai .muted{color:#64748b;font-style:italic}
.ai ul{margin:4px 0 0;padding-left:18px;font-size:13px;line-height:1.6}
@media print{@page{margin:16mm}}
</style></head><body>
<h1>Fitness Testing Report</h1>
<p style="color:#64748b;font-weight:500;margin-bottom:24px">${clientName}</p>
<div class="top">
  ${field('Assessment', number)}
  ${field('Date', date)}
  ${field('Type', type)}
  ${field('Coach', coach)}
</div>
${dashboard}
${vitals}
${anthro}
${bodyComp}
${cardio}
${strength}
${endurance}
${flexibility}
${notes}
${ai}
</body></html>`;
}

export function downloadAssessmentPdf(assessment: Row, clientName: string, aiAnalysis?: AiFitnessTestAnalysis | null): void {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(generateAssessmentReportHTML(assessment, clientName, aiAnalysis));
  w.document.close();
  w.focus();
  w.print();
}
