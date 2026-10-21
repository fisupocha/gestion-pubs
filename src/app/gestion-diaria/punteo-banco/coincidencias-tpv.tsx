"use client";

import { etiquetaClaseTpv } from "@/modules/punteo-banco/detalle-tpv";
import type { LocalPunteo } from "@/modules/punteo-banco/locales-punteo";
import { botonCompacto } from "./clases";

export type FilaCoincidenciaTpv = {
  id: string;
  fecha: string;
  importe: string;
  concepto: string;
  clase: string;
  local: LocalPunteo | null;
};

type CoincidenciasTpvProps = {
  filas: FilaCoincidenciaTpv[];
  hayMas: boolean;
  onMas?: () => void;
};

const COLOR_LOCAL: Record<LocalPunteo, string> = {
  Tarantino: "bg-[#d7e6f8] text-[#1d4e89]",
  Hangar: "bg-[#fde4c8] text-[#8a4b12]",
  Cue: "bg-[#eadcf8] text-[#5b2d86]",
  Riverocio: "bg-[#d4f3ea] text-[#0f5c4c]",
  Fisu: "bg-[#f8d6e8] text-[#8a2d5c]",
  Soho: "bg-[#f6f0d4] text-[#5c5220]",
};

export function CoincidenciasTpv({ filas, hayMas, onMas }: CoincidenciasTpvProps) {
  return (
    <section className="max-h-40 overflow-auto rounded-[12px] border border-[#d6c4b8] bg-white/80" aria-label="Coincidencias TPV">
      <p className="sticky top-0 bg-[#f7ece7] px-2 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-[#8b695d]">
        Coincidencias TPV · {filas.length}
        {hayMas ? "+" : ""}
      </p>
      {filas.length === 0 ? (
        <p className="px-2 py-1.5 text-sm text-[#7b635c]">Ningún movimiento TPV coincide con la búsqueda.</p>
      ) : (
        <ul className="divide-y divide-[#ecdbd5]">
          {filas.map((fila) => (
            <li key={fila.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-2 py-1 text-sm text-[#4b312b]">
              <span className="rounded-[6px] bg-[#efe4ff] px-1.5 py-0.5 text-[11px] font-black uppercase text-[#5b2d86]">
                TPV {etiquetaClaseTpv(fila.clase)}
              </span>
              <span className="whitespace-nowrap tabular-nums">{fila.fecha}</span>
              <span className="font-semibold tabular-nums">{fila.importe}</span>
              <span className="min-w-0 flex-1 break-words">{fila.concepto}</span>
              <span className={`rounded-[6px] px-1.5 py-0.5 text-[11px] font-bold ${fila.local ? COLOR_LOCAL[fila.local] : "bg-[#f3ebe6] text-[#7b635c]"}`}>
                {fila.local ?? "Sin asignar"}
              </span>
            </li>
          ))}
        </ul>
      )}
      {hayMas && onMas ? (
        <div className="px-2 py-1">
          <button type="button" className={botonCompacto} onClick={onMas}>
            Ver más TPV
          </button>
        </div>
      ) : null}
    </section>
  );
}
