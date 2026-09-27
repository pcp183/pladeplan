import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';

const isAccountRoute = createRouteMatcher(['/konto(.*)']);

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);

const withClerk = clerkMiddleware(async (auth, request) => {
  if (isAccountRoute(request)) await auth.protect();
});

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  if (request.nextUrl.pathname === '/api/stripe/webhook') return NextResponse.next();
  if (!hasClerk) return NextResponse.next();
  return withClerk(request, event);
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
