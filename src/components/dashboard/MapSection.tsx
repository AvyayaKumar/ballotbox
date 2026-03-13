'use client';

import * as React from 'react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import type { Marker as LeafletMarker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
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
  early:   { label: 'Early Voting',   color: '#22C55E', activeClass: 'bg-green-600 text-white' },
  dropbox: { label: 'Drop Boxes',     color: '#F97316', activeClass: 'bg-orange-500 text-white' },
};

const badgeColors: Record<'success' | 'warning' | 'neutral', string> = {
  success: '#22C55E',
  warning: '#F59E0B',
  neutral: '#6B7280',
};

// Build a Leaflet DivIcon with the teardrop SVG pin shape.
// Uses require() to avoid importing Leaflet at module load time (SSR safety).
function createPinIcon(color: string, isActive: boolean) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require('leaflet');
  const w = isActive ? 35 : 28;
  const h = isActive ? 45 : 36;
  const pulse = isActive
    ? `<span style="position:absolute;top:50%;left:50%;width:${w * 2}px;height:${w * 2}px;
        transform:translate(-50%,-50%);border-radius:50%;background:${color};opacity:0.25;
        animation:pulse-ring 1.5s ease-out infinite;pointer-events:none;"></span>`
    : '';
  return L.divIcon({
    html: `<div style="position:relative;width:${w}px;height:${h}px;">${pulse}
      <svg width="${w}" height="${h}" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 0C6.268 0 0 6.268 0 14c0 9.941 14 22 14 22S28 23.941 28 14C28 6.268 21.732 0 14 0z"
          fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="14" cy="14" r="5" fill="white" fill-opacity="0.8"/>
      </svg></div>`,
    className: '',
    iconSize: [w, h],
    iconAnchor: [w / 2, h],       // tip of pin aligns with coordinate
    popupAnchor: [0, -(h + 4)],   // popup opens above the pin
  });
}

function parseTime(timeStr: string): Date | null {
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
    const diffMins = Math.round((close.getTime() - now.getTime()) / 60000);
    if (diffMins <= 60) return { label: `Closes in ${diffMins}m`, variant: 'warning' };
    return { label: 'Open Now', variant: 'success' };
  }
  return { label: `Opens ${openTime}`, variant: 'neutral' };
}

// Inner component: must live inside <MapContainer> to use useMap().
// Handles re-centering on new searches, flyTo on card clicks, and moveend cleanup.
interface MapControllerProps {
  center: { lat: number; lng: number };
  flyToTarget: { lat: number; lng: number } | null;
  activeLocationId: string | null;
  markerRefs: React.MutableRefObject<Record<string, LeafletMarker | null>>;
  isFlyingRef: React.MutableRefObject<boolean>;
}

function MapController({ center, flyToTarget, activeLocationId, markerRefs, isFlyingRef }: MapControllerProps) {
  const map = useMap();

  // Register moveend to reset the flying guard
  useEffect(() => {
    const handler = () => { isFlyingRef.current = false; };
    map.on('moveend', handler);
    return () => { map.off('moveend', handler); };
  }, [map, isFlyingRef]);

  // Re-center when a new search fires (skipped during active flyTo)
  useEffect(() => {
    if (isFlyingRef.current) return;
    map.setView([center.lat, center.lng], 13);
  }, [center.lat, center.lng, map, isFlyingRef]);

  // Fly to a specific pin when a card is clicked
  useEffect(() => {
    if (!flyToTarget) return;
    isFlyingRef.current = true;
    map.flyTo([flyToTarget.lat, flyToTarget.lng], 15, { duration: 0.8 });
  }, [flyToTarget, map, isFlyingRef]);

  // Open the popup for whichever marker is active
  useEffect(() => {
    if (activeLocationId) {
      markerRefs.current[activeLocationId]?.openPopup();
    } else {
      map.closePopup();
    }
  }, [activeLocationId, markerRefs, map]);

  return null;
}

export const MapSection: React.FC<MapSectionProps> = ({
  center,
  pollingLocations,
  earlyVoteSites,
  dropOffLocations,
  flyToTarget,
  activeLocationId,
  onActiveLocationChange,
}) => {
  // Prevent Leaflet from rendering during SSR (it requires window)
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const isFlyingRef = useRef(false);
  const markerRefs = useRef<Record<string, LeafletMarker | null>>({});

  const [visibleLayers, setVisibleLayers] = useState<Record<LayerKey, boolean>>({
    polling: true,
    early: true,
    dropbox: true,
  });

  const toggleLayer = useCallback((key: LayerKey) => {
    setVisibleLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handlePopupClose = useCallback(() => {
    onActiveLocationChange(null);
  }, [onActiveLocationChange]);

  const taggedLocations = useMemo(
    () => [
      ...pollingLocations.map((loc) => ({ loc, layer: 'polling' as LayerKey })),
      ...earlyVoteSites.map((loc) => ({ loc, layer: 'early' as LayerKey })),
      ...dropOffLocations.map((loc) => ({ loc, layer: 'dropbox' as LayerKey })),
    ],
    [pollingLocations, earlyVoteSites, dropOffLocations]
  );

  return (
    <>
      <style>{`
        @keyframes pulse-ring {
          0%   { transform: translate(-50%, -50%) scale(0.5); opacity: 0.4; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
        .leaflet-container { font-family: inherit; }
        .leaflet-popup-content-wrapper {
          border-radius: 10px;
          padding: 0;
          box-shadow: 0 4px 20px rgba(0,0,0,0.18);
        }
        .leaflet-popup-content { margin: 0; }
        .leaflet-popup-tip { display: none; }
        .leaflet-popup-close-button { display: none; }
      `}</style>

      <div className="h-[500px] rounded-xl overflow-hidden border border-white/10 relative">
        {/* Overlaid layer toggle buttons */}
        <div
          className="absolute top-3 left-3 z-[1000] flex gap-2 backdrop-blur-sm"
          role="group"
          aria-label="Toggle map layers"
        >
          {(Object.entries(layerConfig) as [LayerKey, typeof layerConfig[LayerKey]][]).map(([key, cfg]) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleLayer(key)}
              aria-pressed={visibleLayers[key]}
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-full border transition-colors flex items-center gap-1.5',
                visibleLayers[key]
                  ? cfg.activeClass + ' border-transparent'
                  : 'bg-white/80 text-gray-800 border-gray-300 hover:bg-white'
              )}
            >
              <span aria-hidden="true" style={{ backgroundColor: cfg.color }} className="w-2 h-2 rounded-full shrink-0" />
              {cfg.label}
            </button>
          ))}
        </div>

        {/* Skeleton shown during SSR / before mount */}
        {!mounted && (
          <div className="w-full h-full bg-gray-100 animate-pulse" />
        )}

        {mounted && (
          <MapContainer
            center={[center.lat, center.lng]}
            zoom={13}
            style={{ width: '100%', height: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
            />

            <MapController
              center={center}
              flyToTarget={flyToTarget}
              activeLocationId={activeLocationId}
              markerRefs={markerRefs}
              isFlyingRef={isFlyingRef}
            />

            {taggedLocations.map(({ loc, layer }) => {
              if (!visibleLayers[layer] || loc.lat === undefined || loc.lng === undefined) return null;
              const isActive = loc.id === activeLocationId;
              const firstHour = loc.hours[0];

              return (
                <Marker
                  key={loc.id}
                  position={[loc.lat, loc.lng]}
                  icon={createPinIcon(layerConfig[layer].color, isActive)}
                  ref={(m) => { markerRefs.current[loc.id] = m; }}
                  eventHandlers={{
                    click: () => onActiveLocationChange(loc.id),
                    popupclose: handlePopupClose,
                  }}
                >
                  <Popup closeButton={false}>
                    <div style={{ minWidth: 220, maxWidth: 280, padding: '14px 16px', fontFamily: 'inherit', position: 'relative' }}>
                      <button
                        type="button"
                        onClick={handlePopupClose}
                        aria-label="Close popup"
                        style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#6B7280', lineHeight: 1 }}
                      >✕</button>

                      <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, paddingRight: 22 }}>{loc.name}</p>

                      <p title={loc.address} style={{ fontSize: 12, color: '#6B7280', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {loc.address}
                      </p>

                      {firstHour ? (() => {
                        const status = getOpenStatus(firstHour.openTime, firstHour.closeTime);
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                            <span style={{ fontSize: 12 }}>{firstHour.openTime} – {firstHour.closeTime}</span>
                            <span style={{ fontSize: 11, color: 'white', backgroundColor: badgeColors[status.variant], borderRadius: 4, padding: '1px 6px' }}>
                              {status.label}
                            </span>
                          </div>
                        );
                      })() : (
                        <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 10 }}>See official site</p>
                      )}

                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(loc.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-block', fontSize: 12, color: '#1D4ED8', fontWeight: 600, textDecoration: 'none' }}
                      >
                        Get Directions →
                      </a>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}
      </div>
    </>
  );
};

export default MapSection;
