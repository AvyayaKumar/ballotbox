import { NextRequest, NextResponse } from 'next/server';
import { getVoterInfo } from '@/lib/civic-api';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { address } = body as { address?: unknown };

  if (!address || typeof address !== 'string' || address.trim().length === 0) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }

  if (address.trim().length > 500) {
    return NextResponse.json({ error: 'Address too long (max 500 characters)' }, { status: 400 });
  }

  try {
    const voterInfo = await getVoterInfo(address.trim());
    return NextResponse.json(voterInfo);
  } catch (error) {
    console.error('[api/polling]', error);
    return NextResponse.json({ error: 'Failed to fetch voter info' }, { status: 500 });
  }
}
