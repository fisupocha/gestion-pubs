"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { PantallaLogin } from "@/modules/auth/components/pantalla-login";
import { recordarRolSesion } from "@/modules/auth/exigir-administrador";
import {
  esRutaMaestrosGestoria,
  esRutaPermitidaGestoria,
  type RolAcceso,
} from "@/modules/auth/permisos-acceso";
import { supabase } from "@/lib/supabase";

type AccesoAppContextValue = {
  listo: boolean;
  sesionIniciada: boolean;
  esAdmin: boolean;
  esGestoria: boolean;
  correo: string | null;
  mensaje: string;
  cerrarSesion: () => Promise<void>;
};

const CLAVE_ACCESO_ANTIGUA = "gestion-pubs.modo-acceso";
const RUTAS_OPERATIVA_GESTORIA = new Set([
  "/facturas-recibidas",
  "/facturas-emitidas",
  "/alquileres",
  "/gastos-bancarios",
  "/creditos",
  "/impuestos",
]);
const TEXTOS_GESTORIA_OPERATIVA_PERMITIDOS = new Set([
  "<<",
  "<",
  ">",
  ">>",
  "ver",
  "cerrar",
  "cancelar",
]);
const TITULOS_GESTORIA_OPERATIVA_PERMITIDOS = new Set([
  "primer registro",
  "anterior",
  "siguiente",
  "ultimo registro",
]);
const AccesoAppContext = createContext<AccesoAppContextValue | null>(null);

function normalizarTextoBoton(button: HTMLButtonElement) {
  return (button.textContent ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

function esBotonPermitidoGestoria(button: HTMLButtonElement, pathname: string) {
  if (button.type === "submit") {
    return false;
  }

  const texto = normalizarTextoBoton(button);
  const title = (button.getAttribute("title") ?? "").trim().toLowerCase();

  if (esRutaMaestrosGestoria(pathname)) {
    return !(
      texto.includes("nuevo") ||
      texto.includes("nueva") ||
      texto.includes("guardar") ||
      texto.includes("eliminar")
    );
  }

  if (RUTAS_OPERATIVA_GESTORIA.has(pathname)) {
    return (
      TEXTOS_GESTORIA_OPERATIVA_PERMITIDOS.has(texto) ||
      TITULOS_GESTORIA_OPERATIVA_PERMITIDOS.has(title)
    );
  }

  return false;
}

async function leerRol(userId: string): Promise<{ ok: true; rol: RolAcceso } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("user_id", userId)
    .maybeSingle();

    if (error) {
    const texto = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();

    if (error.code === "PGRST301" || texto.includes("jwt") || texto.includes("expired")) {
      return {
        ok: false,
        error: "",
      };
    }

    if (texto.includes("perfiles") || error.code === "PGRST205" || error.code === "42P01") {
      return {
        ok: false,
        error: "El acceso todavía no está activado. No se ha cargado ningún dato.",
      };
    }

    return {
      ok: false,
      error: "No se ha podido comprobar el permiso. No se ha cargado ningún dato.",
    };
  }

  if (data?.rol === "admin" || data?.rol === "gestoria") {
    return { ok: true, rol: data.rol };
  }

  return {
    ok: false,
    error: "Esta cuenta no tiene un perfil autorizado. No se ha cargado ningún dato.",
  };
}

function PantallaRutaBloqueada() {
  return (
    <section className="flex h-full min-h-0 items-center justify-center px-6 py-8">
      <div className="w-full max-w-2xl rounded-[30px] border border-[#dbc5bc] bg-[linear-gradient(180deg,#fffaf8_0%,#f4ece8_100%)] p-8 text-[#402a24] shadow-[0_24px_60px_rgba(85,52,46,0.10)]">
        <div className="text-center text-[11px] font-black uppercase tracking-[0.22em] text-[#8a6458]">
          Acceso restringido
        </div>
        <h1 className="mt-3 text-center text-3xl font-black tracking-tight">
          Esta zona no está disponible para Gestoría
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-center text-sm leading-6 text-[#6d5249]">
          Puedes consultar las facturas autorizadas y los maestros. El resto de la
          aplicación queda fuera de este acceso.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/facturas-recibidas"
            className="rounded-2xl border border-[#d4b8ad] bg-white px-4 py-2 text-sm font-bold text-[#5c4038]"
          >
            Ir a facturas
          </Link>
          <Link
            href="/maestros/proveedores"
            className="rounded-2xl border border-[#d4b8ad] bg-white px-4 py-2 text-sm font-bold text-[#5c4038]"
          >
            Ir a maestros
          </Link>
        </div>
      </div>
    </section>
  );
}

export function ProveedorAccesoApp({ children }: { children: React.ReactNode }) {
  const [fase, setFase] = useState<"cargando" | "anon" | "error" | "listo">("cargando");
  const [rol, setRol] = useState<RolAcceso | null>(null);
  const [correo, setCorreo] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState("");

  const aplicarSesion = useCallback(async (session: { user: { id: string; email?: string } } | null) => {
    if (!session) {
      recordarRolSesion(null);
      setRol(null);
      setCorreo(null);
      setMensaje("");
      setFase("anon");
      return;
    }

    const resultado = await leerRol(session.user.id);

    if (!resultado.ok) {
      recordarRolSesion(null);
      setRol(null);
      setCorreo(session.user.email ?? null);
      setMensaje(resultado.error);
      setFase(resultado.error ? "error" : "anon");

      if (!resultado.error) {
        await supabase.auth.signOut();
      }

      return;
    }

    recordarRolSesion(resultado.rol);
    setRol(resultado.rol);
    setCorreo(session.user.email ?? null);
    setMensaje("");
    setFase("listo");
  }, []);

  useEffect(() => {
    window.localStorage.removeItem(CLAVE_ACCESO_ANTIGUA);
    let activo = true;

    void supabase.auth.getUser().then(async ({ data, error }) => {
      if (!activo) {
        return;
      }

      if (error || !data.user) {
        await aplicarSesion(null);
        return;
      }

      const { data: sesion } = await supabase.auth.getSession();

      if (activo) {
        await aplicarSesion(sesion.session);
      }
    });

    const { data: suscripcion } = supabase.auth.onAuthStateChange((_evento, session) => {
      if (!activo) {
        return;
      }

      setTimeout(() => {
        if (activo) {
          void aplicarSesion(session);
        }
      }, 0);
    });

    return () => {
      activo = false;
      suscripcion.subscription.unsubscribe();
    };
  }, [aplicarSesion]);

  const cerrarSesion = useCallback(async () => {
    recordarRolSesion(null);
    setRol(null);
    setCorreo(null);
    setMensaje("");
    setFase("anon");
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AccesoAppContextValue>(
    () => ({
      listo: fase !== "cargando",
      sesionIniciada: fase === "listo",
      esAdmin: rol === "admin",
      esGestoria: rol === "gestoria",
      correo,
      mensaje,
      cerrarSesion,
    }),
    [cerrarSesion, correo, fase, mensaje, rol]
  );

  return <AccesoAppContext.Provider value={value}>{children}</AccesoAppContext.Provider>;
}

export function useAccesoApp() {
  const acceso = useContext(AccesoAppContext);

  if (!acceso) {
    throw new Error("useAccesoApp debe usarse dentro de ProveedorAccesoApp.");
  }

  return acceso;
}

export function MarcoContenidoApp({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const acceso = useAccesoApp();
  const bloqueada = acceso.esGestoria && !esRutaPermitidaGestoria(pathname);
  const gestoriaActiva = acceso.esGestoria && esRutaPermitidaGestoria(pathname);

  useEffect(() => {
    if (!acceso.sesionIniciada) {
      return;
    }

    if (pathname === "/login") {
      router.replace(acceso.esGestoria ? "/facturas-recibidas" : "/");
      return;
    }

    if (acceso.esGestoria && !esRutaPermitidaGestoria(pathname)) {
      router.replace("/facturas-recibidas");
    }
  }, [acceso.esGestoria, acceso.sesionIniciada, pathname, router]);

  function bloquearClicksGestoria(event: React.MouseEvent<HTMLDivElement>) {
    if (!gestoriaActiva) {
      return;
    }

    const button = (event.target as HTMLElement | null)?.closest("button");

    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    if (esBotonPermitidoGestoria(button, pathname)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  }

  function bloquearSubmitGestoria(event: React.FormEvent<HTMLDivElement>) {
    if (!gestoriaActiva) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  }

  if (!acceso.listo) {
    return (
      <main className="app-main">
        <p className="px-6 py-10 text-center text-sm font-semibold text-[#6d5249]">
          Comprobando el acceso...
        </p>
      </main>
    );
  }

  if (acceso.sesionIniciada && pathname === "/login") {
    return (
      <main className="app-main">
        <p className="px-6 py-10 text-center text-sm font-semibold text-[#6d5249]">
          Entrando...
        </p>
      </main>
    );
  }

  if (!acceso.sesionIniciada) {
    return (
      <main className="app-main">
        {acceso.mensaje ? (
          <section className="mx-auto flex min-h-[70vh] max-w-xl items-center px-6 py-10">
            <div className="w-full rounded-[30px] border border-[#dbc5bc] bg-white p-8 text-center text-[#402a24]">
              <h1 className="text-2xl font-black">Acceso no disponible</h1>
              <p className="mt-3 text-sm leading-6">{acceso.mensaje}</p>
              <button
                type="button"
                onClick={() => void acceso.cerrarSesion()}
                className="mt-6 rounded-2xl border border-[#b9796d] px-4 py-2 text-sm font-bold"
              >
                Volver
              </button>
            </div>
          </section>
        ) : (
          <PantallaLogin />
        )}
      </main>
    );
  }

  return (
    <main className="app-main">
      <div
        className="page-body"
        data-readonly-lock={gestoriaActiva ? "true" : "false"}
        onClickCapture={bloquearClicksGestoria}
        onSubmitCapture={bloquearSubmitGestoria}
      >
        {bloqueada ? <PantallaRutaBloqueada /> : children}
      </div>
    </main>
  );
}

export function ResumenAccesoMenu() {
  const acceso = useAccesoApp();

  return (
    <div className="mt-1.5 rounded-[18px] border border-[rgba(224,195,158,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0.015)_100%)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="text-center text-[9px] font-black uppercase tracking-[0.24em] text-[#c7ae8d]">
        Acceso
      </div>
      <div className="mt-2 rounded-xl border border-[#5e4638] bg-[linear-gradient(180deg,#3a2b23_0%,#2b2019_100%)] px-3 py-2 text-center text-sm font-bold text-[#f3e6d7]">
        {acceso.esAdmin ? "Administrador" : "Gestoría"}
      </div>
      {acceso.correo ? (
        <p className="mt-2 break-all px-1 text-center text-[11px] leading-4 text-[#c7ae8d]">
          {acceso.correo}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void acceso.cerrarSesion()}
        className="mt-2 w-full rounded-xl border border-[#6e5647] bg-transparent px-3 py-2 text-sm font-bold text-[#ead6c0] transition hover:bg-[rgba(255,244,226,0.06)]"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
