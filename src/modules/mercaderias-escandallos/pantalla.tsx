"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useAccesoApp } from "@/components/acceso/control-acceso-app";
import { supabase } from "@/lib/supabase";
import { leerMercaderias } from "./lectura";
import { resumirMercaderias, type LineaMercaderia } from "./modelo";

const euros = (valor: number) => valor.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
const campo = "rounded-lg border border-[#cbb7a5] bg-white px-3 py-2 text-sm text-[#39291f]";
const celda = "border-b border-[#e5d7c8] px-3 py-3 text-right tabular-nums whitespace-nowrap";

export function PantallaMercaderias() {
  const acceso = useAccesoApp();
  const [lineas, setLineas] = useState<LineaMercaderia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [recarga, setRecarga] = useState(0);
  const [local, setLocal] = useState("");
  const [desde, setDesde] = useState("2026-01-01");
  const [hasta, setHasta] = useState("2026-08-31");
  const [busqueda, setBusqueda] = useState("");
  const [abierta, setAbierta] = useState<string | null>(null);

  useEffect(() => {
    if (!acceso.listo || !acceso.esAdmin) return;
    let cancelada = false;
    leerMercaderias(supabase).then(datos => {
      if (!cancelada) { setLineas(datos); setError(""); setCargando(false); }
    }).catch((fallo: unknown) => {
      if (!cancelada) { setLineas([]); setError(fallo instanceof Error ? fallo.message : "No se pudo leer el módulo."); setCargando(false); }
    });
    return () => { cancelada = true; };
  }, [acceso.listo, acceso.esAdmin, recarga]);

  const calculo = useMemo(() => {
    try { return { filas: resumirMercaderias(lineas, { local, desde, hasta, busqueda }), fallo: "" }; }
    catch (fallo) { return { filas: [], fallo: fallo instanceof Error ? fallo.message : "Revisa los datos." }; }
  }, [lineas, local, desde, hasta, busqueda]);
  const locales = [...new Set(lineas.map(l => l.local).filter((l): l is string => Boolean(l)))].sort();
  const enPeriodo = lineas.filter(l => l.fecha >= desde && l.fecha <= hasta && (!local || l.local === local));
  const pendientes = enPeriodo.filter(l => l.estado_validacion !== "validada").length;
  const sinLocal = enPeriodo.filter(l => !l.local).length;
  const filas = error || calculo.fallo ? [] : calculo.filas;
  const importe = filas.reduce((s, f) => s + f.importeCentimos, 0) / 100;
  const aviso = error || calculo.fallo;

  if (!acceso.listo) return <p className="p-6">Comprobando el acceso…</p>;
  if (!acceso.esAdmin) return <p className="p-6">Tu sesión no permite consultar este módulo.</p>;

  return <section className="flex h-full min-h-0 flex-col overflow-y-auto p-4 text-[#36271d] md:p-6">
    <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-widest text-[#806448]">Riverocio · Compras conjuntas</p>
        <h1 className="mt-1 text-2xl font-black text-[#36271d]">Mercaderías y escandallos</h1>
        <p className="mt-2 text-sm text-[#725c49]">Compras acumuladas por producto y formato. Todos los precios incluyen IVA.</p>
      </div>
      <button type="button" disabled={cargando} className={campo} onClick={() => { setCargando(true); setRecarga(n => n + 1); }}>Actualizar</button>
    </header>

    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl bg-[#fffaf3] p-4 text-[#604732] shadow-sm">
      <label className="grid gap-1 text-xs font-semibold">Local<select className={campo} value={local} onChange={e => setLocal(e.target.value)}>
        <option value="">Riverocio — Todos los locales</option>
        {locales.map(nombre => <option key={nombre} value={nombre}>{nombre}</option>)}
      </select></label>
      <label className="grid gap-1 text-xs font-semibold">Desde<input className={campo} type="date" value={desde} onChange={e => setDesde(e.target.value)} /></label>
      <label className="grid gap-1 text-xs font-semibold">Hasta<input className={campo} type="date" value={hasta} onChange={e => setHasta(e.target.value)} /></label>
      <label className="grid min-w-48 flex-1 gap-1 text-xs font-semibold">Buscar producto<input className={campo} type="search" placeholder="Por ejemplo, whisky J-B" value={busqueda} onChange={e => setBusqueda(e.target.value)} /></label>
    </div>

    <div role="status" aria-live="polite" className="mb-3 text-sm text-[#6c4c38]">
      {cargando ? "Cargando todas las compras…" : aviso ? aviso : lineas.length === 0 ? "Todavía no hay compras cargadas. El listado de Reyes Magos enero–agosto está pendiente de extracción y validación." :
        `${filas.length} referencias · ${euros(importe)} · Orden: mayor a menor cantidad comprada.`}
      {!cargando && !aviso && pendientes > 0 && <p className="mt-2 font-bold">Acumulado provisional: {pendientes} líneas pendientes de revisión, excluidas del cálculo.</p>}
      {!cargando && !aviso && sinLocal > 0 && <p className="mt-1">{sinLocal} líneas sin local identificado: incluidas únicamente en Riverocio completo.</p>}
    </div>

    {!cargando && <div className="overflow-x-auto rounded-2xl border border-[#d8c4ae] bg-[#fffdf9]">
      <table className="w-full border-collapse text-sm text-[#36271d]">
        <caption className="p-3 text-left text-xs text-[#806448]">Precio medio comprado = importe con IVA ÷ compradas. Coste real = importe con IVA ÷ (compradas + regaladas).</caption>
        <thead className="bg-[#eadbc6] text-[#483420]"><tr>
          <th className="px-3 py-3 text-left">Producto / formato</th>
          {["Compradas ↓", "Regaladas", "Recibidas", "Importe con IVA", "Precio medio con IVA", "Coste real con IVA"].map(t => <th key={t} scope="col" className="px-3 py-3 text-right">{t}</th>)}
        </tr></thead>
        <tbody>{filas.map(f => <Fragment key={f.clave}>
          <tr className="hover:bg-[#fcf3e6]">
            <th scope="row" className="border-b border-[#e5d7c8] px-3 py-3 text-left font-normal"><button className="text-left font-bold underline decoration-[#cfb796] underline-offset-4" aria-expanded={abierta === f.clave} onClick={() => setAbierta(abierta === f.clave ? null : f.clave)}>{f.producto}</button><span className="mt-1 block text-xs text-[#806448]">{f.formato}</span></th>
            <td className={celda}>{f.compradas}</td><td className={celda}>{f.bonificadas}</td><td className={celda}>{f.recibidas}</td>
            <td className={celda}>{euros(f.importeCentimos / 100)}</td><td className={celda}>{f.precioCompra === null ? "—" : euros(f.precioCompra)}</td>
            <td className={`${celda} bg-[#eef1e6] font-black text-[#35552a]`}>{euros(f.costeReal)}</td>
          </tr>
          {abierta === f.clave && <tr><td colSpan={7} className="bg-[#f7efe3] p-4">
            <p className="mb-2 font-semibold">Detalle del cálculo · importes con IVA</p>
            <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr>{["Fecha", "Proveedor", "Factura", "Albarán", "Local", "Página / línea", "Compradas", "Regaladas", "Importe", "Precio comprado"].map(t => <th key={t} className="p-2 text-left">{t}</th>)}</tr></thead>
              <tbody>{[...f.lineas].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.factura.localeCompare(b.factura) || a.pagina - b.pagina || a.linea - b.linea).map(l => <tr key={l.id}>
                {[l.fecha, l.proveedor, l.factura, l.albaran || "—", l.local || "Sin asignar", `${l.pagina} / ${l.linea}`, l.compradas, l.bonificadas, euros(l.importe_iva_centimos / 100), l.compradas ? euros(l.importe_iva_centimos / 100 / l.compradas) : "Sin cargo"].map((v, i) => <td key={i} className="border-t border-[#e0cfba] p-2">{v}</td>)}
              </tr>)}</tbody></table></div>
          </td></tr>}
        </Fragment>)}
        {filas.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-[#806448]">{aviso ? "Listado no disponible todavía. No se presentan cifras incompletas." : "No hay referencias validadas para mostrar en esta selección."}</td></tr>}
        </tbody>
      </table>
    </div>}
  </section>;
}
