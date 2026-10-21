import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { presentacionConcepto } from "./presentacion-concepto";

test("nuestro concepto queda arriba aunque esté vacío y el banco queda debajo", () => {
  const bancario = "PAGARE TRUN. 6018699";

  assert.deepEqual(presentacionConcepto("", bancario), ["", bancario]);
  assert.deepEqual(presentacionConcepto("   ", bancario), ["   ", bancario]);
});

test("con texto propio, el orden sigue siendo nuestro concepto arriba y banco debajo", () => {
  const bancario = "PAGARE TRUN. 6018699";
  const nuestro = "Distribuidora Bodega Reyes Magos";

  assert.deepEqual(presentacionConcepto(`  ${nuestro}  `, bancario), [`  ${nuestro}  `, bancario]);
  assert.equal(bancario, "PAGARE TRUN. 6018699");
});

test("un concepto bancario vacío no fabrica una línea secundaria", () => {
  assert.deepEqual(presentacionConcepto("Ingreso Burger Project", "   "), ["Ingreso Burger Project", null]);
  assert.deepEqual(presentacionConcepto("", ""), ["", null]);
});

test("la tabla pinta siempre el campo editable antes que el concepto bancario", () => {
  const tabla = readFileSync(new URL("../../app/gestion-diaria/punteo-banco/tabla-movimientos.tsx", import.meta.url), "utf8");
  const inicio = tabla.indexOf("function ConceptoCampo");
  const fin = tabla.indexOf("function EstadoConcepto");
  const campo = tabla.slice(inicio, fin);
  const campoEditable = campo.indexOf("<textarea");
  const conceptoBancario = campo.indexOf("<p ");

  assert.equal(inicio > 0, true);
  assert.equal((campo.match(/<textarea/g) ?? []).length, 1);
  assert.equal(campoEditable < conceptoBancario, true);
  assert.equal(campo.includes('placeholder="Nuestro concepto"'), true);
  assert.equal(campo.includes("text-sm font-semibold"), true);
  assert.equal(campo.includes("text-[11px]"), true);
});
