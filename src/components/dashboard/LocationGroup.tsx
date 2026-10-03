'use client';

import * as React from 'react';
import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import PollingCard from './PollingCard';
import type { VotingLocation } from '@/lib/types';

export interface LocationGroupProps {
  title: string;
  description: string;
  locations: VotingLocation[];
  /** Total published by officials, before the nearest-N cap. */
  total: number;
  /** Official tool for the complete list, when the cap is in effect. */
  finderUrl?: string;
  onFlyTo: (locationId: string, lat: number, lng: number) => void;
  initialVisible?: number;
}

/** One category of voting location (Election Day, early voting, drop boxes) with progressive disclosure. */
export const LocationGroup: React.FC<LocationGroupProps> = ({
  title,
  description,
  locations,
  total,
  finderUrl,
  onFlyTo,
  initialVisible = 3,
}) => {
  const [expanded, setExpanded] = useState(false);
  if (locations.length === 0) return null;
  const visible = expanded ? locations : locations.slice(0, initialVisible);
  const hiddenCount = locations.length - visible.length;
  const truncated = total > locations.length;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h4 className="text-base font-semibold text-gray-900">
          {title} <span className="text-sm font-normal text-gray-500">({total})</span>
        </h4>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <div className="space-y-3">
        {visible.map((loc) => (
          <PollingCard
            key={loc.id}
            location={loc}
            onFlyTo={loc.lat !== undefined && loc.lng !== undefined ? () => onFlyTo(loc.id, loc.lat as number, loc.lng as number) : undefined}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
        {hiddenCount > 0 && (
          <button type="button" onClick={() => setExpanded(true)} className="font-medium text-brand-accent hover:underline">
            Show {hiddenCount} more nearby
          </button>
        )}
        {expanded && locations.length > initialVisible && (
          <button type="button" onClick={() => setExpanded(false)} className="font-medium text-gray-500 hover:underline">
            Show fewer
          </button>
        )}
        {truncated && (
          <span className="text-gray-500">
            Showing the {locations.length} nearest of {total}.
            {finderUrl && (
              <>
                {' '}
                <a href={finderUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-brand-accent hover:underline">
                  Full official list <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </>
            )}
          </span>
        )}
      </div>
    </div>
  );
};

export default LocationGroup;
