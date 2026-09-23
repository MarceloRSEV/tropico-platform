import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_ROUTES = ["/dashboard", "/crm", "/campaigns", "/analysis", "/suggestions", "/settings"];
const AUTH_ROUTES = ["/login"];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Proteção por senha para /relatorio (independente do Supabase)
  if (pathname.startsWith('/relatorio') && !pathname.startsWith('/relatorio/login')) {
    const session = request.cookies.get('tropico_session')?.value
    const pdfToken = request.nextUrl.searchParams.get('pdfToken')
    const validPdfToken = process.env.PDF_TOKEN && pdfToken === process.env.PDF_TOKEN
    if (session !== process.env.SESSION_SECRET && !validPdfToken) {
      const url = request.nextUrl.clone()
      url.pathname = '/relatorio/login'
      return NextResponse.redirect(url)
    }
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Verifica sessão usando apenas cookies locais (sem chamada remota ao Supabase)
  const authToken = request.cookies.get('sb-auth-token')?.value;
  const user = authToken ? { authenticated: true } : null;

  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  // Redireciona para login se rota protegida e sem sessão
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redireciona para dashboard se já autenticado e tentando acessar login
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
