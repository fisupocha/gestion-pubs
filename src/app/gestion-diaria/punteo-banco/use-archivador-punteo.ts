"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  archivadorVacio,
  guardarArchivador,
  leerArchivador,
  serieEditable,
  type ArchivadorPunteo,
} from "@/modules/punteo-banco/almacen-local";
import { formatearImporte } from "@/modules/punteo-banco/celdas";
import { planificarContinuidad, type PlanContinuidad } from "@/modules/punteo-banco/continuidad-saldo";
import { leerExtracto, type ResultadoLectura } from "@/modules/punteo-banco/leer-extracto";
import { formatearFechaIso, nombreBanco, type BancoPunteoId, type EstadoOk } from "@/modules/punteo-banco/modelo";
import type { ClaseMovimiento, IncidenciaSenalada, MovimientoInterno, PeriodoBanco } from "@/modules/punteo-banco/movimiento-interno";
import { confirmarCorreccionManual } from "@/modules/punteo-banco/decision-estado";
import { proponerGastoComisiones } from "@/modules/punteo-banco/propuesta-gasto-tpv";
import { referenciaVigente, type ReferenciaMovimiento } from "@/modules/punteo-banco/referencias-iniciales";
import { comisionTpvDelMes } from "@/modules/punteo-banco/resumen-tpv-calculo";

export type AvisoPunteo = {
  tono: "ok" | "info" | "error";
  texto: string;
};

type LecturaOk = Extract<ResultadoLectura, { ok: true }>;

export type PasoImportacion = {
  tipo: "confirmar";
  lectura: LecturaOk;
  plan: PlanContinuidad;
  referencia: ReferenciaMovimiento;
} | null;

type SerieEditable = {
  filas: {
    id: string;
    observaciones: string;
    ok: EstadoOk;
    clase: ClaseMovimiento;
    incidenciaAbierta: IncidenciaSenalada | null;
    incidenciasResueltas: IncidenciaSenalada[];
    decisionManual: boolean;
  }[];
  huecos: PeriodoBanco[];
};

const MENSAJE_BASE = "No se ha escrito ningún registro en la base de datos.";

export function useArchivadorPunteo() {
  const [archivador, setArchivador] = useState<ArchivadorPunteo>(archivadorVacio);
  const [snapshot, setSnapshot] = useState("");
  const [listo, setListo] = useState(false);
  const [paso, setPaso] = useState<PasoImportacion>(null);
  const archivadorRef = useRef(archivador);
  const pasoRef = useRef(paso);
  const persistidoRef = useRef<ArchivadorPunteo>(archivadorVacio());

  useEffect(() => {
    archivadorRef.current = archivador;
  }, [archivador]);

  useEffect(() => {
    pasoRef.current = paso;
  }, [paso]);

  useEffect(() => {
    let vigente = true;

    void Promise.resolve().then(() => {
      if (!vigente) {
        return;
      }

      const leido = leerArchivador();
      persistidoRef.current = leido;
      archivadorRef.current = leido;
      setArchivador(leido);
      setSnapshot(serieEditable(leido));
      setListo(true);
    });

    return () => {
      vigente = false;
    };
  }, []);

  const hayCambios = listo && snapshot !== "" && serieEditable(archivador) !== snapshot;

  const guardar = useCallback(() => {
    const actual = archivadorRef.current;
    guardarArchivador(actual);
    persistidoRef.current = actual;
    setSnapshot(serieEditable(actual));
  }, []);

  const descartar = useCallback(() => {
    const base = JSON.parse(snapshot) as SerieEditable;
    const porId = new Map(base.filas.map((fila) => [fila.id, fila]));
    setArchivador((actual) => {
      const siguiente = {
        ...actual,
        huecos: base.huecos,
        movimientos: actual.movimientos.map((movimiento) => {
          const fila = porId.get(movimiento.id);

          if (!fila) {
            return movimiento;
          }

          return {
            ...movimiento,
            observaciones: fila.observaciones,
            ok: fila.ok,
            clase: fila.clase,
            incidenciaAbierta: fila.incidenciaAbierta ?? null,
            incidenciasResueltas: fila.incidenciasResueltas ?? [],
            decisionManual: fila.decisionManual === true,
          };
        }),
      };
      archivadorRef.current = siguiente;
      return siguiente;
    });
  }, [snapshot]);

  const corregirEstadoConfirmado = useCallback((id: string, estado: EstadoOk) => {
    setArchivador((actual) => {
      const siguiente = {
        ...actual,
        movimientos: actual.movimientos.map((movimiento) =>
          movimiento.id === id ? confirmarCorreccionManual(movimiento, estado) : movimiento
        ),
      };
      archivadorRef.current = siguiente;
      return siguiente;
    });
  }, []);

  const actualizarMovimiento = useCallback((id: string, campo: "observaciones" | "ok", valor: string) => {
    setArchivador((actual) => {
      const siguiente = {
        ...actual,
        movimientos: actual.movimientos.map((movimiento) =>
          movimiento.id === id
            ? {
                ...movimiento,
                [campo]: campo === "ok" ? (valor as MovimientoInterno["ok"]) : valor,
              }
            : movimiento
        ),
      };
      archivadorRef.current = siguiente;
      return siguiente;
    });
  }, []);

  const confirmarHueco = useCallback((banco: BancoPunteoId, desde: string, hasta: string) => {
    setArchivador((actual) => {
      const ya = actual.huecos.some(
        (hueco) => hueco.banco === banco && hueco.desde === desde && hueco.hasta === hasta
      );

      if (ya) {
        return actual;
      }

      const siguiente = {
        ...actual,
        huecos: [...actual.huecos, { banco, desde, hasta }],
      };
      archivadorRef.current = siguiente;
      return siguiente;
    });
  }, []);

  const aplicarConfirmacion = useCallback(() => {
    const actualPaso = pasoRef.current;

    if (actualPaso?.tipo !== "confirmar" || !actualPaso.plan.puedeConfirmar || !actualPaso.plan.ultimoNuevo) {
      return null;
    }

    const lectura = actualPaso.lectura;
    const plan = actualPaso.plan;
    const ultimo = plan.ultimoNuevo;

    if (!ultimo || ultimo.saldo === null) {
      return null;
    }

    const periodo = lectura.periodo ? { banco: lectura.banco, desde: lectura.periodo.desde, hasta: lectura.periodo.hasta } : null;
    const referenciaNueva: ReferenciaMovimiento = {
      banco: lectura.banco,
      fecha: ultimo.fecha,
      concepto: ultimo.conceptoOriginal || ultimo.concepto || "Sin concepto",
      importe: ultimo.importe,
      saldo: ultimo.saldo,
    };
    const actual = archivadorRef.current;
    const siguiente = {
      ...actual,
      movimientos: [...actual.movimientos, ...plan.nuevos],
      periodos: periodo ? unirPeriodo(actual.periodos, periodo) : actual.periodos,
      referenciasConfirmadas: sustituirReferencia(actual.referenciasConfirmadas, referenciaNueva),
    };
    archivadorRef.current = siguiente;
    setArchivador(siguiente);

    const base = persistidoRef.current;
    const persistido = {
      ...base,
      movimientos: [...base.movimientos, ...plan.nuevos],
      periodos: periodo ? unirPeriodo(base.periodos, periodo) : base.periodos,
      referenciasConfirmadas: sustituirReferencia(base.referenciasConfirmadas, referenciaNueva),
    };
    persistidoRef.current = persistido;
    guardarArchivador(persistido);
    setSnapshot((previo) => ampliarSnapshot(previo, plan.nuevos));
    pasoRef.current = null;
    setPaso(null);

    return {
      tono: "info" as const,
      texto: `Importación confirmada. Añadidos ${plan.nuevos.length} movimientos. El último movimiento registrado queda actualizado. ${MENSAJE_BASE}`,
    };
  }, []);

  const importarArchivo = useCallback(
    async (archivo: File, bancoEsperado: BancoPunteoId) => {
      if (!listo) {
        return {
          tono: "info" as const,
          texto: "Espera a que se recupere el punteo de este navegador.",
        };
      }

      if (pasoRef.current) {
        return {
          tono: "info" as const,
          texto: "Termina o cancela la importación que está abierta.",
        };
      }

      try {
        const buffer = await archivo.arrayBuffer();
        const lectura = leerExtracto(buffer, archivo.name, bancoEsperado);

        if (!lectura.ok) {
          return { tono: "error" as const, texto: textoRechazo(lectura, bancoEsperado) };
        }

        const referencia = referenciaVigente(lectura.banco, archivadorRef.current.referenciasConfirmadas);
        const plan = planificarContinuidad({
          referencia,
          archivo: lectura.movimientos,
          existentes: archivadorRef.current.movimientos,
        });
        const siguiente = { tipo: "confirmar" as const, lectura, plan, referencia };
        pasoRef.current = siguiente;
        setPaso(siguiente);
        return null;
      } catch {
        return {
          tono: "error" as const,
          texto: "No se ha podido leer el archivo. No se ha importado nada.",
        };
      }
    },
    [listo]
  );

  const cancelarImportacion = useCallback((): AvisoPunteo => {
    pasoRef.current = null;
    setPaso(null);
    return {
      tono: "info",
      texto: "Importación cancelada. No se ha añadido ningún movimiento.",
    };
  }, []);

  const textoGastoMes = useCallback((banco: BancoPunteoId, anio: number, mes: number) => {
    const comisiones = comisionTpvDelMes(archivadorRef.current.movimientos, banco, anio, mes);

    if (comisiones === null || comisiones === 0) {
      return {
        tono: "info" as const,
        texto: "Este mes no tiene comisiones TPV que registrar. No se ha creado ningún gasto.",
      };
    }

    const propuesta = proponerGastoComisiones({
      banco,
      anio,
      mes,
      comisiones,
      gastosRegistrados: archivadorRef.current.gastosRegistrados,
    });

    if (propuesta.duplicado) {
      return {
        tono: "info" as const,
        texto: `Las comisiones TPV de ${nombreBanco(banco)} de ese mes ya están marcadas. No se crea otro gasto. ${MENSAJE_BASE}`,
      };
    }

    return {
      tono: "info" as const,
      texto: `Quedaría preparado un gasto de ${formatearImporte(propuesta.totalGasto)} € en Gastos bancarios, local Riverocio, fecha ${formatearFechaIso(propuesta.fechaGasto)}, banco ${nombreBanco(banco)}. La escritura no está conectada: no se ha creado el gasto y el mes no pasa a Guardado. ${MENSAJE_BASE}`,
    };
  }, []);

  return {
    archivador,
    listo,
    hayCambios,
    paso,
    guardar,
    descartar,
    actualizarMovimiento,
    corregirEstadoConfirmado,
    confirmarHueco,
    importarArchivo,
    confirmarImportacion: aplicarConfirmacion,
    cancelarImportacion,
    textoGastoMes,
  };
}

function unirPeriodo(periodos: PeriodoBanco[], periodo: PeriodoBanco) {
  const ya = periodos.some(
    (actual) =>
      actual.banco === periodo.banco && actual.desde === periodo.desde && actual.hasta === periodo.hasta
  );

  return ya ? periodos : [...periodos, periodo];
}

function sustituirReferencia(referencias: ReferenciaMovimiento[], referencia: ReferenciaMovimiento) {
  return [...referencias.filter((actual) => actual.banco !== referencia.banco), referencia];
}

function ampliarSnapshot(snapshot: string, nuevos: MovimientoInterno[]) {
  const base = JSON.parse(snapshot) as SerieEditable;
  const ids = new Set(base.filas.map((fila) => fila.id));

  nuevos.forEach((movimiento) => {
    if (ids.has(movimiento.id)) {
      return;
    }

    base.filas.push({
      id: movimiento.id,
      observaciones: movimiento.observaciones,
      ok: movimiento.ok,
      clase: movimiento.clase,
      incidenciaAbierta: movimiento.incidenciaAbierta ?? null,
      incidenciasResueltas: movimiento.incidenciasResueltas ?? [],
      decisionManual: movimiento.decisionManual === true,
    });
  });

  return JSON.stringify(base);
}

function textoRechazo(
  lectura: Extract<ResultadoLectura, { ok: false }>,
  bancoEsperado: BancoPunteoId
): string {
  if (lectura.motivo === "banco-distinto" && lectura.bancoDetectado) {
    return `El archivo parece de ${nombreBanco(lectura.bancoDetectado)} y la pestaña activa es ${nombreBanco(bancoEsperado)}. No se ha importado nada y no se mezclan movimientos.`;
  }

  if (lectura.motivo === "sin-movimientos") {
    const banco = lectura.bancoDetectado ? nombreBanco(lectura.bancoDetectado) : "el banco";
    return `Se reconoce el extracto de ${banco}, pero ninguna fila tiene una fecha de operación y un importe legibles. No se ha importado nada.`;
  }

  return "No se reconoce el formato con suficiente seguridad. Revisa el extracto y vuelve a intentarlo. No se ha importado nada.";
}
