"use client";

import { useLayoutEffect, useRef } from "react";
import type { EstadoOk, MovimientoPunteo, OrdenOk } from "@/modules/punteo-banco/modelo";
import { tarjetaPunteo } from "./clases";

type TablaMovimientosProps = {
  banco: string;
  anio: number;
  movimientos: MovimientoPunteo[];
  orden: OrdenOk;
  onCambioOrden: (orden: OrdenOk) => void;
  onCambio: (id: string, campo: "observaciones" | "ok", valor: string) => void;
  onConfirmarObservacion?: (id: string, valor: string) => void;
  textoVacio?: string;
  marcas?: Record<string, "pendiente" | "error" | "conflicto">;
};

const COLOR_ESTADO: Record<EstadoOk, string> = {
  pendiente: "border-[#e3b2aa] bg-[#f6d9d4] text-[#7a3028]",
  comprobar: "border-[#e4d39a] bg-[#f8e8bc] text-[#6a5010]",
  ok: "border-[#b7d7b4] bg-[#d9efd6] text-[#1f5c32]",
};

export function TablaMovimientos({
  banco,
  anio,
  movimientos,
  orden,
  onCambioOrden,
  onCambio,
  onConfirmarObservacion,
  textoVacio,
  marcas,
}: TablaMovimientosProps) {
  return (
    <section className={`${tarjetaPunteo} flex h-full min-h-0 min-w-0 flex-col overflow-hidden`}>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[52rem] table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-[6.5rem]" />
            <col className="w-[7rem]" />
            <col className="w-[6.75rem]" />
            <col />
            <col />
            <col className="w-[10.5rem]" />
          </colgroup>
          <thead>
            <tr className="sticky top-0 z-10 bg-[#f7ece7] text-[11px] font-black uppercase tracking-[0.05em] text-[#8b695d]">
              <th scope="col" className="border border-[#e4d3ca] px-1.5 py-1 text-left">
                Fecha
              </th>
              <th scope="col" className="border border-[#e4d3ca] px-1.5 py-1 text-left">
                Fecha valor
              </th>
              <th scope="col" className="border border-[#e4d3ca] px-1.5 py-1 text-right">
                Importe
              </th>
              <th scope="col" className="border border-[#e4d3ca] px-1.5 py-1 text-left">
                Concepto
              </th>
              <th scope="col" className="border border-[#e4d3ca] px-1.5 py-1 text-left">
                Observaciones
              </th>
              <th scope="col" className="border border-[#e4d3ca] px-1 py-0.5 text-center">
                <label htmlFor="orden-movimientos" className="sr-only">
                  Orden de los movimientos
                </label>
                <select
                  id="orden-movimientos"
                  value={orden}
                  onChange={(event) => onCambioOrden(event.target.value as OrdenOk)}
                  className="w-full rounded-[8px] border border-[#e4d3ca] bg-white px-1 py-0.5 text-[11px] font-black tracking-[0.01em] text-[#4b312b] normal-case outline-none"
                >
                  <option value="original">Orden original</option>
                  <option value="pendientes">Pendientes arriba</option>
                </select>
              </th>
            </tr>
          </thead>
          <tbody>
            {movimientos.length > 0 ? (
              movimientos.map((movimiento) => (
                <tr key={movimiento.id} className="bg-white/75 text-sm leading-5 text-[#4b312b]">
                  <td className="border border-[#ecdbd5] px-1.5 py-1 align-top whitespace-nowrap">
                    {movimiento.fecha}
                  </td>
                  <td className="border border-[#ecdbd5] px-1.5 py-1 align-top whitespace-nowrap">
                    {movimiento.fechaValor || "—"}
                  </td>
                  <td className="border border-[#ecdbd5] px-1.5 py-1 text-right align-top font-semibold whitespace-nowrap tabular-nums">
                    {movimiento.importe}
                  </td>
                  <td className="border border-[#ecdbd5] px-1.5 py-1 align-top break-words">
                    {movimiento.concepto}
                  </td>
                  <td className="border border-[#ecdbd5] px-1.5 py-0.5 align-top">
                    <ObservacionCampo
                      value={movimiento.observaciones}
                      etiqueta={`Observaciones de ${movimiento.concepto || movimiento.fecha}`}
                      onChange={(valor) => onCambio(movimiento.id, "observaciones", valor)}
                      onBlur={
                        onConfirmarObservacion
                          ? (valor) => onConfirmarObservacion(movimiento.id, valor)
                          : undefined
                      }
                    />
                    {marcas?.[movimiento.id] === "pendiente" ? (
                      <span className="mt-0.5 block text-xs font-semibold text-[#7a3d2c]">Pendiente de guardar</span>
                    ) : null}
                    {marcas?.[movimiento.id] === "error" ? (
                      <span className="mt-0.5 block text-xs font-semibold text-[#7a3028]">No se ha guardado</span>
                    ) : null}
                    {marcas?.[movimiento.id] === "conflicto" ? (
                      <span className="mt-0.5 block text-xs font-semibold text-[#7a3028]">
                        Hay otra nota en la base. No se ha sustituido.
                      </span>
                    ) : null}
                  </td>
                  <td className={`border px-1.5 py-0.5 align-top ${COLOR_ESTADO[movimiento.ok]}`}>
                    <select
                      value={movimiento.ok}
                      aria-label={`Estado de ${movimiento.concepto || movimiento.fecha}`}
                      onChange={(event) => onCambio(movimiento.id, "ok", event.target.value)}
                      className={`w-full rounded-[6px] border px-1 py-0.5 text-sm font-semibold leading-5 outline-none ${COLOR_ESTADO[movimiento.ok]}`}
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="comprobar">Comprobar</option>
                      <option value="ok">OK</option>
                    </select>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="border border-[#ecdbd5] px-3 py-3 text-center text-sm text-[#7b635c]"
                >
                  {textoVacio ?? `Sin movimientos de ${banco} en ${anio}.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ObservacionCampo({
  value,
  etiqueta,
  onChange,
  onBlur,
}: {
  value: string;
  etiqueta: string;
  onChange: (valor: string) => void;
  onBlur?: (valor: string) => void;
}) {
  const campoRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const campo = campoRef.current;

    if (!campo) {
      return;
    }

    campo.style.height = "auto";
    campo.style.height = `${campo.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={campoRef}
      value={value}
      rows={1}
      aria-label={etiqueta}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur ? (event) => onBlur(event.target.value) : undefined}
      className="block w-full resize-none overflow-hidden rounded-[6px] border border-[#dac4b8] bg-white px-1.5 py-0.5 text-sm leading-5 outline-none"
    />
  );
}
