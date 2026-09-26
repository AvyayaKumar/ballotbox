import type { GeocodeResult } from './types';

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error('Server configuration error: geocoding unavailable');

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', address);
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Geocoding HTTP error: ${res.status}`);

  const data = await res.json();
  if (data.status !== 'OK' || !data.results?.[0]) {
    throw new Error(`Geocoding failed: ${data.status}`);
  }

  const result = data.results[0];
  const components: Array<{ long_name: string; short_name: string; types: string[] }> =
    result.address_components ?? [];

  const stateComp = components.find((c) => c.types.includes('administrative_area_level_1'));
  const cityComp = components.find(
    (c) => c.types.includes('locality') || c.types.includes('sublocality')
  );

  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    formattedAddress: result.formatted_address,
    state: stateComp?.short_name,
    stateName: stateComp?.long_name,
    city: cityComp?.long_name,
  };
}
