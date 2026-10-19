"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { planCambioEstado } from "@/modules/punteo-banco/acciones-oficiales";
import { formatearCentimos } from "@/modules/punteo-banco/centimos";
import { conexionPunteoActiva } from "@/modules/punteo-banco/conexion-punteo";
import { decidirConsulta, ejecutarCargaEnDosPartes, identificarExcel } from "@/modules/punteo-banco/importacion-doble";
import { leerExtracto, type ResultadoLectura } from "@/modules/punteo-banco/leer-extracto";
import type { BancoPunteoId, EstadoOk, MovimientoPunteo } from "@/modules/punteo-banco/modelo";
import type { MovimientoOficial } from "@/modules/punteo-banco/acceso-oficial";
import {
  aplicarConflicto,
  aplicarObservacionFallida,
  aplicarObservacionGuardada,
  actualizarOficialDesdeServidor,
  combinarFilasConBorradores,
  estaPendiente,
  escribirObservacion,
  marcaDeNota,
  notaInicial,
  prepararGuardadoObservacion,
  type BorradorObservacion,
} from "@/modules/punteo-banco/observacion-borrador";
import { mesTpvUtilizable, type MesTpvOficial } from "@/modules/punteo-banco/paginacion-tpv";
import { prepararCargaOficial, type PlanCargaOficial } from "@/modules/punteo-banco/preparar-carga-oficial";
import type { AvisoPunteo } from "./use-archivador-punteo";

const LIMITE = 100;

export type PreviewOficial = {
  nombre: string;
  plan: PlanCargaOficial;
};

export type EstadoOficialPendiente = {
  id: number;
  estado: EstadoOk;
};

export type IncertidumbreCarga = {
  parte: "historica" | "ordinaria";
  huella: string;
  puedeRepetir: boolean;
};

export function useModoOficial(banco: BancoPunteoId, anio: number) {
  const activo = conexionPunteoActiva();
  const [pagina, setPagina] = useState(0);
  const [filas, setFilas] = useState<MovimientoOficial[]>([]);
  const [hayMas, setHayMas] = useState(false);
  const [meses, setMeses] = useState<MesTpvOficial[]>([]);
  const [cargando, setCargando] = useState(false);
  const [errorLectura, setErrorLectura] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewOficial | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [estadoPendiente, setEstadoPendiente] = useState<EstadoOficialPendiente | null>(null);
  const [recarga, setRecarga] = useState(0);
  const [borradores, setBorradores] = useState<Map<number, BorradorObservacion>>(new Map());
  const [incertidumbre, setIncertidumbre] = useState<IncertidumbreCarga | null>(null);
  const bufferRef = useRef<ArrayBuffer | null>(null);
  const filasRef = useRef<MovimientoOficial[]>([]);
  const textosRef = useRef<Map<number, string>>(new Map());
  const borradoresRef = useRef<Map<number, BorradorObservacion>>(new Map());

  useEffect(() => {
    filasRef.current = filas;
  }, [filas]);

  useEffect(() => {
    borradoresRef.current = borradores;
  }, [borradores]);

  const publicarBorrador = useCallback((nota: BorradorObservacion) => {
    const siguientes = new Map(borradoresRef.current);
    siguientes.set(nota.id, nota);
    borradoresRef.current = siguientes;
    setBorradores(siguientes);
    setFilas((previas) =>
      previas.map((fila) =>
        fila.id === nota.id
          ? { ...fila, observaciones: nota.textoVisible, estado: fila.estado, decisionProtegida: fila.decisionProtegida }
          : fila
      )
    );
  }, []);

  useEffect(() => {
    setPagina(0);
  }, [banco, anio]);

  useEffect(() => {
    if (!conexionPunteoActiva()) {
      return;
    }

    let vivo = true;
    setCargando(true);
    setErrorLectura(null);

    void import("@/modules/punteo-banco/acceso-oficial")
      .then(async (acceso) => {
        const paginaDatos = await acceso.leerMovimientosAnio({
          banco,
          anio,
          desde: pagina * LIMITE,
          limite: LIMITE,
        });

        if (!vivo) {
          return;
        }

        const siguientes = new Map(borradoresRef.current);

        paginaDatos.filas.forEach((fila) => {
          const nota = siguientes.get(fila.id);

          if (nota) {
            siguientes.set(
              fila.id,
              actualizarOficialDesdeServidor(nota, fila.observaciones, fila.estado, fila.decisionProtegida)
            );
          }
        });

        borradoresRef.current = siguientes;
        setBorradores(siguientes);
        setFilas(combinarFilasConBorradores(paginaDatos.filas, siguientes));
        setHayMas(paginaDatos.hayMas);
        textosRef.current = new Map(paginaDatos.filas.map((fila) => [fila.id, fila.observaciones]));
        setErrorLectura(null);
      })
      .catch((error: unknown) => {
        if (!vivo) {
          return;
        }

        setFilas([]);
        setHayMas(false);
        setErrorLectura(
          error instanceof Error ? error.message : "No se han podido leer los movimientos oficiales."
        );
      })
      .finally(() => {
        if (vivo) {
          setCargando(false);
        }
      });

    return () => {
      vivo = false;
    };
  }, [anio, banco, pagina, recarga]);

  useEffect(() => {
    if (!conexionPunteoActiva()) {
      return;
    }

    let vivo = true;

    void import("@/modules/punteo-banco/acceso-oficial")
      .then(async (acceso) => {
        const leidos = await Promise.all(
          Array.from({ length: 12 }, (_, indice) =>
            acceso.leerResumenTpvMes(banco, anio, indice + 1).then(
              (resumen): MesTpvOficial => ({
                mes: indice + 1,
                ingresosCentimos: resumen.ingresosCentimos,
                comisionesCentimos: resumen.comisionesCentimos,
                incompleto: resumen.incompleto,
              }),
              (): MesTpvOficial => ({
                mes: indice + 1,
                ingresosCentimos: 0,
                comisionesCentimos: 0,
                incompleto: true,
              })
            )
          )
        );

        if (vivo) {
          setMeses(leidos);
        }
      })
      .catch(() => {
        if (vivo) {
          setMeses(
            Array.from({ length: 12 }, (_, indice) => ({
              mes: indice + 1,
              ingresosCentimos: 0,
              comisionesCentimos: 0,
              incompleto: true,
            }))
          );
        }
      });

    return () => {
      vivo = false;
    };
  }, [anio, banco, recarga]);

  const leerArchivo = useCallback(
    async (archivo: File): Promise<AvisoPunteo | null> => {
      if (!conexionPunteoActiva()) {
        return null;
      }

      try {
        const buffer = await archivo.arrayBuffer();
        const lectura = leerExtracto(buffer, archivo.name, banco);

        if (!lectura.ok) {
          bufferRef.current = null;
          return { tono: "error", texto: textoLectura(lectura) };
        }

        bufferRef.current = buffer;
        setPreview({ nombre: archivo.name, plan: prepararCargaOficial(banco, lectura.movimientos) });
        return null;
      } catch {
        bufferRef.current = null;
        return { tono: "error", texto: "No se ha podido leer el archivo. No se ha enviado nada a la base." };
      }
    },
    [banco]
  );

  const cancelarPreview = useCallback(() => {
    bufferRef.current = null;
    setPreview(null);
    return {
      tono: "info" as const,
      texto: "Importación cancelada. No se ha enviado nada a la base.",
    };
  }, []);

  const confirmarCarga = useCallback(async (): Promise<AvisoPunteo> => {
    if (!conexionPunteoActiva()) {
      return { tono: "info", texto: "La conexión está desactivada. No se ha enviado nada a la base." };
    }

    if (incertidumbre && !incertidumbre.puedeRepetir) {
      return {
        tono: "error",
        texto: "Hay una confirmación con resultado desconocido. Primero hay que comprobar si se guardó. No se repite ni se deshace.",
      };
    }

    const actual = preview;
    const buffer = bufferRef.current;

    if (!actual || !buffer || !actual.plan.garantizada || actual.plan.llamadas.length === 0) {
      return {
        tono: "error",
        texto: "La vista previa no garantiza la importación. No se ha enviado nada a la base.",
      };
    }

    setEnviando(true);

    try {
      const acceso = await import("@/modules/punteo-banco/acceso-oficial");
      const identidad = await identificarExcel(buffer);
      const informe = await ejecutarCargaEnDosPartes({
        hayHistorico: actual.plan.llamadas.includes("historica"),
        hayOrdinario: actual.plan.llamadas.includes("ordinaria"),
        huellaHistorica: identidad.historica,
        huellaOrdinaria: identidad.ordinaria,
        confirmarHistorica: () => {
          const primero = actual.plan.historico[0];
          const ultimo = actual.plan.historico[actual.plan.historico.length - 1];

          if (!primero || !ultimo) {
            return Promise.reject(new Error("La carga histórica no tiene movimientos."));
          }

          return acceso.confirmarCargaHistorica({
            banco,
            nombreArchivo: actual.nombre,
            contenido: buffer,
            movimientos: actual.plan.historico,
            periodoDesde: primero.fecha,
            periodoHasta: ultimo.fecha,
          });
        },
        confirmarOrdinaria: () => {
          const primero = actual.plan.ordinario[0];
          const ultimo = actual.plan.ordinario[actual.plan.ordinario.length - 1];

          if (!primero || !ultimo) {
            return Promise.reject(new Error("La importación ordinaria no tiene movimientos."));
          }

          return acceso.confirmarImportacionOrdinaria({
            banco,
            nombreArchivo: actual.nombre,
            contenido: buffer,
            movimientos: actual.plan.ordinario,
            periodoDesde: primero.fecha,
            periodoHasta: ultimo.fecha,
          });
        },
        comprobar: async (parte) => {
          const archivos = await acceso.leerImportaciones(banco);
          return archivos
            .filter((archivo) => archivo.tipo === parte)
            .map((archivo) => ({
              tipo: archivo.tipo,
              estado: archivo.estado,
              continuidad: archivo.continuidad,
              huella: archivo.huella,
              motivo: archivo.motivo,
            }));
        },
      });

      if (informe.parteDesconocida) {
        setIncertidumbre({
          parte: informe.parteDesconocida,
          huella: informe.parteDesconocida === "historica" ? identidad.historica : identidad.ordinaria,
          puedeRepetir: informe.puedeRepetir,
        });
      } else {
        setIncertidumbre(null);
        bufferRef.current = null;
        setPreview(null);
        setRecarga((valor) => valor + 1);
      }

      return { tono: informe.tono, texto: informe.texto };
    } catch (error) {
      setIncertidumbre({
        parte: "historica",
        huella: "",
        puedeRepetir: false,
      });
      return {
        tono: "error",
        texto:
          error instanceof Error
            ? `${error.message} El resultado no se da por confirmado ni por fallido. Hay que comprobar el historial antes de repetir.`
            : "El resultado de la importación es desconocido. No se anuncia éxito ni fracaso y no se deshace nada.",
      };
    } finally {
      setEnviando(false);
    }
  }, [banco, incertidumbre, preview]);

  const alCambiar = useCallback((id: string, campo: "observaciones" | "ok", valor: string) => {
    if (!conexionPunteoActiva()) {
      return;
    }

    const numerico = Number(id);
    const fila = filasRef.current.find((actual) => actual.id === numerico);

    if (!fila) {
      return;
    }

    if (campo === "observaciones") {
      const oficial = textosRef.current.get(numerico) ?? "";
      const previa = borradoresRef.current.get(numerico) ?? notaInicial(numerico, oficial, fila.estado, fila.decisionProtegida);
      publicarBorrador(escribirObservacion(previa, valor));
      return;
    }

    const estado = valor as EstadoOk;

    if (estado === fila.estado) {
      return;
    }

    setEstadoPendiente({ id: numerico, estado });
  }, [publicarBorrador]);

  const cancelarEstado = useCallback(() => {
    setEstadoPendiente(null);
  }, []);

  const confirmarEstado = useCallback(
    async (motivo: string): Promise<AvisoPunteo> => {
      if (!conexionPunteoActiva() || !estadoPendiente) {
        return { tono: "info", texto: "No hay un cambio de estado pendiente." };
      }

      let plan: ReturnType<typeof planCambioEstado>;

      try {
        plan = planCambioEstado(estadoPendiente.estado, motivo);
      } catch (error) {
        return {
          tono: "error",
          texto: error instanceof Error ? error.message : "El cambio de estado necesita un motivo.",
        };
      }

      try {
        const acceso = await import("@/modules/punteo-banco/acceso-oficial");
        const resultado = await acceso.cambiarEstadoOficial({
          movimientoId: estadoPendiente.id,
          estado: plan.estado,
          motivo: plan.motivo,
          observaciones: plan.observaciones,
        });

        if (resultado.ok !== true) {
          return {
            tono: "error",
            texto: resultado.motivo?.trim() || "La base no ha cambiado el estado.",
          };
        }

        setFilas((previas) =>
          previas.map((fila) =>
            fila.id === estadoPendiente.id
              ? { ...fila, estado: plan.estado, decisionProtegida: true, motivoEstado: plan.motivo }
              : fila
          )
        );
        setEstadoPendiente(null);
        return { tono: "ok", texto: "Estado actualizado. La observación no se ha modificado." };
      } catch (error) {
        return {
          tono: "error",
          texto: error instanceof Error ? error.message : "No se ha cambiado el estado.",
        };
      }
    },
    [estadoPendiente]
  );

  const confirmarObservacion = useCallback(async (id: string, valor: string): Promise<AvisoPunteo | null> => {
    if (!conexionPunteoActiva()) {
      return null;
    }

    const numerico = Number(id);
    const fila = filasRef.current.find((actual) => actual.id === numerico);

    if (!fila) {
      return null;
    }

    const oficial = textosRef.current.get(numerico) ?? fila.observaciones;
    const nota = escribirObservacion(
      borradoresRef.current.get(numerico) ?? notaInicial(numerico, oficial, fila.estado, fila.decisionProtegida),
      valor
    );
    let textoEnBase: string | null = null;

    try {
      const acceso = await import("@/modules/punteo-banco/acceso-oficial");
      const lectura = await acceso.leerObservacionOficial(numerico);
      textoEnBase = lectura ? lectura.observaciones : null;
      const preparacion = prepararGuardadoObservacion(nota, textoEnBase);

      if (preparacion.accion === "nada") {
        return null;
      }

      if (preparacion.accion === "conflicto") {
        const conflicto = aplicarConflicto(nota, preparacion.textoEnBase);
        publicarBorrador(conflicto.nota);
        return conflicto.aviso;
      }

      const resultado = (await acceso.guardarObservacionOficial(
        numerico,
        preparacion.texto,
        preparacion.textoEsperado
      )) as {
        ok?: boolean;
        cambio?: boolean;
        motivo?: string;
        estado?: string;
        decision_protegida?: boolean;
        conflicto?: boolean;
        observaciones?: string;
      };
      const aplicado = aplicarObservacionGuardada(nota, resultado);

      if (aplicado.nota.error === null) {
        textosRef.current.set(numerico, aplicado.nota.textoOficial);
        const siguientes = new Map(borradoresRef.current);
        siguientes.delete(numerico);
        borradoresRef.current = siguientes;
        setBorradores(siguientes);
        setFilas((previas) =>
          previas.map((actual) =>
            actual.id === numerico
              ? {
                  ...actual,
                  observaciones: aplicado.nota.textoOficial,
                  estado: actual.estado,
                  decisionProtegida: actual.decisionProtegida,
                }
              : actual
          )
        );
      } else {
        publicarBorrador(aplicado.nota);
      }

      return aplicado.aviso;
    } catch (error) {
      const fallo = aplicarObservacionFallida(
        nota,
        error instanceof Error
          ? `${error.message} No se ha guardado la observación. El texto sigue en pantalla.`
          : "No se ha guardado la observación. El texto sigue en pantalla. El estado no ha cambiado."
      );
      publicarBorrador(fallo.nota);
      return fallo.aviso;
    }
  }, [publicarBorrador]);

  const guardarNotasPendientes = useCallback(async () => {
    const pendientes = [...borradoresRef.current.values()].filter(estaPendiente);
    let aviso: AvisoPunteo | null = null;
    let todas = true;

    for (const nota of pendientes) {
      const resultado = await confirmarObservacion(String(nota.id), nota.textoVisible);
      const sigue = borradoresRef.current.get(nota.id);

      if (sigue && estaPendiente(sigue)) {
        todas = false;
      }

      if (resultado) {
        aviso = resultado;
      }
    }

    return {
      todas,
      aviso: aviso ?? { tono: "info" as const, texto: "No había observaciones pendientes." },
    };
  }, [confirmarObservacion]);

  const comprobarIncertidumbre = useCallback(async (): Promise<AvisoPunteo> => {
    if (!conexionPunteoActiva() || !incertidumbre) {
      return { tono: "info", texto: "No hay una importación pendiente de comprobar." };
    }

    if (!incertidumbre.huella) {
      return {
        tono: "error",
        texto: "Falta la huella de la operación incierta. No se repite ni se deshace.",
      };
    }

    try {
      const acceso = await import("@/modules/punteo-banco/acceso-oficial");
      const archivos = await acceso.leerImportaciones(banco);
      const decision = decidirConsulta({
        parte: incertidumbre.parte,
        huella: incertidumbre.huella,
        filas: archivos.map((archivo) => ({
          tipo: archivo.tipo,
          estado: archivo.estado,
          continuidad: archivo.continuidad,
          huella: archivo.huella,
          motivo: archivo.motivo,
        })),
        faltaOrdinaria: Boolean(preview?.plan.llamadas.includes("ordinaria") && incertidumbre.parte === "historica"),
      });

      if (decision.accion === "reintentar") {
        setIncertidumbre({ ...incertidumbre, puedeRepetir: true });
      }

      if (decision.accion === "continuar-ordinaria") {
        setIncertidumbre(null);
      }

      if (decision.accion === "cerrada") {
        setIncertidumbre(null);
        bufferRef.current = null;
        setPreview(null);
        setRecarga((valor) => valor + 1);
      }

      return { tono: decision.tono, texto: decision.texto };
    } catch {
      return {
        tono: "error",
        texto: "No se ha podido consultar el historial. El resultado sigue siendo desconocido. No se repite ni se deshace.",
      };
    }
  }, [banco, incertidumbre, preview]);

  const avisarGasto = useCallback(
    (mes: number): AvisoPunteo => {
      const resumen = meses.find((actual) => actual.mes === mes);

      if (!mesTpvUtilizable(resumen)) {
        return {
          tono: "error",
          texto: "El resumen TPV de este mes está incompleto. No se puede usar para crear un gasto.",
        };
      }

      return {
        tono: "info",
        texto: "El resumen de este mes está completo, pero Guardar TPV no está conectado con Gastos bancarios. No se ha creado ningún gasto.",
      };
    },
    [meses]
  );

  const hayNotasPendientes = [...borradores.values()].some(estaPendiente);
  const marcas: Record<string, "pendiente" | "error" | "conflicto"> = {};

  borradores.forEach((nota, id) => {
    const marca = marcaDeNota(nota);

    if (marca !== "oficial") {
      marcas[String(id)] = marca;
    }
  });

  const movimientos: MovimientoPunteo[] = filas.map((fila) => ({
    id: String(fila.id),
    fecha: fila.fecha,
    fechaValor: fila.fechaValor,
    importe: formatearCentimos(fila.importeCentimos),
    concepto: fila.conceptoOriginal,
    observaciones: fila.observaciones,
    ok: fila.estado,
    orden: fila.ordenBanco,
  }));

  return {
    activo,
    pagina,
    setPagina,
    hayMas,
    cargando,
    errorLectura,
    meses,
    movimientos,
    preview,
    enviando,
    estadoPendiente,
    incertidumbre,
    hayNotasPendientes,
    marcas,
    leerArchivo,
    cancelarPreview,
    confirmarCarga,
    comprobarIncertidumbre,
    alCambiar,
    cancelarEstado,
    confirmarEstado,
    confirmarObservacion,
    guardarNotasPendientes,
    avisarGasto,
  };
}

function textoLectura(lectura: Extract<ResultadoLectura, { ok: false }>) {
  if (lectura.motivo === "banco-distinto") {
    return "El archivo no corresponde al banco seleccionado. No se ha enviado nada a la base.";
  }

  if (lectura.motivo === "sin-movimientos") {
    return "El archivo no trae movimientos. No se ha enviado nada a la base.";
  }

  return "No se reconoce el extracto. No se ha enviado nada a la base.";
}
