import { aCentimos, desdeCentimos } from "./centimos";
import { normalizarTexto } from "./celdas";
import type { MovimientoInterno } from "./movimiento-interno";
import { clasificarSecuenciaTpv } from "./clasificar-movimiento";
import type { ReferenciaMovimiento } from "./referencias-iniciales";

export type EstadoContinuidad = "cuadra" | "no-cuadra" | "sin-saldos" | "sin-nuevos" | "secuencia-incierta";

export type FalloSaldo = {
  fecha: string;
  concepto: string;
  saldoAnterior: number;
  importe: number;
  saldoEsperado: number;
  saldoEncontrado: number;
  diferencia: number;
};

export type PlanContinuidad = {
  puedeConfirmar: boolean;
  estado: EstadoContinuidad;
  mensaje: string;
  nuevos: MovimientoInterno[];
  omitidos: number;
  primeroNuevo: MovimientoInterno | null;
  ultimoNuevo: MovimientoInterno | null;
  normales: number;
  tpv: number;
  pendientes: number;
  fallo: FalloSaldo | null;
};

export function planificarContinuidad(opciones: {
  referencia: ReferenciaMovimiento;
  archivo: MovimientoInterno[];
  existentes: MovimientoInterno[];
}): PlanContinuidad {
  const delBanco = opciones.archivo.filter((movimiento) => movimiento.banco === opciones.referencia.banco);

  if (delBanco.some((movimiento) => movimiento.saldo === null)) {
    return vacio("sin-saldos", "Este archivo no trae saldos suficientes. La continuidad no queda comprobada.");
  }

  const orden = ordenarPorCadena(delBanco);

  if (orden.estado === "rota") {
    return {
      ...vacio("no-cuadra", "Los saldos no cuadran."),
      fallo: orden.fallo,
    };
  }

  if (orden.estado === "incierta") {
    return vacio(
      "secuencia-incierta",
      "No se puede determinar con seguridad el orden real del extracto ni dónde continúa."
    );
  }

  const secuencia = clasificarSecuenciaTpv(orden.secuencia);
  const marcas = secuencia.map((movimiento) =>
    marcar(movimiento, opciones.referencia, opciones.existentes)
  );

  if (marcas.includes("incierto")) {
    return vacio(
      "secuencia-incierta",
      "Hay un movimiento que no se distingue con seguridad de otro ya registrado. No se importa."
    );
  }

  const indiceAncla = marcas.indexOf("ancla");
  const anteriorIgnorado = (indice: number) =>
    indiceAncla >= 0 && indice < indiceAncla && marcas[indice] === "nuevo";
  const conocidos = marcas
    .map((marca, indice) => (marca === "ancla" || marca === "importado" ? indice : -1))
    .filter((indice) => indice >= 0);
  const ultimoConocido = conocidos.length > 0 ? conocidos[conocidos.length - 1] : -1;
  const indicesNuevos = marcas
    .map((marca, indice) => (marca === "nuevo" && !anteriorIgnorado(indice) ? indice : -1))
    .filter((indice) => indice >= 0);

  if (indicesNuevos.some((indice) => indice < ultimoConocido)) {
    return vacio(
      "secuencia-incierta",
      "Hay movimientos nuevos mezclados con otros ya registrados. No se sabe dónde continúa el extracto."
    );
  }

  if (ultimoConocido >= 0 && !mismoAncla(secuencia[ultimoConocido], opciones.referencia)) {
    return vacio(
      "secuencia-incierta",
      "El extracto no enlaza con el último movimiento registrado."
    );
  }

  const saldoAnterior =
    ultimoConocido >= 0 ? secuencia[ultimoConocido].saldo ?? opciones.referencia.saldo : opciones.referencia.saldo;
  const nuevos = indicesNuevos.map((indice) => secuencia[indice]);

  if (nuevos.length === 0) {
    return vacio("sin-nuevos", "No hay movimientos nuevos. No se crea ningún duplicado.");
  }

  const enlace = enlaceSaldo(saldoAnterior, nuevos[0]);

  if (!enlace.ok) {
    return {
      ...vacio("no-cuadra", "Los saldos no cuadran."),
      fallo: enlace.fallo,
      primeroNuevo: nuevos[0],
      ultimoNuevo: nuevos[nuevos.length - 1],
    };
  }

  const base = opciones.existentes.filter((movimiento) => movimiento.banco === opciones.referencia.banco).length;
  const preparados = nuevos.map((movimiento, indice) => ({
    ...movimiento,
    orden: base + indice + 1,
  }));

  return {
    puedeConfirmar: true,
    estado: "cuadra",
    mensaje: "CUADRA",
    nuevos: preparados,
    omitidos: delBanco.length - preparados.length,
    primeroNuevo: preparados[0] ?? null,
    ultimoNuevo: preparados[preparados.length - 1] ?? null,
    normales: preparados.filter(
      (movimiento) => movimiento.clase === "normal" || movimiento.clase === "credito-cuota"
    ).length,
    tpv: preparados.filter((movimiento) => movimiento.clase.startsWith("tpv-")).length,
    pendientes: preparados.filter((movimiento) => movimiento.clase === "pendiente-clasificacion").length,
    fallo: null,
  };
}

export function ordenarPorCadena(filas: MovimientoInterno[]) {
  if (filas.length <= 1) {
    return { estado: "ok" as const, secuencia: filas };
  }

  const adelante = evaluar(filas);
  const inverso = evaluar([...filas].reverse());

  if (adelante.rotos === 0 && inverso.rotos === 0) {
    return { estado: "ok" as const, secuencia: desempatar(filas) };
  }

  if (adelante.rotos === 0) {
    return { estado: "ok" as const, secuencia: filas };
  }

  if (inverso.rotos === 0) {
    return { estado: "ok" as const, secuencia: [...filas].reverse() };
  }

  if (adelante.rotos < inverso.rotos && adelante.fallo) {
    return { estado: "rota" as const, fallo: adelante.fallo };
  }

  if (inverso.rotos < adelante.rotos && inverso.fallo) {
    return { estado: "rota" as const, fallo: inverso.fallo };
  }

  const desciende = filas.every((fila, indice) => indice === 0 || filas[indice - 1].fecha > fila.fecha);

  if (desciende && inverso.fallo) {
    return { estado: "rota" as const, fallo: inverso.fallo };
  }

  if (adelante.fallo) {
    return { estado: "rota" as const, fallo: adelante.fallo };
  }

  return { estado: "incierta" as const };
}

function desempatar(filas: MovimientoInterno[]) {
  const ascendente = filas.every((fila, indice) => indice === 0 || filas[indice - 1].fecha <= fila.fecha);
  const descendente = filas.every((fila, indice) => indice === 0 || filas[indice - 1].fecha >= fila.fecha);

  if (descendente && !ascendente) {
    return [...filas].reverse();
  }

  return filas;
}

function evaluar(filas: MovimientoInterno[]) {
  let rotos = 0;
  let fallo: FalloSaldo | null = null;

  for (let indice = 1; indice < filas.length; indice += 1) {
    const enlace = enlaceSaldo(filas[indice - 1].saldo ?? 0, filas[indice]);

    if (!enlace.ok) {
      rotos += 1;
      fallo ??= enlace.fallo;
    }
  }

  return { rotos, fallo };
}

function enlaceSaldo(saldoAnterior: number, movimiento: MovimientoInterno) {
  const esperado = aCentimos(saldoAnterior) + aCentimos(movimiento.importe);
  const encontrado = aCentimos(movimiento.saldo ?? 0);

  if (esperado === encontrado) {
    return { ok: true as const };
  }

  return {
    ok: false as const,
    fallo: {
      fecha: movimiento.fecha,
      concepto: movimiento.conceptoOriginal || movimiento.concepto || "Sin concepto",
      saldoAnterior: desdeCentimos(aCentimos(saldoAnterior)),
      importe: desdeCentimos(aCentimos(movimiento.importe)),
      saldoEsperado: desdeCentimos(esperado),
      saldoEncontrado: desdeCentimos(encontrado),
      diferencia: desdeCentimos(encontrado - esperado),
    },
  };
}

function marcar(
  movimiento: MovimientoInterno,
  referencia: ReferenciaMovimiento,
  existentes: MovimientoInterno[]
) {
  if (mismoAncla(movimiento, referencia)) {
    return "ancla" as const;
  }

  const porReferencia = existentes.find((existente) => {
    const clave = claveReferencia(existente);
    return clave !== null && clave === claveReferencia(movimiento);
  });

  if (porReferencia) {
    if (
      porReferencia.saldo !== null &&
      movimiento.saldo !== null &&
      aCentimos(porReferencia.saldo) !== aCentimos(movimiento.saldo)
    ) {
      return "incierto" as const;
    }

    return "importado" as const;
  }

  const porSaldo = existentes.find((existente) => claveSaldo(existente) === claveSaldo(movimiento));

  if (porSaldo) {
    return "importado" as const;
  }

  return "nuevo" as const;
}

function mismoAncla(movimiento: MovimientoInterno, referencia: ReferenciaMovimiento) {
  return (
    movimiento.banco === referencia.banco &&
    movimiento.fecha === referencia.fecha &&
    aCentimos(movimiento.importe) === aCentimos(referencia.importe) &&
    aCentimos(movimiento.saldo ?? 0) === aCentimos(referencia.saldo)
  );
}

function claveReferencia(movimiento: MovimientoInterno) {
  if (movimiento.referencias.length === 0) {
    return null;
  }

  return [
    movimiento.banco,
    movimiento.fecha,
    aCentimos(movimiento.importe),
    [...movimiento.referencias].sort().join("|"),
  ].join("~");
}

function claveSaldo(movimiento: MovimientoInterno) {
  return [
    movimiento.banco,
    movimiento.fecha,
    aCentimos(movimiento.importe),
    aCentimos(movimiento.saldo ?? 0),
    normalizarTexto(movimiento.conceptoOriginal),
  ].join("~");
}

function vacio(estado: EstadoContinuidad, mensaje: string): PlanContinuidad {
  return {
    puedeConfirmar: false,
    estado,
    mensaje,
    nuevos: [],
    omitidos: 0,
    primeroNuevo: null,
    ultimoNuevo: null,
    normales: 0,
    tpv: 0,
    pendientes: 0,
    fallo: null,
  };
}
