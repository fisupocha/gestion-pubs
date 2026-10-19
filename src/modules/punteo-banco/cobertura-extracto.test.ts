import assert from "node:assert/strict";
import test from "node:test";
import { calcularCoberturaExtracto } from "./cobertura-extracto";
import { textoProximoPeriodo, textoUltimoDiaCubierto } from "./modelo";

test("sin importaciones confirmadas no inventa fechas ni usa el día de hoy", () => {
  const cobertura = calcularCoberturaExtracto([]);

  assert.equal(cobertura.ultimoDiaCubierto, null);
  assert.equal(cobertura.proximoPeriodoPendiente, null);
  assert.deepEqual(cobertura.saltosSinConfirmar, []);
  assert.equal(textoUltimoDiaCubierto(cobertura), "Sin extracto confirmado");
  assert.equal(textoProximoPeriodo(cobertura), "Pendiente de la primera importación confirmada");
});

test("un periodo confirmado cubre solo hasta su último día", () => {
  const cobertura = calcularCoberturaExtracto([
    { desde: "2030-01-01", hasta: "2030-01-31" },
  ]);

  assert.equal(cobertura.ultimoDiaCubierto, "2030-01-31");
  assert.deepEqual(cobertura.proximoPeriodoPendiente, {
    desde: "2030-02-01",
    hasta: null,
  });
  assert.deepEqual(cobertura.saltosSinConfirmar, []);
  assert.equal(textoProximoPeriodo(cobertura), "A partir del 01/02/2030");
});

test("un fin de semana entre extractos es un salto y no queda cubierto", () => {
  const cobertura = calcularCoberturaExtracto([
    { desde: "2026-01-01", hasta: "2026-01-30" },
    { desde: "2026-02-02", hasta: "2026-02-10" },
  ]);

  assert.equal(cobertura.ultimoDiaCubierto, "2026-01-30");
  assert.deepEqual(cobertura.saltosSinConfirmar, [
    { desde: "2026-01-31", hasta: "2026-02-01" },
  ]);
  assert.deepEqual(cobertura.proximoPeriodoPendiente, {
    desde: "2026-01-31",
    hasta: "2026-02-01",
  });
});

test("el salto confirmado permite continuar la cobertura", () => {
  const cobertura = calcularCoberturaExtracto(
    [
      { desde: "2026-01-01", hasta: "2026-01-30" },
      { desde: "2026-02-02", hasta: "2026-02-10" },
    ],
    [{ desde: "2026-01-31", hasta: "2026-02-01" }]
  );

  assert.equal(cobertura.ultimoDiaCubierto, "2026-02-10");
  assert.deepEqual(cobertura.saltosSinConfirmar, []);
  assert.deepEqual(cobertura.proximoPeriodoPendiente, {
    desde: "2026-02-11",
    hasta: null,
  });
});

test("una confirmación parcial no tapa el salto", () => {
  const cobertura = calcularCoberturaExtracto(
    [
      { desde: "2026-01-01", hasta: "2026-01-30" },
      { desde: "2026-02-02", hasta: "2026-02-10" },
    ],
    [{ desde: "2026-01-31", hasta: "2026-01-31" }]
  );

  assert.equal(cobertura.ultimoDiaCubierto, "2026-01-30");
  assert.deepEqual(cobertura.saltosSinConfirmar, [
    { desde: "2026-01-31", hasta: "2026-02-01" },
  ]);
});

test("los periodos solapados o consecutivos no generan salto", () => {
  const solapados = calcularCoberturaExtracto([
    { desde: "2026-03-01", hasta: "2026-03-20" },
    { desde: "2026-03-10", hasta: "2026-03-31" },
  ]);
  const consecutivos = calcularCoberturaExtracto([
    { desde: "2025-02-01", hasta: "2025-02-28" },
    { desde: "2025-03-01", hasta: "2025-03-05" },
  ]);

  assert.equal(solapados.ultimoDiaCubierto, "2026-03-31");
  assert.deepEqual(solapados.saltosSinConfirmar, []);
  assert.equal(consecutivos.ultimoDiaCubierto, "2025-03-05");
  assert.deepEqual(consecutivos.saltosSinConfirmar, []);
});

test("el 29 de febrero solo se exige cuando el calendario lo tiene", () => {
  const bisiesto = calcularCoberturaExtracto([
    { desde: "2024-02-01", hasta: "2024-02-28" },
    { desde: "2024-03-01", hasta: "2024-03-02" },
  ]);

  assert.deepEqual(bisiesto.saltosSinConfirmar, [
    { desde: "2024-02-29", hasta: "2024-02-29" },
  ]);
  assert.equal(bisiesto.ultimoDiaCubierto, "2024-02-28");
});

test("si hay varios saltos, la cobertura se detiene en el primero", () => {
  const cobertura = calcularCoberturaExtracto([
    { desde: "2026-01-01", hasta: "2026-01-10" },
    { desde: "2026-01-12", hasta: "2026-01-15" },
    { desde: "2026-01-20", hasta: "2026-01-25" },
  ]);

  assert.equal(cobertura.ultimoDiaCubierto, "2026-01-10");
  assert.deepEqual(cobertura.saltosSinConfirmar, [
    { desde: "2026-01-11", hasta: "2026-01-11" },
    { desde: "2026-01-16", hasta: "2026-01-19" },
  ]);
  assert.deepEqual(cobertura.proximoPeriodoPendiente, {
    desde: "2026-01-11",
    hasta: "2026-01-11",
  });
});

test("ignora periodos con fechas imposibles", () => {
  const cobertura = calcularCoberturaExtracto([
    { desde: "2026-02-31", hasta: "2026-03-02" },
    { desde: "", hasta: "2026-01-01" },
  ]);

  assert.deepEqual(cobertura, {
    ultimoDiaCubierto: null,
    proximoPeriodoPendiente: null,
    saltosSinConfirmar: [],
  });
});
