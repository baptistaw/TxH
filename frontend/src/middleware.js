// src/middleware.js - Clerk Middleware para proteger rutas
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Rutas públicas que no requieren autenticación
const isPublicRoute = createRouteMatcher([
  '/', // Landing page
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/login(.*)', // Redirigir a sign-in
  '/api/webhooks(.*)', // Webhooks de Clerk
]);

export default clerkMiddleware(async (auth, req) => {
  // Redirigir /login a /sign-in
  if (req.nextUrl.pathname.startsWith('/login')) {
    return Response.redirect(new URL('/sign-in', req.url));
  }

  // Proteger rutas privadas
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
