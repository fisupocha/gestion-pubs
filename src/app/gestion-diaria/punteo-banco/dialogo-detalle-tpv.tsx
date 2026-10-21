"use client";

import { useEffect, useState } from "react";
import { formatearCentimos } from "@/modules/punteo-banco/centimos";
import { abonosFueraDelMes, type DetalleMesTpv, type LineaTpvDetalle } from "@/modules/punteo-banco/detalle-tpv";
import { formatearFechaIso, MESES_PUNTEO, nombreBanco, type BancoPunteoId } from "@/modules/punteo-banco/modelo";
import { botonCompacto } from "./clases";

type DialogoDetalleTpvProps = {
  banco: BancoPunteoId;
  anio: number;
  mes: number;
  lineasLocales?: LineaTpvDetalle[] | null;
  onCerrar: () => void;
};

export function DialogoDetalleTpv({ banco, anio, mes, lineasLocales, onCerrar }: DialogoDetalleTpvProps) {
  const [detalle, setDetalle] = useState<DetalleMesTpv | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function alTeclado(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCerrar();
      }
    }

    window.addEventListener("keydown", alTeclado);
    return () => window.removeEventListener("keydown", alTeclado);
  }, [onCerrar]);

  useEffect(() => {
    let vivo = true;
    setDetalle(null);
    setError(null);

    if (lineasLocales) {
      void import("@/modules/punteo-banco/detalle-tpv").then(({ detallarMesTpv }) => {
        if (vivo) {
          setDetalle(detallarMesTpv(anio, mes, lineasLocales));
        }
      });
      return () => {
        vivo = false;
      };
    }

    void import("@/modules/punteo-banco/acceso-oficial")
      .then(async (acceso) => {
        const leido = await acceso.leerDetalleTpv(banco, anio, mes);

        if (vivo) {
          setDetalle(leido);
        }
      })
      .catch((causa: unknown) => {
        if (vivo) {
          setError(causa instanceof Error ? causa.message : "No se ha podido leer el detalle TPV.");
        }
      });

    return () => {
      vivo = false;
    };
  }, [anio, banco, lineasLocales, mes]);

  const fuera = detalle ? abonosFueraDelMes(detalle) : [];
  const titulo = `${MESES_PUNTEO[mes - 1]} ${anio} · ${nombreBanco(banco)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(36,22,17,0.42)] p-3">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-detalle-tpv"
        className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-[22px] border border-[#d6c4b8] bg-[#fffaf7] text-[#3f2b24] shadow-[0_24px_60px_rgba(36,22,17,0.28)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#eadfd8] px-4 py-3">
          <div>
            <h2 id="titulo-detalle-tpv" className="text-lg font-black">
              Movimientos TPV · {titulo}
            </h2>
            <p className="text-sm text-[#7b635c]">Consulta de solo lectura. No cambia estados ni crea gastos.</p>
          </div>
          <button type="button" className={botonCompacto} onClick={onCerrar}>
            Cerrar
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
          {error ? <p className="text-sm font-semibold text-[#7a3028]">{error}</p> : null}
          {!detalle && !error ? <p className="text-sm font-semibold text-[#5d433a]">Leyendo movimientos TPV…</p> : null}
          {detalle ? <Cuerpo detalle={detalle} fuera={fuera} /> : null}
        </div>
      </div>
    </div>
  );
}

function Cuerpo({
  detalle,
  fuera,
}: {
  detalle: DetalleMesTpv;
  fuera: { id: string; fecha: string; importeCentimos: number }[];
}) {
  return (
    <div className="flex flex-col gap-3">
      {fuera.length > 0 ? (
        <p className="rounded-[10px] border border-[#e4d39a] bg-[#f8e8bc] px-2.5 py-1.5 text-sm text-[#6a5010]">
          {fuera.map((abono) => (
            <span key={abono.id} className="block">
              El abono bancario de {formatearCentimos(abono.importeCentimos)} € tiene fecha de operación{" "}
              {formatearFechaIso(abono.fecha)}. En este mes solo se muestra la parte imputada a cada comisión inicial.
              No se suma otra vez.
            </span>
          ))}
        </p>
      ) : null}
      <div className="grid gap-1 text-sm sm:grid-cols-2">
        <Cifra etiqueta="Ingresos" valor={formatearCentimos(detalle.ingresosCentimos)} />
        <Cifra etiqueta="Comisión original" valor={formatearCentimos(detalle.comisionesOriginalesCentimos)} />
        <Cifra etiqueta="Devolución asignada" valor={formatearCentimos(detalle.devolucionAsignadaCentimos)} />
        <Cifra etiqueta="Comisión neta" valor={formatearCentimos(detalle.comisionNetaCentimos)} />
        <Cifra etiqueta="% efectivo" valor={detalle.porcentajeEfectivo ?? "—"} />
        <Cifra etiqueta="Mantenimiento, aparte" valor={formatearCentimos(detalle.mantenimientoCentimos)} />
      </div>
      <div className="overflow-auto">
        <table className="w-full min-w-[44rem] border-collapse text-sm">
          <thead>
            <tr className="bg-[#f7ece7] text-left text-[11px] font-black uppercase tracking-[0.04em] text-[#8b695d]">
              <th className="border border-[#e4d3ca] px-1.5 py-1">Fecha</th>
              <th className="border border-[#e4d3ca] px-1.5 py-1">Concepto y detalle</th>
              <th className="border border-[#e4d3ca] px-1.5 py-1">Terminal</th>
              <th className="border border-[#e4d3ca] px-1.5 py-1 text-right">Importe banco</th>
              <th className="border border-[#e4d3ca] px-1.5 py-1">Clase</th>
              <th className="border border-[#e4d3ca] px-1.5 py-1 text-right">Imputación</th>
            </tr>
          </thead>
          <tbody>
            {detalle.filas.length === 0 ? (
              <tr>
                <td colSpan={6} className="border border-[#ecdbd5] px-2 py-3 text-center text-[#7b635c]">
                  Este mes no tiene movimientos TPV.
                </td>
              </tr>
            ) : (
              detalle.filas.map((fila) => (
                <tr key={fila.id} className={fila.esAbonoBancario ? "bg-[#f8e8bc]" : "bg-white/70"}>
                  <td className="border border-[#ecdbd5] px-1.5 py-1 whitespace-nowrap">{formatearFechaIso(fila.fecha)}</td>
                  <td className="border border-[#ecdbd5] px-1.5 py-1">
                    <span className="block">{fila.conceptoOriginal || "—"}</span>
                    {fila.detallesOriginales ? (
                      <span className="block text-xs text-[#7b635c]">{fila.detallesOriginales}</span>
                    ) : null}
                    {fila.esAbonoBancario ? (
                      <span className="mt-0.5 block text-xs font-semibold text-[#6a5010]">
                        Abono original del banco. Su importe no se añade otra vez a la comisión neta: ya está repartido
                        entre las comisiones iniciales.
                      </span>
                    ) : null}
                  </td>
                  <td className="border border-[#ecdbd5] px-1.5 py-1">
                    {fila.terminal || fila.referencias.join(", ") || "—"}
                  </td>
                  <td className="border border-[#ecdbd5] px-1.5 py-1 text-right tabular-nums">
                    {formatearCentimos(fila.importeCentimos)}
                  </td>
                  <td className="border border-[#ecdbd5] px-1.5 py-1">{fila.etiquetaClase}</td>
                  <td className="border border-[#ecdbd5] px-1.5 py-1 text-right tabular-nums">
                    {fila.imputacionCentimos ? formatearCentimos(fila.imputacionCentimos) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Cifra({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <p className="flex items-baseline justify-between gap-3 rounded-[10px] border border-[#eadfd8] bg-white/70 px-2 py-1">
      <span>{etiqueta}</span>
      <span className="font-bold tabular-nums">{valor}</span>
    </p>
  );
}
