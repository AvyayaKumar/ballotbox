'use client';

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { VoterInfo, GeocodeResult } from '@/lib/types';

export interface AddressInputProps {
  onResults: (voterInfo: VoterInfo, geocode: GeocodeResult) => void;
  onClear: () => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
}

export const AddressInput: React.FC<AddressInputProps> = ({
  onResults,
  onClear,
  isLoading,
  setIsLoading,
}) => {
  const [address, setAddress] = useState('');
  const [resolvedCoords, setResolvedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Load Places API and attach Autocomplete once on mount
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !inputRef.current) return;

    setOptions({ key: apiKey, v: 'weekly' });

    let active = true;
    importLibrary('places').then(() => {
      if (!active || !inputRef.current) return;
      const ac = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        fields: ['formatted_address', 'geometry'],
      });
      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (place.geometry?.location && place.formatted_address) {
          setAddress(place.formatted_address);
          setResolvedCoords({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          });
          setError(null);
        }
      });
      autocompleteRef.current = ac;
    }).catch(() => {
      // Places failed to load — input still works, just no autocomplete
    });

    return () => {
      active = false;
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = address.trim();
    if (!trimmed) {
      setError('Please enter your address.');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      let geocode: GeocodeResult;

      if (resolvedCoords) {
        // Coordinates already known from Places selection — skip geocode API call
        geocode = {
          lat: resolvedCoords.lat,
          lng: resolvedCoords.lng,
          formattedAddress: trimmed,
        };
      } else {
        // User typed manually without selecting a suggestion — geocode to get coords
        const geocodeRes = await fetch('/api/geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: trimmed }),
        });
        if (!geocodeRes.ok) {
          const data = (await geocodeRes.json()) as { error?: string };
          throw new Error(data.error ?? 'Failed to geocode address.');
        }
        geocode = (await geocodeRes.json()) as GeocodeResult;
      }

      const pollingRes = await fetch('/api/polling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: trimmed }),
      });
      if (!pollingRes.ok) {
        const data = (await pollingRes.json()) as { error?: string };
        throw new Error(data.error ?? 'Failed to fetch polling info.');
      }
      const voterInfo = (await pollingRes.json()) as VoterInfo;
      onResults(voterInfo, geocode);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setIsLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const coordString = `${latitude},${longitude}`;
          const geocodeRes = await fetch('/api/geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: coordString }),
          });
          if (!geocodeRes.ok) {
            const data = (await geocodeRes.json()) as { error?: string };
            throw new Error(data.error ?? 'Failed to reverse geocode location.');
          }
          const geocode = (await geocodeRes.json()) as GeocodeResult;
          setAddress(geocode.formattedAddress);
          setResolvedCoords({ lat: geocode.lat, lng: geocode.lng });

          const pollingRes = await fetch('/api/polling', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: geocode.formattedAddress }),
          });
          if (!pollingRes.ok) {
            const data = (await pollingRes.json()) as { error?: string };
            throw new Error(data.error ?? 'Failed to fetch polling info.');
          }
          const voterInfo = (await pollingRes.json()) as VoterInfo;
          onResults(voterInfo, geocode);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to get location.');
        } finally {
          setIsLoading(false);
        }
      },
      (err) => {
        const msg = err.code === 1
          ? `Location access denied: ${err.message}`
          : `Could not get location: ${err.message}`;
        setError(msg);
        setIsLoading(false);
      }
    );
  };

  const handleClear = () => {
    setAddress('');
    setResolvedCoords(null);
    setError(null);
    onClear();
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4" noValidate>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            // Clear resolved coords if user edits manually after a Places selection
            if (resolvedCoords) setResolvedCoords(null);
          }}
          placeholder="Enter your home address…"
          aria-label="Street address"
          aria-describedby="address-error"
          aria-invalid={!!error}
          className="w-full rounded-xl bg-brand-card border border-white/10 text-white placeholder-brand-muted py-4 px-5 pr-24 text-lg focus:outline-none focus:ring-2 focus:ring-brand-accent min-h-[48px]"
          disabled={isLoading}
          autoComplete="off"
        />
        <div className="absolute right-3 flex items-center gap-1">
          {address && (
            <button
              type="button"
              onClick={handleClear}
              disabled={isLoading}
              aria-label="Clear address"
              className="flex items-center justify-center w-8 h-8 text-brand-muted hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent rounded-lg disabled:opacity-50"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={handleGeolocation}
            disabled={isLoading}
            aria-label="Use my current location"
            className="flex items-center justify-center w-10 h-10 min-h-[48px] min-w-[48px] text-brand-muted hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent rounded-lg disabled:opacity-50"
          >
            <MapPin className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={isLoading}
        aria-busy={isLoading}
      >
        {isLoading ? 'Searching…' : 'Find My Polling Place'}
      </Button>

      <p id="address-error" role="alert" aria-live="polite" className="text-red-400 text-sm mt-1 min-h-[1.25rem]">
        {error ?? ''}
      </p>
    </form>
  );
};

export default AddressInput;
