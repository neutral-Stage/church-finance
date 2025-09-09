import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Define route patterns
  const isAuthPage = request.nextUrl.pathname.startsWith('/auth/')
  const isHomePage = request.nextUrl.pathname === '/'
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') || 
    ['/transactions', '/bills', '/advances', '/offerings', '/ledger-entries', '/funds', '/members'].some(
      route => request.nextUrl.pathname.startsWith(route)
    )

  // Skip auth check for truly public routes (not auth pages, not home, not protected)
  if (!isAuthPage && !isHomePage && !isProtectedRoute) {
    return NextResponse.next()
  }

  // Check for authenticated session using minimal cookie
  let isAuthenticated = false
  try {
    const authCookie = request.cookies.get('church-auth-minimal')
    if (authCookie?.value) {
      const authData = JSON.parse(authCookie.value)
      // Check if token is still valid
      if (authData.expires_at && authData.expires_at > Math.floor(Date.now() / 1000)) {
        isAuthenticated = !!authData.user_id
      }
    }
  } catch (error) {
    // Auth check failed, treat as unauthenticated
    console.log('Middleware auth check error:', error)
    isAuthenticated = false
  }

  // Redirect unauthenticated users away from protected routes
  if (isProtectedRoute && !isAuthenticated) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/auth/login'
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users away from auth pages and homepage
  if ((isAuthPage || isHomePage) && isAuthenticated) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect unauthenticated users from homepage to login
  if (isHomePage && !isAuthenticated) {
    // Allow access to homepage for unauthenticated users
    // They can see the landing page but will be redirected by client-side logic if they become authenticated
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/ (API routes)
     * - Static assets (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}