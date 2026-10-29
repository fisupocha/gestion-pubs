import assert from "node:assert/strict";
import test from "node:test";
import {ordenarBajada,resumirBajada,validarDatosBajada,type DatosBajada} from "./bajada";
const filtros={desde:"2026-01-01",hasta:"2026-12-31",local:"",busqueda:""};
// Solo datos ficticios en el repositorio público.
const datos:DatosBajada={referencias:[{codigo:"1",producto:"Producto ficticio",formato:"C24",unidadesCaja:24,iva:21,anual:null}],compras:[
 {id:"1",codigo:"1",fecha:"2026-01-30",factura:"FICTICIA",albaran:"A1",local:"Tarantino",cajas:10,regaladas:0,brutoCentimos:20000,netoCentimos:14000,descuentoFactura:30},
 {id:"2",codigo:"1",fecha:"2026-01-30",factura:"FICTICIA",albaran:"A2",local:"Tarantino",cajas:0,regaladas:2,brutoCentimos:0,netoCentimos:0,descuentoFactura:100}]};
test("descuento en factura no se resta otra vez; regalos diluyen el coste",()=>{
 const [r]=resumirBajada(datos,filtros);assert.equal(r.compradas,10);assert.equal(r.regaladas,2);assert.equal(r.recibidas,12);
 assert.equal(r.mensual,30);assert.equal(r.total,30);assert.equal(r.anual,null);assert.equal(r.precio,140*1.21/(12*24));
});
test("media ponderada por compras, no media simple, y distintos IVA",()=>{
 const d:DatosBajada={referencias:[{...datos.referencias[0],iva:10}],compras:[datos.compras[0],{...datos.compras[0],id:"3",cajas:20,brutoCentimos:60000,netoCentimos:30000,descuentoFactura:50}]};
 const [r]=resumirBajada(d,filtros);assert.equal(r.mensual,45);assert.equal(r.precio,440*1.10/(30*24));
});
test("formato sin confirmar no inventa precio individual y catálogo persiste vacío",()=>{
 const [r]=resumirBajada({...datos,referencias:[{...datos.referencias[0],unidadesCaja:null}]},filtros);assert.equal(r.precio,null);
 const [v]=resumirBajada({...datos,compras:[]},filtros);assert.equal(v.compradas,null);assert.equal(v.anual,null);
});
test("respeta filtros y ordena cantidades",()=>{
 assert.equal(resumirBajada(datos,{...filtros,local:"Cue"})[0].recibidas,null);
 assert.equal(resumirBajada(datos,{...filtros,desde:"2026-02-01"})[0].recibidas,null);
 assert.equal(resumirBajada(datos,{...filtros,busqueda:"inexistente"}).length,0);
 const [a]=resumirBajada(datos,filtros);const b={...a,codigo:"2",producto:"Otro",compradas:2};
 assert.equal(ordenarBajada([a,b],"compradas",false)[0].compradas,2);
});
test("rechaza duplicados, negativos e intervalos incorrectos",()=>{
 assert.throws(()=>validarDatosBajada({...datos,compras:[datos.compras[0],datos.compras[0]]}),/duplicada/);
 assert.throws(()=>validarDatosBajada({...datos,compras:[{...datos.compras[0],regaladas:-1}]}));
 assert.throws(()=>resumirBajada(datos,{...filtros,desde:"2027-01-01"}));
});
