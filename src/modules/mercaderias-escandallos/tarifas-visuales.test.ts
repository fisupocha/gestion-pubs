import test from 'node:test';
import assert from 'node:assert/strict';
import { tarifasVisuales } from './tarifas-visuales';
import type { CosteCompra } from './escandallo';
const linea:CosteCompra={id:'ficticia',documento:'prueba',fecha:'2026-10-30',clave:'referencia',unidades:15,pagadas:10,neto:80,tarifa:120,prueba:false};
test('Tarifa botella usa unidades pagadas, no regalos ni importe descontado',()=>{
 assert.equal(tarifasVisuales([linea]).get('referencia')?.precio,12);
 assert.equal(tarifasVisuales([{...linea,neto:0,unidades:100}]).get('referencia')?.precio,12);
});
test('Pondera cantidades y conserva aviso de muestra',()=>{
 assert.deepEqual(tarifasVisuales([linea,{...linea,id:'otra',pagadas:20,tarifa:300,prueba:true}]).get('referencia'),{precio:14,prueba:true});
});
test('Tarifa incompleta no se sustituye por coste neto ni una media parcial',()=>{
 assert.equal(tarifasVisuales([linea,{...linea,id:'otra',tarifa:null}]).get('referencia')?.precio,null);
 assert.equal(tarifasVisuales([{...linea,pagadas:null}]).get('referencia')?.precio,null);
});

test("Una línea de regalo sin importe no oculta ni rebaja la tarifa",()=>{assert.equal(tarifasVisuales([linea,{...linea,id:"regalo",pagadas:0,tarifa:0,neto:0,unidades:7}]).get("referencia")?.precio,12);});
