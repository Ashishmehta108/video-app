import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-[var(--rounded-md)] hover:bg-[#1a1a1a] focus-visible:ring-[var(--color-brand-teal)]',
        secondary:
          'bg-[var(--color-surface-card)] text-[var(--color-ink)] border border-[var(--color-hairline)] rounded-[var(--rounded-md)] hover:bg-[var(--color-surface-strong)]',
        destructive:
          'bg-[var(--color-brand-coral)] text-white rounded-[var(--rounded-md)] hover:bg-[#e85a4a]',
        outline:
          'border border-[var(--color-hairline)] bg-[var(--color-canvas)] text-[var(--color-ink)] rounded-[var(--rounded-md)] hover:bg-[var(--color-surface-soft)]',
        ghost:
          'text-[var(--color-body)] rounded-[var(--rounded-md)] hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)]',
        link: 'text-[var(--color-ink)] underline-offset-4 hover:underline',
        brand:
          'bg-[var(--color-brand-teal)] text-[var(--color-on-primary)] rounded-[var(--rounded-md)] hover:bg-[#1a4a4a]',
      },
      size: {
        default: 'h-11 px-5 py-2.5',
        sm: 'h-9 rounded-[var(--rounded-sm)] px-3.5 text-xs',
        lg: 'h-12 rounded-[var(--rounded-md)] px-8 text-base',
        icon: 'h-10 w-10 rounded-[var(--rounded-md)]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = 'Button';

export { Button, buttonVariants };
