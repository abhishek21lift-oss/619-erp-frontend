'use client'

import { useEffect, useRef } from 'react'
import { m } from 'framer-motion'
import { cn } from '@/components/ui/cn'

interface ProgressRingProps {
  size?: number
  strokeWidth?: number
  progress: number
  color: string
  bgColor?: string
  label?: string
  value?: string
  className?: string
}

export function ProgressRing({
  size = 120,
  strokeWidth = 8,
  progress,
  color,
  bgColor = 'rgba(255,255,255,0.08)',
  label,
  value,
  className,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clampedProgress = Math.min(100, Math.max(0, progress))
  const dashOffset = circumference - (clampedProgress / 100) * circumference

  const center = size / 2

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
        aria-hidden="true"
      >
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <m.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
        />
      </svg>

      {/* Center content */}
      {(value != null || label != null) && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ pointerEvents: 'none' }}
        >
          {value != null && (
            <span
              style={{
                color: 'var(--text-primary)',
                fontSize: size * 0.2,
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: '-0.02em',
              }}
            >
              {value}
            </span>
          )}
          {label != null && (
            <span
              style={{
                color: 'var(--text-muted)',
                fontSize: size * 0.11,
                marginTop: size * 0.03,
                fontWeight: 500,
                letterSpacing: '0.01em',
              }}
            >
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
