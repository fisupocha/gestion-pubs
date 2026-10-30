import test from 'node:test';
import assert from 'node:assert/strict';
import { tarifasVisuales } from './tarifas-visuales';
import type { CosteCompra, TarifaReferencia } from './escandallo';
const linea:CosteCompra={id:'ficticia',documento:'prueba',fecha:'2026-10-30',clave:'referencia',unidades:15,pagadas:10,neto:80,tarifa:120,prueba:false};
test('Tarifa botella usa unidades pagadas, no regalos ni importe descontado',()=>{
 assert.equal(tarifasVisuales([linea]).get('referencia')?.precio,12);
 assert.equal(tarifasVisuales([{...linea,neto:0,unidades:100}]).get('referencia')?.precio,12);
});
test('Excluye muestras aunque tengan un precio y cantidad',()=>{
 assert.deepEqual(tarifasVisuales([linea,{...linea,id:'otra',pagadas:20,tarifa:300,prueba:true}]).get('referencia'),{precio:12,prueba:false});
});
test('Tarifa incompleta no se sustituye por coste neto ni una media parcial',()=>{
 assert.equal(tarifasVisuales([linea,{...linea,id:'otra',tarifa:null}]).get('referencia')?.precio,null);
 assert.equal(tarifasVisuales([{...linea,pagadas:null}]).get('referencia')?.precio,null);
});

test("Una línea de regalo sin importe no oculta ni rebaja la tarifa",()=>{assert.equal(tarifasVisuales([linea,{...linea,id:"regalo",pagadas:0,tarifa:0,neto:0,unidades:7}]).get("referencia")?.precio,12);});

const doc:TarifaReferencia={id:'doc-ficticio',clave:'referencia',documento:'FICTICIA',fecha:'2026-06-30',unidades:24,baseCentimos:2544,iva:21,fuente:'Precio caja antes descuento'};
test('Sin documento una muestra jamás aparece como tarifa operativa',()=>{assert.equal(tarifasVisuales([{...linea,prueba:true}]).size,0);});
test('Usa precio documental sin descuento por unidad y añade IVA una vez',()=>{assert.deepEqual(tarifasVisuales([{...linea,prueba:true}], [doc]).get('referencia'),{precio:25.44*1.21/24,prueba:false});});
test('Tarifa real existente prevalece y Vichy utiliza IVA10 por botella',()=>{assert.equal(tarifasVisuales([linea],[doc]).get('referencia')?.precio,12);assert.equal(tarifasVisuales([], [{...doc,baseCentimos:10975,unidades:72,iva:10}]).get('referencia')?.precio,109.75*1.1/72);});
