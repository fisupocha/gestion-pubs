"use client";
import { useMemo,useState } from "react";
import { catalogoVenta,origenesValidados } from "./catalogo-venta";
import type { LineaMercaderia } from "./modelo";
import type { ReferenciaCoca,CompraCoca } from "./cocacola";
import type { DatosBajada } from "./bajada";
import { calcularServicio,capacidadDocumentada,claveProducto,conectarCompras,costePeriodo,validarConfiguracion,type ConfiguracionEscandallo } from "./escandallo";

export function TablaEscandallos({lineas,coca,comprasCoca,bajada,rojas,config,configurada,errores,cargando}:{lineas:LineaMercaderia[];coca:ReferenciaCoca[];comprasCoca:CompraCoca[];bajada:DatosBajada;rojas:DatosBajada;config:ConfiguracionEscandallo;configurada:boolean;errores:string[];cargando:boolean}) {
  const [anio,setAnio]=useState(String(new Date().getFullYear()));
  const [buscar,setBuscar]=useState("");
  const campo="rounded-lg border border-[#cbb7a5] bg-white px-3 py-2 text-sm text-[#39291f]";
  const calculo=useMemo(()=>{
    if(cargando||errores.length) return {filas:[],error:""};
    try {
      validarConfiguracion(config);
      if(!/^\d{4}$/.test(anio)||Number(anio)<1) throw new Error("Introduce un año válido.");
      const desde=`${anio}-01-01`,hasta=`${anio}-12-31`;
      const compras=conectarCompras(lineas,coca,comprasCoca,bajada,rojas);
      const productos=catalogoVenta([...origenesValidados(lineas),...coca.map(r=>({...r,proveedor:"Coca-Cola"})),...bajada.referencias.map(r=>({...r,proveedor:"Distribuciones La Bajada"})),...rojas.referencias.map(r=>({...r,proveedor:"Rojas Barrios"}))]);
      const obtener=(clave:string)=>costePeriodo(compras,config.ajustes,clave,desde,hasta);
      const filas=productos.filter(p=>`${p.producto} ${p.formato}`.toLocaleLowerCase("es").includes(buscar.toLocaleLowerCase("es").trim())).flatMap(p=>{
        const clave=claveProducto(p.producto,p.formato),costes=obtener(clave),capacidad=capacidadDocumentada(p.formato);
        const receta=config.recetas.find(r=>r.clave===clave)??(capacidad===null?undefined:{clave,capacidadCl:capacidad});
        const mezclador=receta?.mezclador?obtener(receta.mezclador.clave):undefined;
        return p.formatos.map(formato=>{
          const precios=config.precios.filter(v=>v.clave===clave&&v.formato===formato&&v.desde<=hasta&&v.hasta>=desde);
          const preciosUnicos=[...new Set(precios.map(v=>v.centimos))];
          // Precio vigente para comparar con coste anual revisado, sin reescribir ventas pasadas.
          const fecha=anio===String(new Date().getFullYear())?new Date().toISOString().slice(0,10):hasta;
          const precio=config.precios.find(v=>v.clave===clave&&v.formato===formato&&v.desde<=fecha&&v.hasta>=fecha);
          const resultado=calcularServicio(costes,formato,receta,mezclador,precio?precio.centimos/100:null);
          const incidencias=[...costes.incidencias,...(mezclador?.incidencias??[])];
          if(costes.prueba||mezclador?.prueba) incidencias.push("Incluye muestra de prueba");
          if(costes.tarifa===null) incidencias.push("Falta tarifa documentada");
          if(costes.efectivo===null) incidencias.push("Faltan compras o unidades");
          if((formato.startsWith("Copa")||formato.startsWith("Chupito"))&&!receta) incidencias.push("Falta capacidad confirmada");
          if(formato.startsWith("Copa")&&!receta?.mezclador) incidencias.push("Falta refresco y cantidad");
          if(!precio) incidencias.push("Precio de venta pendiente");
          if(preciosUnicos.length>1) incidencias.push("Hubo cambios de venta: margen mostrado con el precio a fecha de referencia");
          return {p,formato,clave,costes,resultado,precio:precio?precio.centimos/100:null,incidencias};
        });
      });
      return {filas,error:""};
    } catch(e) {return {filas:[],error:e instanceof Error?e.message:"No se pudo calcular el escandallo."};}
  },[lineas,coca,comprasCoca,bajada,rojas,config,errores,cargando,anio,buscar]);
  const euros=(n:number|null)=>n===null?"Pendiente":n.toLocaleString("es-ES",{style:"currency",currency:"EUR",minimumFractionDigits:4,maximumFractionDigits:4});
  const porcentaje=(n:number|null)=>n===null?"Pendiente":`${n.toLocaleString("es-ES",{maximumFractionDigits:2})}%`;
  return <div>
    <h2 className="text-xl font-bold">Escandallos y precio de venta</h2>
    <p className="my-3 text-sm">Coste medio del año recalculado desde las compras cargadas y sus ajustes documentados. El abono se imputa al periodo que cubre, aunque se reciba después. Copas de 7 cl más refresco y chupitos de 5 cl. Costes y precios con IVA.</p>
    <p className="mb-3 text-sm">Margen directo estimado, antes de hielo, consumibles y gastos generales no incorporados. No es beneficio neto ni un cierre histórico de ventas. Las facturas recibidas todavía requieren incorporar sus líneas al módulo de mercaderías.</p>
    {!configurada&&<p className="mb-3 font-semibold">Pendiente de incorporar medidas, mezcladores, precios de venta y abonos documentados. Ningún importe pendiente se sustituye por cero.</p>}
    <div className="mb-4 flex flex-wrap gap-3"><label className="grid gap-1">Año de coste<input className={campo} type="number" min="1" max="9999" value={anio} onChange={e=>setAnio(e.target.value)}/></label><label className="grid gap-1">Buscar escandallo<input className={campo} type="search" value={buscar} onChange={e=>setBuscar(e.target.value)}/></label></div>
    {(errores.length>0||calculo.error)&&<p role="alert" className="mb-3 font-bold text-red-800">{[...errores,calculo.error].filter(Boolean).join(" ")}</p>}
    {cargando?<p role="status">Cargando compras…</p>:<div className="overflow-x-auto rounded-xl border border-[#d8c4ae] bg-[#fffdf9]"><table className="w-full text-left text-sm text-[#36271d]"><thead className="bg-[#eadbc6]"><tr>{["Referencia / capacidad","Venta","Precio de venta","Coste a tarifa","Margen a tarifa €","Margen a tarifa %","Coste efectivo","Margen efectivo €","Margen efectivo %","Pendientes / origen"].map(t=><th key={t} className="p-3" scope="col">{t}</th>)}</tr></thead><tbody>{calculo.filas.map(f=><tr key={JSON.stringify([f.clave,f.formato])} className="border-t border-[#e5d7c8]"><th scope="row" className="p-3">{f.p.producto}<span className="block text-xs font-normal">{f.p.formato}</span></th><td className="p-3">{f.formato}</td>{[euros(f.precio),euros(f.resultado.tarifa.coste),euros(f.resultado.tarifa.margen),porcentaje(f.resultado.tarifa.porcentaje),euros(f.resultado.efectivo.coste),euros(f.resultado.efectivo.margen),porcentaje(f.resultado.efectivo.porcentaje)].map((v,i)=><td key={i} className="p-3 tabular-nums">{v}</td>)}<td className="p-3"><p>{f.incidencias.join(" · ")}</p><details><summary>Origen del coste</summary><p>{[...new Set(f.costes.documentos)].join(" · ")||"Sin compras en el año"}</p>{f.costes.ajustes.map(a=><p key={a.id}>{a.documento} · recibido {a.recibido} · aplicable {a.desde} a {a.hasta}</p>)}</details></td></tr>)}</tbody></table></div>}
  </div>;
}
