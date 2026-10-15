"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ClasificacionMapa } from "@/lib/clasificacion";
import { cargarOperativaConsultas } from "@/modules/consultas/utils/cargar-operativa-consultas";
import type { ConsultaState } from "@/modules/consultas/utils/estado-consultas";
import { consultaStateToQueryString } from "@/modules/consultas/utils/estado-consultas";
import {
  dividirCentesimas,
  etiquetaMesLarga,
  sumaImportes,
  tratamientoEmitida,
} from "@/modules/consultas/utils/imputacion-consulta";
import {
  OPERATIVA_CONSULTA_VACIA,
  obtenerMovimientosConsulta,
  type Movimiento,
} from "@/modules/consultas/utils/motor-consultas";
import {
  eliminarRepartoEspecial,
  guardarRepartoEspecial,
  listarRepartosEspeciales,
  validarMesesReparto,
  type RepartoEspecial,
} from "@/modules/consultas/utils/reparto-especial";

type PantallaRepartosEspecialesProps = {
  clasificacion: ClasificacionMapa;
  initialState: ConsultaState;
};

type ModoPantalla = "lista" | "buscar" | "editar";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const panel =
  "rounded-[30px] border border-[#d9c0b4] bg-[linear-gradient(180deg,rgba(255,251,248,0.98)_0%,rgba(244,233,227,0.98)_100%)] shadow-[0_22px_40px_rgba(85,52,46,0.10)]";
const botonSecundario =
  "rounded-2xl border border-[#d5c2bc] bg-[linear-gradient(180deg,#fffdfb_0%,#f5ece8_100%)] px-4 py-2 text-sm font-black text-[#5f3a32] shadow-[0_10px_18px_rgba(85,52,46,0.08)]";
const botonPrimario =
  "rounded-2xl border border-[#9f6425] bg-[linear-gradient(180deg,#f5e3dc_0%,#edd4cb_100%)] px-4 py-2 text-sm font-black text-[#5a3025] shadow-[0_12px_20px_rgba(85,52,46,0.12)] disabled:cursor-not-allowed disabled:opacity-50";

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

function norm(value?: string) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function registroIdDe(item: Movimiento) {
  return Number(item.id.split("-").at(-1) ?? 0);
}

function origenDe(item: Movimiento): RepartoEspecial["origen"] | null {
  if (item.origen === "facturas-emitidas" || item.origen === "facturas-recibidas") return item.origen;
  return null;
}

function notaTratamiento(item: Movimiento) {
  if (item.origen === "facturas-recibidas") {
    return "El gasto se imputa a los meses elegidos. El registro original de la factura no cambia.";
  }
  const tratamiento = tratamientoEmitida(item);
  if (tratamiento === "caja") {
    return `Cada mensualidad suma a la Caja de ${item.local}. No se prorratea entre otros locales.`;
  }
  if (tratamiento === "contabilidad") {
    return "Esta factura queda fuera de Caja y del resultado de Consultas. Guardar meses no le crea un efecto económico.";
  }
  if (tratamiento === "compensacion") {
    return `Cada mensualidad resta el gasto de ${item.familiaLabel}${item.subfamilia ? ` / ${item.subfamilia}` : ""}. Si el local es Riverocio, el reparto entre locales se calcula después, con la Caja de cada mes.`;
  }
  return "Consultas mantiene el tratamiento actual de esta factura y solo cambia el mes de imputación.";
}

function textoMeses(meses: string[]) {
  return [...meses].sort().map((mes) => etiquetaMesLarga(mes)).join(", ");
}

export function PantallaRepartosEspeciales({
  clasificacion,
  initialState,
}: PantallaRepartosEspecialesProps) {
  const [operativa, setOperativa] = useState(OPERATIVA_CONSULTA_VACIA);
  const [repartos, setRepartos] = useState<RepartoEspecial[]>([]);
  const [disponible, setDisponible] = useState(true);
  const [mensajePersistencia, setMensajePersistencia] = useState<string | null>(null);
  const [modo, setModo] = useState<ModoPantalla>("lista");
  const [busqueda, setBusqueda] = useState("");
  const [seleccionId, setSeleccionId] = useState<string | null>(null);
  const [anio, setAnio] = useState("2026");
  const [meses, setMeses] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [confirmarId, setConfirmarId] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      try {
        const [operativaData, listado] = await Promise.all([
          cargarOperativaConsultas(clasificacion),
          listarRepartosEspeciales(),
        ]);
        if (cancelado) return;
        setOperativa(operativaData);
        setRepartos(listado.repartos);
        setDisponible(listado.disponible);
        setMensajePersistencia(listado.mensaje);
      } catch (causa) {
        console.error("No se pudieron cargar los repartos especiales", causa);
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

  const facturas = useMemo(() => {
    return obtenerMovimientosConsulta(clasificacion, operativa)
      .filter((item) => item.origen === "facturas-emitidas" || item.origen === "facturas-recibidas")
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));
  }, [clasificacion, operativa]);

  const facturasPorId = useMemo(
    () => new Map(facturas.map((item) => [item.id, item])),
    [facturas]
  );

  const guardados = useMemo(() => {
    return [...repartos].sort((a, b) => {
      const fechaA = facturasPorId.get(a.movimientoId)?.fecha ?? "";
      const fechaB = facturasPorId.get(b.movimientoId)?.fecha ?? "";
      if (fechaA !== fechaB) return fechaB.localeCompare(fechaA);
      return b.movimientoId.localeCompare(a.movimientoId);
    });
  }, [facturasPorId, repartos]);

  const seleccion = facturas.find((item) => item.id === seleccionId) ?? null;
  const texto = norm(busqueda);
  const coincidencias = texto
    ? facturas.filter((item) =>
        [
          item.fecha,
          item.numeroFactura,
          item.cliente,
          item.proveedor,
          item.local,
          item.tipoLabel,
          item.familiaLabel,
          item.subfamilia,
          item.id,
        ].some((campo) => norm(campo).includes(texto))
      )
    : [];

  const mesesOrdenados = useMemo(() => [...meses].sort(), [meses]);
  const previewCon = dividirCentesimas(seleccion?.conIva ?? 0, mesesOrdenados.length);
  const previewSin = dividirCentesimas(seleccion?.sinIva ?? 0, mesesOrdenados.length);

  function abrirBuscador() {
    setModo("buscar");
    setBusqueda("");
    setSeleccionId(null);
    setMeses([]);
    setError(null);
    setAviso(null);
    setConfirmarId(null);
  }

  function volverAlListado() {
    setModo("lista");
    setBusqueda("");
    setSeleccionId(null);
    setMeses([]);
    setError(null);
    setConfirmarId(null);
  }

  function abrirEditor(item: Movimiento, mesesIniciales: string[]) {
    setModo("editar");
    setSeleccionId(item.id);
    setMeses(mesesIniciales);
    setAnio(mesesIniciales[0]?.slice(0, 4) || item.fecha.slice(0, 4) || "2026");
    setError(null);
    setAviso(null);
    setConfirmarId(null);
  }

  function editarGuardado(reparto: RepartoEspecial) {
    const factura = facturasPorId.get(reparto.movimientoId);
    if (!factura) {
      setError("No se ha encontrado la factura de este reparto. Se puede quitar la configuración sin modificar la factura.");
      return;
    }
    abrirEditor(factura, reparto.meses);
  }

  function alternarMes(mes: string) {
    setMeses((prev) => (prev.includes(mes) ? prev.filter((item) => item !== mes) : [...prev, mes]));
    setError(null);
    setAviso(null);
  }

  async function guardar() {
    if (!seleccion) return;
    const origen = origenDe(seleccion);
    const registroId = registroIdDe(seleccion);
    const validacion = validarMesesReparto(mesesOrdenados);
    if (!origen || registroId <= 0 || validacion) {
      setError(validacion ?? "La factura seleccionada no se puede repartir.");
      return;
    }
    if (!disponible) {
      setError(mensajePersistencia ?? "La persistencia todavía no está disponible.");
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      const guardado = await guardarRepartoEspecial({
        movimientoId: seleccion.id,
        origen,
        registroId,
        meses: mesesOrdenados,
        updatedAt: new Date().toISOString(),
      });
      setRepartos((prev) => [
        ...prev.filter((item) => item.movimientoId !== guardado.movimientoId),
        guardado,
      ]);
      setAviso("Reparto especial guardado. La factura original no se ha modificado.");
      volverAlListado();
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "No se pudo guardar el reparto.");
    } finally {
      setGuardando(false);
    }
  }

  async function quitar(movimientoId: string) {
    if (confirmarId !== movimientoId) {
      setConfirmarId(movimientoId);
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await eliminarRepartoEspecial(movimientoId);
      setRepartos((prev) => prev.filter((item) => item.movimientoId !== movimientoId));
      setConfirmarId(null);
      setAviso("Reparto especial quitado. La factura original sigue igual y vuelve a imputarse en el mes de su fecha.");
      if (seleccionId === movimientoId) {
        volverAlListado();
      }
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "No se pudo quitar el reparto.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col bg-transparent px-4 py-4">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1680px] flex-col gap-4 overflow-hidden">
        <header className={`${panel} p-5`}>
          <div className="flex items-center justify-between gap-5">
            <Link href={volverHref} className={botonSecundario}>
              Volver
            </Link>
            <div className="flex-1 text-center">
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-[#8a6458]">
                Consultas
              </div>
              <h1 className="mt-1 text-[42px] font-black tracking-[-0.03em] text-[#3f2a23]">
                Repartos especiales
              </h1>
            </div>
            <button type="button" className={botonPrimario} onClick={abrirBuscador}>
              Añadir reparto
            </button>
          </div>
          <p className="mx-auto mt-3 max-w-3xl text-center text-sm leading-6 text-[#6d5149]">
            Primero se reparte el importe a partes iguales entre los meses elegidos. Después, si la factura es de Riverocio, Consultas reparte cada mensualidad entre locales con la Caja de cada mes.
          </p>
        </header>

        {mensajePersistencia ? (
          <p className={`${panel} px-5 py-3 text-sm font-semibold text-[#8a5144]`}>{mensajePersistencia}</p>
        ) : null}
        {aviso && modo === "lista" ? (
          <p className={`${panel} px-5 py-3 text-sm font-semibold text-[#5f3a32]`}>{aviso}</p>
        ) : null}
        {error && modo === "lista" ? (
          <p className={`${panel} px-5 py-3 text-sm font-semibold text-[#8a5144]`}>{error}</p>
        ) : null}

        {modo === "buscar" ? (
          <section className={`${panel} flex min-h-0 flex-1 flex-col p-5`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black text-[#3f2a23]">Buscar factura</h2>
              <button type="button" className={botonSecundario} onClick={volverAlListado}>
                Cerrar buscador
              </button>
            </div>
            <input
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por fecha, número, cliente, proveedor, local o familia"
              className="mt-4 rounded-2xl border border-[#d7bbb3] bg-white px-4 py-3 text-sm text-[#3f2a23] outline-none focus:border-[#9f6425]"
            />
            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {texto ? (
                coincidencias.slice(0, 40).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => abrirEditor(item, [])}
                    className="w-full rounded-[22px] border border-[#e4d3cc] bg-white/70 px-4 py-3 text-left"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-black text-[#3f2a23]">
                        {fmtDate(item.fecha)} · {item.numeroFactura || "sin número"}
                      </div>
                      <div className="text-sm font-black text-[#6b3022]">{fmtMoney(item.conIva)}</div>
                    </div>
                    <div className="mt-1 text-xs text-[#6d5149]">
                      {item.origen === "facturas-emitidas" ? "Emitida" : "Recibida"} · {item.cliente || item.proveedor || "-"} · {item.local}
                    </div>
                    <div className="mt-1 text-xs text-[#6d5149]">
                      {item.tipoLabel} / {item.familiaLabel}
                      {item.subfamilia ? ` / ${item.subfamilia}` : ""}
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-sm leading-6 text-[#6d5149]">
                  Escribe para localizar una factura entre todas las recibidas y emitidas.
                </p>
              )}
              {texto && coincidencias.length === 0 ? (
                <p className="text-sm text-[#8a6458]">No hay facturas con ese texto.</p>
              ) : null}
            </div>
          </section>
        ) : null}

        {modo === "editar" && seleccion ? (
          <section className={`${panel} min-h-0 flex-1 overflow-y-auto p-5`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a6458]">
                  Factura seleccionada
                </div>
                <h2 className="mt-1 text-2xl font-black text-[#3f2a23]">
                  {seleccion.cliente || seleccion.proveedor || "Sin contraparte"}
                </h2>
              </div>
              <button type="button" className={botonSecundario} onClick={volverAlListado}>
                Cerrar editor
              </button>
            </div>
            <div className="mt-4 grid gap-2 text-sm text-[#5f453f] sm:grid-cols-2">
              <div>Fecha: {fmtDate(seleccion.fecha)}</div>
              <div>Número: {seleccion.numeroFactura || "-"}</div>
              <div>Local: {seleccion.local}</div>
              <div>Tipo: {seleccion.tipoLabel}</div>
              <div>Familia: {seleccion.familiaLabel}</div>
              <div>Subfamilia: {seleccion.subfamilia || "-"}</div>
              <div>Sin IVA: {fmtMoney(seleccion.sinIva)}</div>
              <div>IVA: {fmtMoney(seleccion.iva)}</div>
              <div>Total: {fmtMoney(seleccion.conIva)}</div>
            </div>
            <p className="mt-4 rounded-2xl bg-white/70 px-4 py-3 text-sm leading-6 text-[#6d5149]">
              {notaTratamiento(seleccion)}
            </p>

            <div className="mt-4 flex items-center gap-3">
              <label className="text-sm font-black text-[#5f3a32]" htmlFor="anio-reparto">
                Año
              </label>
              <input
                id="anio-reparto"
                value={anio}
                onChange={(event) => setAnio(event.target.value.replace(/[^\d]/g, "").slice(0, 4))}
                className="w-28 rounded-2xl border border-[#d7bbb3] bg-white px-3 py-2 text-center text-sm font-black text-[#3f2a23] outline-none"
              />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {MESES.map((nombre, index) => {
                const mes = `${anio || "0000"}-${String(index + 1).padStart(2, "0")}`;
                const activo = meses.includes(mes);
                return (
                  <button
                    key={nombre}
                    type="button"
                    disabled={!/^\d{4}$/.test(anio)}
                    onClick={() => alternarMes(mes)}
                    className={`rounded-2xl border px-3 py-2 text-sm font-black ${
                      activo
                        ? "border-[#9f6425] bg-[#f3d7cc] text-[#6b3022]"
                        : "border-[#e4d3cc] bg-white text-[#6d5149]"
                    }`}
                  >
                    {nombre}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {mesesOrdenados.map((mes) => (
                <button
                  key={mes}
                  type="button"
                  onClick={() => alternarMes(mes)}
                  className="rounded-full border border-[#d8b4aa] bg-white px-3 py-1 text-xs font-black text-[#6b3022]"
                >
                  {etiquetaMesLarga(mes)} ×
                </button>
              ))}
            </div>
            {mesesOrdenados.length > 0 ? (
              <div className="mt-4 overflow-hidden rounded-[22px] border border-[#ead9d3]">
                <div className="grid grid-cols-[1.4fr_1fr_1fr] bg-[#f6ebe6] px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#8a6458]">
                  <div>Mes</div>
                  <div className="text-right">Sin IVA</div>
                  <div className="text-right">Con IVA</div>
                </div>
                {mesesOrdenados.map((mes, index) => (
                  <div key={mes} className="grid grid-cols-[1.4fr_1fr_1fr] border-t border-[#f0e3de] px-4 py-2 text-sm text-[#4b332d]">
                    <div>{etiquetaMesLarga(mes)}</div>
                    <div className="text-right">{fmtMoney(previewSin[index] ?? 0)}</div>
                    <div className="text-right">{fmtMoney(previewCon[index] ?? 0)}</div>
                  </div>
                ))}
                <div className="grid grid-cols-[1.4fr_1fr_1fr] border-t border-[#ead9d3] px-4 py-2 text-sm font-black text-[#3f2a23]">
                  <div>Suma</div>
                  <div className="text-right">{fmtMoney(sumaImportes(previewSin))}</div>
                  <div className="text-right">{fmtMoney(sumaImportes(previewCon))}</div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[#8a6458]">Marca uno o varios meses para ver la vista previa.</p>
            )}
            {error ? <p className="mt-3 text-sm font-semibold text-[#8a5144]">{error}</p> : null}
            <div className="mt-4">
              <button type="button" className={botonPrimario} disabled={guardando || mesesOrdenados.length === 0} onClick={() => void guardar()}>
                Guardar reparto
              </button>
            </div>
          </section>
        ) : null}

        {modo === "lista" ? (
          <section className={`${panel} min-h-0 flex-1 overflow-y-auto p-5`}>
            {guardados.length === 0 ? (
              <p className="text-center text-lg font-black text-[#5f3a32]">Todavía no hay repartos especiales</p>
            ) : (
              <div className="space-y-3">
                {guardados.map((reparto) => {
                  const factura = facturasPorId.get(reparto.movimientoId);
                  return (
                    <article key={reparto.movimientoId} className="rounded-[22px] border border-[#e4d3cc] bg-white/75 px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-black text-[#3f2a23]">
                            {factura ? fmtDate(factura.fecha) : "Sin fecha"} · {factura?.numeroFactura || reparto.movimientoId}
                          </div>
                          <div className="mt-1 text-sm text-[#5f453f]">
                            {factura?.cliente || factura?.proveedor || "Factura no localizada"} · {factura?.local || "-"}
                          </div>
                          <div className="mt-1 text-sm text-[#5f453f]">
                            {factura ? `${factura.tipoLabel} / ${factura.familiaLabel}${factura.subfamilia ? ` / ${factura.subfamilia}` : ""}` : reparto.origen}
                          </div>
                          <div className="mt-2 text-sm font-semibold text-[#6d5149]">
                            Meses: {textoMeses(reparto.meses)}
                          </div>
                        </div>
                        <div className="text-right text-sm font-black text-[#6b3022]">
                          {factura ? fmtMoney(factura.conIva) : "-"}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" className={botonPrimario} onClick={() => editarGuardado(reparto)}>
                          Editar
                        </button>
                        <button type="button" className={botonSecundario} disabled={guardando} onClick={() => void quitar(reparto.movimientoId)}>
                          {confirmarId === reparto.movimientoId ? "Confirmar quitar" : "Quitar reparto"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </section>
  );
}
