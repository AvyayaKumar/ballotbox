import * as React from 'react';
import { cn } from '@/lib/utils';

type CardVariant = 'dark' | 'light';

const variantClasses: Record<CardVariant, string> = {
  dark: 'bg-brand-card rounded-xl border border-white/10',
  light: 'bg-white rounded-xl shadow-sm border border-gray-100',
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  className?: string;
  children?: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'dark', className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(variantClasses[variant], 'p-6', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
