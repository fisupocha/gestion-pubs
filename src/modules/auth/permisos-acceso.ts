export type RolAcceso = "admin" | "gestoria";

export const RUTAS_OPERATIVA_GESTORIA = [
  "/facturas-recibidas",
  "/facturas-emitidas",
  "/alquileres",
  "/gastos-bancarios",
  "/creditos",
  "/impuestos",
] as const;

export const RUTAS_MAESTROS_GESTORIA = [
  "/maestros/clasificacion",
  "/maestros/proveedores",
  "/maestros/clientes",
  "/maestros/varios",
  "/maestros/empresas",
  "/maestros/tipos",
  "/maestros/familias",
  "/maestros/subfamilias",
  "/maestros/bancos",
  "/maestros/formas-pago",
  "/maestros/tipos-iva",
  "/maestros/conceptos-gastos-bancarios",
] as const;

const RUTAS_GESTORIA = new Set<string>([
  ...RUTAS_OPERATIVA_GESTORIA,
  ...RUTAS_MAESTROS_GESTORIA,
]);

export const MODULOS_ADJUNTO_GESTORIA = new Set([
  "facturas-recibidas",
  "facturas-emitidas",
  "alquileres",
  "gastos-bancarios",
  "creditos",
  "impuestos",
]);

export function esRutaPermitidaGestoria(pathname: string) {
  return RUTAS_GESTORIA.has(pathname);
}

export function esRutaMaestrosGestoria(pathname: string) {
  return pathname.startsWith("/maestros/") && esRutaPermitidaGestoria(pathname);
}

export function puedeVerRuta(rol: RolAcceso | null, pathname: string) {
  if (pathname === "/login") {
    return true;
  }

  if (rol === "admin") {
    return true;
  }

  if (rol === "gestoria") {
    return esRutaPermitidaGestoria(pathname);
  }

  return false;
}

export function puedeVerAdjunto(rol: RolAcceso | null, ruta: string) {
  if (!rol || !ruta || ruta.includes("..") || ruta.includes("\\") || ruta.startsWith("/")) {
    return false;
  }

  const modulo = ruta.split("/")[0] ?? "";

  if (!modulo) {
    return false;
  }

  if (rol === "admin") {
    return true;
  }

  return MODULOS_ADJUNTO_GESTORIA.has(modulo);
}
