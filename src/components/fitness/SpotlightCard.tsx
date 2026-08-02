'use client'

import { useRef, useState, useCallback } from 'react'
import { cn } from '@/components/ui/cn'
import type { ReactNode, CSSProperties, MouseEvent } from 'react'

interface SpotlightCardProps {
  children: ReactNode
  className?: string
  spotlightColor?: string
  style?: CSSProperties
}

export function SpotlightCard({
  children,
  className,
  spotlightColor = 'rgba(127,180,255,0.10)',
  style,
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [spotlight, setSpotlight] = useState<{ x: number; y: number } | null>(null)

  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current
    if (card == null) return
    const rect = card.getBoundingClientRect()
    setSpotlight({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }, [])

  const handleMouseLeave = useCallback(() => {
    setSpotlight(null)
  }, [])

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn('relative overflow-hidden', className)}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${spotlight != null ? 'rgba(127,180,255,0.28)' : 'var(--border)'}`,
        borderRadius: 18,
        transition: 'border-color 0.25s ease',
        ...style,
      }}
    >
      {/* Spotlight overlay */}
      {spotlight != null && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 0,
            background: `radial-gradient(400px circle at ${spotlight.x}px ${spotlight.y}px, ${spotlightColor}, transparent 70%)`,
            borderRadius: 'inherit',
          }}
        />
      )}

      {/* Content sits above spotlight */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  )
}
