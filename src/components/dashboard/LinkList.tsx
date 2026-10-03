import * as React from 'react';
import { ExternalLink, Landmark } from 'lucide-react';
import type { LinkItem } from '@/lib/types';
import { cn } from '@/lib/utils';

export interface LinkListProps {
  links: LinkItem[];
  className?: string;
  /** Compact chips instead of a descriptive list. */
  compact?: boolean;
}

/** A list of outbound links. Government sources carry an "Official" marker. */
export const LinkList: React.FC<LinkListProps> = ({ links, className, compact = false }) => {
  if (links.length === 0) return null;

  if (compact) {
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        {links.map((l) => (
          <a
            key={l.href + l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            {l.official && <Landmark className="h-3.5 w-3.5 text-brand-accent" aria-hidden="true" />}
            {l.label}
            <ExternalLink className="h-3 w-3 text-gray-400" aria-hidden="true" />
          </a>
        ))}
      </div>
    );
  }

  return (
    <ul className={cn('divide-y divide-gray-100', className)}>
      {links.map((l) => (
        <li key={l.href + l.label} className="py-3 first:pt-0 last:pb-0">
          <a
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3"
          >
            <span
              className={cn(
                'mt-0.5 shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg',
                l.official ? 'bg-blue-50 text-brand-accent' : 'bg-gray-100 text-gray-500'
              )}
              aria-hidden="true"
            >
              {l.official ? <Landmark className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
            </span>
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-gray-900 group-hover:text-brand-accent transition-colors">{l.label}</span>
                <span
                  className={cn(
                    'text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded',
                    l.official ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
                  )}
                >
                  {l.official ? 'Official' : 'Nonpartisan guide'}
                </span>
              </span>
              {l.description && <span className="block text-sm text-gray-500 mt-0.5">{l.description}</span>}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
};

export default LinkList;
