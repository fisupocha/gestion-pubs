import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { aCentimos } from "./centimos";
import { ordenarPorCadena } from "./continuidad-saldo";
import { terminalFactTpv } from "./clasificar-movimiento";
import { leerExtracto } from "./leer-extracto";
import { lineasOficiales } from "./linea-oficial";
import { esVisibleEnTabla } from "./movimiento-interno";
import { prepararCargaOficial } from "./preparar-carga-oficial";
import { asignarDevolucionCentimos } from "./reparto-abono-comision";
import { resumirTpvAnual } from "./resumen-tpv-calculo";
import type { MovimientoInterno } from "./movimiento-interno";

const CAIXA = "C:/Users/aranj/Desktop/caixa cursor.xls";
const IBER = "C:/Users/aranj/Desktop/ibercaja cursor.xlsx";

function bufferDe(ruta: string) {
  const contenido = readFileSync(ruta);
  return contenido.buffer.slice(contenido.byteOffset, contenido.byteOffset + contenido.byteLength);
}

function suma(filas: MovimientoInterno[], clase: MovimientoInterno["clase"]) {
  return filas.filter((fila) => fila.clase === clase).reduce((total, fila) => total + aCentimos(fila.importe), 0);
}

function cadenaAlCentimo(filas: MovimientoInterno[]) {
  const orden = ordenarPorCadena(filas);
  assert.equal(orden.estado, "ok");
  if (orden.estado !== "ok") {
    return;
  }

  for (let indice = 1; indice < orden.secuencia.length; indice += 1) {
    const esperado: number = aCentimos(orden.secuencia[indice - 1].saldo ?? 0) + aCentimos(orden.secuencia[indice].importe);
    assert.equal(aCentimos(orden.secuencia[indice].saldo ?? 0), esperado);
  }
}

test("los Excel completos clasifican ingresos, comisiones y excepciones", () => {
  assert.equal(existsSync(CAIXA), true);
  assert.equal(existsSync(IBER), true);

  const caixa = leerExtracto(bufferDe(CAIXA), "caixa cursor.xls", "caixabank");
  const iber = leerExtracto(bufferDe(IBER), "ibercaja cursor.xlsx", "ibercaja");
  assert.equal(caixa.ok, true);
  assert.equal(iber.ok, true);
  if (!caixa.ok || !iber.ok) {
    return;
  }

  cadenaAlCentimo(caixa.movimientos);
  cadenaAlCentimo(iber.movimientos);

  const planCaixa = prepararCargaOficial("caixabank", caixa.movimientos.map((fila) => ({ ...fila, clase: "normal" })));
  const planIber = prepararCargaOficial("ibercaja", iber.movimientos.map((fila) => ({ ...fila, clase: "normal" })));
  assert.equal(planCaixa.garantizada, true);
  assert.equal(planIber.garantizada, true);

  const enviadasCaixa = [...planCaixa.historico, ...planCaixa.ordinario];
  const enviadasIber = [...planIber.historico, ...planIber.ordinario];
  const lineasCaixa = lineasOficiales("caixabank", enviadasCaixa);
  const lineasIber = lineasOficiales("ibercaja", enviadasIber);

  assert.equal(enviadasCaixa.length, 1708);
  assert.equal(suma(enviadasCaixa, "tpv-ingreso"), 33713834);
  assert.equal(enviadasCaixa.filter((fila) => fila.clase === "tpv-ingreso").length, 892);
  assert.equal(suma(enviadasCaixa, "tpv-comision"), -132269);
  assert.equal(enviadasCaixa.filter((fila) => fila.clase === "tpv-comision").length, 245);
  assert.deepEqual(
    lineasCaixa.filter((linea) => linea.concepto_original === "C. 124129933 3009").map((linea) => linea.clase),
    ["tpv-comision", "tpv-comision"]
  );
  assert.equal(
    lineasCaixa
      .filter((linea) => linea.fecha_operacion === "2026-10-01" && linea.concepto_original === "C. 124129933 3009")
      .reduce((total, linea) => total + Number(linea.importe_centimos), 0),
    -37
  );

  assert.equal(enviadasIber.length, 533);
  assert.equal(new Set(enviadasIber.map((fila) => fila.id)).size, 533);
  assert.equal(suma(enviadasIber, "tpv-ingreso"), 8824508);
  assert.equal(enviadasIber.filter((fila) => fila.clase === "tpv-ingreso").length, 237);
  assert.equal(enviadasIber.filter((fila) => fila.clase === "tpv-comision").length, 237);
  assert.equal(suma(enviadasIber, "tpv-comision"), -28440);

  const factNegativos = enviadasIber.filter(
    (fila) => fila.detallesOriginales.includes("FACT.TPV") && fila.importe < 0
  );
  const comi = enviadasIber.filter((fila) => fila.detallesOriginales.includes("COMI.TPV") && fila.importe < 0);
  const abono = enviadasIber.filter((fila) => fila.detallesOriginales.includes("ABONO PARCIAL LIQUIDACIONES TPV"));
  assert.equal(factNegativos.length, 35);
  assert.equal(comi.length, 202);
  assert.equal(suma(comi, "tpv-comision"), -20026);
  assert.equal(factNegativos.every((fila) => fila.clase === "tpv-comision" && !esVisibleEnTabla(fila.clase)), true);
  assert.equal(abono.length, 1);
  assert.equal(aCentimos(abono[0]?.importe ?? 0), 6625);
  assert.equal(abono[0]?.fecha, "2026-05-20");
  assert.equal(abono[0]?.clase, "tpv-devolucion");
  assert.equal(esVisibleEnTabla(abono[0]?.clase ?? "normal"), false);

  const asignacion = asignarDevolucionCentimos(
    enviadasIber.map((fila) => ({
      id: fila.id,
      fecha: fila.fecha,
      fechaValor: fila.fechaValor,
      centimos: aCentimos(fila.importe),
      clase: fila.clase,
      conceptoOriginal: fila.conceptoOriginal,
      detallesOriginales: fila.detallesOriginales,
    }))
  );
  const iniciales = factNegativos.filter(
    (fila) => fila.fechaValor >= "2026-04-25" && fila.fechaValor <= "2026-05-04"
  );
  const posteriores = factNegativos.filter(
    (fila) => fila.fechaValor >= "2026-05-09" && fila.fechaValor <= "2026-05-11"
  );
  assert.equal(iniciales.length, 25);
  assert.equal(posteriores.length, 10);
  assert.equal(iniciales.reduce((total, fila) => total + aCentimos(fila.importe), 0), -7700);
  assert.equal(posteriores.reduce((total, fila) => total + aCentimos(fila.importe), 0), -714);
  assert.equal(
    iniciales.reduce((total, fila) => total + (asignacion.get(fila.id) ?? 0), 0),
    6625
  );
  assert.equal(
    posteriores.every((fila) => (asignacion.get(fila.id) ?? 0) === 0) &&
      comi.every((fila) => (asignacion.get(fila.id) ?? 0) === 0),
    true
  );
  const devolucionDe = (fecha: string) =>
    iniciales
      .filter((fila) => fila.fecha === fecha)
      .reduce((total, fila) => total + (asignacion.get(fila.id) ?? 0), 0);
  assert.equal(devolucionDe("2026-04-27"), 1741);
  assert.equal(devolucionDe("2026-05-04"), 4884);
  assert.equal(-7700 + 6625, -1075);
  assert.equal((-28440 + 6625), -21815);
  assert.equal(((1075 / 537800) * 100).toFixed(4), "0.1999");

  const partes = new Map(
    iniciales.map((fila) => [
      `${fila.fechaValor}|${terminalFactTpv(fila.conceptoOriginal, fila.detallesOriginales)}`,
      asignacion.get(fila.id) ?? 0,
    ])
  );
  assert.equal(partes.get("2026-04-25|S102697242"), 77);
  assert.equal(partes.get("2026-05-03|S114682021"), 1309);
  assert.equal(partes.get("2026-05-04|S125143372"), 305);

  const resumen = resumirTpvAnual({
    banco: "ibercaja",
    anio: 2026,
    movimientos: enviadasIber,
    periodos: [],
    huecos: [],
    hoy: "2026-10-20",
    gastosRegistrados: [],
    hayHistorico: false,
  });
  assert.equal(resumen[3]?.comisionOriginal, "-20,23");
  assert.equal(resumen[3]?.devolucionAsignada, "17,41");
  assert.equal(resumen[3]?.comisiones, "-2,82");
  assert.equal(resumen[4]?.devolucionAsignada, "48,84");
  assert.equal(resumen[12]?.comisionOriginal, "-284,40");
  assert.equal(resumen[12]?.devolucionAsignada, "66,25");
  assert.equal(resumen[12]?.comisiones, "-218,15");
  assert.equal(resumen[12]?.ingresos, "88.245,08");

  assert.equal(enviadasCaixa.every((fila) => fila.ok === "pendiente"), true);
  assert.equal(enviadasIber.every((fila) => fila.ok === "pendiente"), true);
  assert.deepEqual(
    lineasCaixa.map((linea) => linea.clase),
    enviadasCaixa.map((fila) => fila.clase)
  );
  assert.deepEqual(
    lineasIber.map((linea) => linea.clase),
    enviadasIber.map((fila) => fila.clase)
  );

  const mantenimiento = enviadasCaixa.filter((fila) => fila.clase === "tpv-mantenimiento");
  const bonificaciones = enviadasCaixa.filter((fila) => fila.conceptoOriginal.startsWith("BONIF."));
  assert.equal(mantenimiento.length, 50);
  assert.equal(bonificaciones.length, 9);
  assert.equal(bonificaciones.every((fila) => fila.clase === "normal" && esVisibleEnTabla(fila.clase)), true);
  assert.equal(mantenimiento.some((fila) => fila.clase === "tpv-comision" || fila.clase === "tpv-ingreso"), false);
});

test("el resumen TPV no ofrece un enlace para crear el gasto", () => {
  const resumen = readFileSync(new URL("../../app/gestion-diaria/punteo-banco/resumen-tpv.tsx", import.meta.url), "utf8");
  const oficial = readFileSync(new URL("./paginacion-tpv.ts", import.meta.url), "utf8");
  const local = readFileSync(new URL("./resumen-tpv-calculo.ts", import.meta.url), "utf8");
  const sql = readFileSync(new URL("../../../sql/punteo-banco/PUNTEO-BANCO-FASE1-NO-EJECUTAR.sql", import.meta.url), "utf8");

  assert.equal(resumen.includes("onGuardarMes"), false);
  assert.equal(resumen.includes("Sin autorizar") || oficial.includes("Sin autorizar"), true);
  assert.equal(oficial.includes('"Guardar"'), false);
  assert.equal(local.includes('return "Guardar"'), false);
  assert.match(sql, /'pendiente',\s*'Importado\. Pendiente de revisión\.'/);
});
