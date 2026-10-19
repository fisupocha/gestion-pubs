"use client";

import { aCentimos, formatearCentimos } from "@/modules/punteo-banco/centimos";
import { formatearFechaIso } from "@/modules/punteo-banco/modelo";
import type { UltimoMovimientoOficial } from "@/modules/punteo-banco/acceso-oficial";
import type { ReferenciaMovimiento } from "@/modules/punteo-banco/referencias-iniciales";

type ReferenciaRegistradaProps =
  | { modo: "local"; referencia: ReferenciaMovimiento }
  | { modo: "oficial"; ultimo: UltimoMovimientoOficial | null; cargando: boolean };

export function ReferenciaRegistrada(props: ReferenciaRegistradaProps) {
  const texto =
    props.modo === "local"
      ? `${formatearFechaIso(props.referencia.fecha)} · ${props.referencia.concepto} · ${formatearCentimos(aCentimos(props.referencia.importe))} € · Saldo ${formatearCentimos(aCentimos(props.referencia.saldo))} €`
      : props.cargando
        ? "Cargando el último movimiento…"
        : props.ultimo
          ? `${formatearFechaIso(props.ultimo.fecha)} · ${props.ultimo.concepto} · ${formatearCentimos(props.ultimo.importeCentimos)} € · Saldo ${formatearCentimos(props.ultimo.saldoCentimos)} €`
          : "No hay un último movimiento registrado.";

  return (
    <div className="shrink-0 rounded-[12px] border border-[#d6c4b8] bg-white/80 px-2.5 py-1 text-[#4b312b]">
      <p className="text-[11px] font-black uppercase leading-none tracking-[0.12em] text-[#8b695d]">
        Último movimiento registrado
      </p>
      <p className="mt-1 text-sm font-semibold leading-5">{texto}</p>
    </div>
  );
}
