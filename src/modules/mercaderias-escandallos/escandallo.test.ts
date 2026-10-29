import test from "node:test";
import assert from "node:assert/strict";
import { calcularServicio,configuracionVacia,conectarCompras,costePeriodo,validarConfiguracion,type CosteCompra,type AjusteCoste } from "./escandallo";
const compra=(id:string,fecha:string,unidades:number,neto:number,tarifa:number|null=neto):CosteCompra=>({id,documento:id,fecha,clave:"p",unidades,pagadas:unidades,neto,tarifa,prueba:false});
const abono:AjusteCoste={id:"a",documento:"abono-2026",recibido:"2027-02-01",desde:"2026-01-01",hasta:"2026-12-31",clave:"p",abonoCentimos:20000,regaladas:0};
const datos=[compra("enero","2026-01-10",100,1400),compra("julio","2026-07-01",100,1600)];
test("Precio medio ponderado cambia al añadir compras, sin reemplazar documentos anteriores",()=>{
  assert.equal(costePeriodo(datos,[],"p","2026-01-01","2026-12-31").efectivo,15);
  assert.equal(costePeriodo([...datos,compra("otra","2026-10-01",50,1000)],[],"p","2026-01-01","2026-12-31").efectivo,16);
});
test("50 regalos reducen coste efectivo del año sin reducir escenario tarifa",()=>{
  const regalo=compra("regalo","2026-11-01",50,0,0);regalo.pagadas=0;
  const c=costePeriodo([...datos,regalo],[],"p","2026-01-01","2026-12-31");
  assert.equal(c.efectivo,12);assert.equal(c.tarifa,15);
});
test("Abono recibido en 2027 revisa 2026 y no afecta 2027",()=>{
  assert.equal(costePeriodo(datos,[abono],"p","2026-01-01","2026-12-31").efectivo,14);
  assert.equal(costePeriodo(datos,[abono],"p","2027-01-01","2027-12-31").ajustes.length,0);
});
test("Abono anual se distribuye a meses por botellas; no se resta entero a cada mes",()=>{
  assert.equal(costePeriodo(datos,[abono],"p","2026-01-01","2026-01-31").efectivo,13);
  assert.equal(costePeriodo(datos,[abono],"p","2026-07-01","2026-07-31").efectivo,15);
});
test("Sin tarifa documental no se presenta neto como tarifa",()=>{
  assert.equal(costePeriodo([compra("x","2026-01-01",100,1400,null)],[],"p","2026-01-01","2026-12-31").tarifa,null);
});
test("Unidades desconocidas impiden coste parcial engañoso",()=>{
  const desconocida=compra("x","2026-01-01",1,1);desconocida.unidades=null;
  assert.equal(costePeriodo([...datos,desconocida],[],"p","2026-01-01","2026-12-31").efectivo,null);
});
test("No permite aplicar dos veces un documento ya en compras",()=>{
  assert.throws(()=>costePeriodo([...datos,compra(abono.documento,"2026-12-01",1,0)],[abono],"p","2026-01-01","2026-12-31"),/dos veces/);
});
test("Rechaza duplicados, fechas imposibles y precios solapados",()=>{
  assert.throws(()=>validarConfiguracion({...configuracionVacia,ajustes:[abono,abono]}),/duplicado/);
  assert.throws(()=>validarConfiguracion({...configuracionVacia,ajustes:[{...abono,recibido:"2027-02-30"}]}));
  const p={id:"1",clave:"p",formato:"Unidad",desde:"2026-01-01",hasta:"2026-12-31",centimos:350};
  assert.throws(()=>validarConfiguracion({...configuracionVacia,precios:[p,{...p,id:"2"}]}),/solapadas/);
});
test("Copa incluye siempre mezclador y calcula ambos márgenes",()=>{
  const r=calcularServicio({efectivo:14,tarifa:20},"Copa · 7 cl + refresco",{clave:"p",capacidadCl:70,mezclador:{clave:"r",unidades:1}},{efectivo:0.6,tarifa:1},7.5);
  assert.equal(r.efectivo.coste,2);assert.equal(r.tarifa.coste,3);assert.equal(r.efectivo.margen,5.5);
});
test("5 cl son 14 chupitos de 70 cl; capacidad diferente cambia rendimiento",()=>{
  const a=calcularServicio({efectivo:14,tarifa:14},"Chupito · 5 cl",{clave:"p",capacidadCl:70},undefined,3);
  const b=calcularServicio({efectivo:14,tarifa:14},"Chupito · 5 cl",{clave:"p",capacidadCl:100},undefined,3);
  assert.equal(a.efectivo.coste,1);assert.ok(Math.abs(b.efectivo.coste!-0.7)<1e-12);
});
test("Falta refresco, capacidad o precio: no inventa coste ni margen",()=>{
  assert.equal(calcularServicio({efectivo:14,tarifa:20},"Copa",{clave:"p",capacidadCl:70},undefined,7.5).efectivo.coste,null);
  assert.equal(calcularServicio({efectivo:14,tarifa:20},"Chupito",undefined,undefined,3).efectivo.coste,null);
  assert.equal(calcularServicio({efectivo:1,tarifa:2},"Unidad",undefined,undefined,null).efectivo.margen,null);
});
test("Abonos superiores al coste y regalos anuales parciales no generan costes falsos",()=>{
  assert.throws(()=>costePeriodo(datos,[{...abono,abonoCentimos:400000}],"p","2026-01-01","2026-12-31"));
  assert.equal(costePeriodo(datos,[{...abono,regaladas:50}],"p","2026-01-01","2026-01-31").efectivo,null);
});
test("Adaptadores preservan límites de las muestras y calculan sin duplicar descuentos",()=>{
  const ref={codigo:"r",producto:"Prueba",formato:"24 botellas",unidadesCaja:24,directo:10,mensual:5,semestral:5};
  const c={id:"x",codigo:"r",fecha:"2026-01-01",factura:"F",local:"Prueba",cajas:1,cajasRegaladas:1,brutoCentimos:10000,netoCentimos:9000,iva:21};
  const adaptadas=conectarCompras([],[ref],[c,c],{referencias:[],compras:[]},{referencias:[],compras:[]});
  assert.equal(adaptadas.length,1);assert.equal(adaptadas[0].unidades,48);assert.equal(adaptadas[0].neto,96.8);assert.equal(adaptadas[0].prueba,true);
  assert.throws(()=>conectarCompras([],[ref],[c,{...c,netoCentimos:8000}],{referencias:[],compras:[]},{referencias:[],compras:[]}));
});
