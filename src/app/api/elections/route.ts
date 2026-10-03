import { NextRequest, NextResponse } from 'next/server';
import { getElectionsForAddress } from '@/lib/elections-api';
import { CivicApiError } from '@/lib/civic-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RequestBody {
  address?: unknown;
  state?: unknown;
  lat?: unknown;
  lng?: unknown;
  includeTestElection?: unknown;
}

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * POST { address, state?, lat?, lng? }
 * Returns every election officials currently publish for this address, with where to vote in each.
 * Data is fetched live from election officials on every request and never stored.
 */
export async function POST(request: NextRequest) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { address, state, lat, lng, includeTestElection } = body;

  if (!address || typeof address !== 'string' || address.trim().length === 0) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }
  if (address.trim().length > 500) {
    return NextResponse.json({ error: 'Address too long (max 500 characters)' }, { status: 400 });
  }
  const stateCode = typeof state === 'string' && /^[A-Za-z]{2}$/.test(state.trim()) ? state.trim().toUpperCase() : undefined;
  const origin = isFiniteNumber(lat) && isFiniteNumber(lng) ? { lat, lng } : undefined;
  // The VIP test election is only ever surfaced outside production.
  const allowTest = process.env.NODE_ENV !== 'production' && includeTestElection === true;

  try {
    const data = await getElectionsForAddress(address.trim(), { stateCode, origin, includeTestElection: allowTest });
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof CivicApiError && error.status === 400) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[api/elections]', error);
    return NextResponse.json({ error: 'Could not reach election officials’ data right now. Please try again.' }, { status: 502 });
  }
}
