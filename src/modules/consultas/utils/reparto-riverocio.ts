"use client";

import { supabase } from "@/lib/supabase";

export type RepartoRiverocioManual = {
  movimientoId: string;
  origen: string;
  registroId: number;
  porcentajes: Record<string, number>;
  updatedAt: string;
};

const STORAGE_KEY = "gestion-pubs:reparto-riverocio-manual";
const TABLA_REPARTO_RIVEROCIO = "consultas_reparto_riverocio";

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizarPorcentajes(value: unknown) {
  const input =
    typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

  return Object.fromEntries(
    Object.entries(input)
      .map(([local, porcentaje]) => [local, toNumber(porcentaje)])
      .filter(([local]) => String(local).trim() !== "")
  );
}

function normalizarReparto(value: unknown): RepartoRiverocioManual | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const input = value as Record<string, unknown>;
  const movimientoId = String(input.movimientoId ?? "").trim();
  const origen = String(input.origen ?? "").trim();
  const registroId = toNumber(input.registroId);

  if (!movimientoId || !origen || registroId <= 0) {
    return null;
  }

  return {
    movimientoId,
    origen,
    registroId,
    porcentajes: normalizarPorcentajes(input.porcentajes),
    updatedAt: String(input.updatedAt ?? new Date().toISOString()),
  };
}

function leerLocal() {
  if (typeof window === "undefined") {
    return [] as RepartoRiverocioManual[];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => normalizarReparto(item))
      .filter(Boolean) as RepartoRiverocioManual[];
  } catch {
    return [];
  }
}

function guardarLocal(repartos: RepartoRiverocioManual[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(repartos));
  } catch {
    // no-op
  }
}

function upsertLocal(reparto: RepartoRiverocioManual) {
  const actuales = leerLocal();
  const siguientes = [
    ...actuales.filter((item) => item.movimientoId !== reparto.movimientoId),
    reparto,
  ];
  guardarLocal(siguientes);
  return siguientes;
}

function removeLocal(movimientoId: string) {
  const siguientes = leerLocal().filter((item) => item.movimientoId !== movimientoId);
  guardarLocal(siguientes);
  return siguientes;
}

function desdeFila(row: Record<string, unknown>): RepartoRiverocioManual | null {
  return normalizarReparto({
    movimientoId: row.movimiento_id,
    origen: row.origen,
    registroId: row.registro_id,
    porcentajes: row.porcentajes,
    updatedAt: row.updated_at,
  });
}

export async function listarRepartosRiverocioManuales() {
  const respaldoLocal = leerLocal();

  try {
    const { data, error } = await supabase
      .from(TABLA_REPARTO_RIVEROCIO)
      .select("movimiento_id, origen, registro_id, porcentajes, updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      return respaldoLocal;
    }

    const repartos = (data ?? [])
      .map((row) => desdeFila(row as unknown as Record<string, unknown>))
      .filter(Boolean) as RepartoRiverocioManual[];

    guardarLocal(repartos);
    return repartos;
  } catch {
    return respaldoLocal;
  }
}

export async function guardarRepartoRiverocioManual(
  reparto: RepartoRiverocioManual
) {
  const normalizado = normalizarReparto(reparto);
  if (!normalizado) {
    throw new Error("Reparto Riverocio invalido");
  }

  upsertLocal(normalizado);

  try {
    const { error } = await supabase.from(TABLA_REPARTO_RIVEROCIO).upsert(
      {
        movimiento_id: normalizado.movimientoId,
        origen: normalizado.origen,
        registro_id: normalizado.registroId,
        porcentajes: normalizado.porcentajes,
        updated_at: normalizado.updatedAt,
      },
      { onConflict: "movimiento_id" }
    );

    if (error) {
      return normalizado;
    }

    return normalizado;
  } catch {
    return normalizado;
  }
}

export async function eliminarRepartoRiverocioManual(movimientoId: string) {
  removeLocal(movimientoId);

  try {
    await supabase.from(TABLA_REPARTO_RIVEROCIO).delete().eq("movimiento_id", movimientoId);
  } catch {
    // no-op
  }
}
