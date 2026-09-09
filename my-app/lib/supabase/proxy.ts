import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "./env";

/** Rotas que nao exigem login. */
const PUBLIC_PATHS = ["/login", "/auth"];

/**
 * Renova a sessao do Supabase a cada request e redireciona para /login
 * quem tentar acessar uma rota protegida sem estar autenticado.
 * Chamado pelo proxy.ts da raiz.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Sem env configurado ainda: nao bloqueia nada (permite ver o app com mock).
  if (!supabaseConfigured) return response;

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/obras";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
