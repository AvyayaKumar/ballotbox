'use client';

import * as React from 'react';
import { MapPin, Phone } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { VotingLocation } from '@/lib/types';

export interface PollingCardProps {
  location: VotingLocation;
  onFlyTo?: () => void;
}

function parseTime(timeStr: string): Date | null {
  // e.g. "6:00 AM" or "8:00 PM"
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
}

function getOpenStatus(openTime: string, closeTime: string): { label: string; variant: 'success' | 'warning' | 'neutral' } {
  const now = new Date();
  const open = parseTime(openTime);
  const close = parseTime(closeTime);

  if (!open || !close) return { label: closeTime, variant: 'neutral' };

  if (now >= open && now < close) {
    const diffMs = close.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins <= 60) {
      return { label: `Closes in ${diffMins}m`, variant: 'warning' };
    }
    return { label: 'Open Now', variant: 'success' };
  }
  return { label: `Opens ${openTime}`, variant: 'neutral' };
}

const typeLabels: Record<VotingLocation['type'], string> = {
  polling: 'Polling Place',
  early: 'Early Voting',
  dropbox: 'Drop Box',
};

const typeBadgeVariants: Record<VotingLocation['type'], 'default' | 'success' | 'neutral'> = {
  polling: 'default',
  early: 'success',
  dropbox: 'neutral',
};

export const PollingCard: React.FC<PollingCardProps> = ({ location, onFlyTo }) => {
  const firstHours = location.hours[0];

  return (
    <Card variant="dark" className="space-y-4">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-xl font-bold text-white leading-snug">{location.name}</h3>
        <Badge variant={typeBadgeVariants[location.type]}>
          {typeLabels[location.type]}
        </Badge>
      </div>

      {/* Address */}
      <div className="flex items-start gap-2 text-brand-muted text-sm">
        <MapPin className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
        <span>{location.address}</span>
      </div>

      {/* Distance */}
      {location.distance && (
        <p className="text-brand-muted text-sm">{location.distance} away</p>
      )}

      {/* Hours & open status */}
      {firstHours && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-white text-sm">
            {firstHours.openTime} – {firstHours.closeTime}
          </span>
          {(() => {
            const status = getOpenStatus(firstHours.openTime, firstHours.closeTime);
            return (
              <Badge variant={status.variant}>{status.label}</Badge>
            );
          })()}
        </div>
      )}

      {/* Services */}
      {location.services.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {location.services.map((service) => (
            <Badge key={service} variant="neutral">
              {service}
            </Badge>
          ))}
        </div>
      )}

      {/* Phone */}
      {location.phone && (
        <a
          href={`tel:${location.phone}`}
          className="flex items-center gap-2 text-brand-muted hover:text-white text-sm transition-colors min-h-[48px]"
          aria-label={`Call ${location.name} at ${location.phone}`}
        >
          <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
          {location.phone}
        </a>
      )}

      {/* View on map link */}
      {onFlyTo && (
        <button
          type="button"
          onClick={onFlyTo}
          className="text-brand-accent text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent rounded"
        >
          View on map ↓
        </button>
      )}
    </Card>
  );
};

export default PollingCard;
