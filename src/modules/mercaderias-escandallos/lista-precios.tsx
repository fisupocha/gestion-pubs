"use client";
import { useMemo, useState } from "react";
import type { LineaMercaderia } from "./modelo";
import type { ReferenciaCoca } from "./cocacola";
import type { ReferenciaBajada } from "./bajada";
import { claveProducto, type ConfiguracionEscandallo } from "./escandallo";
import { catalogoVenta, origenesValidados } from "./catalogo-venta";

export function ListaPrecios({lineas,coca,bajada,rojas,cargando,errores,config}:{lineas:LineaMercaderia[];coca:ReferenciaCoca[];bajada:ReferenciaBajada[];rojas:ReferenciaBajada[];cargando:boolean;errores:string[];config:ConfiguracionEscandallo}) {
  const [buscar,setBuscar]=useState("");
  const [grupo,setGrupo]=useState("");
  const productos=useMemo(()=>catalogoVenta([...origenesValidados(lineas),...coca.map(r=>({...r,proveedor:"Coca-Cola"})),...bajada.map(r=>({...r,proveedor:"Distribuciones La Bajada"})),...rojas.map(r=>({...r,proveedor:"Rojas Barrios"}))]),[lineas,coca,bajada,rojas]);
  const seleccion=productos.filter(r=>(!grupo||r.grupo===grupo)&&`${r.producto} ${r.formato} ${r.proveedores.join(" ")}`.toLocaleLowerCase("es").includes(buscar.trim().toLocaleLowerCase("es")));
  const precioVenta=(producto:string,formatoOrigen:string,formatoVenta:string)=>{
    const fecha=new Date().toISOString().slice(0,10);
    const p=config.precios.find(p=>p.clave===claveProducto(producto,formatoOrigen)&&p.formato===formatoVenta&&p.desde<=fecha&&p.hasta>=fecha);
    return p?(p.centimos/100).toLocaleString("es-ES",{style:"currency",currency:"EUR"}):"Pendiente";
  };
  const campo="rounded-lg border border-[#cbb7a5] bg-white px-3 py-2 text-sm text-[#39291f]";
  return <div className="text-[#36271d]">
    <h2 className="text-xl font-bold">Lista de precios</h2>
    <p className="my-3 text-sm">Referencias disponibles en compras y catálogos cargados, sin limitar por fecha o local. Grupos iniciales propuestos, pendientes de confirmar contigo. Precios de venta con IVA vigentes, compartidos con los escandallos; los no asignados quedan pendientes.</p>
    <p className="mb-4 text-sm">Copa: 7 cl de alcohol + refresco. Chupito: 5 cl. Una botella de 70 cl rinde 10 copas o 14 chupitos; otras capacidades tendrán su rendimiento correspondiente. Botella completa: su capacidad indicada.</p>
    {errores.length>0&&<p role="alert" className="mb-3 font-bold text-red-800">Listado incompleto: {errores.join(" ")}</p>}
    <div className="mb-4 flex flex-wrap gap-3 rounded-xl bg-[#fffaf3] p-4">
      <label className="grid gap-1 text-sm">Buscar referencia<input type="search" className={campo} value={buscar} onChange={e=>setBuscar(e.target.value)} /></label>
      <label className="grid gap-1 text-sm">Grupo<select className={campo} value={grupo} onChange={e=>setGrupo(e.target.value)}><option value="">Todos los grupos</option>{[...new Set(productos.map(r=>r.grupo))].sort().map(g=><option key={g}>{g}</option>)}</select></label>
    </div>
    <p role="status" className="mb-3 text-sm">{cargando?"Cargando referencias…":`${seleccion.length} referencias · ${seleccion.reduce((s,r)=>s+r.formatos.length,0)} formatos de venta · Precios pendientes`}</p>
    <div className="overflow-x-auto rounded-xl border border-[#d8c4ae] bg-[#fffdf9]"><table className="w-full text-left text-sm text-[#36271d]">
      <thead className="bg-[#eadbc6]"><tr>{["Producto","Formato de origen","Proveedor","Grupo propuesto","Formato de venta","Precio de venta con IVA"].map(t=><th scope="col" key={t} className="px-3 py-3">{t}</th>)}</tr></thead>
      <tbody>{seleccion.flatMap(r=>r.formatos.map(formato=><tr key={JSON.stringify([r.producto,r.formato,formato])} className="border-t border-[#e5d7c8] hover:bg-[#fcf3e6]"><th scope="row" className="px-3 py-3 font-semibold">{r.producto}</th><td className="px-3 py-3">{r.formato}</td><td className="px-3 py-3">{r.proveedores.join(" · ")}</td><td className="px-3 py-3">{r.grupo}</td><td className="px-3 py-3">{formato}</td><td className="px-3 py-3 font-semibold text-[#725c49]">{precioVenta(r.producto,r.formato,formato)}</td></tr>))}
      {!cargando&&seleccion.length===0&&<tr><td colSpan={6} className="p-6 text-center">No hay referencias para esta selección.</td></tr>}</tbody>
    </table></div>
  </div>;
}
