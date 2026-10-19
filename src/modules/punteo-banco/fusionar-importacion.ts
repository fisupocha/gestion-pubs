import { normalizarTexto } from "./celdas";
import type { MovimientoInterno } from "./movimiento-interno";

/** La identidad usa la fecha de operación. La fecha valor no cambia el mes del movimiento. */

export type DecisionDuplicado = "preguntar" | "importar-nuevos" | "omitir-coincidencias";

export type ResultadoFusion = {
  movimientos: MovimientoInterno[];
  anadidos: number;
  omitidosSeguros: number;
  ambiguos: MovimientoInterno[];
  pendienteDecision: boolean;
};

export function fusionarImportacion(
  existentes: MovimientoInterno[],
  incoming: MovimientoInterno[],
  decision: DecisionDuplicado
): ResultadoFusion {
  const fuertes = new Map<string, number>();
  const medias = new Map<string, number>();
  const debiles = new Map<string, number>();

  existentes.forEach((movimiento) => {
    sumar(fuertes, claveFuerte(movimiento));
    sumar(medias, claveMedia(movimiento));
    sumar(debiles, claveDebil(movimiento));
  });

  const aceptados: MovimientoInterno[] = [];
  const ambiguos: MovimientoInterno[] = [];
  let omitidosSeguros = 0;

  incoming.forEach((movimiento) => {
    const fuerte = claveFuerte(movimiento);
    const media = claveMedia(movimiento);

    if (fuerte && consumir(fuertes, fuerte)) {
      omitidosSeguros += 1;
      return;
    }

    if (media && consumir(medias, media)) {
      omitidosSeguros += 1;
      return;
    }

    if ((debiles.get(claveDebil(movimiento)) ?? 0) > 0) {
      ambiguos.push(movimiento);
      return;
    }

    aceptados.push(movimiento);
  });

  if (decision === "preguntar" && ambiguos.length > 0) {
    return {
      movimientos: existentes,
      anadidos: 0,
      omitidosSeguros,
      ambiguos,
      pendienteDecision: true,
    };
  }

  const incorporados =
    decision === "omitir-coincidencias" ? aceptados : [...aceptados, ...ambiguos];

  return {
    movimientos: [...existentes, ...incorporados],
    anadidos: incorporados.length,
    omitidosSeguros,
    ambiguos: [],
    pendienteDecision: false,
  };
}

function claveFuerte(movimiento: MovimientoInterno) {
  if (movimiento.referencias.length === 0) {
    return null;
  }

  return [
    movimiento.banco,
    movimiento.fecha,
    movimiento.importe.toFixed(2),
    [...movimiento.referencias].sort().join("|"),
  ].join("~");
}

function claveMedia(movimiento: MovimientoInterno) {
  if (movimiento.saldo === null || !movimiento.conceptoOriginal) {
    return null;
  }

  return [
    movimiento.banco,
    movimiento.fecha,
    movimiento.fechaValor,
    movimiento.importe.toFixed(2),
    movimiento.saldo.toFixed(2),
    normalizarTexto(movimiento.conceptoOriginal),
    normalizarTexto(movimiento.detallesOriginales),
  ].join("~");
}

function claveDebil(movimiento: MovimientoInterno) {
  return [
    movimiento.banco,
    movimiento.fecha,
    movimiento.importe.toFixed(2),
    normalizarTexto(movimiento.conceptoOriginal),
    normalizarTexto(movimiento.detallesOriginales),
  ].join("~");
}

function sumar(mapa: Map<string, number>, clave: string | null) {
  if (!clave) {
    return;
  }

  mapa.set(clave, (mapa.get(clave) ?? 0) + 1);
}

function consumir(mapa: Map<string, number>, clave: string) {
  const cantidad = mapa.get(clave) ?? 0;

  if (cantidad <= 0) {
    return false;
  }

  mapa.set(clave, cantidad - 1);
  return true;
}
