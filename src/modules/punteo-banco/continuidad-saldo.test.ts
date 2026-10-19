import assert from "node:assert/strict";
import test from "node:test";
import { aCentimos } from "./centimos";
import { planificarContinuidad } from "./continuidad-saldo";
import type { MovimientoInterno } from "./movimiento-interno";
import { REFERENCIAS_INICIALES } from "./referencias-iniciales";

function movimiento(
  parcial: Partial<MovimientoInterno> &
    Pick<MovimientoInterno, "id" | "fecha" | "importe" | "saldo" | "conceptoOriginal">
): MovimientoInterno {
  return {
    banco: "caixabank",
    fechaValor: parcial.fecha,
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

test("el saldo negativo de CaixaBank continúa al céntimo", () => {
  const referencia = REFERENCIAS_INICIALES.caixabank;
  const plan = planificarContinuidad({
    referencia,
    existentes: [],
    archivo: [
      movimiento({
        id: "nuevo",
        fecha: "2026-10-01",
        fechaValor: "2026-10-02",
        importe: 500,
        saldo: -8628.52,
        conceptoOriginal: "Ingreso",
      }),
    ],
  });

  assert.equal(plan.estado, "cuadra");
  assert.equal(plan.puedeConfirmar, true);
  assert.equal(aCentimos(referencia.saldo) + aCentimos(500), aCentimos(-8628.52));
  assert.equal(plan.primeroNuevo?.fecha, "2026-10-01");
  assert.equal(plan.primeroNuevo?.fechaValor, "2026-10-02");
});

test("el saldo positivo de Ibercaja continúa al céntimo", () => {
  const referencia = REFERENCIAS_INICIALES.ibercaja;
  const plan = planificarContinuidad({
    referencia,
    existentes: [],
    archivo: [
      movimiento({
        id: "cajero",
        banco: "ibercaja",
        fecha: "2026-10-03",
        importe: -500,
        saldo: 7034.64,
        conceptoOriginal: "Reintegro",
      }),
    ],
  });

  assert.equal(plan.estado, "cuadra");
  assert.equal(aCentimos(referencia.saldo) + aCentimos(-500), aCentimos(7034.64));
});

test("un extracto descendente se ordena por saldos y no por la fecha valor", () => {
  const referencia = { ...REFERENCIAS_INICIALES.caixabank, saldo: 95, importe: -1, concepto: "Anterior" };
  const reciente = movimiento({
    id: "reciente",
    fila: 2,
    fecha: "2031-10-02",
    fechaValor: "2031-10-01",
    importe: 10,
    saldo: 110,
    conceptoOriginal: "Segundo",
    clase: "tpv-ingreso",
  });
  const anterior = movimiento({
    id: "anterior",
    fila: 3,
    fecha: "2031-10-02",
    fechaValor: "2031-10-05",
    importe: 5,
    saldo: 100,
    conceptoOriginal: "Primero",
    clase: "normal",
  });
  const plan = planificarContinuidad({
    referencia,
    existentes: [],
    archivo: [reciente, anterior],
  });

  assert.equal(plan.estado, "cuadra");
  assert.equal(plan.primeroNuevo?.conceptoOriginal, "Primero");
  assert.equal(plan.ultimoNuevo?.conceptoOriginal, "Segundo");
  assert.equal(plan.normales, 1);
  assert.equal(plan.tpv, 1);
  assert.equal(plan.primeroNuevo?.fechaValor, "2031-10-05");
});

test("varios movimientos el mismo día y varios días vacíos no son un error", () => {
  const referencia = { ...REFERENCIAS_INICIALES.caixabank, saldo: 0, importe: 0, concepto: "Inicio" };
  const plan = planificarContinuidad({
    referencia,
    existentes: [],
    archivo: [
      movimiento({
        id: "a",
        fila: 2,
        fecha: "2031-10-01",
        importe: 10,
        saldo: 10,
        conceptoOriginal: "Uno",
      }),
      movimiento({
        id: "b",
        fila: 3,
        fecha: "2031-10-01",
        importe: -4,
        saldo: 6,
        conceptoOriginal: "Dos",
      }),
      movimiento({
        id: "c",
        fila: 4,
        fecha: "2031-10-09",
        importe: 1,
        saldo: 7,
        conceptoOriginal: "Nueve",
      }),
    ],
  });

  assert.equal(plan.estado, "cuadra");
  assert.deepEqual(
    plan.nuevos.map((movimiento) => movimiento.conceptoOriginal),
    ["Uno", "Dos", "Nueve"]
  );
});

test("un movimiento intermedio omitido descuadra y no permite confirmar", () => {
  const referencia = { ...REFERENCIAS_INICIALES.caixabank, saldo: 100, importe: -1, concepto: "Anterior" };
  const plan = planificarContinuidad({
    referencia,
    existentes: [],
    archivo: [
      movimiento({
        id: "a",
        fila: 2,
        fecha: "2031-10-01",
        importe: 10,
        saldo: 110,
        conceptoOriginal: "Primero",
      }),
      movimiento({
        id: "c",
        fila: 3,
        fecha: "2031-10-01",
        importe: 5,
        saldo: 120,
        conceptoOriginal: "Tercero",
      }),
    ],
  });

  assert.equal(plan.estado, "no-cuadra");
  assert.equal(plan.puedeConfirmar, false);
  assert.equal(plan.fallo?.concepto, "Tercero");
  assert.equal(plan.fallo?.saldoAnterior, 110);
  assert.equal(plan.fallo?.importe, 5);
  assert.equal(plan.fallo?.saldoEsperado, 115);
  assert.equal(plan.fallo?.saldoEncontrado, 120);
  assert.equal(plan.fallo?.diferencia, 5);
  assert.equal(plan.nuevos.length, 0);
});

test("repetir el archivo y solapar una importación no duplica lo ya registrado", () => {
  const referencia = { ...REFERENCIAS_INICIALES.ibercaja, saldo: 1000, importe: -1, concepto: "Anterior" };
  const primero = movimiento({
    id: "a",
    banco: "ibercaja",
    fila: 2,
    fecha: "2031-10-02",
    importe: -20,
    saldo: 980,
    conceptoOriginal: "Mañana",
    referencias: ["REF-MANANA-01"],
  });
  const segundo = movimiento({
    id: "b",
    banco: "ibercaja",
    fila: 3,
    fecha: "2031-10-02",
    importe: -30,
    saldo: 950,
    conceptoOriginal: "Tarde",
    referencias: ["REF-TARDE-0002"],
  });
  const inicial = planificarContinuidad({
    referencia,
    existentes: [],
    archivo: [primero],
  });
  const repetido = planificarContinuidad({
    referencia: {
      ...referencia,
      fecha: primero.fecha,
      concepto: primero.conceptoOriginal,
      importe: primero.importe,
      saldo: primero.saldo ?? 0,
    },
    existentes: inicial.nuevos,
    archivo: [primero, segundo],
  });

  assert.equal(inicial.estado, "cuadra");
  assert.equal(repetido.estado, "cuadra");
  assert.equal(repetido.nuevos.length, 1);
  assert.equal(repetido.primeroNuevo?.conceptoOriginal, "Tarde");
  assert.equal(repetido.omitidos, 1);

  const otraVez = planificarContinuidad({
    referencia: {
      banco: "ibercaja",
      fecha: segundo.fecha,
      concepto: segundo.conceptoOriginal,
      importe: segundo.importe,
      saldo: segundo.saldo ?? 0,
    },
    existentes: [...inicial.nuevos, ...repetido.nuevos],
    archivo: [primero, segundo],
  });

  assert.equal(otraVez.estado, "sin-nuevos");
  assert.equal(otraVez.puedeConfirmar, false);
});

test("sin saldo no se afirma que la continuidad está comprobada", () => {
  const plan = planificarContinuidad({
    referencia: REFERENCIAS_INICIALES.caixabank,
    existentes: [],
    archivo: [
      movimiento({
        id: "sin",
        fecha: "2031-10-01",
        importe: 10,
        saldo: null,
        conceptoOriginal: "Sin saldo",
      }),
    ],
  });

  assert.equal(plan.estado, "sin-saldos");
  assert.equal(plan.puedeConfirmar, false);
});
