'use client';

import * as React from 'react';
import { useState } from 'react';
import { MapPin, Phone, ChevronDown, Info } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { VotingLocation } from '@/lib/types';
import { formatHoursLine, getOpenStatus, pickRelevantHours } from '@/lib/hours';
import { cn } from '@/lib/utils';

export interface PollingCardProps {
  location: VotingLocation;
  onFlyTo?: () => void;
}

const typeLabels: Record<VotingLocation['type'], string> = {
  polling: 'Election Day polling place',
  early: 'Early voting site',
  dropbox: 'Ballot drop box',
};

const typeBadgeVariants: Record<VotingLocation['type'], 'default' | 'success' | 'neutral'> = {
  polling: 'default',
  early: 'success',
  dropbox: 'neutral',
};

export const PollingCard: React.FC<PollingCardProps> = ({ location, onFlyTo }) => {
  const [showAllHours, setShowAllHours] = useState(false);
  const relevant = pickRelevantHours(location.hours);
  const status = getOpenStatus(relevant);
  const multiDay = location.hours.length > 1;

  return (
    <Card variant="dark" className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h4 className="text-lg font-bold text-white leading-snug">{location.name}</h4>
        <div className="flex items-center gap-2">
          {location.distance && <span className="text-xs text-brand-muted">{location.distance}</span>}
          <Badge variant={typeBadgeVariants[location.type]}>{typeLabels[location.type]}</Badge>
        </div>
      </div>

      {location.address && (
        <div className="flex items-start gap-2 text-brand-muted text-sm">
          <MapPin className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>{location.address}</span>
        </div>
      )}

      {/* Hours as published by election officials */}
      {relevant ? (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-white text-sm">{formatHoursLine(relevant)}</span>
            {status && <Badge variant={status.variant}>{status.label}</Badge>}
          </div>
          {multiDay && (
            <>
              <button
                type="button"
                onClick={() => setShowAllHours((v) => !v)}
                aria-expanded={showAllHours}
                className="mt-1 inline-flex items-center gap-1 text-xs text-brand-muted hover:text-white transition-colors"
              >
                {showAllHours ? 'Hide schedule' : `Full schedule (${location.hours.length} days)`}
                <ChevronDown className={cn('h-3 w-3 transition-transform', showAllHours && 'rotate-180')} aria-hidden="true" />
              </button>
              {showAllHours && (
                <ul className="mt-2 grid gap-0.5 sm:grid-cols-2 text-xs text-gray-300">
                  {location.hours.map((h, i) => (
                    <li key={i} className={cn(h === relevant && 'text-white font-medium')}>{formatHoursLine(h)}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      ) : (
        <p className="text-sm text-brand-muted">Hours not yet published. Check the official election site.</p>
      )}

      {location.notes && (
        <p className="flex items-start gap-2 text-xs text-gray-300">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-brand-muted" aria-hidden="true" />
          <span>{location.notes}</span>
        </p>
      )}

      {location.services.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {location.services.map((service) => (
            <Badge key={service} variant="neutral">{service}</Badge>
          ))}
        </div>
      )}

      {location.phone && (
        <a
          href={`tel:${location.phone}`}
          className="flex items-center gap-2 text-brand-muted hover:text-white text-sm transition-colors"
          aria-label={`Call ${location.name} at ${location.phone}`}
        >
          <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
          {location.phone}
        </a>
      )}

      <div className="flex flex-wrap items-center gap-4 pt-1">
        {onFlyTo && (
          <button
            type="button"
            onClick={onFlyTo}
            className="text-brand-accent text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent rounded"
          >
            View on map
          </button>
        )}
        {location.address && (
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(`${location.name}, ${location.address}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-accent text-sm font-medium hover:underline"
          >
            Directions
          </a>
        )}
      </div>
    </Card>
  );
};

export default PollingCard;
