import { loadSheetPrices } from '@/lib/sheet-prices';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  const book = await loadSheetPrices();
  const cacheControl =
    book.ok && !book.stale
      ? 'public, s-maxage=21600, stale-while-revalidate=86400'
      : 'no-store';
  return Response.json(book, {
    headers: { 'Cache-Control': cacheControl },
  });
}
