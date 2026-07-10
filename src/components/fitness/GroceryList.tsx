'use client';

import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Check, ShoppingCart } from 'lucide-react';
import { cn } from '@/components/ui/cn';

interface GroceryCategory {
  category: string;
  items: string[];
}

interface GroceryListProps {
  items?: GroceryCategory[];
  onGenerate?: () => void;
  isGenerating?: boolean;
  className?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  Vegetables: '#10b981',
  Protein: '#ef4444',
  Fruits: '#f59e0b',
  Dairy: '#06b6d4',
  Supplements: '#8b5cf6',
  Grains: '#d97706',
  Snacks: '#ec4899',
  Miscellaneous: '#6b7280',
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? '#6b7280';
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function GroceryList({ items, onGenerate, isGenerating, className }: GroceryListProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const allItems = items?.flatMap(c => c.items.map(item => `${c.category}::${item}`)) ?? [];
  const totalCount = allItems.length;
  const checkedCount = allItems.filter(k => checked.has(k)).length;
  const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

  function toggleItem(key: string) {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function clearCompleted() {
    setChecked(new Set());
  }

  // ── Generating skeleton ────────────────────────────────────────────────────
  if (isGenerating) {
    return (
      <div className={cn('space-y-3', className)} style={{ padding: '4px 0' }}>
        {[1, 2, 3].map(i => (
          <div
            key={i}
            style={{
              height: 52,
              borderRadius: 12,
              background: 'var(--bg-muted, rgba(255,255,255,0.06))',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <m.div
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut', delay: i * 0.15 }}
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
              }}
            />
          </div>
        ))}
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!items || items.length === 0) {
    return (
      <div
        className={cn(className)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: '40px 20px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(99,102,241,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ShoppingCart size={24} color="#6366f1" />
        </div>
        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-primary, rgba(255,255,255,0.88))',
            margin: 0,
          }}
        >
          No grocery list yet
        </p>
        <p
          style={{
            fontSize: 12,
            color: 'var(--text-muted, rgba(255,255,255,0.50))',
            margin: 0,
            maxWidth: 220,
          }}
        >
          Generate a grocery list based on your diet plan
        </p>
        {onGenerate && (
          <m.button
            onClick={onGenerate}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            style={{
              marginTop: 4,
              padding: '8px 20px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <ShoppingCart size={14} />
            Generate from Diet Plan
          </m.button>
        )}
      </div>
    );
  }

  // ── Full list ──────────────────────────────────────────────────────────────
  return (
    <div className={cn(className)}>
      {/* Progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 6,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-muted, rgba(255,255,255,0.50))',
            }}
          >
            {checkedCount} of {totalCount} items
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#10b981',
            }}
          >
            {Math.round(progress)}%
          </span>
        </div>
        <div
          style={{
            height: 5,
            borderRadius: 4,
            background: 'rgba(255,255,255,0.08)',
            overflow: 'hidden',
          }}
        >
          <m.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #6366f1 0%, #10b981 100%)',
              borderRadius: 4,
            }}
          />
        </div>
      </div>

      {/* Categories */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {items.map(category => {
          const color = getCategoryColor(category.category);
          const categoryChecked = category.items.filter(item =>
            checked.has(`${category.category}::${item}`)
          ).length;

          return (
            <div key={category.category}>
              {/* Category header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    flex: 1,
                  }}
                >
                  {category.category}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '1px 7px',
                    borderRadius: 20,
                    background: hexToRgba(color, 0.15),
                    color,
                  }}
                >
                  {categoryChecked}/{category.items.length}
                </span>
              </div>

              {/* Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <AnimatePresence initial={false}>
                  {category.items.map(item => {
                    const key = `${category.category}::${item}`;
                    const isChecked = checked.has(key);

                    return (
                      <m.div
                        key={key}
                        layout
                        animate={{ scale: 1 }}
                        initial={{ scale: 0.95 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        onClick={() => toggleItem(key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '7px 10px',
                          borderRadius: 8,
                          cursor: 'pointer',
                          background: isChecked
                            ? 'rgba(255,255,255,0.03)'
                            : 'transparent',
                          transition: 'background 0.15s',
                          userSelect: 'none',
                        }}
                      >
                        {/* Checkbox */}
                        <m.div
                          animate={{
                            background: isChecked ? color : 'transparent',
                            borderColor: isChecked ? color : 'rgba(255,255,255,0.20)',
                            scale: isChecked ? [1, 1.2, 1] : 1,
                          }}
                          transition={{ duration: 0.18 }}
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 5,
                            border: '1.5px solid rgba(255,255,255,0.20)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {isChecked && (
                            <m.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ duration: 0.15 }}
                            >
                              <Check size={11} color="#fff" strokeWidth={3} />
                            </m.div>
                          )}
                        </m.div>

                        {/* Item name */}
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: isChecked
                              ? 'var(--text-muted, rgba(255,255,255,0.35))'
                              : 'var(--text-primary, rgba(255,255,255,0.88))',
                            textDecoration: isChecked ? 'line-through' : 'none',
                            opacity: isChecked ? 0.5 : 1,
                            transition: 'color 0.15s, opacity 0.15s',
                          }}
                        >
                          {item}
                        </span>
                      </m.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      {/* Clear completed */}
      <AnimatePresence>
        {checkedCount > 0 && (
          <m.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2 }}
            style={{
              marginTop: 16,
              textAlign: 'center',
            }}
          >
            <button
              onClick={clearCompleted}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.40)',
                padding: '4px 8px',
                borderRadius: 6,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e =>
                ((e.target as HTMLButtonElement).style.color = 'rgba(255,255,255,0.70)')
              }
              onMouseLeave={e =>
                ((e.target as HTMLButtonElement).style.color = 'rgba(255,255,255,0.40)')
              }
            >
              Clear {checkedCount} completed
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
