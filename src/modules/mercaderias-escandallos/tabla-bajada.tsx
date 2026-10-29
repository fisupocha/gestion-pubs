"use client";
import {Fragment,useMemo,useState} from "react";
import type {FiltrosMercaderia} from "./modelo";
import {COLUMNAS_BAJADA,ordenarBajada,resumirBajada,type CampoBajada,type DatosBajada} from "./bajada";
const porcentaje=(n:number|null)=>n===null?"Pendiente":`${n.toLocaleString("es-ES",{maximumFractionDigits:2})}%`;
const euros=(n:number|null)=>n===null?"—":`${n.toLocaleString("es-ES",{minimumFractionDigits:3,maximumFractionDigits:4})} €`;
const celda="border-b border-[#e5d7c8] px-3 py-3 text-right tabular-nums whitespace-nowrap";
export function TablaBajada({datos,filtros,nombre="Distribuciones La Bajada",muestra="Muestra de enero de Tarantino.",porcentajeCalculado=false}:{datos:DatosBajada;filtros:FiltrosMercaderia;nombre?:string;muestra?:string;porcentajeCalculado?:boolean}) {
 const [orden,setOrden]=useState<{campo:CampoBajada;descendente:boolean}>({campo:"compradas",descendente:true});
 const [abierta,setAbierta]=useState<string|null>(null);
 const calculo=useMemo(()=>{try{return {filas:resumirBajada(datos,filtros),error:""};}catch(e){return {filas:[],error:e instanceof Error?e.message:"No se pudo calcular La Bajada."};}},[datos,filtros]);
 const filas=ordenarBajada(calculo.filas,orden.campo,orden.descendente);
 return <>
  <div role="status" className="mb-3 rounded-xl border border-[#c8ab77] bg-[#fff5df] p-3 text-sm text-[#503a20]">
   <p className="font-bold">{nombre} · PRUEBA VISUAL · No contabilizada</p>
   <p className="mt-1">{muestra} Precio actual con IVA: ya incluye los descuentos conocidos y las cajas regaladas. Pendiente de incorporar el descuento anual cuando se conozca. El total mostrado recoge solo el descuento conocido.</p>
   <p className="mt-1">El descuento de la factura mensual ya está incluido en el coste; no se aplica dos veces. Las cajas sin cargo reducen el precio por unidad, sin aumentar el porcentaje pactado. Se respeta el IVA de cada producto.</p>
   <p className="mt-1">En los formatos sin unidades por caja documentadas, el precio individual queda pendiente.</p>
   {porcentajeCalculado&&<p className="mt-1">La factura expresa el descuento en euros: el porcentaje mostrado se calcula sobre el precio de cada compra. El punto verde ya está incluido en el coste.</p>}
   {calculo.error&&<p role="alert">{calculo.error}</p>}
  </div>
  <div className="overflow-x-auto rounded-2xl border border-[#d8c4ae] bg-[#fffdf9]"><table className="w-full border-collapse text-sm text-[#36271d]">
   <caption className="p-3 text-left text-xs text-[#71563d]">Precio por botella con IVA entre todas las unidades recibidas. Ordena por las cabeceras y despliega cada producto.</caption>
   <thead className="bg-[#eadbc6] text-[#483420]"><tr>{COLUMNAS_BAJADA.map(c=><th key={c.campo} scope="col" className={`px-3 py-3 ${c.campo==="producto"?"text-left":"text-right"}`} aria-sort={orden.campo===c.campo?(orden.descendente?"descending":"ascending"):"none"}><button type="button" className="rounded px-1 py-1 font-bold hover:underline focus-visible:outline-2" onClick={()=>setOrden(o=>({campo:c.campo,descendente:o.campo===c.campo?!o.descendente:true}))}>{c.titulo}{orden.campo===c.campo?(orden.descendente?" ↓":" ↑"):" ↕"}</button></th>)}</tr></thead>
   <tbody>{filas.map(f=><Fragment key={f.codigo}><tr className="hover:bg-[#fcf3e6]">
    <th scope="row" className="border-b border-[#e5d7c8] px-3 py-3 text-left font-normal"><button type="button" className="text-left font-bold underline decoration-[#cfb796] underline-offset-4" aria-expanded={abierta===f.codigo} onClick={()=>setAbierta(abierta===f.codigo?null:f.codigo)}>{f.producto}</button><span className="mt-1 block text-xs text-[#71563d]">{f.formato}</span></th>
    {[f.compradas??"—",f.regaladas??"—",f.recibidas??"—",porcentaje(f.mensual),porcentaje(f.anual),porcentaje(f.total)].map((v,i)=><td key={i} className={celda}>{v}</td>)}<td className={`${celda} bg-[#eef1e6] font-black text-[#35552a]`}>{euros(f.precio)}</td>
   </tr>{abierta===f.codigo&&<tr><td colSpan={COLUMNAS_BAJADA.length} className="bg-[#f7efe3] p-4"><p className="mb-2 font-semibold">Detalle de prueba · Artículo {f.codigo} · {f.unidadesCaja===null?"Unidades por caja pendientes de confirmar":`${f.unidadesCaja} unidades por caja`}</p><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr>{["Fecha","Factura","Albarán","Local","Compradas","Regaladas","Recibidas","Descuento factura","IVA","Precio unidad provisional"].map(t=><th key={t} className="p-2 text-left">{t}</th>)}</tr></thead><tbody>{f.lineas.map(l=>{const d=resumirBajada({referencias:[f],compras:[l]},filtros)[0];return <tr key={l.id}>{[l.fecha,l.factura,l.albaran,l.local,l.cajas,l.regaladas,l.cajas+l.regaladas,l.cajas?porcentaje(l.descuentoFactura):"Sin cargo",porcentaje(f.iva),euros(d?.precio??null)].map((v,i)=><td key={i} className="border-t border-[#e0cfba] p-2">{v}</td>)}</tr>})}</tbody></table></div>{!f.lineas.length&&<p>Sin compras en esta selección.</p>}</td></tr>}</Fragment>)}{!filas.length&&<tr><td colSpan={COLUMNAS_BAJADA.length} className="p-6 text-center">{calculo.error||"No hay referencias que coincidan con la búsqueda."}</td></tr>}</tbody>
  </table></div>
 </>;
}
