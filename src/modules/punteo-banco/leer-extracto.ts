import * as XLSX from "xlsx";
import {
  fechaIsoDesdeValor,
  hashEstable,
  importeDesdeValor,
  normalizarClave,
  normalizarTexto,
  textoCelda,
} from "./celdas";
import { clasificarMovimiento, codigosTpvEnTexto } from "./clasificar-movimiento";
import { aliasesFechaOperacion, aliasesFechaValor } from "./fechas-movimiento";
import type { BancoPunteoId } from "./modelo";
import type { MovimientoInterno } from "./movimiento-interno";
import { reconocerBanco } from "./reconocer-banco";

export type ResultadoLectura =
  | {
      ok: false;
      motivo: "formato-desconocido" | "banco-distinto" | "sin-movimientos";
      bancoDetectado: BancoPunteoId | null;
    }
  | {
      ok: true;
      banco: BancoPunteoId;
      movimientos: MovimientoInterno[];
      periodo: { desde: string; hasta: string } | null;
      /** Fecha de operación más alta. No confirma la cobertura del extracto. */
      ultimoMovimiento: string | null;
    };

const ALIAS: Record<string, string[]> = {
  concepto: ["movimiento", "concepto", "descripcion"],
  detalles: ["masdatos", "detalles", "ampliacion", "datosadicionales", "descripcion"],
  importe: ["importe", "importeeur", "cantidad"],
  saldo: ["saldo", "saldodisponible"],
  referencia: [
    "referencia",
    "referencia1",
    "referencia2",
    "numerodocumento",
    "ndocumento",
    "nmovimiento",
    "numeromovimiento",
  ],
};

export function leerExtracto(
  buffer: ArrayBuffer,
  nombreArchivo: string,
  bancoEsperado: BancoPunteoId
): ResultadoLectura {
  const extension = nombreArchivo.split(".").pop() ?? "";
  const libro = XLSX.read(buffer, { type: "array", cellDates: false, raw: true });
  let mejor: { matriz: unknown[][]; fila: number; banco: BancoPunteoId } | null = null;

  for (const nombre of libro.SheetNames) {
    const hoja = libro.Sheets[nombre];

    if (!hoja) {
      continue;
    }

    const matriz = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, defval: "", raw: true });
    const reconocimiento = reconocerBanco(matriz, extension);

    if (reconocimiento.estado !== "reconocido") {
      continue;
    }

    mejor = {
      matriz,
      fila: reconocimiento.filaCabecera,
      banco: reconocimiento.banco,
    };
    break;
  }

  if (!mejor) {
    return { ok: false, motivo: "formato-desconocido", bancoDetectado: null };
  }

  if (mejor.banco !== bancoEsperado) {
    return { ok: false, motivo: "banco-distinto", bancoDetectado: mejor.banco };
  }

  const columnas = mapearColumnas(mejor.matriz[mejor.fila] ?? [], mejor.banco);
  const movimientos = construirMovimientos(mejor.matriz, mejor.fila, columnas, mejor.banco, nombreArchivo);

  if (movimientos.length === 0) {
    return { ok: false, motivo: "sin-movimientos", bancoDetectado: mejor.banco };
  }

  const preambulo = mejor.matriz
    .slice(0, mejor.fila)
    .flat()
    .map((celda) => textoCelda(celda));
  const periodo = detectarPeriodoDeclarado(preambulo);
  const ultimoMovimiento = movimientos.reduce<string | null>(
    (ultimo, movimiento) => (!ultimo || movimiento.fecha > ultimo ? movimiento.fecha : ultimo),
    null
  );

  return {
    ok: true,
    banco: mejor.banco,
    movimientos,
    periodo,
    ultimoMovimiento,
  };
}

export function detectarPeriodoDeclarado(textos: string[]) {
  const texto = textos.join(" ");
  const patrones = [
    /del\s+(\d{1,2}[/.]\d{1,2}[/.]\d{2,4})\s+al\s+(\d{1,2}[/.]\d{1,2}[/.]\d{2,4})/i,
    /periodo\s*:?\s*(\d{1,2}[/.]\d{1,2}[/.]\d{2,4})\s*(?:al|-|a)\s*(\d{1,2}[/.]\d{1,2}[/.]\d{2,4})/i,
    /desde\s+(\d{1,2}[/.]\d{1,2}[/.]\d{2,4})\s+hasta\s+(\d{1,2}[/.]\d{1,2}[/.]\d{2,4})/i,
  ];

  for (const patron of patrones) {
    const encontrado = texto.match(patron);

    if (!encontrado) {
      continue;
    }

    const desde = fechaIsoDesdeValor(encontrado[1]);
    const hasta = fechaIsoDesdeValor(encontrado[2]);

    if (desde && hasta && desde <= hasta) {
      return { desde, hasta };
    }
  }

  return null;
}

function mapearColumnas(cabecera: unknown[], banco: BancoPunteoId) {
  const mapa = new Map<string, number>();

  cabecera.forEach((celda, indiceColumna) => {
    const clave = normalizarClave(textoCelda(celda));

    if (clave && !mapa.has(clave)) {
      mapa.set(clave, indiceColumna);
    }
  });

  function indice(grupo: keyof typeof ALIAS) {
    for (const alias of ALIAS[grupo]) {
      const encontrado = mapa.get(alias);

      if (encontrado !== undefined) {
        return encontrado;
      }
    }

    return -1;
  }

  function indiceDe(aliases: readonly string[]) {
    for (const alias of aliases) {
      const encontrado = mapa.get(alias);

      if (encontrado !== undefined) {
        return encontrado;
      }
    }

    return -1;
  }

  const referencias = ALIAS.referencia
    .map((alias) => mapa.get(alias))
    .filter((indiceColumna): indiceColumna is number => indiceColumna !== undefined);
  const fecha = indiceDe(aliasesFechaOperacion(banco));
  const fechaValor = indiceDe(aliasesFechaValor());

  return {
    fecha,
    fechaValor: fechaValor === fecha ? -1 : fechaValor,
    concepto: indice("concepto"),
    detalles: indice("detalles"),
    importe: indice("importe"),
    saldo: indice("saldo"),
    referencias,
  };
}

function construirMovimientos(
  matriz: unknown[][],
  filaCabecera: number,
  columnas: ReturnType<typeof mapearColumnas>,
  banco: BancoPunteoId,
  archivo: string
) {
  const movimientos: MovimientoInterno[] = [];
  const ordinales = new Map<string, number>();

  for (let fila = filaCabecera + 1; fila < matriz.length; fila += 1) {
    const celdas = matriz[fila] ?? [];
    const fecha = columnas.fecha >= 0 ? fechaIsoDesdeValor(celdas[columnas.fecha]) : null;
    const importe = columnas.importe >= 0 ? importeDesdeValor(celdas[columnas.importe]) : null;

    if (!fecha || importe === null) {
      continue;
    }

    const fechaValor =
      columnas.fechaValor >= 0 ? (fechaIsoDesdeValor(celdas[columnas.fechaValor]) ?? "") : "";
    const conceptoOriginal =
      columnas.concepto >= 0 ? textoCelda(celdas[columnas.concepto]) : "";
    const detallesOriginales = columnas.detalles >= 0 ? textoCelda(celdas[columnas.detalles]) : "";
    const concepto = [conceptoOriginal, detallesOriginales].filter(Boolean).join(" · ");
    const saldo = columnas.saldo >= 0 ? importeDesdeValor(celdas[columnas.saldo]) : null;
    const referencias = [
      ...columnas.referencias
        .map((indice) => textoCelda(celdas[indice]))
        .filter((referencia) => referencia.length >= 4),
      ...codigosTpvEnTexto(conceptoOriginal, detallesOriginales),
    ].filter((referencia, indice, lista) => referencia.length >= 4 && lista.indexOf(referencia) === indice);
    const clase = clasificarMovimiento(conceptoOriginal, detallesOriginales);
    const clave = [
      banco,
      fecha,
      fechaValor,
      importe.toFixed(2),
      saldo === null ? "" : saldo.toFixed(2),
      referencias.join("|"),
      normalizarTexto(concepto),
    ].join("~");
    const orden = (ordinales.get(clave) ?? 0) + 1;
    ordinales.set(clave, orden);

    movimientos.push({
      id: `${banco}-${hashEstable(`${clave}#${orden}`)}`,
      banco,
      fecha,
      fechaValor,
      importe,
      concepto,
      conceptoOriginal,
      detallesOriginales,
      saldo,
      referencias,
      clase,
      observaciones: "",
      ok: "pendiente",
      archivo,
      fila,
      orden,
    });
  }

  return movimientos;
}
