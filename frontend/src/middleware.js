// src/middleware.js - Clerk Middleware para proteger rutas
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Rutas públicas que no requieren autenticación
// NOTA: sign-up está deshabilitado - solo admins pueden crear usuarios
const isPublicRoute = createRouteMatcher([
  '/', // Landing page
  '/sign-in(.*)',
  '/api/webhooks(.*)', // Webhooks de Clerk
]);

export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;

  // Redirigir /login y /sign-up a /sign-in (sign-up deshabilitado)
  if (pathname.startsWith('/login') || pathname.startsWith('/sign-up')) {
    return Response.redirect(new URL('/sign-in', req.url));
  }

  // Landing page es pública (verificación explícita)
  if (pathname === '/') {
    return;
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
