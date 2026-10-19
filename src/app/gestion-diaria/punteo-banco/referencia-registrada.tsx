"use client";

import { aCentimos, formatearCentimos } from "@/modules/punteo-banco/centimos";
import { formatearFechaIso } from "@/modules/punteo-banco/modelo";
import type { ReferenciaMovimiento } from "@/modules/punteo-banco/referencias-iniciales";

export function ReferenciaRegistrada({ referencia }: { referencia: ReferenciaMovimiento }) {
  return (
    <div className="shrink-0 rounded-[12px] border border-[#d6c4b8] bg-white/80 px-2.5 py-1 text-[#4b312b]">
      <p className="text-[11px] font-black uppercase leading-none tracking-[0.12em] text-[#8b695d]">
        Último movimiento registrado
      </p>
      <p className="mt-1 text-sm font-semibold leading-5">
        {formatearFechaIso(referencia.fecha)} · {referencia.concepto} ·{" "}
        {formatearCentimos(aCentimos(referencia.importe))} € · Saldo{" "}
        {formatearCentimos(aCentimos(referencia.saldo))} €
      </p>
    </div>
  );
}
