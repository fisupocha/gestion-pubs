import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";
import { clasificarMovimiento, clasificarSecuenciaTpv } from "./clasificar-movimiento";
import { planificarContinuidad } from "./continuidad-saldo";
import { leerExtracto } from "./leer-extracto";
import type { MovimientoInterno } from "./movimiento-interno";
import { esTpvCalculable, esVisibleEnTabla } from "./movimiento-interno";
import { REFERENCIAS_INICIALES } from "./referencias-iniciales";
import { resumirTpvAnual } from "./resumen-tpv-calculo";

function libro(filas: unknown[][], bookType: "xls" | "xlsx") {
  const hoja = XLSX.utils.aoa_to_sheet(filas);
  const archivo = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(archivo, hoja, "Movimientos");
  const salida = XLSX.write(archivo, { type: "buffer", bookType }) as Uint8Array;
  const copia = new Uint8Array(salida.byteLength);
  copia.set(salida);
  return copia.buffer;
}

function movimiento(
  parcial: Partial<MovimientoInterno> &
    Pick<MovimientoInterno, "id" | "fecha" | "importe" | "saldo" | "conceptoOriginal">
): MovimientoInterno {
  return {
    banco: "caixabank",
    fechaValor: "",
    concepto: parcial.conceptoOriginal,
    detallesOriginales: "",
    referencias: [],
    clase: "normal",
    observaciones: "",
    ok: "pendiente",
    archivo: "prueba.xls",
    fila: 1,
    orden: 1,
    ...parcial,
  };
}

test("CaixaBank reconoce ON y C. en Movimiento o en Más datos", () => {
  assert.equal(clasificarMovimiento("ON 203103310001", ""), "tpv-ingreso");
  assert.equal(clasificarMovimiento("Traspaso", "ON203103310001"), "tpv-ingreso");
  assert.equal(clasificarMovimiento("C. ON 203103310001", ""), "pendiente-clasificacion");
  assert.equal(clasificarMovimiento("C. 203103310001", ""), "pendiente-clasificacion");
  assert.equal(clasificarMovimiento("Comisión mantenimiento cuenta", ""), "normal");
  assert.equal(clasificarMovimiento("C.C. 203103310001", ""), "normal");
  assert.equal(clasificarMovimiento("Mantenimiento TPV", ""), "tpv-mantenimiento");
  assert.equal(clasificarMovimiento("CONCEPTO 203103310001", ""), "normal");

  const secuencia = clasificarSecuenciaTpv([
    movimiento({
      id: "ingreso",
      fecha: "2031-03-31",
      importe: 80,
      saldo: 80,
      conceptoOriginal: "Traspaso",
      detallesOriginales: "ON 203103310001",
      clase: "tpv-ingreso",
    }),
    movimiento({
      id: "comision",
      fecha: "2031-03-31",
      importe: -1.2,
      saldo: 78.8,
      conceptoOriginal: "Cargo",
      detallesOriginales: "C. 203103310001",
      clase: "pendiente-clasificacion",
    }),
  ]);

  assert.deepEqual(
    secuencia.map((fila) => fila.clase),
    ["tpv-ingreso", "pendiente-clasificacion"]
  );
  assert.equal(secuencia[0]?.conceptoOriginal, "Traspaso");
  assert.equal(secuencia[0]?.detallesOriginales, "ON 203103310001");
});

test("un único cierre reconoce el ingreso ON y la comisión C.", () => {
  assert.equal(clasificarMovimiento("ON 12993-070 3009", ""), "tpv-ingreso");
  assert.equal(clasificarMovimiento("C. 124129933 3009", ""), "pendiente-clasificacion");
  assert.equal(clasificarMovimiento("C. 124129933 3009", "", -0.11), "tpv-comision");
  assert.equal(clasificarMovimiento("C. 124129933 3009", "", 0.11), "pendiente-clasificacion");

  const secuencia = clasificarSecuenciaTpv([
    movimiento({
      id: "on",
      fecha: "2031-03-31",
      importe: 5,
      saldo: 5,
      conceptoOriginal: "ON 12993-070 3009",
      clase: "tpv-ingreso",
    }),
    movimiento({
      id: "c",
      fecha: "2031-03-31",
      importe: -0.11,
      saldo: 4.89,
      conceptoOriginal: "C. 124129933 3009",
      clase: clasificarMovimiento("C. 124129933 3009", "", -0.11),
    }),
  ]);

  assert.deepEqual(
    secuencia.map((fila) => fila.clase),
    ["tpv-ingreso", "tpv-comision"]
  );
  assert.equal(secuencia.length, 2);
});

test("varios cierres consecutivos reconocen los ingresos y las comisiones sin emparejarlos", () => {
  const referencia = { ...REFERENCIAS_INICIALES.caixabank, saldo: 0, importe: 0, concepto: "Inicio" };
  const plan = planificarContinuidad({
    referencia,
    existentes: [],
    archivo: [
      movimiento({
        id: "on-1",
        fila: 2,
        fecha: "2031-03-31",
        importe: 5,
        saldo: 5,
        conceptoOriginal: "ON 12993-070 3009",
        clase: "tpv-ingreso",
      }),
      movimiento({
        id: "on-2",
        fila: 3,
        fecha: "2031-03-31",
        importe: 102.5,
        saldo: 107.5,
        conceptoOriginal: "ON 12993-070 3009",
        clase: "tpv-ingreso",
      }),
      movimiento({
        id: "c-1",
        fila: 4,
        fecha: "2031-03-31",
        importe: -0.11,
        saldo: 107.39,
        conceptoOriginal: "C. 124129933 3009",
        clase: clasificarMovimiento("C. 124129933 3009", "", -0.11),
      }),
      movimiento({
        id: "c-2",
        fila: 5,
        fecha: "2031-03-31",
        importe: -0.26,
        saldo: 107.13,
        conceptoOriginal: "C. 124129933 3009",
        clase: clasificarMovimiento("C. 124129933 3009", "", -0.26),
      }),
      movimiento({
        id: "nomina",
        fila: 6,
        fecha: "2031-04-01",
        importe: -10,
        saldo: 97.13,
        conceptoOriginal: "Nómina",
      }),
      movimiento({
        id: "c-suelta",
        fila: 7,
        fecha: "2031-04-01",
        importe: -0.05,
        saldo: 97.08,
        conceptoOriginal: "C. 88888888",
        clase: "pendiente-clasificacion",
      }),
    ],
  });

  assert.equal(plan.estado, "cuadra");
  assert.deepEqual(
    plan.nuevos.map((fila) => fila.clase),
    ["tpv-ingreso", "tpv-ingreso", "tpv-comision", "tpv-comision", "normal", "pendiente-clasificacion"]
  );
  assert.equal(plan.normales, 1);
  assert.equal(plan.tpv, 4);
  assert.equal(plan.pendientes, 1);
  assert.equal(plan.normales + plan.tpv + plan.pendientes, plan.nuevos.length);
  assert.equal(plan.nuevos.length, 6);
});

test("una comisión C. sin ingreso anterior queda pendiente y no se inventa el par", () => {
  const secuencia = clasificarSecuenciaTpv([
    movimiento({
      id: "suelta",
      fecha: "2031-04-02",
      importe: -3,
      saldo: 95,
      conceptoOriginal: "C. 99999999",
      clase: "pendiente-clasificacion",
    }),
    movimiento({
      id: "ingreso",
      fecha: "2031-04-02",
      importe: 40,
      saldo: 135,
      conceptoOriginal: "ON 203104020002",
      clase: "tpv-ingreso",
    }),
  ]);

  assert.deepEqual(
    secuencia.map((fila) => fila.clase),
    ["pendiente-clasificacion", "tpv-ingreso"]
  );
  assert.equal(secuencia.length, 2);
});

test("Ibercaja reconoce FACT.TPV y COMI.TPV sin depender del puesto", () => {
  assert.equal(clasificarMovimiento("FACT.TPV terminal", "", 150), "tpv-ingreso");
  assert.equal(clasificarMovimiento("FACT.TPV terminal", "", -2), "pendiente-clasificacion");
  assert.equal(clasificarMovimiento("COMI.TPV terminal", "", -2.5), "tpv-comision");
  assert.equal(clasificarMovimiento("COMI.TPV terminal", "", 2.5), "pendiente-clasificacion");

  const soloComision = clasificarSecuenciaTpv([
    movimiento({
      id: "comi",
      banco: "ibercaja",
      fecha: "2031-03-31",
      importe: -2.5,
      saldo: 10,
      conceptoOriginal: "COMI.TPV terminal",
      clase: "tpv-comision",
    }),
  ]);

  assert.equal(soloComision[0]?.clase, "tpv-comision");
  assert.equal(soloComision.length, 1);
});

test("el lector guarda las referencias de ambos bancos y no usa la fecha valor como mes", () => {
  const caixa = libro(
    [
      ["Fecha", "Fecha valor", "Movimiento", "Más datos", "Importe", "Saldo"],
      ["31/03/2031", "02/04/2031", "Traspaso", "ON 203103310001", "80,00", "80,00"],
      ["31/03/2031", "02/04/2031", "Cargo", "C. 203103310001", "-1,20", "78,80"],
      ["01/04/2031", "01/04/2031", "ON 203104010009", "terminal", "40,00", "118,80"],
      ["01/04/2031", "03/04/2031", "C. 203104010009", "", "-0,80", "118,00"],
      ["02/04/2031", "02/04/2031", "Nómina", "", "-20,00", "98,00"],
      ["02/04/2031", "02/04/2031", "C. 99999999", "sin ingreso anterior", "-3,00", "95,00"],
    ],
    "xls"
  );
  const lecturaCaixa = leerExtracto(caixa, "extracto.xls", "caixabank");

  assert.equal(lecturaCaixa.ok, true);
  if (!lecturaCaixa.ok) {
    return;
  }

  assert.equal(lecturaCaixa.movimientos[0]?.conceptoOriginal, "Traspaso");
  assert.equal(lecturaCaixa.movimientos[0]?.detallesOriginales, "ON 203103310001");
  assert.equal(lecturaCaixa.movimientos[0]?.clase, "tpv-ingreso");
  assert.ok(lecturaCaixa.movimientos[0]?.referencias.some((referencia) => referencia.includes("ON")));
  assert.equal(lecturaCaixa.movimientos[1]?.clase, "pendiente-clasificacion");
  assert.equal(lecturaCaixa.movimientos[2]?.conceptoOriginal, "ON 203104010009");
  assert.equal(lecturaCaixa.movimientos[3]?.conceptoOriginal, "C. 203104010009");

  const referencia = { ...REFERENCIAS_INICIALES.caixabank, saldo: 0, importe: 0, concepto: "Inicio" };
  const plan = planificarContinuidad({
    referencia,
    existentes: [],
    archivo: lecturaCaixa.movimientos,
  });

  assert.equal(plan.estado, "cuadra");
  assert.equal(plan.normales, 1);
  assert.equal(plan.tpv, 2);
  assert.equal(plan.pendientes, 3);
  assert.equal(plan.normales + plan.tpv + plan.pendientes, plan.nuevos.length);
  assert.equal(plan.nuevos.length, lecturaCaixa.movimientos.length);
  assert.deepEqual(
    plan.nuevos.map((fila) => fila.clase),
    ["tpv-ingreso", "pendiente-clasificacion", "tpv-ingreso", "pendiente-clasificacion", "normal", "pendiente-clasificacion"]
  );
  assert.deepEqual(
    plan.nuevos.filter((fila) => esVisibleEnTabla(fila.clase)).map((fila) => fila.conceptoOriginal),
    ["Cargo", "C. 203104010009", "Nómina", "C. 99999999"]
  );
  assert.equal(
    plan.nuevos.filter((fila) => esTpvCalculable(fila.clase)).length,
    2
  );

  const filas = resumirTpvAnual({
    banco: "caixabank",
    anio: 2031,
    movimientos: plan.nuevos,
    periodos: [],
    huecos: [],
    hoy: "2031-06-15",
    gastosRegistrados: [],
    hayHistorico: true,
  });

  assert.equal(filas[2]?.ingresos, "80,00");
  assert.equal(filas[2]?.comisiones, null);
  assert.equal(filas[3]?.ingresos, "40,00");
  assert.equal(filas[3]?.comisiones, null);

  const iber = libro(
    [
      ["Ibercaja"],
      ["Fecha operación", "Fecha valor", "Concepto", "Importe", "Saldo disponible"],
      ["31/03/2031", "01/04/2031", "FACT.TPV terminal", "150,00", "150,00"],
      ["31/03/2031", "01/04/2031", "COMI.TPV terminal", "-2,50", "147,50"],
      ["01/04/2031", "01/04/2031", "Recibo luz", "-10,00", "137,50"],
    ],
    "xlsx"
  );
  const lecturaIber = leerExtracto(iber, "extracto.xlsx", "ibercaja");

  assert.equal(lecturaIber.ok, true);
  if (!lecturaIber.ok) {
    return;
  }

  assert.deepEqual(
    lecturaIber.movimientos.map((fila) => fila.clase),
    ["tpv-ingreso", "tpv-comision", "normal"]
  );
  assert.equal(lecturaIber.movimientos[0]?.fecha, "2031-03-31");
  assert.equal(lecturaIber.movimientos[0]?.fechaValor, "2031-04-01");
  assert.equal(lecturaIber.movimientos[0]?.conceptoOriginal, "FACT.TPV terminal");

  const planIber = planificarContinuidad({
    referencia: { ...REFERENCIAS_INICIALES.ibercaja, saldo: 0, importe: 0, concepto: "Inicio" },
    existentes: [],
    archivo: lecturaIber.movimientos,
  });

  assert.equal(planIber.estado, "cuadra");
  assert.equal(planIber.normales + planIber.tpv + planIber.pendientes, planIber.nuevos.length);
  assert.equal(planIber.normales, 1);
  assert.equal(planIber.tpv, 2);
  assert.equal(planIber.pendientes, 0);

  const resumenIber = resumirTpvAnual({
    banco: "ibercaja",
    anio: 2031,
    movimientos: planIber.nuevos,
    periodos: [],
    huecos: [],
    hoy: "2031-06-15",
    gastosRegistrados: [],
    hayHistorico: true,
  });

  assert.equal(resumenIber[2]?.ingresos, "150,00");
  assert.equal(resumenIber[2]?.comisiones, "-2,50");
  assert.equal(resumenIber[3]?.ingresos, null);
  assert.equal(resumenIber[3]?.comisiones, null);
});

test("un ingreso ON sin comisión no crea el apunte que falta", () => {
  const plan = planificarContinuidad({
    referencia: { ...REFERENCIAS_INICIALES.caixabank, saldo: 0, importe: 0, concepto: "Inicio" },
    existentes: [],
    archivo: [
      movimiento({
        id: "on",
        fila: 2,
        fecha: "2031-03-31",
        fechaValor: "2031-04-02",
        importe: 80,
        saldo: 80,
        conceptoOriginal: "ON 203103310001",
        clase: "tpv-ingreso",
      }),
      movimiento({
        id: "nomina",
        fila: 3,
        fecha: "2031-04-02",
        importe: -20,
        saldo: 60,
        conceptoOriginal: "Nómina",
      }),
    ],
  });

  assert.equal(plan.estado, "cuadra");
  assert.equal(plan.nuevos.length, 2);
  assert.equal(plan.tpv, 1);
  assert.equal(plan.normales, 1);
  assert.equal(plan.pendientes, 0);
});

test("si falta la comisión TPV en la cadena de saldos, no cuadra", () => {
  const plan = planificarContinuidad({
    referencia: { ...REFERENCIAS_INICIALES.caixabank, saldo: 0, importe: 0, concepto: "Inicio" },
    existentes: [],
    archivo: [
      movimiento({
        id: "on",
        fila: 2,
        fecha: "2031-03-31",
        importe: 80,
        saldo: 80,
        conceptoOriginal: "ON 203103310001",
        clase: "tpv-ingreso",
      }),
      movimiento({
        id: "nomina",
        fila: 4,
        fecha: "2031-04-02",
        importe: -20,
        saldo: 58.8,
        conceptoOriginal: "Nómina",
      }),
    ],
  });

  assert.equal(plan.estado, "no-cuadra");
  assert.equal(plan.puedeConfirmar, false);
  assert.equal(plan.nuevos.length, 0);
});

test("un extracto descendente confirma la comisión C. que sigue al ingreso ON", () => {
  const plan = planificarContinuidad({
    referencia: { ...REFERENCIAS_INICIALES.caixabank, saldo: 100, importe: 0, concepto: "Inicio" },
    existentes: [],
    archivo: [
      movimiento({
        id: "normal",
        fila: 2,
        fecha: "2031-04-03",
        importe: -10,
        saldo: 139,
        conceptoOriginal: "Nómina",
      }),
      movimiento({
        id: "comision",
        fila: 3,
        fecha: "2031-04-02",
        importe: -1,
        saldo: 149,
        conceptoOriginal: "C. 203104020003",
        clase: "pendiente-clasificacion",
      }),
      movimiento({
        id: "ingreso",
        fila: 4,
        fecha: "2031-04-01",
        importe: 50,
        saldo: 150,
        conceptoOriginal: "ON 203104010003",
        clase: "tpv-ingreso",
      }),
    ],
  });

  assert.equal(plan.estado, "cuadra");
  assert.deepEqual(
    plan.nuevos.map((fila) => [fila.conceptoOriginal, fila.clase]),
    [
      ["ON 203104010003", "tpv-ingreso"],
      ["C. 203104020003", "pendiente-clasificacion"],
      ["Nómina", "normal"],
    ]
  );
  assert.equal(plan.normales + plan.tpv + plan.pendientes, 3);
});
