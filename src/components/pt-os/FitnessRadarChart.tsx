'use client';

import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';

export interface RadarDatum {
  category: string;
  score: number;
}

interface FitnessRadarChartProps {
  data: RadarDatum[];
  height?: number;
}

/** 6-category fitness score radar (Body Composition / Strength / Endurance / Mobility / Cardio / Health Risk). */
export function FitnessRadarChart({ data, height = 280 }: FitnessRadarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="75%">
        <PolarGrid stroke="rgba(255,255,255,0.12)" />
        <PolarAngleAxis dataKey="category" tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 600 }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} />
        <Radar
          name="Score" dataKey="score"
          stroke="#0067E0" fill="#0067E0" fillOpacity={0.35}
          strokeWidth={2} isAnimationActive={false}
        />
        <Tooltip
          contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }}
          labelStyle={{ color: '#fff', fontWeight: 700 }}
          itemStyle={{ color: '#0067E0' }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export default FitnessRadarChart;
