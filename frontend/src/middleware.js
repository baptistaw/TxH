// src/middleware.js - Clerk Middleware para proteger rutas
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Rutas públicas que no requieren autenticación
const isPublicRoute = createRouteMatcher([
  '/', // Landing page
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/bootstrap(.*)',
  '/api/webhooks(.*)', // Webhooks de Clerk
]);

export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;

  // Redirigir /login y /sign-up a /sign-in
  if (pathname.startsWith('/login') || pathname.startsWith('/sign-up')) {
    return Response.redirect(new URL('/sign-in', req.url));
  }

  // Rutas públicas - no proteger
  if (isPublicRoute(req)) {
    return;
  }

  // Para rutas privadas, solo verificar que esté autenticado en Clerk
  // NO usar auth.protect() ya que puede causar loops con organizaciones
  const { userId } = await auth();

  if (!userId) {
    // No autenticado - redirigir a sign-in
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', pathname);
    return Response.redirect(signInUrl);
  }

  // Usuario autenticado - dejar pasar
  // La verificación de organización se hace en el cliente (ProtectedRoute)
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
