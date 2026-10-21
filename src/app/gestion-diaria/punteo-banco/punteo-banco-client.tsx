"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { aCentimos, formatearCentimos } from "@/modules/punteo-banco/centimos";
import { formatearImporte } from "@/modules/punteo-banco/celdas";
import { calcularCoberturaExtracto } from "@/modules/punteo-banco/cobertura-extracto";
import { consultarMovimientos, type ConsultaMovimiento } from "@/modules/punteo-banco/consulta-movimientos";
import {
  LOCALES_PUNTEO_GUARDADOS,
  type ColumnaOrdenPunteo,
  type FiltroLocal,
} from "@/modules/punteo-banco/locales-punteo";
import {
  ANIO_INICIAL_PUNTEO,
  ANIOS_PUNTEO,
  BANCOS_PUNTEO,
  type BancoPunteoId,
  type EstadoOk,
  formatearFechaIso,
  nombreBanco,
} from "@/modules/punteo-banco/modelo";
import { requiereConfirmacionManual, textoConfirmacionManual } from "@/modules/punteo-banco/decision-estado";
import type { MovimientoInterno, PeriodoBanco } from "@/modules/punteo-banco/movimiento-interno";
import { conexionPunteoActiva } from "@/modules/punteo-banco/conexion-punteo";
import { referenciaVigente } from "@/modules/punteo-banco/referencias-iniciales";
import { presentarTpvOficial } from "@/modules/punteo-banco/paginacion-tpv";
import { resumirTpvAnual } from "@/modules/punteo-banco/resumen-tpv-calculo";
import {
  botonCompacto,
  botonCompactoPrimario,
  botonPestana,
  botonPestanaActiva,
  botonPestanaInactiva,
} from "./clases";
import { CoincidenciasTpv } from "./coincidencias-tpv";
import { DialogoCambios } from "./dialogo-cambios";
import { DialogoDetalleTpv } from "./dialogo-detalle-tpv";
import { DialogoConfirmarImportacion } from "./dialogo-confirmar-importacion";
import { DialogoCorreccionEstado } from "./dialogo-correccion-estado";
import { DialogoImportacionOficial } from "./dialogo-importacion-oficial";
import { DialogoMotivoOficial } from "./dialogo-motivo-oficial";
import { ReferenciaRegistrada } from "./referencia-registrada";
import { SeparacionBorrador } from "./separacion-borrador";
import { ResumenTpv } from "./resumen-tpv";
import { RevisionConjunta } from "./revision-conjunta";
import { TablaMovimientos } from "./tabla-movimientos";
import { useArchivadorPunteo, type AvisoPunteo } from "./use-archivador-punteo";
import { useModoOficial, type ConsultaOficial } from "./use-modo-oficial";

type VistaPunteo = "banco" | "revision";

type AccionNavegacion =
  | { tipo: "banco"; banco: BancoPunteoId }
  | { tipo: "anio"; anio: number }
  | { tipo: "revision" }
  | { tipo: "cerrar" }
  | { tipo: "historial" };

const MENSAJE_GUARDADO =
  "Punteo conservado en este navegador. No se ha escrito ningún registro en la base de datos.";

function textoLineaExtracto(cobertura: {
  ultimoDiaCubierto: string | null;
  proximoPeriodoPendiente: { desde: string; hasta: string | null } | null;
}) {
  if (!cobertura.ultimoDiaCubierto || !cobertura.proximoPeriodoPendiente) {
    return "Sin periodo de extracto confirmado.";
  }

  const ultimo = formatearFechaIso(cobertura.ultimoDiaCubierto);
  const desde = formatearFechaIso(cobertura.proximoPeriodoPendiente.desde);
  const hasta = cobertura.proximoPeriodoPendiente.hasta
    ? ` hasta ${formatearFechaIso(cobertura.proximoPeriodoPendiente.hasta)}`
    : "";

  return `Último día cubierto: ${ultimo} · Próximo extracto: desde ${desde}${hasta}`;
}

function textoAccion(accion: AccionNavegacion) {
  switch (accion.tipo) {
    case "banco":
      return `cambiar a ${nombreBanco(accion.banco)}`;
    case "anio":
      return `cambiar al año ${accion.anio}`;
    case "revision":
      return "abrir la revisión conjunta";
    case "cerrar":
      return "cerrar Punteo banco";
    case "historial":
      return "salir de esta pantalla";
  }
}

function hoyLocal() {
  const fecha = new Date();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function recortarAlAnio(periodos: PeriodoBanco[], banco: BancoPunteoId, anio: number) {
  const inicio = `${anio}-01-01`;
  const fin = `${anio}-12-31`;

  return periodos
    .filter((periodo) => periodo.banco === banco && periodo.hasta >= inicio && periodo.desde <= fin)
    .map((periodo) => ({
      desde: periodo.desde < inicio ? inicio : periodo.desde,
      hasta: periodo.hasta > fin ? fin : periodo.hasta,
    }));
}

export function PunteoBancoClient() {
  const router = useRouter();
  const archivoRef = useRef<HTMLInputElement>(null);
  const [bancoId, setBancoId] = useState<BancoPunteoId>("caixabank");
  const [anio, setAnio] = useState(ANIO_INICIAL_PUNTEO);
  const [vista, setVista] = useState<VistaPunteo>("banco");
  const [filtroLocal, setFiltroLocal] = useState<FiltroLocal>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [columnaOrden, setColumnaOrden] = useState<ColumnaOrdenPunteo>("orden_banco");
  const [ascendente, setAscendente] = useState(false);
  const [mesTpv, setMesTpv] = useState<number | null>(null);
  const [correccion, setCorreccion] = useState<{ id: string; estado: EstadoOk; motivo: string } | null>(null);
  const [accionPendiente, setAccionPendiente] = useState<AccionNavegacion | null>(null);
  const [navegacionNota, setNavegacionNota] = useState<AccionNavegacion | null>(null);
  const [aviso, setAviso] = useState<AvisoPunteo | null>(null);
  const omitirPopstate = useRef(0);
  const archivadorPunteo = useArchivadorPunteo();
  const {
    archivador,
    listo,
    hayCambios,
    paso,
    guardar,
    descartar,
    actualizarMovimiento,
    corregirEstadoConfirmado,
    importarArchivo,
    confirmarImportacion,
    cancelarImportacion,
  } = archivadorPunteo;
  const consultaOficial = useMemo<ConsultaOficial>(
    () => ({
      filtroLocal,
      busqueda: busquedaAplicada,
      columna: columnaOrden,
      ascendente,
    }),
    [ascendente, busquedaAplicada, columnaOrden, filtroLocal]
  );
  const modo = useModoOficial(bancoId, anio, consultaOficial);

  useEffect(() => {
    const espera = window.setTimeout(() => setBusquedaAplicada(busqueda), 250);
    return () => window.clearTimeout(espera);
  }, [busqueda]);
  const hoy = useMemo(() => hoyLocal(), []);
  const bancoNombre = nombreBanco(bancoId);

  const cobertura = useMemo(
    () =>
      calcularCoberturaExtracto(
        recortarAlAnio(archivador.periodos, bancoId, anio),
        recortarAlAnio(archivador.huecos, bancoId, anio)
      ),
    [archivador.huecos, archivador.periodos, anio, bancoId]
  );
  const movimientosVisibles = useMemo(() => {
    if (conexionPunteoActiva()) {
      return modo.movimientos;
    }

    const pagina = consultarMovimientos(
      archivador.movimientos
        .filter((movimiento) => movimiento.banco === bancoId && movimiento.fecha.startsWith(`${anio}-`))
        .map(consultaDesdeArchivo),
      {
        filtroLocal,
        busqueda: busquedaAplicada,
        columna: columnaOrden,
        ascendente,
        ambito: "ordinarios",
        desde: 0,
        limite: Math.max(1, archivador.movimientos.length),
      }
    );

    return pagina.filas.map((fila) => ({
      id: fila.clave ?? String(fila.id),
      fecha: fila.fecha,
      fechaValor: fila.fechaValor,
      importe: formatearImporte(fila.importeCentimos / 100),
      concepto: fila.conceptoOriginal,
      observaciones: fila.observaciones,
      local: fila.local,
      ok: fila.estado as EstadoOk,
      orden: fila.ordenBanco,
    }));
  }, [
    anio,
    archivador.movimientos,
    ascendente,
    bancoId,
    busquedaAplicada,
    columnaOrden,
    filtroLocal,
    modo.movimientos,
  ]);
  const coincidenciasLocales = useMemo(() => {
    if (conexionPunteoActiva() || busquedaAplicada.trim() === "") {
      return [];
    }

    return consultarMovimientos(
      archivador.movimientos
        .filter((movimiento) => movimiento.banco === bancoId && movimiento.fecha.startsWith(`${anio}-`))
        .map(consultaDesdeArchivo),
      {
        filtroLocal,
        busqueda: busquedaAplicada,
        columna: columnaOrden,
        ascendente,
        ambito: "tpv",
        desde: 0,
        limite: Math.max(1, archivador.movimientos.length),
      }
    ).filas;
  }, [anio, archivador.movimientos, ascendente, bancoId, busquedaAplicada, columnaOrden, filtroLocal]);
  const lineasTpvArchivo = useMemo(
    () =>
      archivador.movimientos
        .filter(
          (movimiento) =>
            movimiento.banco === bancoId &&
            movimiento.fecha.startsWith(`${anio}-`) &&
            movimiento.clase.startsWith("tpv-")
        )
        .map((movimiento) => ({
          id: movimiento.id,
          fecha: movimiento.fecha,
          fechaValor: movimiento.fechaValor,
          importeCentimos: aCentimos(movimiento.importe),
          clase: movimiento.clase,
          conceptoOriginal: movimiento.conceptoOriginal || movimiento.concepto,
          detallesOriginales: movimiento.detallesOriginales,
          ordenBanco: movimiento.orden,
          referencias: movimiento.referencias,
        })),
    [anio, archivador.movimientos, bancoId]
  );
  const filasTpv = useMemo(
    () =>
      conexionPunteoActiva()
        ? presentarTpvOficial(modo.meses)
        : resumirTpvAnual({
        banco: bancoId,
        anio,
        movimientos: archivador.movimientos,
        periodos: archivador.periodos,
        huecos: archivador.huecos,
        hoy,
        gastosRegistrados: archivador.gastosRegistrados,
        hayHistorico:
          archivador.movimientos.some((movimiento) => movimiento.banco === bancoId) ||
          archivador.periodos.some((periodo) => periodo.banco === bancoId) ||
          archivador.huecos.some((hueco) => hueco.banco === bancoId),
      }),
    [anio, archivador, bancoId, hoy, modo.meses]
  );

  const cerrarPantalla = useCallback(() => {
    window.close();
    window.setTimeout(() => {
      router.push("/gestion-diaria/empleados");
    }, 80);
  }, [router]);

  const aplicarAccion = useCallback(
    (accion: AccionNavegacion) => {
      if (accion.tipo === "banco") {
        setVista("banco");
        setBancoId(accion.banco);
        setColumnaOrden("orden_banco");
        setAscendente(false);
        return;
      }

      if (accion.tipo === "anio") {
        setAnio(accion.anio);
        setColumnaOrden("orden_banco");
        setAscendente(false);
        return;
      }

      if (accion.tipo === "revision") {
        setVista("revision");
        return;
      }

      if (accion.tipo === "cerrar") {
        cerrarPantalla();
        return;
      }

      omitirPopstate.current = 2;
      window.history.go(-2);
    },
    [cerrarPantalla]
  );

  const solicitar = useCallback(
    (accion: AccionNavegacion) => {
      if (
        (accion.tipo === "banco" && accion.banco === bancoId && vista === "banco") ||
        (accion.tipo === "anio" && accion.anio === anio) ||
        (accion.tipo === "revision" && vista === "revision")
      ) {
        return;
      }

      if (conexionPunteoActiva() && modo.hayNotasPendientes) {
        setNavegacionNota(accion);
        return;
      }

      if (!hayCambios) {
        aplicarAccion(accion);
        return;
      }

      setAccionPendiente(accion);
    },
    [anio, aplicarAccion, bancoId, hayCambios, modo.hayNotasPendientes, vista]
  );

  const guardarEnPantalla = useCallback(() => {
    if (!hayCambios) {
      return;
    }

    guardar();
    setAviso({ tono: "ok", texto: MENSAJE_GUARDADO });
  }, [guardar, hayCambios]);

  const guardarYSeguir = useCallback(() => {
    const accion = accionPendiente;
    guardar();
    setAccionPendiente(null);

    if (accion) {
      aplicarAccion(accion);
    }

    setAviso({ tono: "ok", texto: MENSAJE_GUARDADO });
  }, [accionPendiente, aplicarAccion, guardar]);

  const descartarYSeguir = useCallback(() => {
    const accion = accionPendiente;
    descartar();
    setAccionPendiente(null);

    if (accion) {
      aplicarAccion(accion);
    }
  }, [accionPendiente, aplicarAccion, descartar]);

  const cancelarNavegacion = useCallback(() => {
    setAccionPendiente(null);
  }, []);

  const publicar = useCallback((resultado: AvisoPunteo | null) => {
    if (resultado) {
      setAviso(resultado);
    }
  }, []);
  const alCancelarImportacion = useCallback(() => {
    publicar(cancelarImportacion());
  }, [cancelarImportacion, publicar]);
  const alConfirmarImportacion = useCallback(() => {
    publicar(confirmarImportacion());
  }, [confirmarImportacion, publicar]);

  useEffect(() => {
    if (!hayCambios) {
      return;
    }

    function avisarSalida(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    const estadoHistorial = window.history.state as { __punteoBancoGuard?: boolean } | null;

    if (!estadoHistorial?.__punteoBancoGuard) {
      window.history.pushState(
        { ...(estadoHistorial ?? {}), __punteoBancoGuard: true },
        "",
        window.location.href
      );
    }

    function avisarHistorial() {
      if (omitirPopstate.current > 0) {
        omitirPopstate.current -= 1;
        return;
      }

      const estadoActualHistorial = window.history.state as { __punteoBancoGuard?: boolean } | null;
      window.history.pushState(
        { ...(estadoActualHistorial ?? {}), __punteoBancoGuard: true },
        "",
        window.location.href
      );
      setAccionPendiente({ tipo: "historial" });
    }

    window.addEventListener("beforeunload", avisarSalida);
    window.addEventListener("popstate", avisarHistorial);

    return () => {
      window.removeEventListener("beforeunload", avisarSalida);
      window.removeEventListener("popstate", avisarHistorial);
    };
  }, [hayCambios]);

  async function alElegirArchivo(event: ChangeEvent<HTMLInputElement>) {
    const archivo = event.target.files?.[0];
    event.target.value = "";

    if (!archivo) {
      setAviso({
        tono: "error",
        texto: "No se ha seleccionado ningún archivo. No se ha importado nada.",
      });
      return;
    }

    setAviso(null);

    if (conexionPunteoActiva()) {
      publicar(await modo.leerArchivo(archivo));
      return;
    }

    try {
      publicar(await importarArchivo(archivo, bancoId));
    } catch {
      setAviso({
        tono: "error",
        texto: "No se ha podido leer el archivo. No se ha importado nada.",
      });
    }
  }

  const lineaExtracto = textoLineaExtracto(cobertura);
  const detalleCambios = accionPendiente
    ? `Hay cambios sin guardar en ${bancoNombre}, año ${anio}. Puedes guardarlos en este navegador, descartarlos o cancelar y seguir aquí antes de ${textoAccion(accionPendiente)}.`
    : "";

  return (
    <section className="flex h-full min-h-0 flex-col gap-1.5 overflow-auto p-2">
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[14px] border border-[#d6c4b8] bg-[linear-gradient(180deg,#fffaf7_0%,#f1e8e2_100%)] px-2.5 py-1.5 text-[#3f2b24] shadow-[0_10px_24px_rgba(70,45,37,0.08)]">
        <h1 className="text-lg font-black leading-none">Punteo banco</h1>

        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Banco">
          {BANCOS_PUNTEO.map((banco) => {
            const activa = vista === "banco" && banco.id === bancoId;

            return (
              <button
                key={banco.id}
                type="button"
                role="tab"
                id={`pestana-${banco.id}`}
                aria-selected={activa}
                aria-controls="panel-punteo-banco"
                className={`${botonPestana} ${activa ? botonPestanaActiva : botonPestanaInactiva}`}
                onClick={() => solicitar({ tipo: "banco", banco: banco.id })}
              >
                {banco.nombre}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <label className="flex items-center gap-1.5 text-sm font-bold text-[#5d433a]">
            Año
            <select
              aria-label="Año"
              value={anio}
              onChange={(event) =>
                solicitar({ tipo: "anio", anio: Number(event.target.value) })
              }
              className="rounded-[10px] border border-[#d9c3b7] bg-white px-2 py-1 text-sm font-bold leading-none text-[#4b2f27] outline-none"
            >
              {ANIOS_PUNTEO.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <input
            ref={archivoRef}
            type="file"
            accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            tabIndex={-1}
            onChange={alElegirArchivo}
          />
          <button
            type="button"
            className={botonCompactoPrimario}
            disabled={!listo}
            onClick={() => archivoRef.current?.click()}
          >
            Importar Excel
          </button>
          <button
            type="button"
            className={vista === "revision" ? botonCompactoPrimario : botonCompacto}
            aria-pressed={vista === "revision"}
            onClick={() => solicitar({ tipo: "revision" })}
          >
            Revisión conjunta
          </button>
          <button type="button" className={botonCompacto} onClick={() => solicitar({ tipo: "cerrar" })}>
            Cerrar
          </button>
        </div>
      </header>

      {aviso ? (
        <div
          role="status"
          className={
            aviso.tono === "ok"
              ? "rounded-[10px] border border-[#b7d3b4] bg-[#f3faf2] px-2.5 py-1 text-sm font-semibold leading-5 text-[#2f6a39]"
              : aviso.tono === "error"
                ? "rounded-[10px] border border-[#e3b2aa] bg-[#fdf3f1] px-2.5 py-1 text-sm font-semibold leading-5 text-[#7a3028]"
                : "rounded-[10px] border border-[#e1cec4] bg-white/80 px-2.5 py-1 text-sm font-semibold leading-5 text-[#5d433a]"
          }
        >
          {aviso.texto}
        </div>
      ) : null}

      {vista === "revision" ? (
        <RevisionConjunta />
      ) : (
        <div
          id="panel-punteo-banco"
          role="tabpanel"
          aria-labelledby={`pestana-${bancoId}`}
          className="flex min-h-0 flex-1 flex-col gap-1.5"
        >
          {conexionPunteoActiva() ? (
            <SeparacionBorrador
              banco={bancoId}
              anio={anio}
              ultimo={modo.ultimo}
              cargandoUltimo={modo.cargandoUltimo}
              recarga={modo.recarga}
              borrador={archivador.movimientos
                .filter((movimiento) => movimiento.banco === bancoId)
                .map((movimiento) => ({
                  id: movimiento.id,
                  fecha: movimiento.fecha,
                  concepto: movimiento.concepto,
                  importe: formatearImporte(movimiento.importe),
                  observaciones: movimiento.observaciones,
                  ok: movimiento.ok,
                }))}
            />
          ) : null}
          {conexionPunteoActiva() && modo.errorLectura ? (
            <div
              role="alert"
              className="rounded-[10px] border border-[#e3b2aa] bg-[#fdf3f1] px-2.5 py-1 text-sm font-semibold leading-5 text-[#7a3028]"
            >
              {modo.errorLectura}
            </div>
          ) : null}
          {conexionPunteoActiva() && modo.incertidumbre ? (
            <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-[#e4d39a] bg-[#f8e8bc] px-2.5 py-1 text-sm font-semibold leading-5 text-[#6a5010]">
              <span>Hay una confirmación sin resultado conocido.</span>
              <button
                type="button"
                className={botonCompacto}
                onClick={() => {
                  void modo.comprobarIncertidumbre().then((resultado) => publicar(resultado));
                }}
              >
                Comprobar si se guardó
              </button>
            </div>
          ) : null}
          {conexionPunteoActiva() && modo.cargando ? (
            <p className="px-0.5 text-sm font-semibold leading-5 text-[#5d433a]">Cargando movimientos oficiales…</p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-0.5">
            <p className="text-sm font-semibold leading-5 text-[#4b312b]">{lineaExtracto}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {hayCambios ? (
                <span className="text-sm font-semibold leading-5 text-[#7a3d2c]">
                  Hay cambios sin guardar.
                </span>
              ) : null}
              <button
                type="button"
                className={botonCompactoPrimario}
                onClick={guardarEnPantalla}
                disabled={conexionPunteoActiva() || !hayCambios}
              >
                Guardar
              </button>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_auto] gap-1.5 min-[1280px]:grid-cols-[minmax(0,3fr)_minmax(34rem,1.3fr)] min-[1280px]:grid-rows-1">
            <div className="flex min-h-0 min-w-0 flex-col gap-1.5">
              {conexionPunteoActiva() ? (
                <ReferenciaRegistrada modo="oficial" ultimo={modo.ultimo} cargando={modo.cargandoUltimo} />
              ) : (
                <ReferenciaRegistrada
                  modo="local"
                  referencia={referenciaVigente(bancoId, archivador.referenciasConfirmadas)}
                />
              )}
              <div className="flex flex-wrap items-center gap-1.5">
                <label className="sr-only" htmlFor="filtro-local-punteo">
                  Filtrar por local
                </label>
                <select
                  id="filtro-local-punteo"
                  value={filtroLocal}
                  onChange={(event) => setFiltroLocal(event.target.value as FiltroLocal)}
                  className="h-8 max-w-[13.5rem] rounded-[8px] border border-[#e4d3ca] bg-white px-1.5 text-xs font-bold text-[#4b312b] outline-none"
                >
                  <option value="todos">Orden original — Todos</option>
                  {LOCALES_PUNTEO_GUARDADOS.map((local) => (
                    <option key={local} value={local}>
                      {local}
                    </option>
                  ))}
                  <option value="sin-asignar">Sin asignar</option>
                </select>
                <label className="sr-only" htmlFor="busqueda-punteo">
                  Buscar movimientos
                </label>
                <input
                  id="busqueda-punteo"
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                  placeholder="Buscar en todo el banco y año"
                  className="h-8 min-w-[12rem] flex-1 rounded-[8px] border border-[#e4d3ca] bg-white px-2 text-sm text-[#4b312b] outline-none"
                />
                <button
                  type="button"
                  className={botonCompacto}
                  onClick={() => {
                    setBusqueda("");
                    setBusquedaAplicada("");
                  }}
                  disabled={busqueda === "" && busquedaAplicada === ""}
                >
                  Limpiar
                </button>
                <button
                  type="button"
                  className={botonCompacto}
                  onClick={() => {
                    setColumnaOrden("orden_banco");
                    setAscendente(false);
                  }}
                >
                  Orden original
                </button>
              </div>
              {busquedaAplicada.trim() ? (
                <CoincidenciasTpv
                  filas={
                    conexionPunteoActiva()
                      ? modo.coincidenciasTpv.map((fila) => ({
                          id: String(fila.id),
                          fecha: fila.fecha,
                          importe: formatearCentimos(fila.importeCentimos),
                          concepto: fila.conceptoOriginal,
                          clase: fila.clase,
                          local: fila.local,
                        }))
                      : coincidenciasLocales.map((fila) => ({
                          id: fila.clave ?? String(fila.id),
                          fecha: fila.fecha,
                          importe: formatearImporte(fila.importeCentimos / 100),
                          concepto: fila.conceptoOriginal,
                          clase: fila.clase,
                          local: fila.local,
                        }))
                  }
                  hayMas={conexionPunteoActiva() && modo.hayMasTpv}
                  onMas={
                    conexionPunteoActiva() && modo.hayMasTpv
                      ? () => {
                          void modo.cargarMasTpv();
                        }
                      : undefined
                  }
                />
              ) : null}
              <p className="text-xs leading-5 text-[#7b635c]">
                Nuestro concepto y el local se guardan al salir del campo. El orden por concepto sigue el texto del banco.
              </p>
              <div className="min-h-0 flex-1">
                <TablaMovimientos
                  banco={bancoNombre}
                  anio={anio}
                  movimientos={movimientosVisibles}
                  columnaOrden={columnaOrden}
                  ascendente={ascendente}
                  onOrdenar={(columna) => {
                    if (columna === columnaOrden) {
                      setAscendente((valor) => !valor);
                      return;
                    }

                    setColumnaOrden(columna);
                    setAscendente(
                      columna === "concepto" || columna === "observaciones" || columna === "local" || columna === "estado"
                    );
                  }}
                  localEditable={conexionPunteoActiva()}
                  marcasConcepto={conexionPunteoActiva() ? modo.marcasConcepto : undefined}
                  onEditarConcepto={
                    conexionPunteoActiva()
                      ? (id, valor) => {
                          modo.editarConcepto(id, valor);
                        }
                      : undefined
                  }
                  onConfirmarConcepto={
                    conexionPunteoActiva()
                      ? (id, valor) => {
                          void modo.confirmarConcepto(id, valor);
                        }
                      : undefined
                  }
                  onCambioLocal={
                    conexionPunteoActiva()
                      ? (id, local) => {
                          void modo.guardarLocal(id, local).then((resultado) => setAviso(resultado));
                        }
                      : undefined
                  }
                  textoVacio={
                    conexionPunteoActiva() && modo.errorLectura
                      ? "No se muestran movimientos porque la lectura ha fallado."
                      : undefined
                  }
                  marcas={conexionPunteoActiva() ? modo.marcas : undefined}
                  onLlegarAlFinal={
                    conexionPunteoActiva() && modo.hayMas
                      ? () => {
                          void modo.cargarMas();
                        }
                      : undefined
                  }
                  onConfirmarObservacion={
                    conexionPunteoActiva()
                      ? (id, valor) => {
                          void modo.confirmarObservacion(id, valor).then((resultado) => publicar(resultado));
                        }
                      : undefined
                  }
                  onCambio={(id, campo, valor) => {
                    if (conexionPunteoActiva()) {
                      modo.alCambiar(id, campo, valor);
                      return;
                    }

                    if (campo === "ok") {
                      const movimiento = archivador.movimientos.find((actual) => actual.id === id);
                      const estado = valor as EstadoOk;

                      if (movimiento && requiereConfirmacionManual(movimiento, estado)) {
                        setCorreccion({
                          id,
                          estado,
                          motivo: movimiento.incidenciaAbierta?.motivo ?? "",
                        });
                        return;
                      }
                    }

                    actualizarMovimiento(id, campo, valor);
                    setAviso(null);
                  }}
                />
                {conexionPunteoActiva() && modo.cargando && modo.movimientos.length > 0 ? (
                  <p className="px-0.5 text-sm font-semibold leading-5 text-[#5d433a]">Cargando más movimientos…</p>
                ) : null}
              </div>
            </div>
            <ResumenTpv anio={anio} filas={filasTpv} onVerMes={setMesTpv} />
          </div>
        </div>
      )}

      <DialogoCambios
        abierto={accionPendiente !== null}
        titulo="Cambios sin guardar"
        detalle={detalleCambios}
        onGuardar={guardarYSeguir}
        onDescartar={descartarYSeguir}
        onCancelar={cancelarNavegacion}
      />
      {conexionPunteoActiva() ? (
        <DialogoCambios
          abierto={navegacionNota !== null}
          titulo="Observación sin guardar"
          detalle="Hay un texto que todavía no está guardado en la base. Puedes guardarlo, continuar conservando el borrador en esta pantalla, o cancelar."
          textoDescartar="Conservar y seguir"
          onGuardar={() => {
            void modo.guardarNotasPendientes().then((resultado) => {
              publicar(resultado.aviso);

              if (!resultado.todas || !navegacionNota) {
                return;
              }

              const accion = navegacionNota;
              setNavegacionNota(null);
              aplicarAccion(accion);
            });
          }}
          onDescartar={() => {
            const accion = navegacionNota;
            setNavegacionNota(null);

            if (!accion) {
              return;
            }

            aplicarAccion(accion);
          }}
          onCancelar={() => setNavegacionNota(null)}
        />
      ) : null}
      <DialogoCorreccionEstado
        abierto={correccion !== null}
        detalle={correccion ? textoConfirmacionManual(correccion.estado) : ""}
        motivo={correccion?.motivo ?? ""}
        onConfirmar={() => {
          if (!correccion) {
            return;
          }

          corregirEstadoConfirmado(correccion.id, correccion.estado);
          setCorreccion(null);
          setAviso(null);
        }}
        onCancelar={() => setCorreccion(null)}
      />
      {paso?.tipo === "confirmar" && !conexionPunteoActiva() ? (
        <DialogoConfirmarImportacion
          banco={nombreBanco(paso.lectura.banco)}
          referencia={paso.referencia}
          plan={paso.plan}
          onConfirmar={alConfirmarImportacion}
          onCancelar={alCancelarImportacion}
        />
      ) : null}
      {conexionPunteoActiva() && modo.preview ? (
        <DialogoImportacionOficial
          banco={bancoId}
          nombre={modo.preview.nombre}
          plan={modo.preview.plan}
          enviando={modo.enviando}
          onConfirmar={() => {
            void modo.confirmarCarga().then((resultado) => publicar(resultado));
          }}
          onCancelar={() => publicar(modo.cancelarPreview())}
        />
      ) : null}
      {conexionPunteoActiva() && modo.estadoPendiente ? (
        <DialogoMotivoOficial
          estado={modo.estadoPendiente.estado}
          onConfirmar={(motivo) => {
            void modo.confirmarEstado(motivo).then((resultado) => publicar(resultado));
          }}
          onCancelar={modo.cancelarEstado}
        />
      ) : null}
      {mesTpv !== null ? (
        <DialogoDetalleTpv
          banco={bancoId}
          anio={anio}
          mes={mesTpv}
          lineasLocales={conexionPunteoActiva() ? null : lineasTpvArchivo}
          onCerrar={() => setMesTpv(null)}
        />
      ) : null}
    </section>
  );
}

function consultaDesdeArchivo(movimiento: MovimientoInterno): ConsultaMovimiento {
  return {
    id: idEstable(movimiento.id),
    clave: movimiento.id,
    fecha: movimiento.fecha,
    fechaValor: movimiento.fechaValor,
    importeCentimos: aCentimos(movimiento.importe),
    saldoCentimos: aCentimos(movimiento.saldo ?? 0),
    concepto: movimiento.concepto,
    conceptoOriginal: movimiento.conceptoOriginal || movimiento.concepto,
    conceptoNormalizado: "",
    detallesOriginales: movimiento.detallesOriginales,
    observaciones: movimiento.observaciones,
    local: null,
    estado: movimiento.ok,
    clase: movimiento.clase,
    motivoEstado: "",
    origenEstado: "",
    referencias: movimiento.referencias,
    ordenBanco: movimiento.orden,
    filaExcel: movimiento.fila,
  };
}

function idEstable(id: string) {
  const directo = Number(id);

  if (Number.isSafeInteger(directo)) {
    return directo;
  }

  let hash = 0;

  for (let indice = 0; indice < id.length; indice += 1) {
    hash = (hash * 33 + id.charCodeAt(indice)) | 0;
  }

  return Math.abs(hash);
}
