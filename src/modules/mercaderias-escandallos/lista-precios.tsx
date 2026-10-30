"use client";
import { fechaNegocio } from "./fecha-negocio";
import { useMemo, useState } from "react";
import type { LineaMercaderia } from "./modelo";
import type { ReferenciaCoca, CompraCoca } from "./cocacola";
import type { DatosBajada } from "./bajada";
import { conectarCompras, claveProducto, type ConfiguracionEscandallo } from "./escandallo";
import { tarifasVisuales } from "./tarifas-visuales";
import { catalogoVenta, origenesValidados } from "./catalogo-venta";

export function ListaPrecios({lineas,coca,comprasCoca,bajada,rojas,cargando,errores,config}:{lineas:LineaMercaderia[];coca:ReferenciaCoca[];comprasCoca:CompraCoca[];bajada:DatosBajada;rojas:DatosBajada;cargando:boolean;errores:string[];config:ConfiguracionEscandallo}) {
  const [buscar,setBuscar]=useState("");
  const [grupo,setGrupo]=useState("");
  const productos=useMemo(()=>catalogoVenta([...origenesValidados(lineas),...coca.map(r=>({...r,proveedor:"Coca-Cola"})),...bajada.referencias.map(r=>({...r,proveedor:"Distribuciones La Bajada"})),...rojas.referencias.map(r=>({...r,proveedor:"Rojas Barrios"}))]),[lineas,coca,bajada,rojas]);
  const tarifas=useMemo(()=>{
    if(cargando||errores.length) return {datos:new Map<string,{precio:number|null;prueba:boolean}>(),error:""};
    try {return {datos:tarifasVisuales(conectarCompras(lineas,coca,comprasCoca,bajada,rojas)),error:""};}
    catch(e) {return {datos:new Map<string,{precio:number|null;prueba:boolean}>(),error:e instanceof Error?e.message:"No se pudo leer la tarifa."};}
  },[lineas,coca,comprasCoca,bajada,rojas,cargando,errores]);
  const tarifaVisual=(producto:string,formato:string)=>{
    const t=tarifas.datos.get(claveProducto(producto,formato));
    return <>{t?.precio!=null&&!/estuche/i.test(formato)?t.precio.toLocaleString("es-ES",{style:"currency",currency:"EUR",minimumFractionDigits:2,maximumFractionDigits:4}):"Pendiente"}{t?.precio!=null&&t.prueba&&<span className="block text-xs">Muestra de prueba</span>}</>;
  };
  const seleccion=productos.filter(r=>(!grupo||r.grupo===grupo)&&`${r.producto} ${r.formato} ${r.proveedores.join(" ")}`.toLocaleLowerCase("es").includes(buscar.trim().toLocaleLowerCase("es")));
  const datoPrecio=(producto:string,formatoOrigen:string,formatoVenta:string)=>{
    const fecha=fechaNegocio();
    const p=config.precios.find(p=>p.clave===claveProducto(producto,formatoOrigen)&&p.formato===formatoVenta&&p.desde<=fecha&&p.hasta>=fecha);
    return p;
  };
  const precioVenta=(producto:string,formatoOrigen:string,formatoVenta:string)=>{
    const p=datoPrecio(producto,formatoOrigen,formatoVenta);
    return p?(p.centimos/100).toLocaleString("es-ES",{style:"currency",currency:"EUR"}):"Pendiente";
  };
  const totalFormatos=seleccion.reduce((s,r)=>s+r.formatos.length,0);
  const preciosAsignados=seleccion.reduce((s,r)=>s+r.formatos.filter(f=>precioVenta(r.producto,r.formato,f)!=="Pendiente").length,0);
  const campo="rounded-lg border border-[#cbb7a5] bg-white px-3 py-2 text-sm text-[#39291f]";
  return <div className="text-[#36271d]">
    <h2 className="text-xl font-bold">Lista de precios</h2>
    <p className="my-3 text-sm">Referencias disponibles en compras y catálogos cargados, sin limitar por fecha o local. Grupos iniciales propuestos, pendientes de confirmar contigo. Precios de venta con IVA vigentes, compartidos con los escandallos; los no asignados quedan pendientes.</p>
    <p className="mb-4 text-sm">Copa: 7 cl de alcohol + refresco. Chupito: 5 cl. Una botella de 70 cl rinde 10 copas o 14 chupitos; otras capacidades tendrán su rendimiento correspondiente. Botella completa: su capacidad indicada.</p>
    <p className="mb-3 rounded-lg bg-blue-100 p-3 text-sm text-blue-950">Azul = precio propuesto por Work, pendiente de confirmar. Los demás precios los has confirmado tú. Propuestas por comparación; no acreditan margen suficiente sin tarifa, capacidad y receta documentadas.</p>
    <p className="mb-3 text-sm">Tarifa con IVA: coste medio ponderado de la botella entera o unidad en las compras cargadas, sin descuentos ni regalos. Se repite en copa, chupito y botella; no incluye refresco ni hielo. Sin tarifa documentada aparece pendiente. Licores: pendientes de definir.</p>
    {tarifas.error&&<p role="alert">{tarifas.error}</p>}
    {errores.length>0&&<p role="alert" className="mb-3 font-bold text-red-800">Listado incompleto: {errores.join(" ")}</p>}
    <div className="mb-4 flex flex-wrap gap-3 rounded-xl bg-[#fffaf3] p-4">
      <label className="grid gap-1 text-sm">Buscar referencia<input type="search" className={campo} value={buscar} onChange={e=>setBuscar(e.target.value)} /></label>
      <label className="grid gap-1 text-sm">Grupo<select className={campo} value={grupo} onChange={e=>setGrupo(e.target.value)}><option value="">Todos los grupos</option>{[...new Set(productos.map(r=>r.grupo))].sort().map(g=><option key={g}>{g}</option>)}</select></label>
    </div>
    <p role="status" className="mb-3 text-sm">{cargando?"Cargando referencias…":`${seleccion.length} referencias · ${totalFormatos} formatos de venta · ${preciosAsignados} precios asignados · ${totalFormatos-preciosAsignados} pendientes`}</p>
    <div className="overflow-x-auto rounded-xl border border-[#d8c4ae] bg-[#fffdf9]"><table className="w-full text-left text-sm text-[#36271d]">
      <thead className="bg-[#eadbc6]"><tr>{["Producto","Formato de origen","Proveedor","Grupo propuesto","Formato de venta","Coste botella/unidad a tarifa con IVA","Precio de venta con IVA"].map(t=><th scope="col" key={t} className="px-3 py-3">{t}</th>)}</tr></thead>
      <tbody>{seleccion.flatMap(r=>r.formatos.map(formato=><tr key={JSON.stringify([r.producto,r.formato,formato])} className="border-t border-[#e5d7c8] hover:bg-[#fcf3e6]"><th scope="row" className="px-3 py-3 font-semibold">{r.producto}</th><td className="px-3 py-3">{r.formato}</td><td className="px-3 py-3">{r.proveedores.join(" · ")}</td><td className="px-3 py-3">{r.grupo}</td><td className="px-3 py-3">{formato}</td><td className="px-3 py-3 font-semibold text-[#36271d]">{tarifaVisual(r.producto,r.formato)}</td><td className={`px-3 py-3 font-semibold ${datoPrecio(r.producto,r.formato,formato)?.origen==="propuesta"?"bg-blue-100 text-blue-950":"text-[#725c49]"}`} title={datoPrecio(r.producto,r.formato,formato)?.nota}>{precioVenta(r.producto,r.formato,formato)}{datoPrecio(r.producto,r.formato,formato)?.origen==="propuesta"&&<span className="block text-xs">Propuesto</span>}</td></tr>))}
      {!cargando&&seleccion.length===0&&<tr><td colSpan={7} className="p-6 text-center">No hay referencias para esta selección.</td></tr>}</tbody>
    </table></div>
  </div>;
}
