import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { formatearCentimos, desdeCentimos } from "./centimos";
import { abonosFueraDelMes, detallarMesTpv, type LineaTpvDetalle } from "./detalle-tpv";
import type { MovimientoInterno } from "./movimiento-interno";
import { resumirTpvAnual } from "./resumen-tpv-calculo";

test("el detalle TPV cuadra con el resumen y no contabiliza dos veces el abono de Ibercaja", () => {
  const lineas: LineaTpvDetalle[] = [
    comision("a", "2026-04-27", "2026-04-25", -2023, "S1"),
    ingreso("v", "2026-04-27", 100000),
    mantenimiento("m", "2026-04-30", -500),
    comision("b", "2026-05-04", "2026-05-03", -5677, "S2"),
    comision("c", "2026-05-11", "2026-05-09", -714, "S3"),
    abono("d", "2026-05-20", 6625),
  ];
  const abril = detallarMesTpv(2026, 4, lineas);
  const mayo = detallarMesTpv(2026, 5, lineas);
  const imputado = abril.devolucionAsignadaCentimos + mayo.devolucionAsignadaCentimos;

  assert.equal(imputado, 6625);
  assert.equal(abril.filas.some((fila) => fila.esAbonoBancario), false);
  assert.equal(mayo.filas.filter((fila) => fila.esAbonoBancario).length, 1);
  assert.equal(mayo.filas.find((fila) => fila.esAbonoBancario)?.importeCentimos, 6625);
  assert.equal(mayo.filas.find((fila) => fila.esAbonoBancario)?.imputacionCentimos, 0);
  assert.equal(abril.mantenimientoCentimos, -500);
  assert.equal(abril.comisionesOriginalesCentimos, -2023);
  assert.equal(mayo.comisionesOriginalesCentimos, -5677 + -714);
  assert.equal(lineas.find((linea) => linea.id === "c") && mayo.filas.find((fila) => fila.id === "c")?.imputacionCentimos, 0);
  assert.equal(abonosFueraDelMes(abril).length, 1);
  assert.equal(abonosFueraDelMes(mayo).length, 0);

  const resumen = resumirTpvAnual({
    banco: "ibercaja",
    anio: 2026,
    movimientos: lineas.map(aInterno),
    periodos: [],
    huecos: [],
    hoy: "2026-10-20",
    gastosRegistrados: [],
    hayHistorico: false,
  });

  assert.equal(resumen[3]?.comisionOriginal, formatearCentimos(abril.comisionesOriginalesCentimos));
  assert.equal(resumen[3]?.devolucionAsignada, formatearCentimos(abril.devolucionAsignadaCentimos));
  assert.equal(resumen[3]?.comisiones, formatearCentimos(abril.comisionNetaCentimos));
  assert.equal(resumen[3]?.ingresos, formatearCentimos(abril.ingresosCentimos));
  assert.equal(resumen[4]?.comisionOriginal, formatearCentimos(mayo.comisionesOriginalesCentimos));
  assert.equal(resumen[4]?.devolucionAsignada, formatearCentimos(mayo.devolucionAsignadaCentimos));
  assert.equal(resumen[4]?.comisiones, formatearCentimos(mayo.comisionNetaCentimos));
  assert.equal(resumen[12]?.devolucionAsignada, "66,25");
});

test("abrir el detalle TPV no escribe en la base", () => {
  const acceso = readFileSync(new URL("./acceso-oficial.ts", import.meta.url), "utf8");
  const inicio = acceso.indexOf("export async function leerDetalleTpv");
  const fin = acceso.indexOf("export async function confirmarCargaHistorica");
  const cuerpo = acceso.slice(inicio, fin);
  const dialogo = readFileSync(
    new URL("../../app/gestion-diaria/punteo-banco/dialogo-detalle-tpv.tsx", import.meta.url),
    "utf8"
  );

  assert.equal(cuerpo.includes(".update("), false);
  assert.equal(cuerpo.includes(".insert("), false);
  assert.equal(cuerpo.includes(".delete("), false);
  assert.equal(cuerpo.includes(".rpc("), false);
  assert.equal(cuerpo.includes('.select('), true);
  assert.equal(dialogo.includes("punteo_cambiar_estado"), false);
  assert.equal(dialogo.includes("punteo_guardar"), false);
  assert.equal(dialogo.includes("onGuardarMes"), false);
});

function comision(id: string, fecha: string, fechaValor: string, centimos: number, terminal: string): LineaTpvDetalle {
  return {
    id,
    fecha,
    fechaValor,
    importeCentimos: centimos,
    clase: "tpv-comision",
    conceptoOriginal: "FACT.TPV",
    detallesOriginales: `FACT.TPV ${terminal}`,
    ordenBanco: centimos,
    referencias: [terminal],
  };
}

function ingreso(id: string, fecha: string, centimos: number): LineaTpvDetalle {
  return {
    id,
    fecha,
    fechaValor: fecha,
    importeCentimos: centimos,
    clase: "tpv-ingreso",
    conceptoOriginal: "FACT.TPV",
    detallesOriginales: "FACT.TPV S9",
    ordenBanco: 1,
    referencias: [],
  };
}

function mantenimiento(id: string, fecha: string, centimos: number): LineaTpvDetalle {
  return {
    id,
    fecha,
    fechaValor: fecha,
    importeCentimos: centimos,
    clase: "tpv-mantenimiento",
    conceptoOriginal: "SERV.TPV.MANT",
    detallesOriginales: "",
    ordenBanco: 2,
    referencias: [],
  };
}

function abono(id: string, fecha: string, centimos: number): LineaTpvDetalle {
  return {
    id,
    fecha,
    fechaValor: fecha,
    importeCentimos: centimos,
    clase: "tpv-devolucion",
    conceptoOriginal: "ABONO PARCIAL LIQUIDACIONES TPV",
    detallesOriginales: "ABONO PARCIAL LIQUIDACIONES TPV",
    ordenBanco: 9,
    referencias: [],
  };
}

function aInterno(linea: LineaTpvDetalle): MovimientoInterno {
  return {
    id: linea.id,
    banco: "ibercaja",
    fecha: linea.fecha,
    fechaValor: linea.fechaValor,
    importe: desdeCentimos(linea.importeCentimos),
    concepto: linea.conceptoOriginal,
    conceptoOriginal: linea.conceptoOriginal,
    detallesOriginales: linea.detallesOriginales,
    saldo: null,
    referencias: linea.referencias,
    clase: linea.clase as MovimientoInterno["clase"],
    observaciones: "",
    ok: "pendiente",
    archivo: "prueba.xls",
    fila: linea.ordenBanco,
    orden: linea.ordenBanco,
  };
}
