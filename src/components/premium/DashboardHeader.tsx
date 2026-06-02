"use client";

import { useState } from "react";
import { LayoutDashboard, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Range = "Today" | "7 days" | "30 days" | "90 days";
const RANGES: Range[] = ["Today", "7 days", "30 days", "90 days"];

function RangeTab({
  label,
  active,
  onClick,
}: {
  label: Range;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="relative flex-1 min-w-0 px-3 py-2 rounded-lg text-[12px] sm:text-[13px] font-medium tracking-tight transition-all duration-200 ease-out select-none outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-lo)]/60 active:scale-95"
      style={{
        color: active ? "var(--text-inverse)" : "var(--text-muted)",
        fontWeight: active ? 600 : 500,
      }}
    >
      <AnimatePresence>
        {active && (
          <motion.span
            layoutId="active-tab-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 rounded-lg"
            style={{
              background: "var(--brand-lo)",
              boxShadow: "0 1px 3px var(--brand-glow), 0 1px 2px var(--brand-glow-2)",
            }}
          />
        )}
      </AnimatePresence>

      {!active && (
        <span
          className="absolute inset-0 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-150"
          style={{ background: "var(--bg-hover)" }}
        />
      )}

      <span className="relative z-10">{label}</span>
    </button>
  );
}

export function DashboardHeader({
  onRangeChange,
  onRefresh,
}: {
  onRangeChange?: (range: Range) => void;
  onRefresh?: () => void;
}) {
  const [activeRange, setActiveRange] = useState<Range>("30 days");
  const [spinning, setSpinning] = useState(false);

  const handleRange = (r: Range) => {
    setActiveRange(r);
    onRangeChange?.(r);
  };

  const handleRefresh = () => {
    if (spinning) return;
    setSpinning(true);
    onRefresh?.();
    setTimeout(() => setSpinning(false), 800);
  };

  return (
    <div className="w-full">
      <div
        className="relative overflow-hidden rounded-[20px] sm:rounded-[24px] bg-[var(--bg-card)] shadow-[0_1px_3px_var(--border),0_4px_12px_var(--brand-glow-2)]"
      >
        <div className="relative z-10 px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
                style={{
                  background: "var(--bg-subtle)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              >
                <LayoutDashboard size={15} strokeWidth={1.8} />
              </div>

              <div className="min-w-0">
                <h1 className="text-[20px] sm:text-[22px] font-bold leading-tight tracking-[-0.025em] text-[var(--text-primary)]">
                  Dashboard
                </h1>
                <div className="mt-[5px] flex items-center gap-[6px] flex-wrap">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--success)]" />
                  </span>
                  <span className="text-[11px] sm:text-[12px] font-normal tracking-[0.01em] text-[var(--text-muted)]">
                    Rolling 30 days &middot; refreshes every 30s
                  </span>
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleRefresh}
              aria-label="Refresh dashboard"
              title="Refresh"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] outline-none transition-all duration-200"
              style={{
                background: "var(--bg-subtle)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
              }}
            >
              <RefreshCw
                size={14}
                strokeWidth={2.2}
                style={{ color: spinning ? "var(--brand-lo)" : "var(--text-muted)" }}
              />
            </motion.button>
          </div>

          <div className="my-4 sm:my-5 h-px w-full" style={{ background: "var(--border)" }} />

          <div
            role="tablist"
            aria-label="Time range filter"
            className="flex gap-[3px] rounded-[12px] p-[3px]"
            style={{
              background: "var(--bg-subtle)",
              border: "1px solid var(--border)",
            }}
          >
            {RANGES.map((r) => (
              <RangeTab
                key={r}
                label={r}
                active={activeRange === r}
                onClick={() => handleRange(r)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
