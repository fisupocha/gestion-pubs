"use client";

import type { ReactNode } from "react";
import type { FilaResumenTpv } from "@/modules/punteo-banco/modelo";
import { tarjetaPunteo } from "./clases";

type ResumenTpvProps = {
  anio: number;
  filas: FilaResumenTpv[];
};

function CeldaDato({ valor, alineacion }: { valor: string | null; alineacion: "left" | "right" }) {
  const clase = alineacion === "right" ? "block text-right tabular-nums" : "block text-left";

  if (valor === null || valor.trim() === "") {
    return (
      <span aria-label="Sin dato" className={clase}>
        —
      </span>
    );
  }

  return <span className={clase}>{valor}</span>;
}

function Cabecera({
  children,
  alineacion,
}: {
  children: ReactNode;
  alineacion: "left" | "right";
}) {
  return (
    <div
      role="columnheader"
      className={
        alineacion === "right"
          ? "border border-[#e4d3ca] px-1 py-0.5 text-right leading-tight"
          : "border border-[#e4d3ca] px-1 py-0.5 text-left leading-tight"
      }
    >
      {children}
    </div>
  );
}

export function ResumenTpv({ anio, filas }: ResumenTpvProps) {
  return (
    <section
      className={`${tarjetaPunteo} flex h-auto min-w-0 shrink-0 flex-col overflow-visible min-[1280px]:h-full min-[1280px]:overflow-hidden`}
      aria-label={`Resumen mensual TPV ${anio}`}
    >
      <h2 className="shrink-0 px-2 py-1 text-[11px] font-black uppercase leading-none tracking-[0.14em] text-[#8b695d]">
        Resumen mensual TPV
      </h2>

      <div
        role="table"
        className="grid min-h-0 w-full flex-1 max-[1279px]:flex-none"
        style={{ gridTemplateRows: `auto repeat(${filas.length}, minmax(1.35rem, 1fr))` }}
      >
        <div
          role="row"
          className="grid grid-cols-[5.75rem_repeat(4,minmax(0,1fr))] bg-[#f7ece7] text-[11px] font-black uppercase tracking-[0.03em] text-[#8b695d]"
        >
          <Cabecera alineacion="left">Mes</Cabecera>
          <Cabecera alineacion="right">
            Ingresos
            <br />
            TPV
          </Cabecera>
          <Cabecera alineacion="right">
            Comisiones
            <br />
            TPV
          </Cabecera>
          <Cabecera alineacion="right">
            Porcentaje
            <br />
            efectivo
          </Cabecera>
          <Cabecera alineacion="left">Estado</Cabecera>
        </div>

        {filas.map((fila) => (
          <div
            key={fila.id}
            role="row"
            className={
              fila.esTotal
                ? "grid grid-cols-[5.75rem_repeat(4,minmax(0,1fr))] bg-[#f7ece7] text-sm font-black leading-none text-[#3f2b24]"
                : "grid grid-cols-[5.75rem_repeat(4,minmax(0,1fr))] bg-white/75 text-sm leading-none text-[#4b312b]"
            }
          >
            <div
              role="rowheader"
              className="flex items-center border border-[#ecdbd5] px-1 font-bold whitespace-nowrap"
            >
              {fila.mes}
            </div>
            <div role="cell" className="flex items-center justify-end border border-[#ecdbd5] px-1">
              <CeldaDato valor={fila.ingresos} alineacion="right" />
            </div>
            <div role="cell" className="flex items-center justify-end border border-[#ecdbd5] px-1">
              <CeldaDato valor={fila.comisiones} alineacion="right" />
            </div>
            <div role="cell" className="flex items-center justify-end border border-[#ecdbd5] px-1">
              <CeldaDato valor={fila.porcentajeEfectivo} alineacion="right" />
            </div>
            <div role="cell" className="flex items-center border border-[#ecdbd5] px-1">
              <CeldaDato valor={fila.aviso ?? fila.estado} alineacion="left" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
