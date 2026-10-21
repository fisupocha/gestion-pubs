"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ColumnaOrdenPunteo, LocalPunteo } from "@/modules/punteo-banco/locales-punteo";
import { LOCALES_PUNTEO } from "@/modules/punteo-banco/locales-punteo";
import type { EstadoOk, MovimientoPunteo } from "@/modules/punteo-banco/modelo";
import { aplicarAlturaAlContenido } from "@/modules/punteo-banco/altura-campo";
import { presentacionConcepto } from "@/modules/punteo-banco/presentacion-concepto";
import { tarjetaPunteo } from "./clases";

type TablaMovimientosProps = {
  banco: string;
  anio: number;
  movimientos: MovimientoPunteo[];
  columnaOrden: ColumnaOrdenPunteo;
  ascendente: boolean;
  onOrdenar: (columna: ColumnaOrdenPunteo) => void;
  onCambio: (id: string, campo: "observaciones" | "ok", valor: string) => void;
  onCambioLocal?: (id: string, local: LocalPunteo | null) => void;
  localEditable?: boolean;
  onConfirmarObservacion?: (id: string, valor: string) => void;
  onEditarConcepto?: (id: string, valor: string) => void;
  onConfirmarConcepto?: (id: string, valor: string) => void;
  textoVacio?: string;
  marcas?: Record<string, "pendiente" | "error" | "conflicto">;
  marcasConcepto?: Record<string, "pendiente" | "guardando" | "guardado" | "error">;
  onLlegarAlFinal?: () => void;
};

const COLOR_ESTADO: Record<EstadoOk, string> = {
  pendiente: "border-[#e3b2aa] bg-[#f6d9d4] text-[#7a3028]",
  comprobar: "border-[#e4d39a] bg-[#f8e8bc] text-[#6a5010]",
  ok: "border-[#b7d7b4] bg-[#d9efd6] text-[#1f5c32]",
};

const COLOR_LOCAL: Record<LocalPunteo, string> = {
  Tarantino: "border-[#b7cfee] bg-[#d7e6f8] text-[#1d4e89]",
  Hangar: "border-[#f0c48a] bg-[#fde4c8] text-[#8a4b12]",
  Cue: "border-[#d2b6ee] bg-[#eadcf8] text-[#5b2d86]",
  Riverocio: "border-[#9ed9c8] bg-[#d4f3ea] text-[#0f5c4c]",
  Fisu: "border-[#e7b0cc] bg-[#f8d6e8] text-[#8a2d5c]",
  Soho: "border-[#d2c48a] bg-[#f6f0d4] text-[#5c5220]",
};

const COLOR_SIN_LOCAL = "border-[#dac4b8] bg-white text-[#4b312b]";

export function TablaMovimientos({
  banco,
  anio,
  movimientos,
  columnaOrden,
  ascendente,
  onOrdenar,
  onCambio,
  onCambioLocal,
  localEditable = false,
  onConfirmarObservacion,
  onEditarConcepto,
  onConfirmarConcepto,
  textoVacio,
  marcas,
  marcasConcepto,
  onLlegarAlFinal,
}: TablaMovimientosProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const finalRef = useRef<HTMLDivElement>(null);
  const [conceptoLocal, setConceptoLocal] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!onLlegarAlFinal) {
      return;
    }

    const raiz = scrollRef.current;
    const marca = finalRef.current;

    if (!raiz || !marca) {
      return;
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((entrada) => entrada.isIntersecting)) {
          onLlegarAlFinal();
        }
      },
      { root: raiz, rootMargin: "160px" }
    );

    observador.observe(marca);
    return () => observador.disconnect();
  }, [onLlegarAlFinal, movimientos.length]);

  return (
    <section className={`${tarjetaPunteo} flex h-full min-h-0 min-w-0 flex-col overflow-hidden`}>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[60rem] table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-[6.5rem]" />
            <col className="w-[6.75rem]" />
            <col />
            <col />
            <col className="w-[8.75rem]" />
            <col className="w-[8.5rem]" />
            <col className="w-[4.75rem]" />
          </colgroup>
          <thead>
            <tr className="sticky top-0 z-10 bg-[#f7ece7] text-[11px] font-black uppercase tracking-[0.05em] text-[#8b695d]">
              <CabeceraOrden
                columna="fecha_operacion"
                etiqueta="Fecha"
                activa={columnaOrden}
                ascendente={ascendente}
                onOrdenar={onOrdenar}
              />
              <CabeceraOrden
                columna="importe"
                etiqueta="Importe"
                activa={columnaOrden}
                ascendente={ascendente}
                alineacion="right"
                onOrdenar={onOrdenar}
              />
              <CabeceraOrden
                columna="concepto"
                etiqueta="Concepto"
                activa={columnaOrden}
                ascendente={ascendente}
                onOrdenar={onOrdenar}
              />
              <CabeceraOrden
                columna="observaciones"
                etiqueta="Observaciones"
                activa={columnaOrden}
                ascendente={ascendente}
                onOrdenar={onOrdenar}
              />
              <CabeceraOrden
                columna="local"
                etiqueta="Local"
                activa={columnaOrden}
                ascendente={ascendente}
                onOrdenar={onOrdenar}
              />
              <CabeceraOrden
                columna="estado"
                etiqueta="Estado"
                activa={columnaOrden}
                ascendente={ascendente}
                onOrdenar={onOrdenar}
              />
              <CabeceraOrden
                columna="orden_banco"
                etiqueta="Orden"
                activa={columnaOrden}
                ascendente={ascendente}
                alineacion="right"
                onOrdenar={onOrdenar}
              />
            </tr>
          </thead>
          <tbody>
            {movimientos.length > 0 ? (
              movimientos.map((movimiento) => {
                const propio = onEditarConcepto
                  ? (movimiento.nuestroConcepto ?? "")
                  : (conceptoLocal[movimiento.id] ?? movimiento.nuestroConcepto ?? "");
                const [nuestroVisible, bancoVisible] = presentacionConcepto(propio, movimiento.concepto);
                const referencia = bancoVisible || nuestroVisible.trim() || movimiento.fecha;
                const localVisible = movimiento.local;
                const marcaConcepto = marcasConcepto?.[movimiento.id];

                return (
                <tr key={movimiento.id} className="bg-white/75 text-sm leading-5 text-[#4b312b]">
                  <td className="border border-[#ecdbd5] px-1.5 py-1 align-top whitespace-nowrap">
                    {movimiento.fecha}
                  </td>
                  <td className="border border-[#ecdbd5] px-1.5 py-1 text-right align-top font-semibold whitespace-nowrap tabular-nums">
                    {movimiento.importe}
                  </td>
                  <td className="border border-[#ecdbd5] px-1.5 py-0.5 align-top break-words">
                    <ConceptoCampo
                      valor={nuestroVisible}
                      conceptoBancario={bancoVisible}
                      marca={marcaConcepto}
                      etiqueta={`Nuestro concepto de ${referencia}`}
                      onChange={(valor) => {
                        if (onEditarConcepto) {
                          onEditarConcepto(movimiento.id, valor);
                          return;
                        }

                        setConceptoLocal((previo) => ({
                          ...previo,
                          [movimiento.id]: valor,
                        }));
                      }}
                      onBlur={
                        onConfirmarConcepto
                          ? (valor) => onConfirmarConcepto(movimiento.id, valor)
                          : undefined
                      }
                    />
                  </td>
                  <td className="border border-[#ecdbd5] px-1.5 py-0.5 align-top">
                    <ObservacionCampo
                      value={movimiento.observaciones}
                      etiqueta={`Observaciones de ${referencia}`}
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
                  <td className="border border-[#ecdbd5] px-1 py-0.5 align-top">
                    <select
                      value={localVisible ?? ""}
                      disabled={!localEditable}
                      aria-label={`Local de ${referencia}`}
                      onChange={(event) => {
                        const valor = event.target.value;
                        onCambioLocal?.(movimiento.id, valor === "" ? null : (valor as LocalPunteo));
                      }}
                      className={`w-full rounded-[6px] border px-1 py-0.5 text-[13px] font-semibold leading-5 outline-none ${
                        localVisible ? COLOR_LOCAL[localVisible] : COLOR_SIN_LOCAL
                      }`}
                    >
                      <option value="">Sin asignar</option>
                      {LOCALES_PUNTEO.map((local) => (
                        <option key={local} value={local}>
                          {local}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={`border px-1.5 py-0.5 align-top ${COLOR_ESTADO[movimiento.ok]}`}>
                    <select
                      value={movimiento.ok}
                      aria-label={`Estado de ${referencia}`}
                      onChange={(event) => onCambio(movimiento.id, "ok", event.target.value)}
                      className={`w-full rounded-[6px] border px-1 py-0.5 text-sm font-semibold leading-5 outline-none ${COLOR_ESTADO[movimiento.ok]}`}
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="comprobar">Comprobar</option>
                      <option value="ok">OK</option>
                    </select>
                  </td>
                  <td className="border border-[#ecdbd5] px-1 py-1 text-right align-top tabular-nums">{movimiento.orden}</td>
                </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="border border-[#ecdbd5] px-3 py-3 text-center text-sm text-[#7b635c]"
                >
                  {textoVacio ?? `Sin movimientos de ${banco} en ${anio}.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {onLlegarAlFinal ? <div ref={finalRef} className="h-1" aria-hidden="true" /> : null}
      </div>
    </section>
  );
}

function CabeceraOrden({
  columna,
  etiqueta,
  activa,
  ascendente,
  alineacion = "left",
  onOrdenar,
}: {
  columna: ColumnaOrdenPunteo;
  etiqueta: string;
  activa: ColumnaOrdenPunteo;
  ascendente: boolean;
  alineacion?: "left" | "right";
  onOrdenar: (columna: ColumnaOrdenPunteo) => void;
}) {
  const encendida = activa === columna;
  const flecha = encendida ? (ascendente ? " ▲" : " ▼") : "";

  return (
    <th scope="col" className="border border-[#e4d3ca] px-1 py-0.5" aria-sort={encendida ? (ascendente ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => onOrdenar(columna)}
        className={`w-full text-[11px] font-black uppercase tracking-[0.04em] text-[#8b695d] ${
          alineacion === "right" ? "text-right" : "text-left"
        }`}
      >
        {etiqueta}
        {flecha}
      </button>
    </th>
  );
}

function ConceptoCampo({
  valor,
  conceptoBancario,
  marca,
  etiqueta,
  onChange,
  onBlur,
}: {
  valor: string;
  conceptoBancario: string | null;
  marca?: "pendiente" | "guardando" | "guardado" | "error";
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

    aplicarAlturaAlContenido(campo);
  }, [valor]);

  const campo =
    "block w-full resize-none overflow-hidden whitespace-pre-wrap break-words rounded-[6px] border bg-white px-1 py-0 leading-4 outline-none";

  return (
    <div>
      <textarea
        ref={campoRef}
        value={valor}
        rows={1}
        aria-label={etiqueta}
        placeholder="Nuestro concepto"
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur ? (event) => onBlur(event.target.value) : undefined}
        className={`${campo} border-[#dac4b8] text-sm font-semibold text-[#4b312b] placeholder:text-[#a08b84]`}
      />
      {conceptoBancario ? (
        <p className="mt-0.5 whitespace-pre-wrap break-words text-[11px] leading-4 text-[#8b695d]">{conceptoBancario}</p>
      ) : null}
      <EstadoConcepto marca={marca} />
    </div>
  );
}

function EstadoConcepto({ marca }: { marca?: "pendiente" | "guardando" | "guardado" | "error" }) {
  if (marca === "guardando") {
    return <span className="mt-0.5 block text-[11px] leading-4 text-[#7a3d2c]">Guardando…</span>;
  }

  if (marca === "guardado") {
    return <span className="mt-0.5 block text-[11px] leading-4 text-[#1f5c32]">Guardado</span>;
  }

  if (marca === "error") {
    return <span className="mt-0.5 block text-[11px] leading-4 font-semibold text-[#7a3028]">No se ha guardado</span>;
  }

  if (marca === "pendiente") {
    return <span className="mt-0.5 block text-[11px] leading-4 text-[#7a3d2c]">Pendiente de guardar</span>;
  }

  return null;
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

    aplicarAlturaAlContenido(campo);
  }, [value]);

  return (
    <textarea
      ref={campoRef}
      value={value}
      rows={1}
      aria-label={etiqueta}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur ? (event) => onBlur(event.target.value) : undefined}
      className="block w-full resize-none overflow-hidden whitespace-pre-wrap break-words rounded-[6px] border border-[#dac4b8] bg-white px-1 py-0 text-sm leading-4 outline-none"
    />
  );
}
