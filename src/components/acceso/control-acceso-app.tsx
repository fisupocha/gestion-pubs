"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

type ModoAcceso = "admin" | "gestoria";

type AccesoAppContextValue = {
  modo: ModoAcceso;
  esAdmin: boolean;
  esGestoria: boolean;
  activarAdmin: (clave: string) => boolean;
  salirAdmin: () => void;
};

const CLAVE_ADMIN = "1324";
const STORAGE_KEY = "gestion-pubs.modo-acceso";
const listeners = new Set<() => void>();
const RUTAS_OPERATIVA_GESTORIA = new Set([
  "/facturas-recibidas",
  "/alquileres",
  "/gastos-bancarios",
  "/creditos",
  "/impuestos",
  "/facturas-emitidas",
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

function leerModoAcceso(): ModoAcceso {
  if (typeof window === "undefined") {
    return "gestoria";
  }

  return window.localStorage.getItem(STORAGE_KEY) === "admin"
    ? "admin"
    : "gestoria";
}

function notificarCambioAcceso() {
  listeners.forEach((listener) => listener());
}

function suscribirAcceso(listener: () => void) {
  listeners.add(listener);

  const onStorage = () => {
    listener();
  };

  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function esRutaMaestros(pathname: string) {
  return pathname.startsWith("/maestros/");
}

function esRutaPermitidaGestoria(pathname: string) {
  return (
    pathname === "/login" ||
    RUTAS_OPERATIVA_GESTORIA.has(pathname) ||
    esRutaMaestros(pathname)
  );
}

function normalizarTextoBoton(button: HTMLButtonElement) {
  return (button.textContent ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function esBotonPermitidoGestoria(button: HTMLButtonElement, pathname: string) {
  if (button.type === "submit") {
    return false;
  }

  const texto = normalizarTextoBoton(button);
  const title = (button.getAttribute("title") ?? "").trim().toLowerCase();

  if (esRutaMaestros(pathname)) {
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

function FormularioAccesoAdmin({
  compacto = false,
}: {
  compacto?: boolean;
}) {
  const acceso = useAccesoApp();
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const ok = acceso.activarAdmin(clave.trim());

    if (ok) {
      setClave("");
      setError("");
      return;
    }

    setError("Clave incorrecta.");
  }

  return (
    <form onSubmit={enviar} className={compacto ? "grid gap-2" : "grid gap-3"}>
      <input
        type="password"
        value={clave}
        onChange={(e) => {
          setClave(e.target.value);
          if (error) {
            setError("");
          }
        }}
        placeholder="Clave de admin"
        className="w-full rounded-2xl border border-[#d8c2b6] bg-white px-4 py-2.5 text-sm text-[#3f2a23] outline-none"
      />
      <button
        type="submit"
        className="rounded-2xl border border-[#b9796d] bg-[linear-gradient(180deg,#f5e3dc_0%,#edd4cb_100%)] px-4 py-2.5 text-sm font-black text-[#5a3025]"
      >
        Entrar como admin
      </button>
      {error ? (
        <p className="text-xs font-semibold text-[#a13d2f]">{error}</p>
      ) : null}
    </form>
  );
}

function PantallaRutaBloqueada() {
  const pathname = usePathname();

  return (
    <section className="flex h-full min-h-0 items-center justify-center px-6 py-8">
      <div className="w-full max-w-2xl rounded-[30px] border border-[#dbc5bc] bg-[linear-gradient(180deg,#fffaf8_0%,#f4ece8_100%)] p-8 text-[#402a24] shadow-[0_24px_60px_rgba(85,52,46,0.10)]">
        <div className="text-center text-[11px] font-black uppercase tracking-[0.22em] text-[#8a6458]">
          Acceso restringido
        </div>
        <h1 className="mt-3 text-center text-3xl font-black tracking-tight">
          Esta zona es solo para admin
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-center text-sm leading-6 text-[#6d5249]">
          Con perfil de gestoría puedes consultar la operativa permitida y todos
          los maestros, pero esta pantalla queda bloqueada.
        </p>

        <div className="mt-6 rounded-[24px] border border-[#e4d1ca] bg-white/70 p-5">
          <FormularioAccesoAdmin />
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/facturas-recibidas"
            className="rounded-2xl border border-[#d4b8ad] bg-white px-4 py-2 text-sm font-bold text-[#5c4038]"
          >
            Ir a operativa
          </Link>
          <Link
            href="/maestros/varios"
            className="rounded-2xl border border-[#d4b8ad] bg-white px-4 py-2 text-sm font-bold text-[#5c4038]"
          >
            Ir a maestros
          </Link>
        </div>

        <p className="mt-5 text-center text-xs text-[#8b6c62]">
          Ruta actual: {pathname}
        </p>
      </div>
    </section>
  );
}

export function ProveedorAccesoApp({
  children,
}: {
  children: React.ReactNode;
}) {
  const modo = useSyncExternalStore<ModoAcceso>(
    suscribirAcceso,
    leerModoAcceso,
    () => "gestoria"
  );

  const value = useMemo<AccesoAppContextValue>(
    () => ({
      modo,
      esAdmin: modo === "admin",
      esGestoria: modo === "gestoria",
      activarAdmin: (clave) => {
        if (clave !== CLAVE_ADMIN) {
          return false;
        }

        window.localStorage.setItem(STORAGE_KEY, "admin");
        notificarCambioAcceso();
        return true;
      },
      salirAdmin: () => {
        window.localStorage.setItem(STORAGE_KEY, "gestoria");
        notificarCambioAcceso();
      },
    }),
    [modo]
  );

  return (
    <AccesoAppContext.Provider value={value}>
      {children}
    </AccesoAppContext.Provider>
  );
}

export function useAccesoApp() {
  const context = useContext(AccesoAppContext);

  if (!context) {
    throw new Error("useAccesoApp debe usarse dentro de ProveedorAccesoApp.");
  }

  return context;
}

export function MarcoContenidoApp({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const acceso = useAccesoApp();
  const bloqueada = acceso.esGestoria && !esRutaPermitidaGestoria(pathname);
  const gestoriaActiva = acceso.esGestoria && esRutaPermitidaGestoria(pathname);

  function bloquearSubmitGestoria(e: React.FormEvent<HTMLDivElement>) {
    if (!gestoriaActiva) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
  }

  function bloquearClicksGestoria(e: React.MouseEvent<HTMLDivElement>) {
    if (!gestoriaActiva) {
      return;
    }

    const target = e.target as HTMLElement | null;
    const button = target?.closest("button");

    if (!button) {
      return;
    }

    if (esBotonPermitidoGestoria(button, pathname)) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
  }

  if (bloqueada) {
    return (
      <main className="app-main">
        <div className="page-body">
          <PantallaRutaBloqueada />
        </div>
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
        {children}
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
        {acceso.esAdmin ? "Admin" : "Gestoria"}
      </div>

      {acceso.esAdmin ? (
        <button
          type="button"
          onClick={acceso.salirAdmin}
          className="mt-2 w-full rounded-xl border border-[#6e5647] bg-transparent px-3 py-2 text-sm font-bold text-[#ead6c0] transition hover:bg-[rgba(255,244,226,0.06)]"
        >
          Salir de admin
        </button>
      ) : (
        <div className="mt-2 grid gap-2">
          <Link
            href="/"
            className="w-full rounded-xl border border-[#6e5647] px-3 py-2 text-center text-sm font-bold text-[#ead6c0] transition hover:bg-[rgba(255,244,226,0.06)]"
          >
            Acceso admin
          </Link>
          <FormularioAccesoAdmin compacto />
        </div>
      )}
    </div>
  );
}
