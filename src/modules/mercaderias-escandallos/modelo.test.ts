import assert from "node:assert/strict";
import test from "node:test";
import { resumirMercaderias, type LineaMercaderia } from "./modelo";

const filtros = { desde: "2026-01-01", hasta: "2026-08-31", local: "", busqueda: "" };
function linea(id: string, datos: Partial<LineaMercaderia> = {}): LineaMercaderia {
  return { id, proveedor: "Proveedor ficticio", factura: id, fecha: "2026-01-15", albaran: "A1", pagina: 1, linea: 1,
    producto: "Whisky de prueba", formato: "70 cl", local: "Tarantino", compradas: 10, bonificadas: 0,
    importe_iva_centimos: 12000, estado_validacion: "validada", ...datos };
}

test("media ponderada, IVA incluido, divide entre todas las recibidas", () => {
  const [r] = resumirMercaderias([linea("1"), linea("2", { compradas: 20, bonificadas: 2, importe_iva_centimos: 26000 })], filtros);
  assert.equal(r.compradas, 30); assert.equal(r.recibidas, 32); assert.equal(r.importeCentimos, 38000);
  assert.equal(r.precioCompra, 380 / 30); assert.equal(r.costeReal, 11.875);
  assert.equal(r.acuerdoComercial,"No");
});
test("bonificación en otra línea y céntimos documentales", () => {
  const [r] = resumirMercaderias([linea("1", { compradas: 14, importe_iva_centimos: 19670 }),
    linea("2", { compradas: 0, bonificadas: 1, importe_iva_centimos: 0 })], filtros);
  assert.equal(r.costeReal, 196.70 / 15); assert.equal(r.bonificadas, 1);
});
test("Riverocio agrupa locales, filtro recalcula y no incluye sin asignar", () => {
  const datos = [linea("1"), linea("2", { local: "Cue", compradas: 2, importe_iva_centimos: 3000 }), linea("3", { local: null })];
  assert.equal(resumirMercaderias(datos, filtros)[0].compradas, 22);
  assert.equal(resumirMercaderias(datos, { ...filtros, local: "Cue" })[0].compradas, 2);
});
test("ordena por compradas, separa formatos y no usa regalos para ordenar", () => {
  const datos = [linea("1", { compradas: 1, bonificadas: 20 }), linea("2", { formato: "1 litro", compradas: 2 })];
  const r = resumirMercaderias(datos, filtros); assert.equal(r.length, 2); assert.equal(r[0].formato, "1 litro");
});
test("no duplica IDs y rechaza dos IDs con el mismo origen", () => {
  const l = linea("1"); assert.equal(resumirMercaderias([l, l], filtros)[0].compradas, 10);
  assert.throws(() => resumirMercaderias([l, { ...l, id: "2" }], filtros), /duplicadas/);
});
test("excluye pendientes y fechas fuera del periodo; rechaza datos incorrectos", () => {
  assert.equal(resumirMercaderias([linea("1", { estado_validacion: "pendiente" }), linea("2", { fecha: "2026-09-01" })], filtros).length, 0);
  assert.throws(() => resumirMercaderias([linea("1", { importe_iva_centimos: -1 })], filtros), /no válidos/);
  assert.throws(() => resumirMercaderias([linea("1", { formato: "" })], filtros), /incompletos/);
});
