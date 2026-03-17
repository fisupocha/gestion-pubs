"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CampoFecha } from "@/components/ui/campo-fecha";
import type { ClasificacionMapa } from "@/lib/clasificacion";
import type { MaestrosFormulario } from "@/modules/maestros/varios/data/obtener-maestros-formulario";
import {
  calcularConsulta,
  obtenerFamiliasDisponibles,
  obtenerSubfamiliasDisponibles,
  obtenerTiposDisponibles,
} from "@/modules/consultas/utils/motor-consultas";
import {
  consultaStateToQueryString,
  ESTADO_CONSULTA_INICIAL,
} from "@/modules/consultas/utils/estado-consultas";

type PantallaConsultasProps = {
  clasificacion: ClasificacionMapa;
  maestros: MaestrosFormulario;
};

const panel =
  "rounded-[24px] border border-[#d2b7aa] bg-[linear-gradient(180deg,rgba(250,244,241,0.98)_0%,rgba(238,226,221,0.98)_100%)] shadow-[0_16px_28px_rgba(85,52,46,0.08)]";
const input =
  "w-full rounded-2xl border border-[#d7bbb3] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] px-3 py-2 text-center text-sm text-[#2e211d] shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_4px_10px_rgba(85,52,46,0.04)] outline-none placeholder:text-[#a78f88]";

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

function ChipMulti({
  titulo,
  items,
  selected,
  onToggle,
  empty,
}: {
  titulo: string;
  items: string[];
  selected: string[];
  onToggle: (value: string) => void;
  empty: string;
}) {
  return (
    <section className={`${panel} flex min-h-0 flex-col gap-2 p-3`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8a6458]">
          {titulo}
        </div>
        <div className="rounded-full border border-[#d8c0b9] bg-[rgba(255,250,248,0.86)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8d6f67]">
          {selected.length}
        </div>
      </div>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#dcc8c2] bg-[rgba(255,250,248,0.65)] px-3 py-3 text-center text-xs text-[#9d817a]">
          {empty}
        </div>
      ) : (
        <div className="max-h-[124px] overflow-y-auto rounded-2xl border border-[#e3d2cb] bg-[rgba(255,250,248,0.55)] p-2">
          <div className="flex flex-wrap gap-2">
            {items.map((item) => {
              const active = selected.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => onToggle(item)}
                  className={
                    active
                      ? "rounded-2xl border border-[#b9796d] bg-[linear-gradient(180deg,#f5e3dc_0%,#edd4cb_100%)] px-2.5 py-1.5 text-xs font-semibold text-[#4a2d28]"
                      : "rounded-2xl border border-[#dcc8c2] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] px-2.5 py-1.5 text-xs font-semibold text-[#765650]"
                  }
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
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
          ? "rounded-[22px] border border-[#b9796d] bg-[linear-gradient(180deg,#f2d8cf_0%,#e8c0b3_100%)] p-3 shadow-[0_12px_20px_rgba(85,52,46,0.12)]"
          : `${panel} p-3`
      }
    >
      <div className={`text-[10px] font-black uppercase tracking-[0.18em] ${fuerte ? "text-[#884b3d]" : "text-[#8a6458]"}`}>
        {titulo}
      </div>
      <div className={`mt-1 text-2xl font-black tracking-tight ${fuerte ? "text-[#6b3022]" : "text-[#432c26]"}`}>
        {valor}
      </div>
      <div className={`mt-1 text-xs leading-5 ${fuerte ? "text-[#8a5144]" : "text-[#7b635b]"}`}>
        {nota}
      </div>
    </section>
  );
}

export function PantallaConsultas({ clasificacion, maestros }: PantallaConsultasProps) {
  const [state, setState] = useState(ESTADO_CONSULTA_INICIAL);

  const tiposDisponibles = useMemo(() => obtenerTiposDisponibles(clasificacion), [clasificacion]);
  const familiasDisponibles = useMemo(
    () => obtenerFamiliasDisponibles(clasificacion, state.tiposSeleccionados),
    [clasificacion, state.tiposSeleccionados]
  );
  const subfamiliasDisponibles = useMemo(
    () => obtenerSubfamiliasDisponibles(clasificacion, state.familiasSeleccionadas),
    [clasificacion, state.familiasSeleccionadas]
  );

  const resultado = useMemo(
    () =>
      calcularConsulta({
        clasificacion,
        maestros,
        state,
      }),
    [clasificacion, maestros, state]
  );

  const detalleHref = useMemo(() => {
    const query = consultaStateToQueryString(state);
    return query ? `/consultas/detalle?${query}` : "/consultas/detalle";
  }, [state]);

  return (
    <section className="flex h-full min-h-0 flex-col gap-3 p-3">
      <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[1.2fr_0.9fr]">
        <section className="flex min-h-0 flex-col gap-3">
          <section className={`${panel} flex flex-col gap-3 p-3`}>
            <div className="grid gap-3 xl:grid-cols-[1.15fr_0.82fr_0.82fr_0.78fr]">
              <section className="rounded-[22px] border border-[#d8c0b9] bg-[rgba(255,250,248,0.68)] p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6458]">
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
                        }))
                      }
                      className={
                        state.localesSeleccionados.includes(local)
                          ? "rounded-2xl border border-[#b9796d] bg-[linear-gradient(180deg,#f5e3dc_0%,#edd4cb_100%)] px-3 py-1.5 text-xs font-semibold text-[#4a2d28]"
                          : "rounded-2xl border border-[#dcc8c2] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] px-3 py-1.5 text-xs font-semibold text-[#765650]"
                      }
                    >
                      {local}
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-[22px] border border-[#d8c0b9] bg-[rgba(255,250,248,0.68)] p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6458]">
                  Desde
                </div>
                <CampoFecha
                  value={state.desde}
                  onChange={(e) => setState((prev) => ({ ...prev, desde: e.target.value }))}
                  className={`${input} mt-2`}
                />
              </section>

              <section className="rounded-[22px] border border-[#d8c0b9] bg-[rgba(255,250,248,0.68)] p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6458]">
                  Hasta
                </div>
                <CampoFecha
                  value={state.hasta}
                  onChange={(e) => setState((prev) => ({ ...prev, hasta: e.target.value }))}
                  className={`${input} mt-2`}
                />
              </section>

              <section className="rounded-[22px] border border-[#d8c0b9] bg-[rgba(255,250,248,0.68)] p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6458]">
                  IVA
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setState((prev) => ({ ...prev, modoIva: "con" }))}
                    className={
                      state.modoIva === "con"
                        ? "rounded-2xl border border-[#b9796d] bg-[linear-gradient(180deg,#f5e3dc_0%,#edd4cb_100%)] px-2 py-1.5 text-xs font-bold text-[#4a2d28]"
                        : "rounded-2xl border border-[#dcc8c2] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] px-2 py-1.5 text-xs font-semibold text-[#765650]"
                    }
                  >
                    Con
                  </button>
                  <button
                    type="button"
                    onClick={() => setState((prev) => ({ ...prev, modoIva: "sin" }))}
                    className={
                      state.modoIva === "sin"
                        ? "rounded-2xl border border-[#b9796d] bg-[linear-gradient(180deg,#f5e3dc_0%,#edd4cb_100%)] px-2 py-1.5 text-xs font-bold text-[#4a2d28]"
                        : "rounded-2xl border border-[#dcc8c2] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] px-2 py-1.5 text-xs font-semibold text-[#765650]"
                    }
                  >
                    Sin
                  </button>
                </div>
              </section>
            </div>

            <div className="grid gap-3 xl:grid-cols-3">
              <ChipMulti
                titulo="Tipos"
                items={tiposDisponibles}
                selected={state.tiposSeleccionados}
                onToggle={(value) =>
                  setState((prev) => {
                    const tiposSeleccionados = toggleValue(prev.tiposSeleccionados, value);
                    const familiasDisponiblesNext = obtenerFamiliasDisponibles(
                      clasificacion,
                      tiposSeleccionados
                    );
                    const familiasSeleccionadas = filtrarSeleccion(
                      prev.familiasSeleccionadas,
                      familiasDisponiblesNext
                    );
                    const subfamiliasDisponiblesNext = obtenerSubfamiliasDisponibles(
                      clasificacion,
                      familiasSeleccionadas
                    );
                    const subfamiliasSeleccionadas = filtrarSeleccion(
                      prev.subfamiliasSeleccionadas,
                      subfamiliasDisponiblesNext
                    );

                    return {
                      ...prev,
                      tiposSeleccionados,
                      familiasSeleccionadas,
                      subfamiliasSeleccionadas,
                    };
                  })
                }
                empty="No hay tipos."
              />
              <ChipMulti
                titulo="Fam"
                items={familiasDisponibles}
                selected={state.familiasSeleccionadas}
                onToggle={(value) =>
                  setState((prev) => {
                    const familiasSeleccionadas = toggleValue(prev.familiasSeleccionadas, value);
                    const subfamiliasDisponiblesNext = obtenerSubfamiliasDisponibles(
                      clasificacion,
                      familiasSeleccionadas
                    );
                    const subfamiliasSeleccionadas = filtrarSeleccion(
                      prev.subfamiliasSeleccionadas,
                      subfamiliasDisponiblesNext
                    );

                    return {
                      ...prev,
                      familiasSeleccionadas,
                      subfamiliasSeleccionadas,
                    };
                  })
                }
                empty="Selecciona tipos."
              />
              <ChipMulti
                titulo="Sub"
                items={subfamiliasDisponibles}
                selected={state.subfamiliasSeleccionadas}
                onToggle={(value) =>
                  setState((prev) => ({
                    ...prev,
                    subfamiliasSeleccionadas: toggleValue(prev.subfamiliasSeleccionadas, value),
                  }))
                }
                empty="Selecciona familias."
              />
            </div>
          </section>

          <div className="grid gap-3 xl:grid-cols-2">
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
              nota="Peso de la seleccion."
              fuerte
            />
          </div>
        </section>

        <section className="flex min-h-0 flex-col gap-3">
          <section className={`${panel} flex flex-col gap-3 p-3`}>
            <div className="rounded-[20px] border border-[#6f5149] bg-[linear-gradient(180deg,#4b3530_0%,#2d211e_100%)] p-4 text-[#fff4ec] shadow-[0_16px_28px_rgba(36,24,20,0.22)]">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#d7bfb6]">
                Lectura activa
              </div>
              <div className="mt-1 text-lg font-black leading-tight">{resultado.textoLocales}</div>
              <div className="mt-2 text-sm leading-6 text-[#ead8d1]">
                {resultado.datos.aplicarReparto
                  ? "Locales operativos con reparto de Empresa por caja."
                  : "Total grupo con Empresa como bloque propio."}
              </div>
              <div className="mt-3 grid gap-2 xl:grid-cols-2">
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

            <div className="grid gap-2 xl:grid-cols-2">
              <Link
                href={detalleHref}
                className="rounded-2xl border border-[#b9796d] bg-[linear-gradient(180deg,#f5e3dc_0%,#edd4cb_100%)] px-4 py-2 text-center text-sm font-black text-[#5a3025]"
              >
                Abrir detalle
              </Link>
              <button
                type="button"
                onClick={() => setState(ESTADO_CONSULTA_INICIAL)}
                className="rounded-2xl border border-[#dcc8c2] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] px-4 py-2 text-sm font-bold text-[#765650]"
              >
                Limpiar filtros
              </button>
            </div>
          </section>

          <section className={`${panel} flex min-h-0 flex-col gap-2 p-3`}>
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8a6458]">
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
                      <div className="mt-1 font-black">{row.local}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#9b7f77]">
                        Caja
                      </div>
                      <div className="mt-1">{fmtMoney(row.caja)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#9b7f77]">
                        Directo
                      </div>
                      <div className="mt-1">{fmtMoney(row.directo)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#9b7f77]">
                        Emitidas
                      </div>
                      <div className="mt-1">{fmtMoney(row.emitidas)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#9b7f77]">
                        Empresa
                      </div>
                      <div className="mt-1">{fmtMoney(row.empresa)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#9b7f77]">
                        %
                      </div>
                      <div className="mt-1 font-black">{fmtPercent(row.porcentaje)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </section>
      </div>
    </section>
  );
}
