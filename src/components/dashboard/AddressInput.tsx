'use client';

import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { VoterInfo, GeocodeResult } from '@/lib/types';

export interface AddressInputProps {
  onResults: (voterInfo: VoterInfo, geocode: GeocodeResult) => void;
  onClear: () => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
}

type Prediction = { description: string; place_id: string };

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if ((window as any).__googleMapsLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (document.getElementById('gmaps-script')) {
      // already injected — wait for it
      const check = setInterval(() => {
        if ((window as any).__googleMapsLoaded) { clearInterval(check); resolve(); }
      }, 50);
      return;
    }
    (window as any).initGoogleMaps = () => {
      (window as any).__googleMapsLoaded = true;
      resolve();
    };
    const script = document.createElement('script');
    script.id = 'gmaps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps&loading=async`;
    script.async = true;
    script.defer = true;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export const AddressInput: React.FC<AddressInputProps> = ({
  onResults,
  onClear,
  isLoading,
  setIsLoading,
}) => {
  const [address, setAddress] = useState('');
  const [resolvedGeocode, setResolvedGeocode] = useState<GeocodeResult | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;
    loadGoogleMaps(apiKey).then(() => {
      if (google?.maps?.places?.AutocompleteService) {
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
      }
    }).catch(() => {});
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchPredictions = useCallback((value: string) => {
    if (!autocompleteServiceRef.current || value.length < 3) {
      setPredictions([]);
      return;
    }
    autocompleteServiceRef.current.getPlacePredictions(
      { input: value, types: ['address'], componentRestrictions: { country: 'us' } },
      (preds, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && preds) {
          setPredictions(preds.map((p) => ({ description: p.description, place_id: p.place_id })));
          setShowSuggestions(true);
        } else {
          setPredictions([]);
        }
      }
    );
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddress(value);
    setResolvedGeocode(null); // clear resolved if user types manually
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(value), 250);
  };

  const selectPrediction = useCallback((pred: Prediction) => {
    setAddress(pred.description);
    setPredictions([]);
    setShowSuggestions(false);

    // Get full place details to extract lat/lng + state
    const placesService = new google.maps.places.PlacesService(document.createElement('div'));
    placesService.getDetails(
      { placeId: pred.place_id, fields: ['geometry', 'formatted_address', 'address_components'] },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const components = place.address_components ?? [];
          const stateComp = components.find((c) => c.types.includes('administrative_area_level_1'));
          const cityComp = components.find((c) => c.types.includes('locality') || c.types.includes('sublocality'));
          setResolvedGeocode({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            formattedAddress: place.formatted_address ?? pred.description,
            state: stateComp?.short_name,
            stateName: stateComp?.long_name,
            city: cityComp?.long_name,
          });
        }
      }
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = address.trim();
    if (!trimmed) { setError('Please enter your address.'); return; }
    setError(null);
    setIsLoading(true);
    setShowSuggestions(false);

    try {
      let geocode: GeocodeResult;

      if (resolvedGeocode) {
        geocode = resolvedGeocode;
      } else {
        const geocodeRes = await fetch('/api/geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: trimmed }),
        });
        if (!geocodeRes.ok) {
          const data = (await geocodeRes.json()) as { error?: string };
          throw new Error(data.error ?? 'Address not found.');
        }
        geocode = (await geocodeRes.json()) as GeocodeResult;
      }

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(
        msg.toLowerCase().includes('zero_results') || msg.toLowerCase().includes('not found')
          ? 'Address not found. Try your full address, e.g. "123 Main St, San Francisco, CA 94102".'
          : msg
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeolocation = () => {
    if (!navigator.geolocation) { setError('Geolocation is not supported by your browser.'); return; }
    setIsLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const geocodeRes = await fetch('/api/geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: `${latitude},${longitude}` }),
          });
          if (!geocodeRes.ok) throw new Error('Failed to reverse geocode location.');
          const geocode = (await geocodeRes.json()) as GeocodeResult;
          setAddress(geocode.formattedAddress);
          setResolvedGeocode(geocode);

          const pollingRes = await fetch('/api/polling', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: geocode.formattedAddress }),
          });
          if (!pollingRes.ok) throw new Error('Failed to fetch polling info.');
          const voterInfo = (await pollingRes.json()) as VoterInfo;
          onResults(voterInfo, geocode);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to get location.');
        } finally {
          setIsLoading(false);
        }
      },
      (err) => {
        setError(err.code === 1 ? 'Location access denied.' : 'Could not get location.');
        setIsLoading(false);
      }
    );
  };

  const handleClear = () => {
    setAddress('');
    setResolvedGeocode(null);
    setPredictions([]);
    setError(null);
    onClear();
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4" noValidate>
      <div ref={wrapperRef} className="relative">
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={address}
            onChange={handleInputChange}
            onFocus={() => predictions.length > 0 && setShowSuggestions(true)}
            placeholder="e.g. 123 Main St, San Francisco, CA 94102"
            aria-label="Street address"
            aria-describedby="address-error"
            aria-invalid={!!error}
            aria-autocomplete="list"
            aria-expanded={showSuggestions}
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

        {/* Suggestions dropdown */}
        {showSuggestions && predictions.length > 0 && (
          <ul
            role="listbox"
            className="absolute z-50 w-full mt-1 bg-brand-card border border-white/10 rounded-xl shadow-xl overflow-hidden"
          >
            {predictions.map((pred) => (
              <li
                key={pred.place_id}
                role="option"
                aria-selected={false}
                onMouseDown={(e) => { e.preventDefault(); selectPrediction(pred); }}
                className="px-4 py-3 text-sm text-gray-200 hover:bg-white/10 cursor-pointer transition-colors"
              >
                {pred.description}
              </li>
            ))}
          </ul>
        )}
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
