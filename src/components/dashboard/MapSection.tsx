'use client';

import * as React from 'react';
import { useState } from 'react';
import Map, { Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { cn } from '@/lib/utils';
import type { VotingLocation } from '@/lib/types';

export interface MapSectionProps {
  center: { lat: number; lng: number };
  pollingLocations: VotingLocation[];
  earlyVoteSites: VotingLocation[];
  dropOffLocations: VotingLocation[];
}

type LayerKey = 'polling' | 'early' | 'dropbox';

const layerConfig: Record<LayerKey, { label: string; color: string; activeClass: string }> = {
  polling: { label: 'Polling Places', color: '#3B82F6', activeClass: 'bg-blue-600 text-white' },
  early: { label: 'Early Voting', color: '#22C55E', activeClass: 'bg-green-600 text-white' },
  dropbox: { label: 'Drop Boxes', color: '#F97316', activeClass: 'bg-orange-500 text-white' },
};

interface MarkerDotProps {
  color: string;
  label: string;
}

const MarkerDot: React.FC<MarkerDotProps> = ({ color, label }) => (
  <div
    role="img"
    aria-label={label}
    style={{ backgroundColor: color }}
    className="w-4 h-4 rounded-full border-2 border-white shadow-md"
  />
);

export const MapSection: React.FC<MapSectionProps> = ({
  center,
  pollingLocations,
  earlyVoteSites,
  dropOffLocations,
}) => {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const [visibleLayers, setVisibleLayers] = useState<Record<LayerKey, boolean>>({
    polling: true,
    early: true,
    dropbox: true,
  });

  const toggleLayer = (key: LayerKey) => {
    setVisibleLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!token) {
    return (
      <div className="h-96 rounded-xl bg-brand-card border border-white/10 flex items-center justify-center">
        <p className="text-brand-muted text-sm text-center px-6">
          Map unavailable — <code className="font-mono">NEXT_PUBLIC_MAPBOX_TOKEN</code> is not configured.
        </p>
      </div>
    );
  }

  const allLocations: Array<{ loc: VotingLocation; layer: LayerKey }> = [
    ...pollingLocations.map((loc) => ({ loc, layer: 'polling' as LayerKey })),
    ...earlyVoteSites.map((loc) => ({ loc, layer: 'early' as LayerKey })),
    ...dropOffLocations.map((loc) => ({ loc, layer: 'dropbox' as LayerKey })),
  ];

  return (
    <div className="space-y-3">
      {/* Layer toggle buttons */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Toggle map layers">
        {(Object.entries(layerConfig) as [LayerKey, typeof layerConfig[LayerKey]][]).map(
          ([key, cfg]) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleLayer(key)}
              aria-pressed={visibleLayers[key]}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-colors min-h-[48px] border',
                visibleLayers[key]
                  ? cfg.activeClass + ' border-transparent'
                  : 'bg-brand-card text-brand-muted border-white/10 hover:border-white/30'
              )}
            >
              {cfg.label}
            </button>
          )
        )}
      </div>

      {/* Map container */}
      <div className="h-96 rounded-xl overflow-hidden border border-white/10">
        <Map
          mapboxAccessToken={token}
          initialViewState={{
            longitude: center.lng,
            latitude: center.lat,
            zoom: 13,
          }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/dark-v11"
        >
          {allLocations.map(({ loc, layer }) => {
            if (!visibleLayers[layer] || loc.lat === undefined || loc.lng === undefined) {
              return null;
            }
            return (
              <Marker
                key={loc.id}
                longitude={loc.lng}
                latitude={loc.lat}
                anchor="center"
              >
                <MarkerDot
                  color={layerConfig[layer].color}
                  label={loc.name}
                />
              </Marker>
            );
          })}
        </Map>
      </div>
    </div>
  );
};

export default MapSection;
