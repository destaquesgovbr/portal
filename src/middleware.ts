import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@/auth'

export default auth((request: NextRequest) => {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
})

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
}
