'use client'

import { useEffect, useRef } from 'react'
import { animate } from 'framer-motion'
import { cn } from '@/components/ui/cn'

interface AnimatedCounterProps {
  value: number
  decimals?: number
  suffix?: string
  prefix?: string
  className?: string
  duration?: number
}

export function AnimatedCounter({
  value,
  decimals = 0,
  suffix,
  prefix,
  className,
  duration = 1.4,
}: AnimatedCounterProps) {
  const nodeRef = useRef<HTMLSpanElement>(null)
  const prevValueRef = useRef<number>(0)

  useEffect(() => {
    const node = nodeRef.current
    if (node == null) return

    const from = prevValueRef.current
    prevValueRef.current = value

    const controls = animate(from, value, {
      duration,
      ease: [0.4, 0, 0.2, 1],
      onUpdate(latest) {
        node.textContent =
          (prefix ?? '') +
          latest.toFixed(decimals) +
          (suffix ?? '')
      },
    })

    return () => controls.stop()
  }, [value, decimals, suffix, prefix, duration])

  return (
    <span
      ref={nodeRef}
      className={cn(className)}
      style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
    >
      {(prefix ?? '') + value.toFixed(decimals) + (suffix ?? '')}
    </span>
  )
}
