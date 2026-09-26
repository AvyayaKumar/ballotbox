import { NextRequest, NextResponse } from 'next/server';
import { getElectionsData } from '@/lib/elections-api';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { address, state } = body as { address?: unknown; state?: unknown };

  if (!address || typeof address !== 'string' || address.trim().length === 0) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }
  if (!state || typeof state !== 'string') {
    return NextResponse.json({ error: 'State is required' }, { status: 400 });
  }

  try {
    const data = await getElectionsData(address.trim(), state.trim().toUpperCase());
    return NextResponse.json(data);
  } catch (error) {
    console.error('[api/elections]', error);
    return NextResponse.json({ error: 'Failed to fetch elections data' }, { status: 500 });
  }
}
