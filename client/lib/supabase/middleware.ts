import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  const elderRoutes = ['/elder']
  const familyRoutes = ['/family']
  const workerRoutes = ['/worker']
  const authRoutes = ['/login', '/register', '/verify']

  // Redirect unauthenticated users away from protected routes
  if (
    !user &&
    (elderRoutes.some((r) => path.startsWith(r)) ||
      familyRoutes.some((r) => path.startsWith(r)) ||
      workerRoutes.some((r) => path.startsWith(r)))
  ) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect authenticated users away from auth routes
  if (user && authRoutes.some((r) => path.startsWith(r))) {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role === 'elder')
      return NextResponse.redirect(new URL('/elder/home', request.url))
    if (userData?.role === 'family')
      return NextResponse.redirect(new URL('/family/dashboard', request.url))
    if (userData?.role === 'worker')
      return NextResponse.redirect(new URL('/worker/jobs', request.url))
  }

  return supabaseResponse
}
