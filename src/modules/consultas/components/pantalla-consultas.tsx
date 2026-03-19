"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CampoFecha } from "@/components/ui/campo-fecha";
import type { ClasificacionMapa } from "@/lib/clasificacion";
import type { MaestrosFormulario } from "@/modules/maestros/varios/data/obtener-maestros-formulario";
import {
  calcularConsulta,
  OPERATIVA_CONSULTA_VACIA,
  obtenerFamiliasDisponibles,
  obtenerFamiliasPorTipoConsulta,
  obtenerTiposDisponibles,
} from "@/modules/consultas/utils/motor-consultas";
import { cargarOperativaConsultas } from "@/modules/consultas/utils/cargar-operativa-consultas";
import {
  listarRepartosRiverocioManuales,
  type RepartoRiverocioManual,
} from "@/modules/consultas/utils/reparto-riverocio";
import {
  consultaStateToQueryString,
  ESTADO_CONSULTA_INICIAL,
  esEstadoConsultaVacio,
  guardarConsultaState,
  leerConsultaStateGuardado,
} from "@/modules/consultas/utils/estado-consultas";
import type { ConsultaState } from "@/modules/consultas/utils/estado-consultas";

type PantallaConsultasProps = {
  clasificacion: ClasificacionMapa;
  maestros: MaestrosFormulario;
  initialState: ConsultaState;
};

const panel =
  "rounded-[24px] border border-[#d2b7aa] bg-[linear-gradient(180deg,rgba(250,244,241,0.98)_0%,rgba(238,226,221,0.98)_100%)] shadow-[0_16px_28px_rgba(85,52,46,0.08)]";
const input =
  "w-full rounded-2xl border border-[#d7bbb3] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] px-3 py-1.5 text-center text-xs text-[#2e211d] shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_4px_10px_rgba(85,52,46,0.04)] outline-none transition duration-150 placeholder:text-[#a78f88] hover:-translate-y-[1px] hover:scale-[1.005] hover:border-[#9f6425] hover:bg-[#ffffff] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_20px_36px_rgba(85,52,46,0.18)] focus:border-[#7f4718] focus:bg-white focus:shadow-[0_0_0_6px_rgba(169,111,47,0.28),0_22px_40px_rgba(85,52,46,0.20)]";

function fmtMoney(value: number) {
  return `${value.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} EUR`;
}

function fmtPercent(value: number) {
  return `${value.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function filtrarSeleccion<T>(selected: T[], valid: T[]) {
  const validSet = new Set(valid);
  return selected.filter((item) => validSet.has(item));
}

function ordenarAlfabetico(values: string[]) {
  return [...values].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
}

function agruparEnColumnas<T>(items: T[], columnas: number) {
  const grupos = Array.from({ length: columnas }, () => [] as T[]);
  const filasPorColumna = Math.max(1, Math.ceil(items.length / columnas));
  items.forEach((item, index) => {
    grupos[Math.min(columnas - 1, Math.floor(index / filasPorColumna))]?.push(item);
  });
  return grupos.filter((grupo) => grupo.length > 0);
}

function TipoFamiliasBlock({
  tipo,
  familias,
  tipoActivo,
  familiasSeleccionadas,
  onToggleTipo,
  onToggleFamilia,
  onSeleccionRapida,
}: {
  tipo: string;
  familias: string[];
  tipoActivo: boolean;
  familiasSeleccionadas: string[];
  onToggleTipo: () => void;
  onToggleFamilia: (familia: string) => void;
  onSeleccionRapida: () => void;
}) {
  const seleccionadas = familiasSeleccionadas.length;
  const todasSeleccionadas = familias.length > 0 && seleccionadas === familias.length;

  return (
    <section className={`${panel} flex h-full min-h-0 flex-col gap-2 p-2`}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleTipo}
          className={
            tipoActivo
              ? "flex-1 rounded-2xl border border-[#9f6425] bg-[linear-gradient(180deg,#f5e3dc_0%,#edd4cb_100%)] px-3 py-1.5 text-center text-[10px] font-black uppercase tracking-[0.18em] text-[#4a2d28] shadow-[0_14px_24px_rgba(85,52,46,0.14)] transition duration-150 hover:-translate-y-[2px] hover:scale-[1.02] hover:border-[#7f4718] hover:shadow-[0_20px_32px_rgba(85,52,46,0.18)]"
              : "flex-1 rounded-2xl border border-[#dcc8c2] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] px-3 py-1.5 text-center text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6458] transition duration-150 hover:-translate-y-[2px] hover:scale-[1.02] hover:border-[#9f6425] hover:bg-[#fff9f3] hover:text-[#5f3a32] hover:shadow-[0_18px_30px_rgba(85,52,46,0.14)]"
          }
        >
          {tipo}
        </button>
        <div className="rounded-full border border-[#d8c0b9] bg-[rgba(255,250,248,0.86)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#8d6f67]">
          {seleccionadas}
        </div>
      </div>

      {familias.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-dashed border-[#dcc8c2] bg-[rgba(255,250,248,0.65)] px-3 py-3 text-center text-xs text-[#9d817a]">
          Sin familias.
        </div>
      ) : (
        <div
          className={
            tipoActivo
              ? "min-h-0 flex-1 overflow-y-auto rounded-2xl border border-[#e3d2cb] bg-[rgba(255,250,248,0.55)] p-2"
              : "min-h-0 flex-1 overflow-y-auto rounded-2xl border border-dashed border-[#e3d2cb] bg-[rgba(255,250,248,0.42)] p-2"
          }
        >
          <div className="flex flex-wrap gap-2">
            {familias.map((familia) => {
              const active = familiasSeleccionadas.includes(familia);
              return (
                <button
                  key={familia}
                  type="button"
                  disabled={!tipoActivo}
                  onClick={() => onToggleFamilia(familia)}
                  className={
                    !tipoActivo
                      ? "cursor-not-allowed rounded-2xl border border-[#e2d3cd] bg-[rgba(255,250,248,0.48)] px-2 py-1 text-[11px] font-semibold text-[#b39b94]"
                      : active
                      ? "rounded-2xl border border-[#9f6425] bg-[linear-gradient(180deg,#f5e3dc_0%,#edd4cb_100%)] px-2 py-1 text-[11px] font-semibold text-[#4a2d28] shadow-[0_12px_20px_rgba(85,52,46,0.12)] transition duration-150 hover:-translate-y-[1px] hover:scale-[1.02] hover:border-[#7f4718]"
                      : "rounded-2xl border border-[#dcc8c2] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] px-2 py-1 text-[11px] font-semibold text-[#765650] transition duration-150 hover:-translate-y-[1px] hover:scale-[1.02] hover:border-[#9f6425] hover:bg-[#fff9f3] hover:text-[#5f3a32] hover:shadow-[0_14px_24px_rgba(85,52,46,0.12)]"
                  }
                >
                  {familia}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onSeleccionRapida}
            className="mt-3 w-full rounded-2xl border border-dashed border-[#d8c0b9] bg-[rgba(255,250,248,0.5)] px-3 py-2 text-center text-[11px] font-semibold text-[#8d6f67] transition duration-150 hover:-translate-y-[1px] hover:border-[#9f6425] hover:bg-[rgba(255,249,243,0.92)] hover:text-[#5f3a32] hover:shadow-[0_14px_24px_rgba(85,52,46,0.12)]"
          >
            {todasSeleccionadas ? "Deseleccionar todo" : "Seleccionar todo"}
          </button>
        </div>
      )}
    </section>
  );
}

function construirColumnasTipos(
  bloques: Array<{
    tipo: string;
    familias: string[];
  }>
) {
  const byTipo = new Map(bloques.map((bloque) => [bloque.tipo, bloque]));
  const order = [
    ["Fijos"],
    ["Mercaderias", "Personal"],
    ["Extras", "Ingresos", "Varios"],
  ];

  const columnas = order
    .map((tipos) => tipos.map((tipo) => byTipo.get(tipo)).filter(Boolean) as typeof bloques)
    .filter((columna) => columna.length > 0);

  const usados = new Set(columnas.flatMap((columna) => columna.map((bloque) => bloque.tipo)));
  const restantes = bloques.filter((bloque) => !usados.has(bloque.tipo));

  if (restantes.length > 0) {
    const extras = agruparEnColumnas(restantes, Math.max(1, 3 - columnas.length));
    return [...columnas, ...extras];
  }

  return columnas;
}

function MiniResumen({
  titulo,
  valor,
  nota,
  fuerte = false,
}: {
  titulo: string;
  valor: string;
  nota: string;
  fuerte?: boolean;
}) {
  return (
    <section
      className={
        fuerte
          ? "min-h-[82px] rounded-[20px] border border-[#b9796d] bg-[linear-gradient(180deg,#f2d8cf_0%,#e8c0b3_100%)] px-3 py-2 text-center shadow-[0_12px_20px_rgba(85,52,46,0.12)]"
          : `${panel} min-h-[82px] px-3 py-2 text-center`
      }
    >
      <div className={`text-[10px] font-black uppercase tracking-[0.18em] ${fuerte ? "text-[#884b3d]" : "text-[#8a6458]"}`}>
        {titulo}
      </div>
      <div className={`mt-1 text-base font-black tracking-tight ${fuerte ? "text-[#6b3022]" : "text-[#432c26]"}`}>
        {valor}
      </div>
      <div className={`mt-1 text-[10px] leading-4 ${fuerte ? "text-[#8a5144]" : "text-[#7b635b]"}`}>
        {nota}
      </div>
    </section>
  );
}

export function PantallaConsultas({
  clasificacion,
  maestros,
  initialState,
}: PantallaConsultasProps) {
  const [state, setState] = useState<ConsultaState>(() =>
    esEstadoConsultaVacio(initialState)
      ? leerConsultaStateGuardado() ?? ESTADO_CONSULTA_INICIAL
      : initialState
  );
  const [operativa, setOperativa] = useState(OPERATIVA_CONSULTA_VACIA);
  const [repartosRiverocio, setRepartosRiverocio] = useState<RepartoRiverocioManual[]>([]);

  useEffect(() => {
    guardarConsultaState(state);
  }, [state]);

  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      try {
        const [data, repartos] = await Promise.all([
          cargarOperativaConsultas(clasificacion),
          listarRepartosRiverocioManuales(),
        ]);
        if (!cancelado) {
          setOperativa(data);
          setRepartosRiverocio(repartos);
        }
      } catch (error) {
        console.error("No se pudo cargar la operativa para consultas", error);
      }
    };

    void cargar();

    return () => {
      cancelado = true;
    };
  }, [clasificacion]);

  const tiposDisponibles = useMemo(
    () => ordenarAlfabetico(obtenerTiposDisponibles(clasificacion)),
    [clasificacion]
  );
  const tiposConFamilias = useMemo(
    () =>
      tiposDisponibles.map((tipo) => ({
        tipo,
        familias: obtenerFamiliasPorTipoConsulta(clasificacion, tipo),
      })),
    [clasificacion, tiposDisponibles]
  );
  const columnasTipos = useMemo(() => construirColumnasTipos(tiposConFamilias), [tiposConFamilias]);

  const resultado = useMemo(
    () =>
      calcularConsulta({
      clasificacion,
      maestros,
      operativa,
      state,
      repartosRiverocio,
    }),
    [clasificacion, maestros, operativa, repartosRiverocio, state]
  );

  const detalleHref = useMemo(() => {
    const query = consultaStateToQueryString(state);
    return query ? `/consultas/detalle?${query}` : "/consultas/detalle";
  }, [state]);
  const repartoRiverocioHref = useMemo(() => {
    const query = consultaStateToQueryString(state);
    return query ? `/consultas/reparto-riverocio?${query}` : "/consultas/reparto-riverocio";
  }, [state]);

  return (
    <section className="flex h-full min-h-0 flex-col gap-2 p-2">
      <div className="grid min-h-0 flex-1 gap-2 xl:grid-cols-[1.2fr_0.9fr]">
        <section className="flex h-full min-h-0 flex-col justify-between gap-2">
          <section className={`${panel} flex flex-col gap-2 p-2`}>
            <div className="grid gap-2 xl:grid-cols-[1.15fr_0.82fr_0.82fr_0.78fr]">
              <section className="rounded-[22px] border border-[#d8c0b9] bg-[rgba(255,250,248,0.68)] p-2">
                <div className="text-center text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6458]">
                  Local
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {resultado.localesDisponibles.map((local) => (
                    <button
                      key={local}
                      type="button"
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          localesSeleccionados: toggleValue(prev.localesSeleccionados, local),
                          subfamiliasSeleccionadas: [],
                        }))
                      }
                      className={
                        state.localesSeleccionados.includes(local)
                          ? "rounded-2xl border border-[#9f6425] bg-[linear-gradient(180deg,#f5e3dc_0%,#edd4cb_100%)] px-3 py-1 text-[11px] font-semibold text-[#4a2d28] shadow-[0_12px_20px_rgba(85,52,46,0.12)] transition duration-150 hover:-translate-y-[1px] hover:scale-[1.02] hover:border-[#7f4718]"
                          : "rounded-2xl border border-[#dcc8c2] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] px-3 py-1 text-[11px] font-semibold text-[#765650] transition duration-150 hover:-translate-y-[1px] hover:scale-[1.02] hover:border-[#9f6425] hover:bg-[#fff9f3] hover:text-[#5f3a32] hover:shadow-[0_14px_24px_rgba(85,52,46,0.12)]"
                      }
                    >
                      {local}
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-[22px] border border-[#d8c0b9] bg-[rgba(255,250,248,0.68)] p-2">
                <div className="text-center text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6458]">
                  Desde
                </div>
                <CampoFecha
                  value={state.desde}
                  onChange={(e) => setState((prev) => ({ ...prev, desde: e.target.value }))}
                  className={`${input} mt-2`}
                />
              </section>

              <section className="rounded-[22px] border border-[#d8c0b9] bg-[rgba(255,250,248,0.68)] p-2">
                <div className="text-center text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6458]">
                  Hasta
                </div>
                <CampoFecha
                  value={state.hasta}
                  onChange={(e) => setState((prev) => ({ ...prev, hasta: e.target.value }))}
                  className={`${input} mt-2`}
                />
              </section>

              <section className="rounded-[22px] border border-[#d8c0b9] bg-[rgba(255,250,248,0.68)] p-2">
                <div className="text-center text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6458]">
                  IVA
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setState((prev) => ({ ...prev, modoIva: "con" }))}
                    className={
                      state.modoIva === "con"
                        ? "rounded-2xl border border-[#9f6425] bg-[linear-gradient(180deg,#f5e3dc_0%,#edd4cb_100%)] px-2 py-1 text-[11px] font-bold text-[#4a2d28] shadow-[0_12px_20px_rgba(85,52,46,0.12)] transition duration-150 hover:-translate-y-[1px] hover:scale-[1.02] hover:border-[#7f4718]"
                        : "rounded-2xl border border-[#dcc8c2] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] px-2 py-1 text-[11px] font-semibold text-[#765650] transition duration-150 hover:-translate-y-[1px] hover:scale-[1.02] hover:border-[#9f6425] hover:bg-[#fff9f3] hover:text-[#5f3a32] hover:shadow-[0_14px_24px_rgba(85,52,46,0.12)]"
                    }
                  >
                    Con
                  </button>
                  <button
                    type="button"
                    onClick={() => setState((prev) => ({ ...prev, modoIva: "sin" }))}
                    className={
                      state.modoIva === "sin"
                        ? "rounded-2xl border border-[#9f6425] bg-[linear-gradient(180deg,#f5e3dc_0%,#edd4cb_100%)] px-2 py-1 text-[11px] font-bold text-[#4a2d28] shadow-[0_12px_20px_rgba(85,52,46,0.12)] transition duration-150 hover:-translate-y-[1px] hover:scale-[1.02] hover:border-[#7f4718]"
                        : "rounded-2xl border border-[#dcc8c2] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] px-2 py-1 text-[11px] font-semibold text-[#765650] transition duration-150 hover:-translate-y-[1px] hover:scale-[1.02] hover:border-[#9f6425] hover:bg-[#fff9f3] hover:text-[#5f3a32] hover:shadow-[0_14px_24px_rgba(85,52,46,0.12)]"
                    }
                  >
                    Sin
                  </button>
                </div>
              </section>
            </div>
          </section>

          <div className="grid min-h-0 flex-1 gap-2 xl:grid-cols-3">
            {columnasTipos.map((columna, columnIndex) => (
              <div key={`col-${columnIndex}`} className="grid min-h-0 gap-2" style={{ gridTemplateRows: `repeat(${columna.length}, minmax(0, 1fr))` }}>
                {columna.map((bloque) => (
                  <TipoFamiliasBlock
                    key={bloque.tipo}
                    tipo={bloque.tipo}
                    familias={bloque.familias}
                    tipoActivo={state.tiposSeleccionados.includes(bloque.tipo)}
                    familiasSeleccionadas={state.familiasSeleccionadas.filter((item) =>
                      bloque.familias.includes(item)
                    )}
                    onToggleTipo={() =>
                      setState((prev) => {
                        const tiposSeleccionados = toggleValue(prev.tiposSeleccionados, bloque.tipo);
                        const familiasDisponiblesNext = obtenerFamiliasDisponibles(
                          clasificacion,
                          tiposSeleccionados
                        );
                        const familiasSeleccionadas = filtrarSeleccion(
                          prev.familiasSeleccionadas,
                          familiasDisponiblesNext
                        );

                        return {
                          ...prev,
                          tiposSeleccionados,
                          familiasSeleccionadas,
                          subfamiliasSeleccionadas: [],
                        };
                      })
                    }
                    onToggleFamilia={(familia) =>
                      setState((prev) => ({
                        ...prev,
                        familiasSeleccionadas: toggleValue(prev.familiasSeleccionadas, familia),
                        subfamiliasSeleccionadas: [],
                      }))
                    }
                    onSeleccionRapida={() =>
                      setState((prev) => {
                        const todasSeleccionadas = bloque.familias.every((familia) =>
                          prev.familiasSeleccionadas.includes(familia)
                        );

                        if (todasSeleccionadas) {
                          return {
                            ...prev,
                            tiposSeleccionados: prev.tiposSeleccionados.filter(
                              (item) => item !== bloque.tipo
                            ),
                            familiasSeleccionadas: prev.familiasSeleccionadas.filter(
                              (item) => !bloque.familias.includes(item)
                            ),
                            subfamiliasSeleccionadas: [],
                          };
                        }

                        return {
                          ...prev,
                          tiposSeleccionados: prev.tiposSeleccionados.includes(bloque.tipo)
                            ? prev.tiposSeleccionados
                            : [...prev.tiposSeleccionados, bloque.tipo],
                          familiasSeleccionadas: [
                            ...new Set([...prev.familiasSeleccionadas, ...bloque.familias]),
                          ],
                          subfamiliasSeleccionadas: [],
                        };
                      })
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-0 flex-col gap-2">
          <section className={`${panel} flex flex-col gap-2 p-2`}>
            <div className="rounded-[20px] border border-[#6f5149] bg-[linear-gradient(180deg,#4b3530_0%,#2d211e_100%)] p-3 text-[#fff4ec] shadow-[0_16px_28px_rgba(36,24,20,0.22)]">
              <div className="text-center text-[10px] font-black uppercase tracking-[0.16em] text-[#d7bfb6]">
                Lectura activa
              </div>
              <div className="mt-1 text-center text-base font-black leading-tight">{resultado.textoLocales}</div>
              <div className="mt-1 text-center text-xs leading-5 text-[#ead8d1]">
                {resultado.datos.aplicarReparto
                  ? "Locales operativos con reparto de Empresa por caja global."
                  : "Total grupo con Empresa como bloque propio."}
              </div>
              <div className="mt-1 grid gap-2 xl:grid-cols-2">
                <div className="rounded-2xl border border-[#7d5f56] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-xs text-[#f3e6e0]">
                  <span className="font-black">IVA visible:</span>{" "}
                  {fmtMoney(
                    resultado.datos.ivaCaja +
                      resultado.datos.ivaGasto +
                      resultado.datos.ivaEmitidas
                  )}
                </div>
                <div className="rounded-2xl border border-[#7d5f56] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-xs text-[#f3e6e0]">
                  <span className="font-black">Beneficio:</span>{" "}
                  {fmtMoney(resultado.datos.beneficio)}
                </div>
              </div>
            </div>

            <div className="grid gap-2 xl:grid-cols-3">
              <Link
                href={repartoRiverocioHref}
                className="rounded-2xl border border-[#b9796d] bg-[linear-gradient(180deg,#f2d8cf_0%,#e8c0b3_100%)] px-4 py-1.5 text-center text-sm font-black text-[#6b3022] shadow-[0_12px_20px_rgba(85,52,46,0.12)] transition duration-150 hover:-translate-y-[2px] hover:scale-[1.02] hover:border-[#8a4b3d] hover:shadow-[0_20px_32px_rgba(85,52,46,0.18)]"
              >
                Reparto Riverocio
              </Link>
              <Link
                href={detalleHref}
                className="rounded-2xl border border-[#9f6425] bg-[linear-gradient(180deg,#f5e3dc_0%,#edd4cb_100%)] px-4 py-1.5 text-center text-sm font-black text-[#5a3025] shadow-[0_12px_20px_rgba(85,52,46,0.12)] transition duration-150 hover:-translate-y-[2px] hover:scale-[1.02] hover:border-[#7f4718] hover:shadow-[0_20px_32px_rgba(85,52,46,0.18)]"
              >
                Abrir detalle
              </Link>
              <button
                type="button"
                onClick={() => setState(ESTADO_CONSULTA_INICIAL)}
                className="rounded-2xl border border-[#dcc8c2] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] px-4 py-1.5 text-sm font-bold text-[#765650] transition duration-150 hover:-translate-y-[2px] hover:scale-[1.02] hover:border-[#9f6425] hover:bg-[#fff9f3] hover:text-[#5f3a32] hover:shadow-[0_18px_30px_rgba(85,52,46,0.14)]"
              >
                Limpiar filtros
              </button>
            </div>
          </section>

          <section className={`${panel} flex h-[236px] min-h-0 shrink-0 flex-col gap-2 p-2`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 text-center text-[10px] font-black uppercase tracking-[0.2em] text-[#8a6458]">
                Por local
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9b7f77]">
                {resultado.datos.porLocal.length} filas
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto rounded-[20px] border border-[#d8c0b9] bg-[rgba(255,250,248,0.72)]">
              <div className="divide-y divide-[#ead7d1]">
                {resultado.datos.porLocal.map((row) => (
                  <div
                    key={row.local}
                    className="grid gap-2 px-3 py-2 text-xs text-[#4b332d] xl:grid-cols-[1fr_0.85fr_0.9fr_0.9fr_0.9fr_0.7fr]"
                  >
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#9b7f77]">
                        Local
                      </div>
                      <div className="mt-0.5 font-black">{row.local}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#9b7f77]">
                        Caja
                      </div>
                      <div className="mt-0.5">{fmtMoney(row.caja)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#9b7f77]">
                        Directo
                      </div>
                      <div className="mt-0.5">{fmtMoney(row.directo)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#9b7f77]">
                        Emitidas
                      </div>
                      <div className="mt-0.5">{fmtMoney(row.emitidas)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#9b7f77]">
                        Empresa
                      </div>
                      <div className="mt-0.5">{fmtMoney(row.empresa)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#9b7f77]">
                        %
                      </div>
                      <div className="mt-0.5 font-black">{fmtPercent(row.porcentaje)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="grid shrink-0 gap-2 sm:grid-cols-2">
            <MiniResumen
              titulo="Caja usada"
              valor={fmtMoney(resultado.datos.cajaUsada)}
              nota="Base real de ingresos."
            />
            <MiniResumen
              titulo="Gasto neto"
              valor={fmtMoney(resultado.datos.gastoNeto)}
              nota="Con compensacion de emitidas."
            />
            <MiniResumen
              titulo="Emitidas caja"
              valor={fmtMoney(resultado.datos.emitidasCajaIgnoradas)}
              nota="No duplican caja."
            />
            <MiniResumen
              titulo="% sobre caja"
              valor={fmtPercent(resultado.datos.porcentaje)}
              nota="Peso del gasto neto."
              fuerte
            />
          </div>
        </section>
      </div>
    </section>
  );
}
