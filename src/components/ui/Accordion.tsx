'use client';

import * as React from 'react';
import { useState, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AccordionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export const Accordion: React.FC<AccordionProps> = ({
  title,
  children,
  defaultOpen = false,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const id = useId();
  const bodyId = `accordion-body-${id}`;

  return (
    <div className={cn('bg-brand-card rounded-xl border border-white/10', className)}>
      <button
        id={`accordion-header-${id}`}
        type="button"
        aria-expanded={isOpen}
        aria-controls={bodyId}
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'w-full flex items-center justify-between py-4 px-6 text-white min-h-[48px]',
          'hover:bg-white/5 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset',
          isOpen ? 'rounded-t-xl' : 'rounded-xl'
        )}
      >
        <span className="font-medium text-base text-left">{title}</span>
        <ChevronDown
          className={cn(
            'h-5 w-5 text-brand-muted shrink-0 transition-transform duration-300 ease-in-out',
            isOpen && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>

      <div
        id={bodyId}
        role="region"
        aria-labelledby={`accordion-header-${id}`}
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-4 text-brand-muted">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default Accordion;
