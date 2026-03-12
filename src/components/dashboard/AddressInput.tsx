'use client';

import * as React from 'react';
import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { VoterInfo, GeocodeResult } from '@/lib/types';

export interface AddressInputProps {
  onResults: (voterInfo: VoterInfo, geocode: GeocodeResult) => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
}

export const AddressInput: React.FC<AddressInputProps> = ({
  onResults,
  isLoading,
  setIsLoading,
}) => {
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);

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
      const [pollingRes, geocodeRes] = await Promise.all([
        fetch('/api/polling', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: trimmed }),
        }),
        fetch('/api/geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: trimmed }),
        }),
      ]);

      if (!pollingRes.ok) {
        const data = (await pollingRes.json()) as { error?: string };
        throw new Error(data.error ?? 'Failed to fetch polling info.');
      }
      if (!geocodeRes.ok) {
        const data = (await geocodeRes.json()) as { error?: string };
        throw new Error(data.error ?? 'Failed to geocode address.');
      }

      const voterInfo = (await pollingRes.json()) as VoterInfo;
      const geocode = (await geocodeRes.json()) as GeocodeResult;
      onResults(voterInfo, geocode);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
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
        setError(`Location access denied: ${err.message}`);
        setIsLoading(false);
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4" noValidate>
      <div className="relative flex items-center">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter your address…"
          aria-label="Street address"
          aria-describedby="address-error"
          aria-invalid={!!error}
          className="w-full rounded-xl bg-brand-card border border-white/10 text-white placeholder-brand-muted py-4 px-5 pr-14 text-lg focus:outline-none focus:ring-2 focus:ring-brand-accent min-h-[48px]"
          disabled={isLoading}
          autoComplete="street-address"
        />
        <button
          type="button"
          onClick={handleGeolocation}
          disabled={isLoading}
          aria-label="Use my current location"
          className="absolute right-3 flex items-center justify-center w-10 h-10 min-h-[48px] min-w-[48px] text-brand-muted hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent rounded-lg disabled:opacity-50"
        >
          <MapPin className="h-5 w-5" aria-hidden="true" />
        </button>
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

      {error && (
        <p id="address-error" role="alert" className="text-red-400 text-sm mt-1">
          {error}
        </p>
      )}
    </form>
  );
};

export default AddressInput;
