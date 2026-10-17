// Pure scheduling recommendation engine for SMART goals (frontend twin of backend).
export interface ScheduleSession { name: string; focus: string; }
export interface ScheduleDay { dayIndex: number; dayName: string; type: 'training' | 'rest'; session: string | null; focus: string; optional: boolean; }
export interface TrainingSchedule { trainingDays: number; split: string; label: string; notes: string; calendar: ScheduleDay[]; }

const DAY_NAMES = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function buildSessions(split: string, days: number, goal: string, experience: string): ScheduleSession[] {
  const g = (goal || '').toLowerCase();
  if (split === 'full_body' || split === 'full_body_minimal') {
    const n = split === 'full_body_minimal' ? days : 3;
    return Array.from({ length: n }, (_, i) => ({ name: `Full-Body ${i + 1}`, focus: 'Compound strength + core' }));
  }
  if (split === 'upper_lower' || split === 'upper_lower_plus') {
    const base = ['Upper Body', 'Lower Body', 'Upper Body', 'Lower Body'];
    const out = base.slice(0, Math.min(days, 4)).map((f, i) => ({ name: f + (i >= 2 ? ' (2)' : ''), focus: f.includes('Upper') ? 'Push/Pull strength' : 'Squat/Hinge/Calves' }));
    if (days > 4) out.push({ name: 'Specialization Day', focus: g.includes('strength') ? 'Strength skill work' : 'Hypertrophy / conditioning' });
    return out;
  }
  if (split === 'ppl_variation') {
    return ['Push','Pull','Legs','Push (2)','Pull (2)'].slice(0, days).map(f => ({ name: f, focus: f.startsWith('Push') ? 'Chest/Shoulders/Triceps' : f.startsWith('Pull') ? 'Back/Biceps' : 'Quads/Hams/Glutes' }));
  }
  if (split === 'ppl_twice') {
    return ['Push 1','Pull 1','Legs 1','Push 2','Pull 2','Legs 2'].slice(0, days).map(f => ({ name: f, focus: f.startsWith('Push') ? 'Chest/Shoulders/Triceps' : f.startsWith('Pull') ? 'Back/Biceps' : 'Quads/Hams/Glutes' }));
  }
  return Array.from({ length: days }, (_, i) => ({ name: `Session ${i + 1}`, focus: 'General fitness' }));
}

export function recommendTrainingSplit(trainingDays: number | string, opts: { goal?: string; experience?: string } = {}): TrainingSchedule {
  const days = Math.max(1, Math.min(7, parseInt(String(trainingDays), 10) || 3));
  const goal = (opts.goal || '').toLowerCase();
  const experience = (opts.experience || 'beginner').toLowerCase();

  let split = 'full_body', label = 'Full-Body x3', notes = '';
  if (days <= 2) { split = 'full_body_minimal'; label = 'Full-Body (Minimum Effective Dose)'; notes = '1-2 days/week: compound movements covering all major muscle groups.'; }
  else if (days === 3) { split = 'full_body'; label = 'Full-Body x3'; notes = '3 days/week: full-body resistance training 3 days; optional cardio/mobility/stretching on other days.'; }
  else if (days === 4) { split = 'upper_lower'; label = 'Upper/Lower x2'; notes = '4 days/week: upper/lower split performed twice weekly.'; }
  else if (days === 5) {
    if (goal.includes('powerlifting') || goal.includes('strength')) { split = 'upper_lower_plus'; label = 'Upper/Lower + Strength Specialization'; notes = '5 days/week: upper/lower base plus strength specialization day.'; }
    else if (goal.includes('muscle') || goal.includes('hypertrophy')) { split = 'ppl_variation'; label = 'Push/Pull/Legs (PPL) Variation'; notes = '5 days/week: PPL variation with extra specialization day.'; }
    else { split = 'upper_lower_plus'; label = 'Upper/Lower + Specialization Day'; notes = '5 days/week: adaptive upper/lower base plus goal-specific specialization day.'; }
  } else if (days === 6) { split = 'ppl_twice'; label = 'Push/Pull/Legs x2'; notes = '6 days/week: PPL performed twice weekly when recovery allows.'; }
  else { split = 'ppl_twice'; label = 'Push/Pull/Legs x2 + Active Recovery'; notes = '7 days/week: PPL twice weekly plus active recovery day.'; }

  const trainingIndices: number[] = [];
  for (let i = 0; i < days; i++) trainingIndices.push(Math.round(i * 7 / days) % 7);
  const unique = [...new Set(trainingIndices)];
  while (unique.length < days) {
    for (let d = 0; d < 7 && unique.length < days; d++) if (!unique.includes(d)) unique.push(d);
  }
  unique.sort((a, b) => a - b);

  const sessions = buildSessions(split, days, goal, experience);
  const calendar: ScheduleDay[] = DAY_NAMES.map((name, idx) => {
    const isTraining = unique.includes(idx);
    const session = isTraining ? sessions[unique.indexOf(idx)] : null;
    return {
      dayIndex: idx, dayName: name,
      type: isTraining ? 'training' : 'rest',
      session: session ? session.name : null,
      focus: session ? session.focus : (idx % 2 === 0 ? 'Optional cardio / mobility' : 'Recovery / stretching'),
      optional: !isTraining,
    };
  });

  return { trainingDays: days, split, label, notes, calendar };
}

export interface Milestone { label: string; date: string; type: string; }
export function generateMilestones(startDate?: string | null, targetDate?: string | null, shortWeeks = 8, mediumWeeks = 12): Milestone[] {
  const start = startDate ? new Date(startDate) : new Date();
  const target = targetDate ? new Date(targetDate) : null;
  const milestones: Milestone[] = [{ label: 'Start', date: start.toISOString().slice(0, 10), type: 'start' }];
  const addWeeks = (w: number) => {
    const d = new Date(start); d.setDate(d.getDate() + w * 7); return d.toISOString().slice(0, 10);
  };
  if (shortWeeks > 0) milestones.push({ label: `Short-term checkpoint (Week ${shortWeeks})`, date: addWeeks(shortWeeks), type: 'short_term' });
  if (mediumWeeks > 0 && mediumWeeks !== shortWeeks) milestones.push({ label: `Medium-term review (Week ${mediumWeeks})`, date: addWeeks(mediumWeeks), type: 'medium_term' });
  if (target) {
    const totalWeeks = Math.ceil((target.getTime() - start.getTime()) / (7 * 86400000));
    if (totalWeeks > mediumWeeks) milestones.push({ label: 'Long-term goal deadline', date: target.toISOString().slice(0, 10), type: 'long_term' });
  }
  const seen = new Set<string>();
  return milestones.filter(m => { if (seen.has(m.date)) return false; seen.add(m.date); return true; });
}

export interface RoutineBlueprint {
  split: string; experience: string; equipment: string; weeklyStructure: string;
  sessionTemplate: { warmup: string; mainLifts: { sets: number; reps: string; rpeOrRir: string; rest: string; tempo: string; }; accessories: { sets: number; reps: string; rpeOrRir: string; rest: string; }; core: { sets: number; reps: string; rest: string; }; cooldown: string; };
  progressionRules: string[]; substitutions: string[]; regressionProgression: string[]; reassessmentWeeks: number;
}
export function buildRoutineBlueprint(opts: { goal?: string; experience?: string; equipment?: string; trainingDays?: number | string; split?: string }): RoutineBlueprint {
  const exp = (opts.experience || 'beginner').toLowerCase();
  const sets = exp === 'beginner' ? 3 : 4;
  const goal = (opts.goal || '').toLowerCase();
  const reps = goal.includes('strength') || goal.includes('powerlifting') ? '3-5'
    : goal.includes('endurance') ? '12-20'
    : goal.includes('fat') ? '10-15'
    : '8-12';
  const rpe = exp === 'beginner' ? '6-7' : exp === 'intermediate' ? '7-8' : '8-9';
  const rest = goal.includes('strength') || goal.includes('powerlifting') ? '3-5 min'
    : goal.includes('endurance') ? '30-60s' : '60-90s';
  return {
    split: opts.split || 'full_body',
    experience: exp,
    equipment: opts.equipment || 'full_gym',
    weeklyStructure: `Recommended split: ${opts.split || 'full_body'}. Training days: ${opts.trainingDays}.`,
    sessionTemplate: {
      warmup: '5-10 min light cardio + dynamic mobility for target joints',
      mainLifts: { sets, reps, rpeOrRir: `RPE ${rpe}`, rest, tempo: '2-0-1-0 (controlled)' },
      accessories: { sets: Math.max(2, sets - 1), reps: '10-15', rpeOrRir: 'RIR 2', rest: '60s' },
      core: { sets: 2, reps: '10-15', rest: '45s' },
      cooldown: '5 min stretching + breathing',
    },
    progressionRules: [
      'Increase load when all sets hit top of rep range with RPE <= target for 2 consecutive sessions.',
      'Add 1 set per muscle group every 2-3 weeks if recovery allows.',
      'Deload every 4-6 weeks (reduce volume 40%, keep intensity moderate).',
    ],
    substitutions: ['Swap any exercise for a biomechanically similar movement matching equipment.'],
    regressionProgression: ['Regress: reduce load 10-20% or use supported variation.', 'Progress: add load, tempo, or a harder variation.'],
    reassessmentWeeks: 4,
  };
}
