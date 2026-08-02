'use client';

import { m } from 'framer-motion';
import { cn } from '@/components/ui/cn';

interface MealFood {
  name: string;
  quantity?: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
}

interface MealCardProps {
  id: string;
  name: string;
  mealType?: string;
  time?: string;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  emoji?: string;
  foods?: MealFood[];
  onClick?: () => void;
  compact?: boolean;
  className?: string;
}

const MEAL_TYPE_COLORS: Record<string, string> = {
  'Breakfast': '#f59e0b',
  'Lunch': '#0067e0',
  'Dinner': '#0067e0',
  'Snack': '#0067e0',
  'Pre Workout': '#f59e0b',
  'Post Workout': '#10b981',
  'Before Bed': '#0067e0',
};

function getMealColor(mealType?: string): string {
  if (!mealType) return '#0067e0';
  return MEAL_TYPE_COLORS[mealType] ?? '#0067e0';
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function MealCard({
  id: _id,
  name,
  mealType,
  time,
  calories,
  proteinG,
  carbsG,
  fatG,
  emoji = '🍽️',
  foods,
  onClick,
  compact = false,
  className,
}: MealCardProps) {
  const mealColor = getMealColor(mealType);

  const protein = proteinG ?? 0;
  const carbs = carbsG ?? 0;
  const fat = fatG ?? 0;
  const macroTotal = protein + carbs + fat;
  const proteinPct = macroTotal > 0 ? (protein / macroTotal) * 100 : 0;
  const carbsPct = macroTotal > 0 ? (carbs / macroTotal) * 100 : 0;
  const fatPct = macroTotal > 0 ? (fat / macroTotal) * 100 : 0;

  const visibleFoods = foods?.slice(0, 3) ?? [];

  return (
    <m.div
      onClick={onClick}
      whileHover={{ y: -2, boxShadow: `0 8px 32px ${hexToRgba(mealColor, 0.22)}` }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={cn('relative overflow-hidden cursor-pointer select-none', className)}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid var(--border)`,
        borderRadius: 16,
        transition: 'border-color 0.18s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = hexToRgba(mealColor, 0.55);
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
      }}
    >
      {/* Top colored stripe */}
      <div
        style={{
          height: 3,
          background: mealColor,
          borderRadius: '16px 16px 0 0',
        }}
      />

      <div style={{ padding: compact ? '12px 14px' : '14px 16px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          {/* Emoji */}
          <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{emoji}</span>

          {/* mealType badge */}
          {mealType && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 20,
                background: hexToRgba(mealColor, 0.18),
                color: mealColor,
                letterSpacing: '0.02em',
                flexShrink: 0,
              }}
            >
              {mealType}
            </span>
          )}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Time badge */}
          {time && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                padding: '2px 8px',
                borderRadius: 20,
                background: 'var(--bg-muted, rgba(255,255,255,0.06))',
                color: 'var(--text-muted, rgba(255,255,255,0.50))',
                flexShrink: 0,
              }}
            >
              {time}
            </span>
          )}
        </div>

        {/* Meal name */}
        <p
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--text-primary, rgba(255,255,255,0.88))',
            margin: '0 0 10px 0',
            lineHeight: 1.3,
          }}
        >
          {name}
        </p>

        {/* Macro chips row */}
        {(calories !== undefined || protein > 0 || carbs > 0 || fat > 0) && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {calories !== undefined && (
              <MacroChip icon="🔥" value={`${calories}`} unit="kcal" color="#f59e0b" />
            )}
            {protein > 0 && (
              <MacroChip icon="💪" value={`${protein}g`} label="protein" color="#0067e0" />
            )}
            {carbs > 0 && (
              <MacroChip icon="🍚" value={`${carbs}g`} label="carbs" color="#f59e0b" />
            )}
            {fat > 0 && (
              <MacroChip icon="🧈" value={`${fat}g`} label="fat" color="#0067e0" />
            )}
          </div>
        )}

        {/* Macro mini-bars */}
        {macroTotal > 0 && (
          <div style={{ display: 'flex', gap: 3, height: 5, borderRadius: 4, overflow: 'hidden', marginBottom: compact ? 0 : 12 }}>
            <div
              style={{
                width: `${proteinPct}%`,
                background: '#0067e0',
                borderRadius: '4px 0 0 4px',
                transition: 'width 0.4s ease',
              }}
            />
            <div
              style={{
                width: `${carbsPct}%`,
                background: '#f59e0b',
                transition: 'width 0.4s ease',
              }}
            />
            <div
              style={{
                width: `${fatPct}%`,
                background: '#0067e0',
                borderRadius: '0 4px 4px 0',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        )}

        {/* Foods section — hidden in compact mode */}
        {!compact && visibleFoods.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-muted, rgba(255,255,255,0.50))',
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Foods
            </p>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {visibleFoods.map((food, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 20,
                    background: 'var(--bg-muted, rgba(255,255,255,0.06))',
                    color: 'var(--text-secondary, rgba(255,255,255,0.70))',
                    border: '1px solid var(--border)',
                  }}
                >
                  {food.name}
                  {food.quantity ? ` · ${food.quantity}` : ''}
                </span>
              ))}
              {(foods?.length ?? 0) > 3 && (
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 20,
                    background: 'var(--bg-muted, rgba(255,255,255,0.06))',
                    color: 'var(--text-muted, rgba(255,255,255,0.50))',
                  }}
                >
                  +{(foods?.length ?? 0) - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </m.div>
  );
}

// ─── Internal sub-component ───────────────────────────────────────────────────

interface MacroChipProps {
  icon: string;
  value: string;
  unit?: string;
  label?: string;
  color: string;
}

function MacroChip({ icon, value, unit, label, color }: MacroChipProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        fontSize: 11,
        fontWeight: 600,
        padding: '3px 8px',
        borderRadius: 20,
        background: `${color}18`,
        color,
      }}
    >
      <span>{icon}</span>
      <span>{value}</span>
      {(unit || label) && (
        <span style={{ fontWeight: 400, opacity: 0.8 }}>{unit ?? label}</span>
      )}
    </span>
  );
}
