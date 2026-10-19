import { normalizarTexto, redondear } from "./celdas";
import type { MovimientoInterno } from "./movimiento-interno";
import { esVisibleEnTabla } from "./movimiento-interno";

/** Las comprobaciones cronológicas usan la fecha de operación, no la fecha valor. */

export type ModuloRevision =
  | "facturas-recibidas"
  | "facturas-emitidas"
  | "creditos"
  | "alquileres"
  | "gastos-bancarios"
  | "impuestos"
  | "personal"
  | "caja"
  | "notas-varias";

export type RegistroEconomicoRevision = {
  id: string;
  modulo: ModuloRevision;
  fecha: string;
  importe: number;
  texto: string;
};

export type TipoIncidencia =
  | "duplicado-entre-bancos"
  | "repetido-en-banco"
  | "sin-correspondencia"
  | "factura-sin-pago"
  | "devolucion";

export type IncidenciaRevision = {
  id: string;
  tipo: TipoIncidencia;
  detalle: string;
  movimientoIds: string[];
  registroIds: string[];
};

const DIAS_CERCANOS = 5;

export function analizarRevisionConjunta(opciones: {
  movimientos: MovimientoInterno[];
  registros: RegistroEconomicoRevision[];
  descartadas: string[];
}) {
  const visibles = opciones.movimientos.filter((movimiento) => esVisibleEnTabla(movimiento.clase));
  const incidencias: IncidenciaRevision[] = [
    ...duplicadosEntreBancos(visibles),
    ...repetidosEnBanco(visibles),
    ...sinCorrespondencia(visibles, opciones.registros),
    ...facturasSinPago(visibles, opciones.registros),
    ...devoluciones(visibles),
  ];

  return incidencias.filter((incidencia) => !opciones.descartadas.includes(incidencia.id));
}

function duplicadosEntreBancos(movimientos: MovimientoInterno[]) {
  const incidencias: IncidenciaRevision[] = [];

  for (let izquierda = 0; izquierda < movimientos.length; izquierda += 1) {
    for (let derecha = izquierda + 1; derecha < movimientos.length; derecha += 1) {
      const a = movimientos[izquierda];
      const b = movimientos[derecha];

      if (a.banco === b.banco || !mismoImporte(a.importe, b.importe) || dias(a.fecha, b.fecha) > 3) {
        continue;
      }

      incidencias.push({
        id: `entre-bancos:${[a.id, b.id].sort().join(":")}`,
        tipo: "duplicado-entre-bancos",
        detalle: "Posible pago duplicado en los dos bancos. No se marca OK.",
        movimientoIds: [a.id, b.id],
        registroIds: [],
      });
    }
  }

  return incidencias;
}

function repetidosEnBanco(movimientos: MovimientoInterno[]) {
  const incidencias: IncidenciaRevision[] = [];

  for (let izquierda = 0; izquierda < movimientos.length; izquierda += 1) {
    for (let derecha = izquierda + 1; derecha < movimientos.length; derecha += 1) {
      const a = movimientos[izquierda];
      const b = movimientos[derecha];
      const mismaReferencia =
        a.referencias.length > 0 &&
        a.referencias.some((referencia) => b.referencias.includes(referencia));

      if (
        a.banco !== b.banco ||
        mismaReferencia ||
        !mismoImporte(a.importe, b.importe) ||
        normalizarTexto(a.conceptoOriginal) !== normalizarTexto(b.conceptoOriginal) ||
        dias(a.fecha, b.fecha) > DIAS_CERCANOS
      ) {
        continue;
      }

      incidencias.push({
        id: `repetido:${[a.id, b.id].sort().join(":")}`,
        tipo: "repetido-en-banco",
        detalle: "Posible repetición dentro del mismo banco. No se elimina ni se marca OK.",
        movimientoIds: [a.id, b.id],
        registroIds: [],
      });
    }
  }

  return incidencias;
}

function sinCorrespondencia(
  movimientos: MovimientoInterno[],
  registros: RegistroEconomicoRevision[]
) {
  return movimientos
    .filter((movimiento) => movimiento.importe < 0)
    .filter(
      (movimiento) =>
        !registros.some(
          (registro) =>
            mismoImporte(Math.abs(movimiento.importe), Math.abs(registro.importe)) &&
            dias(movimiento.fecha, registro.fecha) <= DIAS_CERCANOS
        )
    )
    .map((movimiento) => ({
      id: `sin-correspondencia:${movimiento.id}`,
      tipo: "sin-correspondencia" as const,
      detalle: "Movimiento sin registro económico cercano del mismo importe.",
      movimientoIds: [movimiento.id],
      registroIds: [],
    }));
}

function facturasSinPago(
  movimientos: MovimientoInterno[],
  registros: RegistroEconomicoRevision[]
) {
  return registros
    .filter((registro) => registro.modulo === "facturas-recibidas")
    .filter(
      (registro) =>
        !movimientos.some(
          (movimiento) =>
            movimiento.importe < 0 &&
            mismoImporte(Math.abs(movimiento.importe), Math.abs(registro.importe)) &&
            dias(movimiento.fecha, registro.fecha) <= 10
        )
    )
    .map((registro) => ({
      id: `factura-sin-pago:${registro.id}`,
      tipo: "factura-sin-pago" as const,
      detalle: "Factura recibida sin un pago bancario cercano del mismo importe.",
      movimientoIds: [],
      registroIds: [registro.id],
    }));
}

function devoluciones(movimientos: MovimientoInterno[]) {
  return movimientos
    .filter(
      (movimiento) =>
        movimiento.importe > 0 && /devoluc|retroces|abono/.test(normalizarTexto(movimiento.concepto))
    )
    .map((movimiento) => ({
      id: `devolucion:${movimiento.id}`,
      tipo: "devolucion" as const,
      detalle: "Posible devolución o regularización. Queda pendiente de revisión.",
      movimientoIds: [movimiento.id],
      registroIds: [],
    }));
}

function mismoImporte(a: number, b: number) {
  return Math.abs(redondear(a) - redondear(b)) < 0.001;
}

function dias(a: string, b: string) {
  const ms = Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`);
  return Math.abs(Math.round(ms / 86400000));
}
