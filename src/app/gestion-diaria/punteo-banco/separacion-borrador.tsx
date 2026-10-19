"use client";

import { useEffect, useState } from "react";
import { conexionPunteoActiva } from "@/modules/punteo-banco/conexion-punteo";
import { formatearCentimos } from "@/modules/punteo-banco/centimos";
import { formatearFechaIso, nombreBanco, type BancoPunteoId, type EstadoOk } from "@/modules/punteo-banco/modelo";
import type { ImportacionOficial, UltimoMovimientoOficial } from "@/modules/punteo-banco/acceso-oficial";

export type LineaBorrador = {
  id: string;
  fecha: string;
  concepto: string;
  importe: string;
  observaciones: string;
  ok: EstadoOk;
};

type SeparacionBorradorProps = {
  banco: BancoPunteoId;
  anio: number;
  borrador: LineaBorrador[];
  ultimo: UltimoMovimientoOficial | null;
  cargandoUltimo: boolean;
  recarga: number;
};

export function SeparacionBorrador({
  banco,
  anio,
  borrador,
  ultimo,
  cargandoUltimo,
  recarga,
}: SeparacionBorradorProps) {
  const [importaciones, setImportaciones] = useState<ImportacionOficial[]>([]);
  const [aviso, setAviso] = useState("Cargando datos oficiales…");
  const [consulta, setConsulta] = useState(false);

  useEffect(() => {
    if (!conexionPunteoActiva()) {
      return;
    }

    let vigente = true;
    setAviso("Cargando datos oficiales…");

    void import("@/modules/punteo-banco/acceso-oficial")
      .then(async (acceso) => {
        const archivos = await acceso.leerImportaciones(banco);

        if (!vigente) {
          return;
        }

        setImportaciones(archivos);
        setAviso("");
      })
      .catch((error: unknown) => {
        if (!vigente) {
          return;
        }

        setImportaciones([]);
        setAviso(error instanceof Error ? error.message : "No se han podido leer los datos oficiales.");
      });

    return () => {
      vigente = false;
    };
  }, [banco, recarga]);

  if (!conexionPunteoActiva()) {
    return null;
  }

  const fechas = [...borrador].map((linea) => linea.fecha).sort();
  const conObservacion = borrador.filter((linea) => linea.observaciones.trim() !== "").length;
  const periodo = fechas.length > 0 ? `${fechas[0]} – ${fechas[fechas.length - 1]}` : "Sin periodo";

  return (
    <section className="grid gap-1.5 rounded-[12px] border border-[#d6c4b8] bg-white/80 p-2 text-sm text-[#4b312b] min-[900px]:grid-cols-2">
      <div>
        <h2 className="text-[11px] font-black uppercase tracking-[0.12em] text-[#8b695d]">Datos oficiales</h2>
        <p className="mt-1 leading-5">
          {nombreBanco(banco)}, año {anio}. Esta vista no copia el borrador del navegador.
        </p>
        {aviso ? (
          <p className="mt-1 leading-5" role="alert">
            {aviso}
          </p>
        ) : null}
        {cargandoUltimo ? (
          <p className="mt-1 leading-5">Cargando el último movimiento…</p>
        ) : ultimo ? (
          <p className="mt-1 font-semibold leading-5">
            Último movimiento: {formatearFechaIso(ultimo.fecha)} · {ultimo.concepto} ·{" "}
            {formatearCentimos(ultimo.importeCentimos)} € · saldo {formatearCentimos(ultimo.saldoCentimos)} €
          </p>
        ) : (
          <p className="mt-1 leading-5">No hay un último movimiento registrado para este banco.</p>
        )}
        {importaciones.length > 0 ? (
          <ul className="mt-1 max-h-36 space-y-0.5 overflow-auto leading-5">
            {importaciones.map((archivo) => (
              <li key={archivo.id}>
                {archivo.nombreArchivo}: {archivo.estado}. {archivo.motivo}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div>
        <h2 className="text-[11px] font-black uppercase tracking-[0.12em] text-[#8b695d]">
          Borrador de este navegador
        </h2>
        <p className="mt-1 leading-5">
          {nombreBanco(banco)}. Periodo {periodo}. {borrador.length} movimientos. {conObservacion} con observación.
        </p>
        <p className="mt-1 leading-5">
          Solo lectura. No se importa, no se mezcla con los datos oficiales y no se borra desde esta vista.
        </p>
        {borrador.length > 0 ? (
          <button
            type="button"
            className="mt-1 text-sm font-black underline underline-offset-2"
            onClick={() => setConsulta((abierta) => !abierta)}
          >
            {consulta ? "Ocultar borrador" : "Consultar borrador"}
          </button>
        ) : null}
        {consulta ? (
          <ul className="mt-1 max-h-48 space-y-0.5 overflow-auto leading-5">
            {borrador.map((linea) => (
              <li key={linea.id}>
                {linea.fecha} · {linea.concepto} · {linea.importe} € · {linea.ok}
                {linea.observaciones.trim() ? ` · ${linea.observaciones}` : ""}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
