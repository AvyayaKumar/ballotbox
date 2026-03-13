'use client';

import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import Map, { Marker, Popup } from 'react-map-gl/mapbox';
import type { MapRef, ViewState } from 'react-map-gl/mapbox';
import type mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { cn } from '@/lib/utils';
import type { VotingLocation } from '@/lib/types';

export interface MapSectionProps {
  center: { lat: number; lng: number };
  pollingLocations: VotingLocation[];
  earlyVoteSites: VotingLocation[];
  dropOffLocations: VotingLocation[];
  allLocations: VotingLocation[];
  flyToTarget: { lat: number; lng: number } | null;
  activeLocationId: string | null;
  onActiveLocationChange: (id: string | null) => void;
}

type LayerKey = 'polling' | 'early' | 'dropbox';

const layerConfig: Record<LayerKey, { label: string; color: string; activeClass: string }> = {
  polling: { label: 'Polling Places', color: '#3B82F6', activeClass: 'bg-blue-600 text-white' },
  early: { label: 'Early Voting', color: '#22C55E', activeClass: 'bg-green-600 text-white' },
  dropbox: { label: 'Drop Boxes', color: '#F97316', activeClass: 'bg-orange-500 text-white' },
};

interface MapPinProps {
  color: string;
  label: string;
  isActive: boolean;
}

const MapPin: React.FC<MapPinProps> = ({ color, label, isActive }) => {
  const width = isActive ? 35 : 28;
  const height = isActive ? 45 : 36;
  return (
    <div style={{ position: 'relative', width, height }}>
      {isActive && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: width * 2,
            height: width * 2,
            borderRadius: '50%',
            backgroundColor: color,
            opacity: 0.25,
            animation: 'pulse-ring 1.5s ease-out infinite',
          }}
        />
      )}
      <svg
        role="img"
        aria-label={label}
        width={width}
        height={height}
        viewBox="0 0 28 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M14 0C6.268 0 0 6.268 0 14c0 9.941 14 22 14 22S28 23.941 28 14C28 6.268 21.732 0 14 0z"
          fill={color}
          stroke="white"
          strokeWidth="2"
        />
        <circle cx="14" cy="14" r="5" fill="white" fillOpacity="0.8" />
      </svg>
    </div>
  );
};

export const MapSection: React.FC<MapSectionProps> = ({
  center,
  pollingLocations,
  earlyVoteSites,
  dropOffLocations,
  allLocations,
  flyToTarget,
  activeLocationId,
  onActiveLocationChange,
}) => {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const mapRef = useRef<MapRef>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const isFlyingRef = useRef(false);
  const moveendHandlerRef = useRef<(() => void) | null>(null);

  const [viewState, setViewState] = useState<ViewState>({
    longitude: center.lng,
    latitude: center.lat,
    zoom: 13,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
  });

  // Re-center when a new search fires, but not during an active flyTo animation
  useEffect(() => {
    if (isFlyingRef.current) return;
    setViewState((prev) => ({
      ...prev,
      longitude: center.lng,
      latitude: center.lat,
      zoom: 13,
    }));
  }, [center.lat, center.lng]);

  useEffect(() => {
    if (!flyToTarget || !mapRef.current) return;
    isFlyingRef.current = true;
    mapRef.current.flyTo({
      center: [flyToTarget.lng, flyToTarget.lat],
      zoom: 15,
      duration: 800,
    });
  }, [flyToTarget]);

  const handleMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    mapInstanceRef.current = map;
    const handler = () => { isFlyingRef.current = false; };
    moveendHandlerRef.current = handler;
    map.on('moveend', handler);
  }, []);

  // Cleanup moveend listener on unmount
  useEffect(() => {
    return () => {
      const map = mapInstanceRef.current;
      const handler = moveendHandlerRef.current;
      if (map && handler) map.off('moveend', handler);
    };
  }, []);

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

  const taggedLocations: Array<{ loc: VotingLocation; layer: LayerKey }> = [
    ...pollingLocations.map((loc) => ({ loc, layer: 'polling' as LayerKey })),
    ...earlyVoteSites.map((loc) => ({ loc, layer: 'early' as LayerKey })),
    ...dropOffLocations.map((loc) => ({ loc, layer: 'dropbox' as LayerKey })),
  ];

  return (
    <>
      <style>{`
        @keyframes pulse-ring {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.4; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
      `}</style>
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
            ref={mapRef}
            mapboxAccessToken={token}
            {...viewState}
            onMove={(evt) => setViewState(evt.viewState)}
            onLoad={handleMapLoad}
            style={{ width: '100%', height: '100%' }}
            mapStyle="mapbox://styles/mapbox/outdoors-v12"
          >
            {taggedLocations.map(({ loc, layer }) => {
              if (!visibleLayers[layer] || loc.lat === undefined || loc.lng === undefined) {
                return null;
              }
              return (
                <Marker
                  key={loc.id}
                  longitude={loc.lng}
                  latitude={loc.lat}
                  anchor="bottom"
                  onClick={() => {
                    onActiveLocationChange(loc.id);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <MapPin
                    color={layerConfig[layer].color}
                    label={loc.name}
                    isActive={loc.id === activeLocationId}
                  />
                </Marker>
              );
            })}
          </Map>
        </div>
      </div>
    </>
  );
};

export default MapSection;
