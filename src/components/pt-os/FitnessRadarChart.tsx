'use client';

import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';

export interface RadarDatum {
  category: string;
  // Null = not measured. Passed straight through so a missing test renders
  // as a gap, never as a zero.
  score: number | null;
}

interface FitnessRadarChartProps {
  data: RadarDatum[];
  height?: number;
  /**
   * 'onDark' is the original rendering, for the navy result cards the other
   * dashboards use. 'onCard' paints for a themed `--bg-card` surface, so the
   * chart follows the app's light/dark mode instead of assuming navy.
   */
  variant?: 'onDark' | 'onCard';
  /** The series colour. Defaults to the app's primary blue. */
  accent?: string;
}

/** 6-category fitness score radar (Body Composition / Strength / Endurance / Flexibility / Cardio / Health Score). */
export function FitnessRadarChart({
  data, height = 280, variant = 'onDark', accent = '#5B63F6',
}: FitnessRadarChartProps) {
  const onCard = variant === 'onCard';
  const labelFill = onCard ? 'currentColor' : 'rgba(255,255,255,0.65)';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius={onCard ? '66%' : '75%'}>
        <PolarGrid stroke={onCard ? 'currentColor' : 'rgba(255,255,255,0.12)'} opacity={onCard ? 0.14 : 1} />
        <PolarAngleAxis dataKey="category" tick={{ fill: labelFill, fontSize: 11, fontWeight: 600 }} />
        <PolarRadiusAxis
          angle={90} domain={[0, 100]} axisLine={false}
          tick={onCard
            ? { fill: 'currentColor', opacity: 0.45, fontSize: 9 }
            : { fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
        />
        <Radar
          name="Score" dataKey="score"
          stroke={accent} fill={accent} fillOpacity={0.35}
          strokeWidth={2} isAnimationActive={false} connectNulls={false}
        />
        <Tooltip
          contentStyle={onCard
            ? { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, color: 'var(--text-primary)' }
            : { background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }}
          labelStyle={onCard ? { color: 'var(--text-primary)', fontWeight: 700 } : { color: '#fff', fontWeight: 700 }}
          itemStyle={{ color: accent }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export default FitnessRadarChart;
