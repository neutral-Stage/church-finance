import { NextResponse, type NextRequest } from 'next/server'
import { handleDemoApiRequest } from '@/lib/demo/handle-demo-api'
import { DEMO_MINIMAL_AUTH, demoSelectedChurchJson } from '@/lib/demo/constants'

const isDemoMode = () => process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

export async function middleware(request: NextRequest) {
  if (isDemoMode() && request.nextUrl.pathname.startsWith('/api/')) {
    const demoRes = handleDemoApiRequest(request)
    if (demoRes) return demoRes
    return NextResponse.next()
  }

  const isAuthPage = request.nextUrl.pathname.startsWith('/auth/')
  const isHomePage = request.nextUrl.pathname === '/'
  const protectedPrefixes = [
    '/dashboard',
    '/admin',
    '/transactions',
    '/bills',
    '/advances',
    '/offerings',
    '/ledger-entries',
    '/funds',
    '/members',
    '/reports',
    '/notifications',
    '/preferences',
    '/cash-breakdown',
    '/member-contributions',
    '/profile-settings',
  ]
  const isProtectedRoute = protectedPrefixes.some((p) =>
    request.nextUrl.pathname.startsWith(p)
  )

  if (!isAuthPage && !isHomePage && !isProtectedRoute) {
    return applyDemoCookiesIfNeeded(request, NextResponse.next())
  }

  let isAuthenticated = false
  try {
    const authCookie = request.cookies.get('church-auth-minimal')
    if (authCookie?.value) {
      const authData = JSON.parse(authCookie.value)
      if (authData.expires_at && authData.expires_at > Math.floor(Date.now() / 1000)) {
        isAuthenticated = !!authData.user_id
      }
    }
  } catch {
    isAuthenticated = false
  }

  if (isDemoMode()) {
    isAuthenticated = true
  }

  if (isProtectedRoute && !isAuthenticated) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/auth/login'
    return NextResponse.redirect(redirectUrl)
  }

  if ((isAuthPage || isHomePage) && isAuthenticated) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    return applyDemoCookiesIfNeeded(request, NextResponse.redirect(redirectUrl))
  }

  if (isHomePage && !isAuthenticated) {
    return applyDemoCookiesIfNeeded(request, NextResponse.next())
  }

  return applyDemoCookiesIfNeeded(request, NextResponse.next())
}

/** Seed demo auth + church cookies on first visit so client and server agree. */
function applyDemoCookiesIfNeeded(request: NextRequest, res: NextResponse): NextResponse {
  if (!isDemoMode()) return res
  if (!request.cookies.get('church-auth-minimal')) {
    res.cookies.set('church-auth-minimal', JSON.stringify(DEMO_MINIMAL_AUTH), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    })
  }
  if (!request.cookies.get('selectedChurch')) {
    res.cookies.set('selectedChurch', demoSelectedChurchJson(), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
  }
  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
