export const LOCALES_PUNTEO = ["Tarantino", "Hangar", "Cue", "Riverocio", "Fisu"] as const;

export type LocalPunteo = (typeof LOCALES_PUNTEO)[number];

export type FiltroLocal = "todos" | "sin-asignar" | LocalPunteo;

export const COLUMNAS_ORDEN_PUNTEO = [
  "orden_banco",
  "fecha_operacion",
  "fecha_valor",
  "importe",
  "concepto",
  "observaciones",
  "local",
  "estado",
] as const;

export type ColumnaOrdenPunteo = (typeof COLUMNAS_ORDEN_PUNTEO)[number];

export type AmbitoConsulta = "ordinarios" | "tpv";

const AUTORIZADOS = new Set<string>(LOCALES_PUNTEO);

export function localParaGuardar(valor: string | null):
  | { ok: true; local: LocalPunteo | null }
  | { ok: false; motivo: string } {
  const texto = valor === null ? "" : valor.trim();

  if (texto === "") {
    return { ok: true, local: null };
  }

  if (!AUTORIZADOS.has(texto)) {
    return { ok: false, motivo: "El local no está autorizado." };
  }

  return { ok: true, local: texto as LocalPunteo };
}

export function encajaFiltroLocal(local: LocalPunteo | null, filtro: FiltroLocal) {
  if (filtro === "todos") {
    return true;
  }

  if (filtro === "sin-asignar") {
    return local === null;
  }

  return local === filtro;
}

export function planGuardarLocal(movimientoId: number, valor: string | null) {
  const local = localParaGuardar(valor);

  if (!local.ok) {
    return local;
  }

  return {
    ok: true as const,
    local: local.local,
    llamada: {
      funcion: "punteo_guardar_local" as const,
      p_movimiento_id: movimientoId,
      p_local: local.local,
    },
  };
}
