import { NextResponse } from 'next/server';
import { getBestModel } from '@/lib/anthropic';

export const dynamic = 'force-dynamic';

export async function GET() {
  const model = await getBestModel();
  return NextResponse.json({ model });
}
