import * as XLSX from "xlsx";

/**
 * Lector del Excel que ya usaba Punteo banco. La pantalla nueva no lo llama.
 * La fecha principal es la columna "Fecha" (fecha de operación). "Fecha valor" queda aparte.
 */

export type EstadoOkAnterior = "Pendiente" | "OK";

export type MovimientoExcelAnterior = {
  id: string;
  fecha: string;
  fechaValor: string;
  movimiento: string;
  masDatos: string;
  importe: string;
  proveedor: string;
  numFactura: string;
  observaciones: string;
  ok: EstadoOkAnterior;
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
        ok: "Pendiente" as EstadoOkAnterior,
      };
    })
    .filter((item): item is MovimientoExcelAnterior => item !== null);
}

export function leerMovimientosExcelAnterior(buffer: ArrayBuffer) {
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

  return construirMovimientos(rows);
}
