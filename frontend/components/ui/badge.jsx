import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-[var(--rounded-pill)] px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-[var(--color-primary)] text-[var(--color-on-primary)]',
        secondary: 'bg-[var(--color-surface-card)] text-[var(--color-muted)] border border-[var(--color-hairline)]',
        success: 'bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0]',
        destructive: 'bg-[#fef2f2] text-[#dc2626] border border-[#fecaca]',
        warning: 'bg-[#fef9c3] text-[#a16207] border border-[#fde68a]',
        pink: 'bg-[var(--color-brand-pink)] text-white',
        teal: 'bg-[var(--color-brand-teal)] text-white',
        lavender: 'bg-[var(--color-brand-lavender)] text-[var(--color-ink)]',
        peach: 'bg-[var(--color-brand-peach)] text-[var(--color-ink)]',
        ochre: 'bg-[var(--color-brand-ochre)] text-[var(--color-ink)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
