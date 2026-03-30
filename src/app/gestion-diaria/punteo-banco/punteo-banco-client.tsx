"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";

type EstadoOk = "Pendiente" | "OK";

type MovimientoBanco = {
  id: string;
  fecha: string;
  fechaValor: string;
  movimiento: string;
  masDatos: string;
  importe: string;
  proveedor: string;
  numFactura: string;
  observaciones: string;
  ok: EstadoOk;
};

function normalizarClaveCabecera(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase()
    .trim();
}

function excelSerialAFecha(value: number) {
  const base = new Date(Date.UTC(1899, 11, 30));
  const fecha = new Date(base.getTime() + value * 86400000);
  const dd = String(fecha.getUTCDate()).padStart(2, "0");
  const mm = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = String(fecha.getUTCFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

function fechaDesdeCelda(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return excelSerialAFecha(value);
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return "";
}

function importeDesdeCelda(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toLocaleString("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return "";
}

function textoDesdeCelda(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function extraerCampo(row: Record<string, unknown>, aliases: string[]) {
  const map = new Map<string, unknown>();

  Object.entries(row).forEach(([key, value]) => {
    map.set(normalizarClaveCabecera(key), value);
  });

  for (const alias of aliases) {
    const encontrado = map.get(normalizarClaveCabecera(alias));
    if (encontrado !== undefined) {
      return encontrado;
    }
  }

  return "";
}

function encontrarFilaCabecera(rows: unknown[][]) {
  return rows.findIndex((row) => {
    if (!Array.isArray(row)) {
      return false;
    }

    const normalizados = row.map((item) => normalizarClaveCabecera(String(item ?? "")));

    return (
      normalizados.includes("fecha") &&
      normalizados.includes("movimiento") &&
      normalizados.includes("importe")
    );
  });
}

function construirMovimientos(rows: Record<string, unknown>[]) {
  return rows
    .map((row, index) => {
      const fecha = fechaDesdeCelda(extraerCampo(row, ["Fecha"]));
      const movimiento = textoDesdeCelda(extraerCampo(row, ["Movimiento", "Concepto"]));
      const importe = importeDesdeCelda(extraerCampo(row, ["Importe"]));

      if (!fecha && !movimiento && !importe) {
        return null;
      }

      return {
        id: `mov-${index}`,
        fecha,
        fechaValor: fechaDesdeCelda(extraerCampo(row, ["Fecha valor", "FechaValor"])),
        movimiento,
        masDatos: textoDesdeCelda(extraerCampo(row, ["Mas datos", "Más datos", "Detalles"])),
        importe,
        proveedor: "",
        numFactura: "",
        observaciones: "",
        ok: "Pendiente" as EstadoOk,
      };
    })
    .filter((item): item is MovimientoBanco => item !== null);
}

export function PunteoBancoClient() {
  const router = useRouter();
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [movimientos, setMovimientos] = useState<MovimientoBanco[]>([]);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totales = useMemo(() => {
    const ok = movimientos.filter((item) => item.ok === "OK").length;
    return {
      total: movimientos.length,
      ok,
      pendientes: movimientos.length - ok,
    };
  }, [movimientos]);

  async function importarExcel(file: File) {
    setError(null);
    setMensaje(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, {
        type: "array",
        cellDates: false,
        raw: true,
      });

      const primeraHoja = workbook.SheetNames[0];

      if (!primeraHoja) {
        throw new Error("El Excel no tiene hojas.");
      }

      const worksheet = workbook.Sheets[primeraHoja];
      const vistaCruda = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
        defval: "",
        header: 1,
      });
      const filaCabecera = encontrarFilaCabecera(vistaCruda);

      if (filaCabecera < 0) {
        throw new Error("No he encontrado la cabecera del extracto.");
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: "",
        range: filaCabecera,
      });
      const nuevos = construirMovimientos(rows);

      setMovimientos(nuevos);
      setNombreArchivo(file.name);
      setMensaje(
        nuevos.length > 0
          ? `Importados ${nuevos.length} movimientos del Excel.`
          : "El Excel se ha leido, pero no he encontrado movimientos utiles."
      );
    } catch {
      setError("No se pudo leer el Excel. Revisa que el fichero sea el bancario correcto.");
      setMovimientos([]);
      setNombreArchivo("");
    }
  }

  function actualizarMovimiento(
    id: string,
    campo: "proveedor" | "numFactura" | "observaciones" | "ok",
    value: string
  ) {
    setMovimientos((actual) =>
      actual.map((item) =>
        item.id === id
          ? {
              ...item,
              [campo]: campo === "ok" ? (value as EstadoOk) : value,
            }
          : item
      )
    );
  }

  function cerrarPantalla() {
    if (typeof window !== "undefined") {
      window.close();
    }

    setTimeout(() => {
      router.push("/gestion-diaria/empleados");
    }, 80);
  }

  return (
    <section className="flex h-full min-h-0 flex-col gap-3 overflow-hidden p-3">
      <header className="rounded-[20px] border border-[#d6c4b8] bg-[linear-gradient(180deg,#fffaf7_0%,#f1e8e2_100%)] px-4 py-3 text-[#3f2b24] shadow-[0_18px_40px_rgba(70,45,37,0.10)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8b695d]">
              Gestion diaria
            </div>
            <h1 className="mt-1 text-2xl font-black">Punteo banco</h1>
            <p className="mt-1 text-sm text-[#6a4f45]">
              Importa el Excel bancario y completa las columnas de trabajo al final.
            </p>
          </div>

          <button
            type="button"
            onClick={cerrarPantalla}
            className="rounded-[14px] border border-[#d1b1a2] bg-[linear-gradient(180deg,#fff8f4_0%,#ecd9ce_100%)] px-4 py-2 text-sm font-bold text-[#4b2f27] shadow-[0_10px_20px_rgba(70,45,37,0.08)] transition hover:-translate-y-[1px]"
          >
            Cerrar
          </button>
        </div>
      </header>

      <section className="rounded-[18px] border border-[#d6c4b8] bg-[linear-gradient(180deg,#fffaf7_0%,#f3ebe6_100%)] px-4 py-3 shadow-[0_12px_24px_rgba(70,45,37,0.08)]">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-end">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8b695d]">
              Excel bancario
            </span>
            <input
              type="file"
              accept=".xls,.xlsx,.xlsm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  void importarExcel(file);
                }
              }}
              className="rounded-[12px] border border-[#d9c3b7] bg-white px-3 py-2 text-sm text-[#4b2f27] file:mr-3 file:rounded-[10px] file:border-0 file:bg-[#4b312b] file:px-3 file:py-2 file:text-sm file:font-bold file:text-white"
            />
          </label>

          <div className="rounded-[14px] border border-[#d8c2b6] bg-white/75 px-3 py-2 text-center">
            <div className="text-[9px] font-black uppercase tracking-[0.14em] text-[#8b695d]">
              Total
            </div>
            <div className="mt-1 text-xl font-black text-[#3f2b24]">{totales.total}</div>
          </div>

          <div className="rounded-[14px] border border-[#d8c2b6] bg-white/75 px-3 py-2 text-center">
            <div className="text-[9px] font-black uppercase tracking-[0.14em] text-[#8b695d]">
              OK
            </div>
            <div className="mt-1 text-xl font-black text-[#2f6a39]">{totales.ok}</div>
          </div>

          <div className="rounded-[14px] border border-[#d8c2b6] bg-white/75 px-3 py-2 text-center">
            <div className="text-[9px] font-black uppercase tracking-[0.14em] text-[#8b695d]">
              Pendientes
            </div>
            <div className="mt-1 text-xl font-black text-[#7a3d2c]">{totales.pendientes}</div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <div className="font-semibold text-[#5d433a]">
            {nombreArchivo ? `Archivo: ${nombreArchivo}` : "Todavia no has importado ningun Excel."}
          </div>

          {mensaje ? <div className="font-semibold text-[#2f6a39]">{mensaje}</div> : null}
          {error ? <div className="font-semibold text-[#8a2f2c]">{error}</div> : null}
        </div>
      </section>

      <section className="min-h-0 flex-1 overflow-hidden rounded-[18px] border border-[#d6c4b8] bg-[linear-gradient(180deg,#fffaf7_0%,#f3ebe6_100%)] shadow-[0_18px_36px_rgba(70,45,37,0.08)]">
        <div className="border-b border-[#e1cec4] px-4 py-2">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8b695d]">
            Tabla de apuntes bancarios
          </div>
        </div>

        <div className="h-full overflow-auto">
          <table className="min-w-[1680px] table-fixed border-collapse">
            <thead>
              <tr className="sticky top-0 z-10 bg-[#f7ece7] text-[10px] font-black uppercase tracking-[0.08em] text-[#8b695d]">
                <th className="border border-[#e4d3ca] px-2 py-2 text-left">Fecha</th>
                <th className="border border-[#e4d3ca] px-2 py-2 text-left">Fecha valor</th>
                <th className="border border-[#e4d3ca] px-2 py-2 text-left">Movimiento</th>
                <th className="border border-[#e4d3ca] px-2 py-2 text-left">Mas datos</th>
                <th className="border border-[#e4d3ca] px-2 py-2 text-right">Importe</th>
                <th className="border border-[#e4d3ca] px-2 py-2 text-left">Proveedor</th>
                <th className="border border-[#e4d3ca] px-2 py-2 text-left">Num factura</th>
                <th className="border border-[#e4d3ca] px-2 py-2 text-left">Observaciones</th>
                <th className="border border-[#e4d3ca] px-2 py-2 text-left">OK</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.length > 0 ? (
                movimientos.map((item) => (
                  <tr key={item.id} className="bg-white/75 text-sm text-[#4b312b]">
                    <td className="border border-[#ecdbd5] px-2 py-2 align-top">{item.fecha}</td>
                    <td className="border border-[#ecdbd5] px-2 py-2 align-top">{item.fechaValor}</td>
                    <td className="border border-[#ecdbd5] px-2 py-2 align-top">{item.movimiento}</td>
                    <td className="border border-[#ecdbd5] px-2 py-2 align-top">{item.masDatos}</td>
                    <td className="border border-[#ecdbd5] px-2 py-2 text-right align-top font-semibold">
                      {item.importe}
                    </td>
                    <td className="border border-[#ecdbd5] px-2 py-2 align-top">
                      <input
                        value={item.proveedor}
                        onChange={(e) =>
                          actualizarMovimiento(item.id, "proveedor", e.target.value)
                        }
                        className="w-full rounded-[8px] border border-[#dac4b8] bg-white px-2 py-1.5 text-sm outline-none"
                      />
                    </td>
                    <td className="border border-[#ecdbd5] px-2 py-2 align-top">
                      <input
                        value={item.numFactura}
                        onChange={(e) =>
                          actualizarMovimiento(item.id, "numFactura", e.target.value)
                        }
                        className="w-full rounded-[8px] border border-[#dac4b8] bg-white px-2 py-1.5 text-sm outline-none"
                      />
                    </td>
                    <td className="border border-[#ecdbd5] px-2 py-2 align-top">
                      <input
                        value={item.observaciones}
                        onChange={(e) =>
                          actualizarMovimiento(item.id, "observaciones", e.target.value)
                        }
                        className="w-full rounded-[8px] border border-[#dac4b8] bg-white px-2 py-1.5 text-sm outline-none"
                      />
                    </td>
                    <td className="border border-[#ecdbd5] px-2 py-2 align-top">
                      <select
                        value={item.ok}
                        onChange={(e) => actualizarMovimiento(item.id, "ok", e.target.value)}
                        className="w-full rounded-[8px] border border-[#dac4b8] bg-white px-2 py-1.5 text-sm font-semibold outline-none"
                      >
                        <option value="Pendiente">Pendiente</option>
                        <option value="OK">OK</option>
                      </select>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={9}
                    className="border border-[#ecdbd5] px-4 py-10 text-center text-sm font-semibold text-[#7b635c]"
                  >
                    Importa el Excel bancario para ver aqui la tabla de trabajo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
