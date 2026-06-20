import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ─── Demo Session Cookie Parser ─────────────────────────────

function parseDemoCookie(request: NextRequest): { role: string } | null {
  try {
    const cookie = request.cookies.get("demo_session");
    if (!cookie?.value) return null;
    const parsed = JSON.parse(decodeURIComponent(cookie.value));
    if (parsed && typeof parsed.role === "string") {
      return { role: parsed.role };
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Main Middleware ────────────────────────────────────────

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Public routes that don't need auth
  const publicPaths = ["/", "/login", "/signup", "/auth/callback", "/r/"];
  const isPublicPath = publicPaths.some((path) =>
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith("/r/")
  );
  const isApiPath = request.nextUrl.pathname.startsWith("/api/");

  if (isPublicPath || isApiPath) {
    return supabaseResponse;
  }

  // Check for authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check for demo session
  const demoSession = parseDemoCookie(request);

  // Neither Supabase user nor demo session → redirect to login
  if (!user && !demoSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Role-based route protection is handled client-side by RouteGuard
  // which shows a beautiful "restricted access" page instead of redirecting

  return supabaseResponse;
}

