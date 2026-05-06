'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { camelCaseToReadable } from '@/utils/string-utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-sm border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1 transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-red-100 text-red-800',
        outline: 'text-foreground border',
        success: 'border-transparent bg-green-100 text-green-800',
        warning: 'border-transparent bg-yellow-100 text-yellow-800',
        blue: 'border-transparent bg-blue-100 text-blue-800',
        emerald: 'border-transparent bg-emerald-100 text-emerald-800',
        violet: 'border-transparent bg-violet-100 text-violet-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export type StatusVariant =
  | 'success'
  | 'destructive'
  | 'warning'
  | 'secondary'
  | 'outline'
  | 'blue'
  | 'emerald'
  | 'violet';

interface BadgeProps
  extends React.ComponentProps<'span'>,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'span';
    return (
      <Comp
        ref={ref}
        data-slot="badge"
        className={cn(badgeVariants({ variant }), className)}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';

interface StatusBadgeProps {
  value: string;
  variant?: StatusVariant;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  value,
  variant = 'outline',
}) => {
  return <Badge variant={variant}>{camelCaseToReadable(value) || '-'}</Badge>;
};

export { Badge, StatusBadge };
export default StatusBadge;
