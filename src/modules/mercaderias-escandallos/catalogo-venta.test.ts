import test from "node:test";
import assert from "node:assert/strict";
import { catalogoVenta } from "./catalogo-venta";
test("Habilita copas confirmadas sin duplicar referencias y mantiene 0,0 sin alcohol",()=>{
  const a={producto:"TANQUERAY RANGPUR",formato:"70 cl",proveedor:"Prueba"};
  const filas=catalogoVenta([a,a,{...a,producto:"GINEBRA TANQUERAY 0.0"}]);
  assert.equal(filas.length,2);
  assert.ok(filas.every(f=>f.formatos.length===1&&f.formatos[0]==="Copa · 7 cl + refresco"));
  assert.equal(filas.find(f=>f.producto.includes("0.0"))?.grupo,"Sin alcohol");
});
