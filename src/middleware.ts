import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { esRutaPermitidaGestoria } from "@/modules/auth/permisos-acceso";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({ request });

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const esLogin = request.nextUrl.pathname === "/login";

  if (!data.user && !esLogin) {
    return redirigirConSesion(request, response, "/login");
  }

  if (data.user && !esLogin) {
    const { data: perfil, error } = await supabase
      .from("perfiles")
      .select("rol")
      .eq("user_id", data.user.id)
      .maybeSingle();
    const rol = perfil?.rol;

    if (error || (rol !== "admin" && rol !== "gestoria")) {
      return redirigirConSesion(request, response, "/login");
    }

    if (rol === "gestoria" && !esRutaPermitidaGestoria(request.nextUrl.pathname)) {
      return redirigirConSesion(request, response, "/facturas-recibidas");
    }
  }

  return response;
}

function redirigirConSesion(request: NextRequest, response: NextResponse, pathname: string) {
  const destino = request.nextUrl.clone();
  destino.pathname = pathname;
  destino.search = "";
  const redireccion = NextResponse.redirect(destino);

  for (const cookie of response.cookies.getAll()) {
    redireccion.cookies.set(cookie);
  }

  return redireccion;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
