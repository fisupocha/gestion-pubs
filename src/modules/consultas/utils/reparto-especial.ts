"use client";

import { supabase } from "@/lib/supabase";
import { exigirAdministrador } from "@/modules/auth/exigir-administrador";

export type RepartoEspecial = {
  movimientoId: string;
  origen: "facturas-emitidas" | "facturas-recibidas";
  registroId: number;
  meses: string[];
  updatedAt: string;
};

export type ListadoRepartosEspeciales = {
  repartos: RepartoEspecial[];
  disponible: boolean;
  mensaje: string | null;
};

const TABLA_REPARTOS_ESPECIALES = "consultas_repartos_especiales";
const MES_VALIDO = /^\d{4}-(0[1-9]|1[0-2])$/;

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizarMesesReparto(value: unknown) {
  const lista = Array.isArray(value) ? value : [];
  return [...new Set(lista.map((item) => String(item ?? "").trim()).filter((item) => MES_VALIDO.test(item)))].sort();
}

export function validarMesesReparto(meses: string[]) {
  if (meses.length === 0) return "Selecciona al menos un mes.";
  const vistos = new Set<string>();
  for (const mes of meses) {
    if (!MES_VALIDO.test(mes)) return "Hay un mes que no es válido.";
    if (vistos.has(mes)) return "Hay meses repetidos.";
    vistos.add(mes);
  }
  return null;
}

function normalizarOrigen(value: unknown): RepartoEspecial["origen"] | null {
  if (value === "facturas-emitidas" || value === "facturas-recibidas") return value;
  return null;
}

function normalizarReparto(value: unknown): RepartoEspecial | null {
  if (typeof value !== "object" || value === null) return null;
  const input = value as Record<string, unknown>;
  const movimientoId = String(input.movimientoId ?? "").trim();
  const origen = normalizarOrigen(input.origen);
  const registroId = toNumber(input.registroId);
  const meses = normalizarMesesReparto(input.meses);
  if (!movimientoId || !origen || registroId <= 0 || meses.length === 0) return null;
  return {
    movimientoId,
    origen,
    registroId,
    meses,
    updatedAt: String(input.updatedAt ?? new Date().toISOString()),
  };
}

function desdeFila(row: Record<string, unknown>) {
  return normalizarReparto({
    movimientoId: row.movimiento_id,
    origen: row.origen,
    registroId: row.registro_id,
    meses: row.meses,
    updatedAt: row.updated_at,
  });
}

function mensajePersistencia(error: { message?: string } | null) {
  const texto = error?.message ?? "";
  if (
    texto.toLowerCase().includes("consultas_repartos_especiales") ||
    texto.toLowerCase().includes("schema cache") ||
    texto.toLowerCase().includes("does not exist")
  ) {
    return "La tabla de repartos especiales todavía no está creada en Supabase. La migración está preparada y no se ha ejecutado.";
  }
  return texto
    ? `No se pudo usar la persistencia de repartos especiales: ${texto}`
    : "No se pudo usar la persistencia de repartos especiales.";
}

export async function listarRepartosEspeciales(): Promise<ListadoRepartosEspeciales> {
  try {
    const { data, error } = await supabase
      .from(TABLA_REPARTOS_ESPECIALES)
      .select("movimiento_id, origen, registro_id, meses, updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      return { repartos: [], disponible: false, mensaje: mensajePersistencia(error) };
    }

    const repartos = (data ?? [])
      .map((row) => desdeFila(row as unknown as Record<string, unknown>))
      .filter((item): item is RepartoEspecial => item !== null);

    return { repartos, disponible: true, mensaje: null };
  } catch (error) {
    return {
      repartos: [],
      disponible: false,
      mensaje: mensajePersistencia(error instanceof Error ? error : null),
    };
  }
}

export async function guardarRepartoEspecial(reparto: RepartoEspecial) {
  await exigirAdministrador();
  const normalizado = normalizarReparto(reparto);
  const errorMeses = validarMesesReparto(normalizado?.meses ?? reparto.meses);
  if (!normalizado || errorMeses) {
    throw new Error(errorMeses ?? "El reparto especial no es válido.");
  }

  const { error } = await supabase.from(TABLA_REPARTOS_ESPECIALES).upsert(
    {
      movimiento_id: normalizado.movimientoId,
      origen: normalizado.origen,
      registro_id: normalizado.registroId,
      meses: normalizado.meses,
      updated_at: normalizado.updatedAt,
    },
    { onConflict: "movimiento_id" }
  );

  if (error) {
    throw new Error(mensajePersistencia(error));
  }

  return normalizado;
}

export async function eliminarRepartoEspecial(movimientoId: string) {
  await exigirAdministrador();
  const { error } = await supabase
    .from(TABLA_REPARTOS_ESPECIALES)
    .delete()
    .eq("movimiento_id", movimientoId);

  if (error) {
    throw new Error(mensajePersistencia(error));
  }
}
