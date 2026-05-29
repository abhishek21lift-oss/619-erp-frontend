import * as React from 'react';
import { cn } from './cn';

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-[24px] bg-white/75 backdrop-blur-[20px] saturate-[160%] border border-white/25 shadow-[0_8px_32px_rgba(11,11,15,0.06),0_1px_2px_rgba(11,11,15,0.03)] transition-all duration-200 hover:shadow-[0_12px_40px_rgba(11,11,15,0.08),0_2px_4px_rgba(11,11,15,0.04)] hover:-translate-y-0.5',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 border-b border-[rgba(11,11,15,0.04)] px-6 py-4',
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'text-[15px] font-semibold tracking-tight text-[#0B0B0F]',
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-[13px] text-[#4A4E57]', className)} {...props} />
  );
}

export function CardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 py-5', className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-3 border-t border-[rgba(11,11,15,0.04)] px-6 py-3',
        className,
      )}
      {...props}
    />
  );
}
