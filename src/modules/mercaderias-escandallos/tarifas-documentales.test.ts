import test from 'node:test';import assert from 'node:assert/strict';
import {conectarCompras,configuracionVacia,validarConfiguracion,type TarifaDocumental,claveProducto} from './escandallo';
import type {LineaMercaderia} from './modelo';
const l:LineaMercaderia={id:'linea-ficticia',proveedor:'Prueba',factura:'F-1',fecha:'2026-01-01',albaran:'A',pagina:1,linea:1,producto:'Botella ficticia',formato:'70 cl',local:null,compradas:2,bonificadas:0,importe_iva_centimos:1815,estado_validacion:'validada'};
const t:TarifaDocumental={lineaId:l.id,documento:l.factura,clave:claveProducto(l.producto,l.formato),unidadesPagadas:2,baseSinDescuentosCentimos:2000,iva:21,fuente:'Factura ficticia, página 1'};
const vacio={referencias:[],compras:[]};
test('Aplica IVA una vez a la base sin descuento, conservando neto independiente',()=>{const c=conectarCompras([l],[],[],vacio,vacio,[t])[0];assert.equal(c.tarifa,24.2);assert.equal(c.neto,18.15);});
test('No adivina tarifa faltante y los regalos no aportan importe a tarifa',()=>{assert.equal(conectarCompras([l],[],[],vacio,vacio)[0].tarifa,null);assert.equal(conectarCompras([{...l,compradas:0,bonificadas:1,importe_iva_centimos:0}],[],[],vacio,vacio)[0].tarifa,0);});
test('Rechaza tarifa duplicada, sin evidencia, IVA inválido o cantidad ajena',()=>{for(const alter of [{...t,fuente:''},{...t,iva:121}])assert.throws(()=>validarConfiguracion({...configuracionVacia,tarifasCompra:[alter]}));assert.throws(()=>validarConfiguracion({...configuracionVacia,tarifasCompra:[t,t]}));assert.throws(()=>conectarCompras([l],[],[],vacio,vacio,[{...t,unidadesPagadas:3}]));});
