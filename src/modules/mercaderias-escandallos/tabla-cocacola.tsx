"use client";
import { Fragment, useMemo, useState } from "react";
import type { FiltrosMercaderia } from "./modelo";
import { calcularCoca, COLUMNAS_COCA, ordenarCoca, resumirCoca, type CampoCoca, type CompraCoca, type ReferenciaCoca } from "./cocacola";

const porcentaje = (v:number|null) => v === null ? "Pendiente" : `${v.toLocaleString("es-ES",{maximumFractionDigits:2})}%`;
const precio = (v:number|null) => v === null ? "—" : `${v.toLocaleString("es-ES",{minimumFractionDigits:3,maximumFractionDigits:4})} €`;
const celda = "border-b border-[#e5d7c8] px-3 py-3 text-right tabular-nums whitespace-nowrap";

export function TablaCocaCola({ filtros, referencias, compras }: { filtros: FiltrosMercaderia; referencias: ReferenciaCoca[]; compras: CompraCoca[] }) {
  const [orden,setOrden] = useState<{campo:CampoCoca;descendente:boolean}>({campo:"cajas",descendente:true});
  const [abierta,setAbierta] = useState<string|null>(null);
  const calculo = useMemo(() => {
    try {return {filas:resumirCoca(compras,filtros,referencias),error:""};}
    catch(e) {return {filas:[],error:e instanceof Error ? e.message : "No se pudo calcular la prueba."};}
  },[filtros,compras,referencias]);
  const filas=ordenarCoca(calculo.filas,orden.campo,orden.descendente);
  const cantidad=filas.reduce((s,r)=>s+(r.cajas ?? 0),0);
  const regalos=filas.reduce((s,r)=>s+(r.regaladas ?? 0),0);
  return <>
    <div role="status" className="mb-3 rounded-xl border border-[#c8ab77] bg-[#fff5df] p-3 text-sm text-[#503a20]">
      <p className="font-bold">Coca-Cola · PRUEBA VISUAL · No contabilizada</p>
      <p className="mt-1">{cantidad} cajas compradas + {regalos} regaladas = {cantidad + regalos} recibidas · {filas.length} referencias de prueba. Solo se ha utilizado la página 1 de la factura de junio de Tarantino.</p>
      <p className="mt-1">Condiciones fijas de 2026: semestral de diciembre igual al de junio. Directos calculados de la factura de muestra; porcentajes no documentados: Pendiente.</p>
      <p className="mt-1">Precio provisional: los abonos mensuales y semestrales se simulan sobre la tarifa del producto, pendiente de contraste con documentos completos. No se resta de nuevo el descuento directo ya incluido.</p>
      {calculo.error && <p role="alert" className="mt-2 font-bold">{calculo.error}</p>}
    </div>
    <div className="overflow-x-auto rounded-2xl border border-[#d8c4ae] bg-[#fffdf9]">
      <table className="w-full border-collapse text-sm text-[#36271d]">
        <caption className="p-3 text-left text-xs text-[#71563d]">Precio por botella o lata con IVA = coste después de descuentos ÷ todas las unidades recibidas, incluidas las regaladas. Los regalos no cambian los porcentajes pactados. Ordena por las cabeceras y despliega cada producto.</caption>
        <thead className="bg-[#eadbc6] text-[#483420]"><tr>{COLUMNAS_COCA.map(c=><th key={c.campo} scope="col" className={`px-3 py-3 ${c.campo==="producto"?"text-left":"text-right"}`} aria-sort={orden.campo===c.campo?(orden.descendente?"descending":"ascending"):"none"}>
          <button type="button" className="rounded px-1 py-1 font-bold hover:underline focus-visible:outline-2" onClick={()=>setOrden(o=>({campo:c.campo,descendente:o.campo===c.campo?!o.descendente:true}))}>{c.titulo}{orden.campo===c.campo?(orden.descendente?" ↓":" ↑"):" ↕"}</button>
        </th>)}</tr></thead>
        <tbody>{filas.map(f=><Fragment key={f.codigo}>
          <tr className="hover:bg-[#fcf3e6]">
            <th scope="row" className="border-b border-[#e5d7c8] px-3 py-3 text-left font-normal"><button type="button" className="text-left font-bold underline decoration-[#cfb796] underline-offset-4" aria-expanded={abierta===f.codigo} onClick={()=>setAbierta(abierta===f.codigo?null:f.codigo)}>{f.producto}</button><span className="mt-1 block text-xs text-[#71563d]">{f.formato}</span></th>
            <td className={celda}>{f.cajas ?? "—"}</td><td className={celda}>{f.regaladas ?? "—"}</td><td className={celda}>{f.recibidas ?? "—"}</td><td className={celda}>{porcentaje(f.directo)}</td><td className={celda}>{porcentaje(f.mensual)}</td><td className={celda}>{porcentaje(f.semestral)}</td><td className={celda}>{porcentaje(f.total)}</td><td className={`${celda} bg-[#eef1e6] font-black text-[#35552a]`}>{precio(f.precio)}</td>
          </tr>
          {abierta===f.codigo&&<tr><td colSpan={COLUMNAS_COCA.length} className="bg-[#f7efe3] p-4">
            <p className="mb-2 text-sm font-semibold">Detalle de prueba · Artículo {f.codigo} · {f.unidadesCaja} unidades por caja</p>
            {f.lineas.length ? <table className="w-full text-xs"><thead><tr>{["Mes / fecha","Factura","Local","Cajas compradas","Cajas regaladas","Cajas recibidas","Directo","Mensual","Semestral","Total","Precio unidad con IVA"].map(t=><th key={t} className="p-2 text-left">{t}</th>)}</tr></thead><tbody>{f.lineas.map(l=>{const d=calcularCoca(f,[l]);return <tr key={l.id}>{[l.fecha,l.factura,l.local,l.cajas,l.cajasRegaladas ?? 0,d.recibidas,porcentaje(f.directo),porcentaje(f.mensual),porcentaje(f.semestral),porcentaje(d.total),precio(d.precio)].map((v,i)=><td key={i} className="border-t border-[#e0cfba] p-2">{v}</td>)}</tr>})}</tbody></table>:<p className="text-sm">Referencia conservada con sus condiciones. Sin compras de prueba en el local o periodo seleccionado.</p>}
          </td></tr>}
        </Fragment>)}
        {!filas.length&&<tr><td colSpan={COLUMNAS_COCA.length} className="p-6 text-center">{calculo.error||"No hay referencias que coincidan con la búsqueda."}</td></tr>}
        </tbody>
      </table>
    </div>
  </>;
}
