import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  selected?: boolean;
  as?: 'div' | 'section' | 'article';
}

export function GlassCard({ children, className, hover, onClick, selected }: GlassCardProps) {
  const base =
    'rounded-2xl border bg-white/80 backdrop-blur-xl shadow-[0_4px_24px_rgba(15,23,42,0.07)] transition-all duration-200 dark:bg-white/5 dark:border-white/10 dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)]';
  const hoverClass = hover
    ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(15,23,42,0.12)] hover:border-red-300/60 dark:hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] dark:hover:border-red-500/60'
    : '';
  const selectedClass = selected
    ? 'border-red-500 shadow-[0_0_0_2px_rgba(220,38,38,0.25)] bg-red-50/80 dark:bg-red-500/10 dark:shadow-[0_0_0_2px_rgba(220,38,38,0.5)]'
    : 'border-white/60';

  if (onClick) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={clsx(base, hoverClass, selectedClass, className)}
        onClick={onClick}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={clsx(base, selectedClass, className)}
    >
      {children}
    </motion.div>
  );
}
