import assert from "node:assert/strict";
import test from "node:test";
import { calcularCoca, ordenarCoca, resumirCoca, type CompraCoca } from "./cocacola";
// Datos ficticios: nunca publicar condiciones comerciales ni facturas reales en el repositorio.
const REFERENCIAS_COCA = Array.from({length:16},(_,i)=>({codigo:String(i),producto:`Producto ficticio ${i}`,formato:"C24",unidadesCaja:24,directo:20,mensual:i===4?null:4,semestral:6}));
const COMPRAS_COCA_PRUEBA:CompraCoca[]=[8,4,3,2,1].map((cajas,i)=>({id:`ficticia-${i}`,codigo:String(i),fecha:"2026-06-30",factura:"FICTICIA",local:"Tarantino",cajas,brutoCentimos:cajas*10000,netoCentimos:cajas*8000,iva:21}));
const filtros={desde:"2026-01-01",hasta:"2026-12-31",local:"",busqueda:""};
const coca=REFERENCIAS_COCA.find(r=>r.codigo==="0")!;
test("neto documental ya lleva directo: no se descuenta dos veces",()=>{
 const l=COMPRAS_COCA_PRUEBA[0];const r=calcularCoca(coca,[l]);
 const esperado=(64000-80000*.10)*1.21/100/192;
 assert.equal(r.precio,esperado); assert.equal(r.cajas,8);
});
test("variaciones de precio: coste acumulado ponderado por unidades",()=>{
 const a:CompraCoca={...COMPRAS_COCA_PRUEBA[0],id:"a",cajas:1,brutoCentimos:3000,netoCentimos:2400};
 const b:CompraCoca={...a,id:"b",fecha:"2026-07-31",cajas:3,brutoCentimos:12000,netoCentimos:9600};
 const r=calcularCoca(coca,[a,b]);
 assert.ok(Math.abs(r.precio!-(calcularCoca(coca,[a]).precio!*24+calcularCoca(coca,[b]).precio!*72)/96)<1e-12);
 assert.notEqual(r.precio,(calcularCoca(coca,[a]).precio!+calcularCoca(coca,[b]).precio!)/2);
});
test("retirar compras conserva referencias y condiciones; no convierte ausencias en cero",()=>{
 const r=resumirCoca([],filtros,REFERENCIAS_COCA);assert.equal(r.length,16);
 assert.equal(r.find(x=>x.codigo==="0")!.mensual,4);
 assert.ok(r.every(x=>x.cajas===null&&x.precio===null));
 assert.equal(r.find(x=>x.codigo==="4")!.mensual,null);
 assert.equal(r.find(x=>x.codigo==="4")!.total,null);
});
test("filtra por local, fecha, producto y rechaza intervalo invertido",()=>{
 assert.equal(resumirCoca(COMPRAS_COCA_PRUEBA,{...filtros,local:"Cue"},REFERENCIAS_COCA)[0].cajas,null);
 assert.equal(resumirCoca(COMPRAS_COCA_PRUEBA,{...filtros,desde:"2026-07-01"},REFERENCIAS_COCA)[0].cajas,null);
 assert.equal(resumirCoca(COMPRAS_COCA_PRUEBA,{...filtros,busqueda:"ficticio 0"},REFERENCIAS_COCA).length,1);
 assert.throws(()=>resumirCoca([],{...filtros,desde:"2027-01-01"},REFERENCIAS_COCA),/fecha/);
});
test("orden numérico, pendientes al final en ambos sentidos e IDs idempotentes",()=>{
 const r=resumirCoca(COMPRAS_COCA_PRUEBA,filtros,REFERENCIAS_COCA);
 assert.equal(ordenarCoca(r,"cajas",true)[0].cajas,8);
 assert.equal(ordenarCoca(r,"cajas",false)[0].cajas,1);
 assert.equal(ordenarCoca(r,"cajas",false).at(-1)!.cajas,null);
 assert.equal(calcularCoca(coca,[COMPRAS_COCA_PRUEBA[0],COMPRAS_COCA_PRUEBA[0]]).cajas,8);
});
test("cantidades inválidas fallan sin totales parciales",()=>{
 assert.throws(()=>calcularCoca(coca,[{...COMPRAS_COCA_PRUEBA[0],cajas:-1}]),/no válida/);
});

test("regalos reducen precio entre todas las recibidas sin aumentar descuentos ni coste",()=>{
 const l={...COMPRAS_COCA_PRUEBA[0],cajas:10};
 const sin=calcularCoca(coca,[l]);
 const con=calcularCoca(coca,[{...l,cajasRegaladas:2}]);
 assert.equal(con.cajas,10);assert.equal(con.regaladas,2);assert.equal(con.recibidas,12);
 assert.equal(con.total,sin.total);
 assert.ok(Math.abs(con.precio!-sin.precio!*10/12)<1e-12);
 assert.equal(calcularCoca(coca,[COMPRAS_COCA_PRUEBA[0]]).regaladas,0);
});

test("regalo de otra referencia no se suma al producto comprado y admite línea sin cargo",()=>{
 const regalo:CompraCoca={...COMPRAS_COCA_PRUEBA[0],id:"regalo-otra",codigo:"4",cajas:0,cajasRegaladas:2,brutoCentimos:0,netoCentimos:0};
 const r=resumirCoca([COMPRAS_COCA_PRUEBA[0],regalo],filtros,REFERENCIAS_COCA);
 assert.equal(r[0].regaladas,0);
 assert.equal(r[4].cajas,0);assert.equal(r[4].regaladas,2);assert.equal(r[4].precio,0);
 assert.throws(()=>calcularCoca(coca,[{...regalo,codigo:"0",netoCentimos:10}]),/no válida/);
});

test("nuevas columnas ordenan numéricamente y rechazan regalos inválidos",()=>{
 const r=resumirCoca(COMPRAS_COCA_PRUEBA.map((l,i)=>({...l,cajasRegaladas:i})),filtros,REFERENCIAS_COCA);
 assert.equal(ordenarCoca(r,"regaladas",true)[0].regaladas,4);
 assert.equal(ordenarCoca(r,"recibidas",false)[0].recibidas,5);
 for(const cajasRegaladas of [-1,.5,NaN,Number.MAX_SAFE_INTEGER]) {
  assert.throws(()=>calcularCoca(coca,[{...COMPRAS_COCA_PRUEBA[0],cajasRegaladas}]));
 }
});
