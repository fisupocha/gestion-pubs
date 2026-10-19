import type { BancoPunteoId } from "./modelo";
import { normalizarClave, normalizarTexto, textoCelda } from "./celdas";

export type ReconocimientoBanco =
  | { estado: "desconocido"; filaCabecera: number }
  | { estado: "reconocido"; banco: BancoPunteoId; filaCabecera: number };

const ALIAS_FECHA = ["fecha", "fechaoperacion", "foperacion", "fechaoper"];
const ALIAS_IMPORTE = ["importe", "importeeur", "cantidad"];

export function reconocerBanco(matriz: unknown[][], extension: string): ReconocimientoBanco {
  const filaCabecera = buscarFilaCabecera(matriz);

  if (filaCabecera < 0) {
    return { estado: "desconocido", filaCabecera: -1 };
  }

  const cabeceras = (matriz[filaCabecera] ?? []).map((celda) => normalizarClave(textoCelda(celda)));
  const preambulo = normalizarTexto(
    matriz
      .slice(0, filaCabecera)
      .flat()
      .map((celda) => textoCelda(celda))
      .join(" ")
  );
  let caixabank = 0;
  let ibercaja = 0;

  if (cabeceras.includes("movimiento")) {
    caixabank += 3;
  }

  if (cabeceras.includes("masdatos")) {
    caixabank += 3;
  }

  if (cabeceras.includes("oficina")) {
    caixabank += 1;
  }

  if (cabeceras.includes("referencia1") || cabeceras.includes("referencia2")) {
    caixabank += 1;
  }

  if (preambulo.includes("caixabank")) {
    caixabank += 4;
  }

  if (cabeceras.includes("concepto") || cabeceras.includes("descripcion")) {
    ibercaja += 2;
  }

  if (
    cabeceras.includes("fechaoperacion") ||
    cabeceras.includes("foperacion") ||
    cabeceras.includes("fechaoper")
  ) {
    ibercaja += 2;
  }

  if (cabeceras.includes("saldodisponible") || cabeceras.includes("categoria")) {
    ibercaja += 1;
  }

  if (preambulo.includes("ibercaja")) {
    ibercaja += 4;
  }

  const sufijo = extension.toLowerCase();

  if (sufijo === "xls" && caixabank >= 4) {
    caixabank += 1;
  }

  if ((sufijo === "xlsx" || sufijo === "xlsm") && ibercaja >= 4) {
    ibercaja += 1;
  }

  const ganador = caixabank === ibercaja ? null : caixabank > ibercaja ? "caixabank" : "ibercaja";
  const mejor = Math.max(caixabank, ibercaja);
  const diferencia = Math.abs(caixabank - ibercaja);

  if (!ganador || mejor < 5 || diferencia < 3) {
    return { estado: "desconocido", filaCabecera };
  }

  return { estado: "reconocido", banco: ganador, filaCabecera };
}

function buscarFilaCabecera(matriz: unknown[][]) {
  const limite = Math.min(matriz.length, 40);

  for (let fila = 0; fila < limite; fila += 1) {
    const claves = (matriz[fila] ?? []).map((celda) => normalizarClave(textoCelda(celda)));
    const tieneFecha = ALIAS_FECHA.some((alias) => claves.includes(alias));
    const tieneImporte = ALIAS_IMPORTE.some((alias) => claves.includes(alias));

    if (tieneFecha && tieneImporte) {
      return fila;
    }
  }

  return -1;
}
