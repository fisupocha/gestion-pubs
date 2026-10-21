import assert from "node:assert/strict";
import test from "node:test";
import { conceptoBancarioSecundario, textoPrincipalMovimiento } from "./presentacion-concepto";

test("sin nuestro concepto, el texto principal es el del banco y no se inventa otro", () => {
  const bancario = "PAGARE TRUN. 6018699";

  assert.equal(textoPrincipalMovimiento("", bancario), bancario);
  assert.equal(textoPrincipalMovimiento("   ", bancario), bancario);
  assert.equal(conceptoBancarioSecundario("", bancario), null);
  assert.equal(conceptoBancarioSecundario("   ", bancario), null);
});

test("con nuestro concepto, ese texto manda y el del banco queda como referencia", () => {
  const bancario = "PAGARE TRUN. 6018699";
  const nuestro = "Distribuidora Bodega Reyes Magos";

  assert.equal(textoPrincipalMovimiento(nuestro, bancario), nuestro);
  assert.equal(conceptoBancarioSecundario(`  ${nuestro}  `, bancario), bancario);
  assert.equal(bancario, "PAGARE TRUN. 6018699");
});

test("nuestro concepto vacío y concepto bancario vacío no fabrican una descripción", () => {
  assert.equal(textoPrincipalMovimiento("", ""), "Sin concepto");
  assert.equal(conceptoBancarioSecundario("Ingreso Burger Project", "   "), null);
});
