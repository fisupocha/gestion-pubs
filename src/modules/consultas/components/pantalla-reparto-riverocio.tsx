"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ClasificacionMapa } from "@/lib/clasificacion";
import type { MaestrosFormulario } from "@/modules/maestros/varios/data/obtener-maestros-formulario";
import { cargarOperativaConsultas } from "@/modules/consultas/utils/cargar-operativa-consultas";
import type { ConsultaState } from "@/modules/consultas/utils/estado-consultas";
import { consultaStateToQueryString } from "@/modules/consultas/utils/estado-consultas";
import {
  eliminarRepartoRiverocioManual,
  guardarRepartoRiverocioManual,
  listarRepartosRiverocioManuales,
  type RepartoRiverocioManual,
} from "@/modules/consultas/utils/reparto-riverocio";
import {
  obtenerMovimientosConsulta,
  OPERATIVA_CONSULTA_VACIA,
  type Movimiento,
} from "@/modules/consultas/utils/motor-consultas";

type PantallaRepartoRiverocioProps = {
  clasificacion: ClasificacionMapa;
  maestros: MaestrosFormulario;
  initialState: ConsultaState;
};

type EstadoEdicion = {
  movimientoId: string;
  porcentajes: Record<string, string>;
};

function fmtMoney(value: number) {
  return `${value.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} EUR`;
}

function fmtDate(value: string) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function norm(value?: string) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function esRiverocio(value?: string) {
  const normalized = norm(value);
  return normalized === "empresa" || normalized === "riverocio";
}

function parsePercent(value: string) {
  return Number(value.replace(",", ".").trim()) || 0;
}

function crearPorcentajesIniciales(locales: string[], reparto?: RepartoRiverocioManual) {
  return Object.fromEntries(
    locales.map((local) => [local, reparto ? String(reparto.porcentajes[local] ?? 0) : "0"])
  );
}

function esMovimientoRepartible(item: Movimiento) {
  if (!item.esEmpresa) {
    return false;
  }

  if (item.clase === "gasto") {
    return true;
  }

  return item.clase === "emitida" && !item.esEmitidaCaja;
}

function esEmitidaRiverocio(item: Movimiento) {
  return item.clase === "emitida" && !item.esEmitidaCaja;
}

const panelPrincipalClassName =
  "rounded-[30px] border border-[#d9c0b4] bg-[linear-gradient(180deg,rgba(255,251,248,0.98)_0%,rgba(244,233,227,0.98)_100%)] shadow-[0_22px_40px_rgba(85,52,46,0.10)]";
const chipRepartoClassName =
  "flex min-w-0 items-center gap-1.5 overflow-hidden rounded-[20px] border border-[#dbc3b8] bg-[linear-gradient(180deg,#fffdfb_0%,#f6ece7_100%)] px-2.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_16px_rgba(85,52,46,0.06)]";
const botonSecundarioClassName =
  "rounded-2xl border border-[#d5c2bc] bg-[linear-gradient(180deg,#fffdfb_0%,#f5ece8_100%)] px-4 py-2 text-sm font-black text-[#5f3a32] shadow-[0_10px_18px_rgba(85,52,46,0.08)] transition duration-150 hover:-translate-y-[1px] hover:border-[#b9796d]";
const botonPrimarioClassName =
  "rounded-2xl border border-[#9f6425] bg-[linear-gradient(180deg,#f5e3dc_0%,#edd4cb_100%)] px-4 py-2 text-sm font-black text-[#5a3025] shadow-[0_12px_20px_rgba(85,52,46,0.12)] transition duration-150 hover:-translate-y-[1px] hover:border-[#7f4718]";
const botonRestaurarClassName =
  "rounded-2xl border border-[#cda59b] bg-[linear-gradient(180deg,#fff8f5_0%,#f2dfd8_100%)] px-4 py-2 text-sm font-black text-[#8a4b3d] shadow-[0_10px_18px_rgba(85,52,46,0.08)] transition duration-150 hover:-translate-y-[1px] hover:border-[#b4695c]";

export function PantallaRepartoRiverocio({
  clasificacion,
  maestros,
  initialState,
}: PantallaRepartoRiverocioProps) {
  const columnasTablaClassName =
    "grid grid-cols-[108px_130px_132px_156px_minmax(0,1fr)_118px_max-content] gap-3";
  const [operativa, setOperativa] = useState(OPERATIVA_CONSULTA_VACIA);
  const [repartos, setRepartos] = useState<RepartoRiverocioManual[]>([]);
  const [edicion, setEdicion] = useState<EstadoEdicion | null>(null);
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      try {
        const [operativaData, repartosData] = await Promise.all([
          cargarOperativaConsultas(clasificacion),
          listarRepartosRiverocioManuales(),
        ]);

        if (cancelado) {
          return;
        }

        setOperativa(operativaData);
        setRepartos(repartosData);
      } catch (error) {
        console.error("No se pudo cargar el reparto manual de Riverocio", error);
      }
    };

    void cargar();

    return () => {
      cancelado = true;
    };
  }, [clasificacion]);

  const volverHref = useMemo(() => {
    const query = consultaStateToQueryString(initialState);
    return query ? `/consultas?${query}` : "/consultas";
  }, [initialState]);

  const localesOperativos = useMemo(
    () => maestros.locales.filter((local) => !esRiverocio(local)),
    [maestros.locales]
  );

  const repartosMap = useMemo(
    () => new Map(repartos.map((item) => [item.movimientoId, item])),
    [repartos]
  );

  const registrosRiverocio = useMemo(() => {
    return obtenerMovimientosConsulta(clasificacion, operativa)
      .filter(esMovimientoRepartible)
      .sort((a, b) => {
        if (a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha);
        return b.id.localeCompare(a.id);
      });
  }, [clasificacion, operativa]);

  function iniciarEdicion(item: Movimiento) {
    const reparto = repartosMap.get(item.id);
    setEdicion({
      movimientoId: item.id,
      porcentajes: crearPorcentajesIniciales(localesOperativos, reparto),
    });
    setErrorEdicion(null);
  }

  function cancelarEdicion() {
    setEdicion(null);
    setErrorEdicion(null);
  }

  async function guardarEdicion(item: Movimiento) {
    if (!edicion || edicion.movimientoId !== item.id) {
      return;
    }

    const porcentajes = Object.fromEntries(
      localesOperativos.map((local) => [local, round2(parsePercent(edicion.porcentajes[local] ?? "0"))])
    );
    const suma = round2(
      localesOperativos.reduce((acc, local) => acc + (porcentajes[local] ?? 0), 0)
    );

    if (suma !== 100) {
      setErrorEdicion("La suma debe ser 100.");
      return;
    }

    const repartoGuardado = await guardarRepartoRiverocioManual({
      movimientoId: item.id,
      origen: item.origen,
      registroId: Number(item.id.split("-").at(-1) ?? 0),
      porcentajes,
      updatedAt: new Date().toISOString(),
    });

    setRepartos((prev) => [
      ...prev.filter((registro) => registro.movimientoId !== repartoGuardado.movimientoId),
      repartoGuardado,
    ]);
    setEdicion(null);
    setErrorEdicion(null);
  }

  async function restaurarReparto(item: Movimiento) {
    await eliminarRepartoRiverocioManual(item.id);
    setRepartos((prev) => prev.filter((registro) => registro.movimientoId !== item.id));
    if (edicion?.movimientoId === item.id) {
      setEdicion(null);
      setErrorEdicion(null);
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col bg-transparent px-4 py-4">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1680px] flex-col gap-4 overflow-hidden">
        <header className={`${panelPrincipalClassName} p-5`}>
          <div className="flex items-center justify-between gap-5">
            <Link
              href={volverHref}
              className={botonSecundarioClassName}
            >
              Volver
            </Link>

            <div className="flex-1 text-center">
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-[#8a6458]">
                Consultas
              </div>
              <h1 className="mt-1 text-[42px] font-black tracking-[-0.03em] text-[#3f2a23]">
                Reparto Riverocio
              </h1>
              <p className="mt-2 text-sm text-[#6d5249]">
                Si no editas un registro, sigue con reparto por caja como siempre.
              </p>
              <div className="mt-3 inline-flex items-center rounded-full border border-[#e1cfc8] bg-white/65 px-4 py-1.5 text-[11px] font-semibold text-[#7a6057] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
                Manual solo cuando tú lo marques. El resto sigue automático.
              </div>
            </div>

            <div className="min-w-[210px] rounded-[24px] border border-[#dbc7bf] bg-[linear-gradient(180deg,#fffdfb_0%,#f4ece8_100%)] px-4 py-3 text-center text-sm text-[#6d5249] shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_10px_18px_rgba(85,52,46,0.06)]">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9a7c71]">
                Registros Riverocio
              </div>
              <div className="mt-1 text-2xl font-black text-[#4a2d28]">{registrosRiverocio.length}</div>
            </div>
          </div>
        </header>

        <section className={`${panelPrincipalClassName} flex min-h-0 flex-1 flex-col overflow-hidden p-4`}>
          <div className={`${columnasTablaClassName} border-b border-[#e3d1ca] px-5 pb-3 text-[11px] font-black uppercase tracking-[0.2em] text-[#8a6458]`}>
            <div>Fecha</div>
            <div>Tipo</div>
            <div>Familia</div>
            <div>Total factura</div>
            <div className="text-center">Reparto manual</div>
            <div>Estado</div>
            <div className="text-right">Accion</div>
          </div>

          <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
            {registrosRiverocio.map((item) => {
              const reparto = repartosMap.get(item.id);
              const editando = edicion?.movimientoId === item.id;
              const totalFactura = item.conIva;
              const esEmitida = esEmitidaRiverocio(item);
              const claseMovimientoLabel = esEmitida ? "Emitida" : "Gasto";
              const chipClaseClassName = esEmitida
                ? "inline-flex items-center rounded-full border border-[#7eb5c7] bg-[linear-gradient(180deg,#e6f7fb_0%,#cfeef6_100%)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#235a69]"
                : "inline-flex items-center rounded-full border border-[#d8b2a7] bg-[linear-gradient(180deg,#fff4ef_0%,#f4ddd4_100%)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#8a5144]";
              const tarjetaFilaClassName = reparto
                ? esEmitida
                  ? `${columnasTablaClassName} items-center rounded-[26px] border border-[#7ab4c6] bg-[linear-gradient(180deg,#f3fbfd_0%,#dff1f7_100%)] px-5 py-4 shadow-[0_18px_34px_rgba(41,96,116,0.12)]`
                  : `${columnasTablaClassName} items-center rounded-[26px] border border-[#cd8f82] bg-[linear-gradient(180deg,#fffaf8_0%,#f1e2db_100%)] px-5 py-4 shadow-[0_18px_34px_rgba(85,52,46,0.12)]`
                : esEmitida
                  ? `${columnasTablaClassName} items-center rounded-[26px] border border-[#c3dde6] bg-[linear-gradient(180deg,#fbfeff_0%,#edf7fa_100%)] px-5 py-4 shadow-[0_14px_24px_rgba(41,96,116,0.08)]`
                  : `${columnasTablaClassName} items-center rounded-[26px] border border-[#dcc7be] bg-[linear-gradient(180deg,#fffdfa_0%,#f7efea_100%)] px-5 py-4 shadow-[0_14px_24px_rgba(85,52,46,0.07)]`;
              const tarjetaTotalClassName = esEmitida
                ? "rounded-[20px] border border-[#a7cfdb] bg-[linear-gradient(180deg,#f6fdff_0%,#e1f4fa_100%)] px-3 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                : "rounded-[20px] border border-[#d8b4aa] bg-[linear-gradient(180deg,#fffaf7_0%,#f5e7e1_100%)] px-3 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]";
              const totalLabelClassName = esEmitida
                ? "text-[10px] font-black uppercase tracking-[0.16em] text-[#5d8d9b]"
                : "text-[10px] font-black uppercase tracking-[0.16em] text-[#9b756a]";
              const totalValueClassName = esEmitida
                ? "mt-0.5 text-base font-black text-[#255463]"
                : "mt-0.5 text-base font-black text-[#4a2d28]";
              const editadoClassName = esEmitida
                ? "rounded-full border border-[#5f9cb0] bg-[linear-gradient(180deg,#d8eff6_0%,#bae0ec_100%)] px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#225766] shadow-[0_8px_14px_rgba(41,96,116,0.10)]"
                : "rounded-full border border-[#b4695c] bg-[linear-gradient(180deg,#f2d8cf_0%,#e8c0b3_100%)] px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#7f392b] shadow-[0_8px_14px_rgba(85,52,46,0.10)]";

              return (
                <article
                  key={item.id}
                  className={tarjetaFilaClassName}
                >
                  <div className="rounded-2xl border border-[#e0cec7] bg-white/68 px-3 py-2 text-center text-sm font-black text-[#402a24] shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]">
                    {fmtDate(item.fecha)}
                  </div>
                  <div className="min-w-0">
                    <div className={chipClaseClassName}>{claseMovimientoLabel}</div>
                    <div className="mt-2 truncate text-sm font-semibold text-[#5f453f]">{item.tipoLabel}</div>
                  </div>
                  <div className="truncate text-sm font-semibold text-[#5f453f]">{item.familiaLabel}</div>
                  <div className={tarjetaTotalClassName}>
                    <div className={totalLabelClassName}>
                      Total
                    </div>
                    <div className={totalValueClassName}>{fmtMoney(totalFactura)}</div>
                  </div>

                  <div className="min-w-0">
                    {editando ? (
                      <div className="grid grid-cols-3 gap-1.5">
                        {localesOperativos.map((local) => {
                          const porcentaje = edicion?.porcentajes[local] ?? "0";
                          const dinero = round2(totalFactura * (parsePercent(porcentaje) / 100));

                          return (
                            <div key={local} className={chipRepartoClassName}>
                              <div className="min-w-[36px] text-[10px] font-black uppercase tracking-[0.08em] text-[#7f6259]">
                                {local}
                              </div>
                              <input
                                value={porcentaje}
                                onChange={(e) =>
                                  setEdicion((prev) =>
                                    prev && prev.movimientoId === item.id
                                      ? {
                                          ...prev,
                                          porcentajes: {
                                            ...prev.porcentajes,
                                            [local]: e.target.value,
                                          },
                                        }
                                      : prev
                                  )
                                }
                                className="w-[42px] rounded-xl border border-[#77a1aa] bg-[linear-gradient(180deg,#ffffff_0%,#eef5f6_100%)] px-1 py-1.5 text-center text-sm font-black text-[#173138] shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] outline-none"
                              />
                              <div className="text-[10px] font-semibold text-[#6f5a53]">%</div>
                              <div className="min-w-0 flex-1 text-right text-[10px] font-black text-[#5d4b45]">
                                {fmtMoney(dinero)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : reparto ? (
                      <div className="grid grid-cols-3 gap-1.5">
                        {localesOperativos.map((local) => {
                          const porcentaje = reparto.porcentajes[local] ?? 0;
                          const dinero = round2(totalFactura * (porcentaje / 100));

                          return (
                            <div key={local} className={chipRepartoClassName}>
                              <span className="min-w-[36px] text-[10px] font-black uppercase tracking-[0.08em] text-[#815b51]">
                                {local}
                              </span>
                              <span className="text-sm font-black text-[#4a2d28]">
                                {porcentaje.toLocaleString("es-ES", {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 2,
                                })}
                                %
                              </span>
                              <span className="min-w-0 flex-1 text-right text-[10px] font-black text-[#6a5751]">
                                {fmtMoney(dinero)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>

                  <div className="min-w-0 flex flex-col items-center justify-center gap-2">
                    {reparto ? (
                      <span className={editadoClassName}>
                        Editado
                      </span>
                    ) : null}
                    {editando && errorEdicion ? (
                      <span className="rounded-full border border-[#e1b4ac] bg-[#fff2ef] px-3 py-1 text-center text-[11px] font-bold text-[#a13d2f]">
                        {errorEdicion}
                      </span>
                    ) : null}
                  </div>

                  <div className="min-w-0 flex items-center justify-end">
                    {editando ? (
                      <div className="flex items-center gap-2 rounded-[22px] border border-[#decbc4] bg-white/70 px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]">
                        <button
                          type="button"
                          onClick={() => guardarEdicion(item)}
                          className={`${botonPrimarioClassName} px-3`}
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={cancelarEdicion}
                          className={`${botonSecundarioClassName} px-3`}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-[22px] border border-[#decbc4] bg-white/70 px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]">
                        <button
                          type="button"
                          onClick={() => iniciarEdicion(item)}
                          className={`${botonSecundarioClassName} px-3`}
                        >
                          Editar
                        </button>
                        {reparto ? (
                          <button
                            type="button"
                            onClick={() => restaurarReparto(item)}
                            className={`${botonRestaurarClassName} px-3`}
                          >
                            Restaurar
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}

            {registrosRiverocio.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-[#d8c0b9] bg-[linear-gradient(180deg,rgba(255,255,255,0.6)_0%,rgba(246,238,233,0.8)_100%)] px-6 py-14 text-center text-sm text-[#7f6259]">
                No hay registros de Riverocio para repartir.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}
