"use client";

import Tesseract from "tesseract.js";

export type DatosFacturaDetectados = {
  proveedor?: string;
  fechaFactura?: string;
  numeroFactura?: string;
  base0?: string;
  base4?: string;
  base10?: string;
  base21?: string;
  formaPago?: string;
  banco?: string;
  numeroPagare?: string;
  observaciones?: string;
};

export type ResultadoLecturaAdjunto = {
  datos: DatosFacturaDetectados;
  textoExtraido: string;
  advertencias: string[];
};

type OpcionesLectura = {
  proveedores: string[];
  formasPago: string[];
  bancos: string[];
};

function normalizarTexto(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function limpiarEspacios(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function aImporteEs(value: number) {
  return value.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseImporte(value: string) {
  const limpio = value.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "");
  const normalizado = limpio.replace(",", ".");
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : null;
}

function convertirFechaIso(value: string) {
  const texto = value.trim();
  const iso = texto.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);

  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }

  const es = texto.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);

  if (es) {
    return `${es[3]}-${es[2]}-${es[1]}`;
  }

  return undefined;
}

function desescaparTextoPdf(value: string) {
  return value
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\n/g, " ")
    .replace(/\\r/g, " ")
    .replace(/\\t/g, " ")
    .replace(/\\([0-7]{1,3})/g, (_, octal: string) =>
      String.fromCharCode(parseInt(octal, 8))
    );
}

function extraerTextoPdf(buffer: ArrayBuffer) {
  const raw = new TextDecoder("latin1").decode(buffer);
  const fragmentos = Array.from(
    raw.matchAll(/\(([^()]*(?:\\.[^()]*)*)\)\s*Tj/g),
    (match) => desescaparTextoPdf(match[1])
  );

  for (const match of raw.matchAll(/\[([\s\S]*?)\]\s*TJ/g)) {
    const interno = match[1];
    for (const texto of interno.matchAll(/\(([^()]*(?:\\.[^()]*)*)\)/g)) {
      fragmentos.push(desescaparTextoPdf(texto[1]));
    }
  }

  return limpiarEspacios(fragmentos.join(" \n "));
}

async function extraerTextoAdjunto(file: File) {
  const nombre = file.name.toLowerCase();

  if (
    file.type.startsWith("text/") ||
    nombre.endsWith(".txt") ||
    nombre.endsWith(".csv")
  ) {
    return limpiarEspacios(await file.text());
  }

  if (file.type === "application/pdf" || nombre.endsWith(".pdf")) {
    return extraerTextoPdf(await file.arrayBuffer());
  }

  if (
    file.type.startsWith("image/") ||
    nombre.endsWith(".jpg") ||
    nombre.endsWith(".jpeg") ||
    nombre.endsWith(".png") ||
    nombre.endsWith(".webp")
  ) {
    const resultado = await Tesseract.recognize(file, "spa+eng");
    return limpiarEspacios(resultado.data.text);
  }

  return "";
}

function detectarPorLista(textoNormalizado: string, items: string[]) {
  return items.find((item) => textoNormalizado.includes(normalizarTexto(item)));
}

function detectarFecha(texto: string) {
  const match = texto.match(/\b(\d{2}[/-]\d{2}[/-]\d{4}|\d{4}[/-]\d{2}[/-]\d{2})\b/);
  return match ? convertirFechaIso(match[1]) : undefined;
}

function detectarNumeroFactura(texto: string) {
  const patrones = [
    /(?:FACTURA|FRA\.?|NUMERO\s+FACTURA|NUM\s+FACTURA|N[Uu]MERO\s+FACTURA|N[Oo#])\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-\/.]*)/i,
    /\b([A-Z]{1,4}-\d{1,8})\b/,
  ];

  for (const patron of patrones) {
    const match = texto.match(patron);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return undefined;
}

function detectarNumeroPagare(texto: string) {
  const match = texto.match(/(?:PAGARE|PAGARES?)\s*[:\-]?\s*([A-Z0-9\-\/.]*)/i);
  return match?.[1]?.trim() || undefined;
}

function detectarImporteTrasEtiqueta(texto: string, etiquetas: string[]) {
  for (const etiqueta of etiquetas) {
    const patron = new RegExp(
      `${etiqueta}\\s*[:\\-]?\\s*([\\d.]+,\\d{2}|\\d+,\\d{2}|\\d+\\.\\d{2})`,
      "i"
    );
    const match = texto.match(patron);
    const importe = match?.[1] ? parseImporte(match[1]) : null;

    if (importe !== null) {
      return importe;
    }
  }

  return null;
}

function detectarPorcentajeIva(textoNormalizado: string) {
  const porcentajes = [21, 10, 4, 0];
  const presentes = porcentajes.filter((porcentaje) =>
    textoNormalizado.includes(`${porcentaje}%`) ||
    textoNormalizado.includes(`IVA ${porcentaje}`) ||
    textoNormalizado.includes(`${porcentaje},00%`)
  );

  return presentes.length === 1 ? presentes[0] : null;
}

function detectarBasesDesdeTexto(texto: string, textoNormalizado: string, total: number | null) {
  const bases: Pick<DatosFacturaDetectados, "base0" | "base4" | "base10" | "base21"> = {};
  const etiquetasPorcentaje: Array<[0 | 4 | 10 | 21, string[]]> = [
    [0, ["BASE IVA 0%", "BASE 0%", "BASE IMPONIBLE 0%", "EXENTO"]],
    [4, ["BASE IVA 4%", "BASE 4%", "BASE IMPONIBLE 4%"]],
    [10, ["BASE IVA 10%", "BASE 10%", "BASE IMPONIBLE 10%"]],
    [21, ["BASE IVA 21%", "BASE 21%", "BASE IMPONIBLE 21%"]],
  ];

  for (const [porcentaje, etiquetas] of etiquetasPorcentaje) {
    const importe = detectarImporteTrasEtiqueta(texto, etiquetas);
    if (importe !== null) {
      bases[`base${porcentaje}` as keyof typeof bases] = aImporteEs(importe);
    }
  }

  if (!bases.base4 && !bases.base10 && !bases.base21 && total !== null) {
    const porcentaje = detectarPorcentajeIva(textoNormalizado);
    if (porcentaje === 4 || porcentaje === 10 || porcentaje === 21) {
      const base = total / (1 + porcentaje / 100);
      bases[`base${porcentaje}` as "base4" | "base10" | "base21"] = aImporteEs(base);
    }
  }

  return bases;
}

export async function leerFacturaAdjunta(
  file: File,
  opciones: OpcionesLectura
): Promise<ResultadoLecturaAdjunto> {
  const textoExtraido = await extraerTextoAdjunto(file);
  const advertencias: string[] = [];

  if (!textoExtraido) {
    advertencias.push(
      "No se ha podido leer el archivo. Esta version solo detecta PDFs con texto y ficheros de texto."
    );
    return {
      datos: {},
      textoExtraido: "",
      advertencias,
    };
  }

  const textoNormalizado = normalizarTexto(textoExtraido);
  const totalDetectado =
    detectarImporteTrasEtiqueta(textoExtraido, ["TOTAL FACTURA", "TOTAL", "IMPORTE TOTAL"]) ??
    detectarImporteTrasEtiqueta(textoExtraido, ["IMPORTE"]);

  const datos: DatosFacturaDetectados = {
    proveedor: detectarPorLista(textoNormalizado, opciones.proveedores),
    fechaFactura: detectarFecha(textoExtraido),
    numeroFactura: detectarNumeroFactura(textoExtraido),
    formaPago: detectarPorLista(textoNormalizado, opciones.formasPago),
    banco: detectarPorLista(textoNormalizado, opciones.bancos),
    numeroPagare: detectarNumeroPagare(textoExtraido),
  };

  Object.assign(datos, detectarBasesDesdeTexto(textoExtraido, textoNormalizado, totalDetectado));

  if (totalDetectado !== null && !datos.base4 && !datos.base10 && !datos.base21 && !datos.base0) {
    advertencias.push(
      `Se ha detectado un total de ${aImporteEs(totalDetectado)} EUR, pero no una base clara para rellenar.`
    );
  }

  if (!datos.proveedor) {
    advertencias.push("No se ha reconocido el proveedor automaticamente.");
  }

  if (!datos.fechaFactura) {
    advertencias.push("No se ha reconocido la fecha automaticamente.");
  }

  if (!datos.numeroFactura) {
    advertencias.push("No se ha reconocido el numero de factura automaticamente.");
  }

  return {
    datos,
    textoExtraido,
    advertencias,
  };
}
