import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";
import { fechaIsoDesdeSerial, fechaIsoDesdeValor, importeDesdeValor } from "./celdas";
import { clasificarMovimiento } from "./clasificar-movimiento";
import { calcularCoberturaExtracto } from "./cobertura-extracto";
import { compararPorFechaOperacion } from "./fechas-movimiento";
import { fusionarImportacion } from "./fusionar-importacion";
import { detectarPeriodoDeclarado, leerExtracto } from "./leer-extracto";
import type { MovimientoInterno } from "./movimiento-interno";
import { planificarContinuidad } from "./continuidad-saldo";
import { proponerGastoComisiones } from "./propuesta-gasto-tpv";
import { reconocerBanco } from "./reconocer-banco";
import { REFERENCIAS_INICIALES } from "./referencias-iniciales";
import { analizarRevisionConjunta } from "./revision-conjunta";
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
    Pick<MovimientoInterno, "id" | "fecha" | "importe" | "conceptoOriginal">
): MovimientoInterno {
  return {
    banco: "caixabank",
    fechaValor: parcial.fecha,
    concepto: parcial.conceptoOriginal,
    detallesOriginales: "",
    saldo: null,
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

test("reconoce CaixaBank por las columnas, aunque el nombre del archivo no lo diga", () => {
  const matriz = [
    ["Fecha", "Fecha valor", "Movimiento", "Más datos", "Importe"],
    ["15/03/2031", "15/03/2031", "Recibo", "Local", "-10,00"],
  ];

  assert.deepEqual(reconocerBanco(matriz, "xls"), {
    estado: "reconocido",
    banco: "caixabank",
    filaCabecera: 0,
  });
});

test("reconoce Ibercaja por el preámbulo y sus columnas, no por la extensión sola", () => {
  const matriz = [
    ["Ibercaja"],
    ["Fecha operación", "Fecha valor", "Concepto", "Importe", "Saldo disponible"],
    ["15/03/2031", "16/03/2031", "Recibo", "-10,00", "90,00"],
  ];

  assert.deepEqual(reconocerBanco(matriz, "xlsx"), {
    estado: "reconocido",
    banco: "ibercaja",
    filaCabecera: 1,
  });
  assert.equal(reconocerBanco([["Fecha", "Importe"], ["15/03/2031", "10"]], "xlsx").estado, "desconocido");
});

test("un extracto de Ibercaja no entra en la pestaña de CaixaBank", () => {
  const buffer = libro(
    [
      ["Ibercaja"],
      ["Fecha operación", "Concepto", "Importe", "Saldo disponible"],
      ["15/03/2031", "Recibo luz", "-80,00", "100,00"],
    ],
    "xlsx"
  );
  const lectura = leerExtracto(buffer, "marzo.xlsx", "caixabank");

  assert.equal(lectura.ok, false);
  if (!lectura.ok) {
    assert.equal(lectura.motivo, "banco-distinto");
    assert.equal(lectura.bancoDetectado, "ibercaja");
  }
});

test("normaliza fechas e importes europeos y separa normales, TPV y cuotas", () => {
  assert.equal(fechaIsoDesdeValor("15/03/2031"), "2031-03-15");
  assert.equal(fechaIsoDesdeValor("19-10-2026"), "2026-10-19");
  assert.equal(fechaIsoDesdeValor("01-10-2026"), "2026-10-01");
  assert.equal(importeDesdeValor("1.234,50 €"), 1234.5);
  assert.equal(importeDesdeValor("(12,30)"), -12.3);
  assert.equal(clasificarMovimiento("Comisión mantenimiento cuenta", ""), "normal");
  assert.equal(clasificarMovimiento("TPV", ""), "pendiente-clasificacion");

  const buffer = libro(
    [
      ["Ibercaja"],
      ["Fecha operación", "Fecha valor", "Concepto", "Importe", "Saldo disponible"],
      ["15/03/2031", "16/03/2031", "Abono TPV tienda", "1.234,50", "5.000,00"],
      ["15/03/2031", "16/03/2031", "COMI.TPV X203100001", "-12,30", "4.987,70"],
      ["15/03/2031", "16/03/2031", "Mantenimiento TPV", "-6,00", "4.981,70"],
      ["15/03/2031", "16/03/2031", "Devolución TPV", "-4,00", "4.977,70"],
      ["15/03/2031", "16/03/2031", "TPV sin detalle", "8,00", "4.985,70"],
      ["15/03/2031", "16/03/2031", "Cuota préstamo local", "-300,00", "4.685,70"],
      ["15/03/2031", "16/03/2031", "Recibo luz", "-80,00", "4.605,70"],
    ],
    "xlsx"
  );
  const lectura = leerExtracto(buffer, "marzo.xlsx", "ibercaja");

  assert.equal(lectura.ok, true);
  if (!lectura.ok) {
    return;
  }

  assert.equal(lectura.periodo, null);
  assert.equal(lectura.ultimoMovimiento, "2031-03-15");
  assert.deepEqual(
    lectura.movimientos.map((movimiento) => movimiento.clase),
    [
      "tpv-ingreso",
      "tpv-comision",
      "tpv-mantenimiento",
      "tpv-devolucion",
      "pendiente-clasificacion",
      "credito-cuota",
      "normal",
    ]
  );
  assert.equal(lectura.movimientos[0]?.importe, 1234.5);
  assert.equal(lectura.movimientos[0]?.fecha, "2031-03-15");
  assert.equal(lectura.movimientos[0]?.fechaValor, "2031-03-16");
  assert.equal(lectura.movimientos[1]?.importe, -12.3);
});

test("no trata como duplicado seguro una coincidencia de fecha, importe y concepto", () => {
  const primero = movimiento({
    id: "a",
    fecha: "2031-03-15",
    importe: -80,
    conceptoOriginal: "Recibo luz",
    saldo: 100,
  });
  const mismoSaldo = movimiento({
    id: "b",
    fecha: "2031-03-15",
    importe: -80,
    conceptoOriginal: "Recibo luz",
    saldo: 100,
    detallesOriginales: "",
  });
  const otroSaldo = movimiento({
    id: "c",
    fecha: "2031-03-15",
    importe: -80,
    conceptoOriginal: "Recibo luz",
    saldo: 40,
  });
  const otraReferencia = movimiento({
    id: "d",
    fecha: "2031-03-15",
    importe: -80,
    conceptoOriginal: "Recibo luz",
    referencias: ["REF-0002"],
  });
  const repetidoPorReferencia = movimiento({
    id: "e",
    fecha: "2031-03-15",
    importe: -80,
    conceptoOriginal: "Recibo luz",
    referencias: ["REF-0001"],
  });

  const seguro = fusionarImportacion(
    [movimiento({ ...primero, referencias: ["REF-0001"] })],
    [repetidoPorReferencia],
    "preguntar"
  );
  assert.equal(seguro.anadidos, 0);
  assert.equal(seguro.omitidosSeguros, 1);
  assert.equal(seguro.pendienteDecision, false);

  const medio = fusionarImportacion([primero], [mismoSaldo], "preguntar");
  assert.equal(medio.omitidosSeguros, 1);
  assert.equal(medio.anadidos, 0);

  const debil = fusionarImportacion([primero], [otroSaldo, otraReferencia], "preguntar");
  assert.equal(debil.pendienteDecision, true);
  assert.equal(debil.anadidos, 0);
  assert.equal(debil.movimientos.length, 1);

  const aceptados = fusionarImportacion([primero], [otroSaldo], "importar-nuevos");
  assert.equal(aceptados.anadidos, 1);
  assert.equal(aceptados.movimientos.length, 2);
});

test("un periodo solo queda cubierto si está declarado, y un hueco intermedio se avisa", () => {
  assert.deepEqual(detectarPeriodoDeclarado(["Extracto del 01/03/2031 al 31/03/2031"]), {
    desde: "2031-03-01",
    hasta: "2031-03-31",
  });
  assert.equal(detectarPeriodoDeclarado(["Movimientos hasta el último apunte"]), null);

  const cobertura = calcularCoberturaExtracto([
    { desde: "2031-03-01", hasta: "2031-03-31" },
    { desde: "2031-04-03", hasta: "2031-04-30" },
  ]);

  assert.equal(cobertura.ultimoDiaCubierto, "2031-03-31");
  assert.deepEqual(cobertura.saltosSinConfirmar, [{ desde: "2031-04-01", hasta: "2031-04-02" }]);
});

test("calcula el resumen mensual y anual sin mezclar mantenimiento ni devoluciones", () => {
  const movimientos = [
    movimiento({
      id: "ingreso",
      banco: "ibercaja",
      fecha: "2031-03-15",
      importe: 200,
      conceptoOriginal: "Abono TPV",
      clase: "tpv-ingreso",
    }),
    movimiento({
      id: "comision",
      banco: "ibercaja",
      fecha: "2031-03-16",
      importe: -5,
      conceptoOriginal: "Comisión TPV",
      clase: "tpv-comision",
    }),
    movimiento({
      id: "mantenimiento",
      banco: "ibercaja",
      fecha: "2031-03-16",
      importe: -9,
      conceptoOriginal: "Mantenimiento TPV",
      clase: "tpv-mantenimiento",
    }),
    movimiento({
      id: "devolucion",
      banco: "ibercaja",
      fecha: "2031-03-17",
      importe: -3,
      conceptoOriginal: "Devolución TPV",
      clase: "tpv-devolucion",
    }),
    movimiento({
      id: "abril",
      banco: "ibercaja",
      fecha: "2031-04-02",
      importe: 50,
      conceptoOriginal: "Abono TPV",
      clase: "tpv-ingreso",
    }),
  ];
  const filas = resumirTpvAnual({
    banco: "ibercaja",
    anio: 2031,
    movimientos,
    periodos: [{ banco: "ibercaja", desde: "2031-03-01", hasta: "2031-03-31" }],
    huecos: [],
    hoy: "2031-06-15",
    gastosRegistrados: [],
    hayHistorico: true,
  });
  const marzo = filas[2];
  const abril = filas[3];
  const total = filas[12];

  assert.equal(marzo?.comisiones, "-5,00");
  assert.equal(marzo?.ingresos, "200,00");
  assert.equal(marzo?.porcentajeEfectivo, "2,50 %");
  assert.equal(marzo?.estado, "Sin autorizar");
  assert.equal(abril?.ingresos, "50,00");
  assert.equal(abril?.estado, "Pendiente de completar");
  assert.equal(total?.ingresos, "250,00");
  assert.equal(total?.comisiones, "-5,00");
  assert.equal(filas[0]?.estado, null);
});

test("no propone dos veces el gasto de comisiones del mismo banco y mes", () => {
  const primero = proponerGastoComisiones({
    banco: "caixabank",
    anio: 2031,
    mes: 3,
    comisiones: -5,
    gastosRegistrados: [],
  });
  const segundo = proponerGastoComisiones({
    banco: "caixabank",
    anio: 2031,
    mes: 3,
    comisiones: -5,
    gastosRegistrados: [{ banco: "caixabank", anio: 2031, mes: 3 }],
  });

  assert.equal(primero.duplicado, false);
  assert.equal(primero.empresa, "Riverocio");
  assert.equal(primero.totalGasto, 5);
  assert.equal(primero.fechaGasto, "2031-03-31");
  assert.match(primero.observaciones, /punteo-tpv:caixabank:2031-03/);
  assert.equal(segundo.duplicado, true);

  const filas = resumirTpvAnual({
    banco: "caixabank",
    anio: 2031,
    movimientos: [
      movimiento({
        id: "comision",
        fecha: "2031-03-16",
        importe: -5,
        conceptoOriginal: "Comisión TPV",
        clase: "tpv-comision",
      }),
    ],
    periodos: [{ banco: "caixabank", desde: "2031-03-01", hasta: "2031-03-31" }],
    huecos: [],
    hoy: "2031-06-15",
    gastosRegistrados: [{ banco: "caixabank", anio: 2031, mes: 3 }],
    hayHistorico: true,
  });

  assert.equal(filas[2]?.estado, "Guardado");
});

test("la revisión conjunta señala coincidencias y permite descartarlas sin marcar OK", () => {
  const caja = movimiento({
    id: "caja",
    banco: "caixabank",
    fecha: "2031-03-10",
    importe: -40,
    conceptoOriginal: "Proveedor",
  });
  const iber = movimiento({
    id: "iber",
    banco: "ibercaja",
    fecha: "2031-03-11",
    importe: -40,
    conceptoOriginal: "Proveedor",
  });
  const incidencias = analizarRevisionConjunta({
    movimientos: [caja, iber],
    registros: [],
    descartadas: [],
  });
  const repetida = analizarRevisionConjunta({
    movimientos: [caja, iber],
    registros: [],
    descartadas: [incidencias[0]?.id ?? ""],
  });

  assert.equal(incidencias.some((incidencia) => incidencia.tipo === "duplicado-entre-bancos"), true);
  assert.equal(repetida.some((incidencia) => incidencia.tipo === "duplicado-entre-bancos"), false);
  assert.equal(caja.ok, "pendiente");
  assert.equal(iber.ok, "pendiente");
});

test("la fecha de operación manda aunque la fecha valor caiga en otro mes", () => {
  const caixa = libro(
    [
      ["Fecha valor", "Importe", "Movimiento", "Más datos", "Fecha"],
      ["01/04/2031", "-3,50", "Comisión TPV", "Terminal", "31/03/2031"],
      ["10/04/2031", "80,00", "Abono TPV", "Terminal", "05/04/2031"],
      ["01/03/2031", "40,00", "Liquidación TPV", "Terminal", "31/03/2031"],
    ],
    "xls"
  );
  const lecturaCaixa = leerExtracto(caixa, "extracto.xls", "caixabank");

  assert.equal(lecturaCaixa.ok, true);
  if (!lecturaCaixa.ok) {
    return;
  }

  assert.deepEqual(
    lecturaCaixa.movimientos.map((movimiento) => [movimiento.fecha, movimiento.fechaValor]),
    [
      ["2031-03-31", "2031-04-01"],
      ["2031-04-05", "2031-04-10"],
      ["2031-03-31", "2031-03-01"],
    ]
  );
  assert.equal(lecturaCaixa.periodo, null);
  assert.equal(lecturaCaixa.ultimoMovimiento, "2031-04-05");
  assert.notEqual(lecturaCaixa.ultimoMovimiento, "2031-04-10");

  const iber = libro(
    [
      ["Ibercaja"],
      ["Nº", "Fecha valor", "Importe", "Concepto", "Fecha operación", "Saldo disponible"],
      [1, "02/04/2031", "100,00", "Abono TPV", "31/03/2031", "1.000,00"],
      [46000, "02/04/2031", "-2,00", "Comisión TPV", "31/03/2031", "998,00"],
    ],
    "xlsx"
  );
  const lecturaIber = leerExtracto(iber, "extracto.xlsx", "ibercaja");

  assert.equal(lecturaIber.ok, true);
  if (!lecturaIber.ok) {
    return;
  }

  assert.equal(lecturaIber.movimientos[0]?.fecha, "2031-03-31");
  assert.equal(lecturaIber.movimientos[0]?.fechaValor, "2031-04-02");
  assert.notEqual(lecturaIber.movimientos[1]?.fecha, fechaIsoDesdeSerial(46000));
  assert.deepEqual(
    compararPorFechaOperacion({ fecha: "2031-04-05", fila: 1 }, { fecha: "2031-03-31", fila: 2 }) > 0,
    true
  );

  const filas = resumirTpvAnual({
    banco: "caixabank",
    anio: 2031,
    movimientos: [
      movimiento({
        id: "marzo",
        fecha: "2031-03-31",
        fechaValor: "2031-04-01",
        importe: 80,
        conceptoOriginal: "Abono TPV",
        clase: "tpv-ingreso",
      }),
      movimiento({
        id: "comision-marzo",
        fecha: "2031-03-31",
        fechaValor: "2031-04-02",
        importe: -4,
        conceptoOriginal: "Comisión TPV",
        clase: "tpv-comision",
      }),
      movimiento({
        id: "enero-siguiente",
        fecha: "2032-01-02",
        fechaValor: "2031-12-31",
        importe: 25,
        conceptoOriginal: "Abono TPV",
        clase: "tpv-ingreso",
      }),
    ],
    periodos: [],
    huecos: [],
    hoy: "2032-02-01",
    gastosRegistrados: [],
    hayHistorico: true,
  });

  assert.equal(filas[2]?.ingresos, "80,00");
  assert.equal(filas[2]?.comisiones, "-4,00");
  assert.equal(filas[3]?.ingresos, null);
  assert.equal(filas[11]?.ingresos, null);

  const soloValor = libro(
    [
      ["Fecha valor", "Movimiento", "Más datos", "Importe"],
      ["31/03/2031", "Recibo", "Local", "-10,00"],
    ],
    "xls"
  );
  const rechazado = leerExtracto(soloValor, "sin-fecha-operacion.xls", "caixabank");

  assert.equal(rechazado.ok, false);
});

test("Ibercaja importa fechas con guion, ignora la numeración y separa FACT.TPV de COMI.TPV", () => {
  const filas = [
    ["Consulta de movimientos"],
    ["Ibercaja"],
    [],
    [],
    [],
    ["Nº Orden", "Fecha Oper", "Fecha Valor", "Concepto", "Descripción", "Referencia", "Importe", "Saldo"],
    [46000, "19-10-2031", "18-10-2031", "COMPRAS CON TARJETA IBERCAJA", "COMI.TPV X203100001", "47203100001", -0.44, 7544.2],
    [2, "19-10-2031", "18-10-2031", "COMPRAS CON TARJETA IBERCAJA", "FACT.TPV X203100001", "47203100001", 20, 7544.64],
    [3, "01-10-2031", "01-10-2031", "RECIBO LUZ", "", "REF-LUZ-0001", -10, 7524.64],
  ];
  const buffer = libro(filas, "xlsx");
  const enCaixa = leerExtracto(buffer, "IBERCAJA 2031.xlsx", "caixabank");

  assert.equal(enCaixa.ok, false);
  if (!enCaixa.ok) {
    assert.equal(enCaixa.motivo, "banco-distinto");
    assert.equal(enCaixa.bancoDetectado, "ibercaja");
  }

  const lectura = leerExtracto(buffer, "IBERCAJA 2031.xlsx", "ibercaja");

  assert.equal(lectura.ok, true);
  if (!lectura.ok) {
    return;
  }

  assert.equal(lectura.movimientos.length, 3);
  assert.equal(lectura.movimientos[0]?.fecha, "2031-10-19");
  assert.equal(lectura.movimientos[0]?.fechaValor, "2031-10-18");
  assert.notEqual(lectura.movimientos[0]?.fecha, fechaIsoDesdeSerial(46000));
  assert.equal(lectura.movimientos[0]?.conceptoOriginal, "COMPRAS CON TARJETA IBERCAJA");
  assert.equal(lectura.movimientos[0]?.detallesOriginales, "COMI.TPV X203100001");
  assert.equal(lectura.movimientos[0]?.clase, "tpv-comision");
  assert.equal(lectura.movimientos[0]?.importe, -0.44);
  assert.equal(lectura.movimientos[1]?.clase, "tpv-ingreso");
  assert.equal(lectura.movimientos[1]?.detallesOriginales, "FACT.TPV X203100001");
  assert.equal(lectura.movimientos[2]?.fecha, "2031-10-01");
  assert.equal(lectura.movimientos[2]?.clase, "normal");

  const plan = planificarContinuidad({
    referencia: REFERENCIAS_INICIALES.ibercaja,
    existentes: [],
    archivo: lectura.movimientos,
  });

  assert.equal(plan.estado, "cuadra");
  assert.equal(plan.puedeConfirmar, true);
  assert.equal(plan.normales + plan.tpv + plan.pendientes, plan.nuevos.length);
  assert.equal(plan.nuevos.length, 3);
  assert.deepEqual(
    plan.nuevos.map((movimiento) => [movimiento.fecha, movimiento.clase]),
    [
      ["2031-10-01", "normal"],
      ["2031-10-19", "tpv-ingreso"],
      ["2031-10-19", "tpv-comision"],
    ]
  );
  assert.equal(plan.primeroNuevo?.fecha, "2031-10-01");
  assert.notEqual(plan.primeroNuevo?.fecha, "2031-10-18");
});
