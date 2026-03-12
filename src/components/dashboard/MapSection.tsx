'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import Map, { Marker, Popup, type ViewState } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { cn } from '@/lib/utils';
import type { VotingLocation } from '@/lib/types';

export interface MapSectionProps {
  center: { lat: number; lng: number };
  flyToTarget: { lat: number; lng: number } | null;
  pollingLocations: VotingLocation[];
  earlyVoteSites: VotingLocation[];
  dropOffLocations: VotingLocation[];
  allLocations: VotingLocation[];
  activeLocationId: string | null;
  onActiveLocationChange: (id: string | null) => void;
}

type LayerKey = 'polling' | 'early' | 'dropbox';

const layerConfig: Record<LayerKey, { label: string; color: string; activeClass: string }> = {
  polling: { label: 'Polling Places', color: '#3B82F6', activeClass: 'bg-blue-600 text-white' },
  early:   { label: 'Early Voting',   color: '#22C55E', activeClass: 'bg-green-600 text-white' },
  dropbox: { label: 'Drop Boxes',     color: '#F97316', activeClass: 'bg-orange-500 text-white' },
};

// SVG teardrop pin marker
function PinMarker({ color, scale = 1 }: { color: string; scale?: number }) {
  const size = 32 * scale;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
      aria-hidden="true"
    >
      <path
        d="M16 2C10.477 2 6 6.477 6 12c0 7.5 10 24 10 24s10-16.5 10-24c0-5.523-4.477-10-10-10z"
        fill={color}
        stroke="white"
        strokeWidth="2"
      />
      <circle cx="16" cy="12" r="4" fill="white" />
    </svg>
  );
}

function getOpenStatus(openTime: string, closeTime: string): string {
  const now = new Date();
  const parseT = (t: string) => {
    const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12;
    if (m[3].toUpperCase() === 'AM' && h === 12) h = 0;
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, min);
  };
  const open = parseT(openTime);
  const close = parseT(closeTime);
  if (!open || !close) return closeTime || openTime;
  if (now >= open && now < close) return 'Open Now';
  return `Opens ${openTime}`;
}

export const MapSection: React.FC<MapSectionProps> = ({
  center,
  flyToTarget,
  pollingLocations,
  earlyVoteSites,
  dropOffLocations,
  allLocations,
  activeLocationId,
  onActiveLocationChange,
}) => {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const [viewState, setViewState] = useState<Partial<ViewState>>({
    longitude: center.lng,
    latitude: center.lat,
    zoom: 13,
  });

  const [visibleLayers, setVisibleLayers] = useState<Record<LayerKey, boolean>>({
    polling: true,
    early: true,
    dropbox: true,
  });

  // Re-center when a new search result arrives
  useEffect(() => {
    setViewState({
      longitude: center.lng,
      latitude: center.lat,
      zoom: 13,
      // @ts-expect-error transitionDuration is valid at runtime but not in ViewState type
      transitionDuration: 800,
    });
    onActiveLocationChange(null);
  }, [center.lat, center.lng, onActiveLocationChange]);

  // Fly to a specific location when triggered by card click
  useEffect(() => {
    if (!flyToTarget) return;
    const next = {
      longitude: flyToTarget.lng,
      latitude: flyToTarget.lat,
      zoom: 15,
      transitionDuration: 700,
    };
    setViewState((prev) => ({ ...prev, ...next }));
  }, [flyToTarget]);

  const toggleLayer = (key: LayerKey) => {
    setVisibleLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleMarkerClick = useCallback((locId: string) => {
    onActiveLocationChange(locId === activeLocationId ? null : locId);
  }, [activeLocationId, onActiveLocationChange]);

  const activeLocation = activeLocationId
    ? allLocations.find((l) => l.id === activeLocationId) ?? null
    : null;

  if (!token) {
    return (
      <div className="h-96 rounded-xl bg-brand-card border border-white/10 flex items-center justify-center">
        <p className="text-brand-muted text-sm text-center px-6">
          Map unavailable — <code className="font-mono">NEXT_PUBLIC_MAPBOX_TOKEN</code> is not configured.
        </p>
      </div>
    );
  }

  const locationsByType: Array<{ loc: VotingLocation; layer: LayerKey }> = [
    ...pollingLocations.map((loc) => ({ loc, layer: 'polling' as LayerKey })),
    ...earlyVoteSites.map((loc) => ({ loc, layer: 'early' as LayerKey })),
    ...dropOffLocations.map((loc) => ({ loc, layer: 'dropbox' as LayerKey })),
  ];

  return (
    <div className="space-y-3">
      {/* Layer toggle buttons */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Toggle map layers">
        {(Object.entries(layerConfig) as [LayerKey, typeof layerConfig[LayerKey]][]).map(([key, cfg]) => (
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
        ))}
      </div>

      {/* Map */}
      <div className="h-96 rounded-xl overflow-hidden border border-white/10">
        <Map
          {...viewState}
          onMove={(e) => setViewState(e.viewState)}
          mapboxAccessToken={token}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/outdoors-v12"
        >
          {/* Markers */}
          {locationsByType.map(({ loc, layer }) => {
            if (!visibleLayers[layer] || loc.lat === undefined || loc.lng === undefined) return null;
            const isActive = loc.id === activeLocationId;
            return (
              <Marker
                key={loc.id}
                longitude={loc.lng}
                latitude={loc.lat}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  handleMarkerClick(loc.id);
                }}
                style={{ cursor: 'pointer' }}
              >
                <PinMarker color={layerConfig[layer].color} scale={isActive ? 1.3 : 1} />
              </Marker>
            );
          })}

          {/* Popup for active location */}
          {activeLocation && activeLocation.lat !== undefined && activeLocation.lng !== undefined && (
            <Popup
              longitude={activeLocation.lng}
              latitude={activeLocation.lat}
              anchor="bottom"
              offset={[0, -36] as [number, number]}
              closeButton={false}
              closeOnClick={false}
              onClose={() => onActiveLocationChange(null)}
              className="ballotbox-popup"
            >
              <div
                role="dialog"
                aria-label={activeLocation.name}
                className="bg-[#1c1c1e] rounded-xl p-4 min-w-[200px] max-w-[260px] shadow-xl"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-white font-bold text-sm leading-tight">{activeLocation.name}</h3>
                  <button
                    type="button"
                    onClick={() => onActiveLocationChange(null)}
                    aria-label="Close popup"
                    className="text-gray-400 hover:text-white shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white rounded"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-gray-400 text-xs mb-3">{activeLocation.address}</p>
                {activeLocation.hours[0] && (
                  <p className="text-green-400 text-xs mb-3 font-medium">
                    {getOpenStatus(activeLocation.hours[0].openTime, activeLocation.hours[0].closeTime)}
                    {activeLocation.hours[0].closeTime
                      ? ` · ${activeLocation.hours[0].openTime}–${activeLocation.hours[0].closeTime}`
                      : ` · ${activeLocation.hours[0].openTime}`}
                  </p>
                )}
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(activeLocation.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors min-h-[36px] leading-5"
                >
                  Get Directions ↗
                </a>
              </div>
            </Popup>
          )}
        </Map>
      </div>
    </div>
  );
};

export default MapSection;
