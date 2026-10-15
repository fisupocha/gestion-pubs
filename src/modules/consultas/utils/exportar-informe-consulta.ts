import type { FacturaDetalleLinea } from "@/modules/consultas/utils/motor-consultas";
import {
  etiquetaMes,
  formatearFechaInforme,
  type FamiliaMensual,
  type ResultadoDetalleMensual,
} from "@/modules/consultas/utils/detalle-mensual";
import type { MovimientoInforme } from "@/modules/consultas/utils/informe-consulta";
import type { InformeConsulta } from "@/modules/consultas/utils/informe-consulta";

const FORMATO_IMPORTE = "#,##0.00";
const FORMATO_PORCENTAJE = "0.00";
const FORMATO_FECHA = "dd/mm/yyyy";

function csvTexto(value: string | number) {
  const text = String(value);
  if (/[;"\n]/.test(text)) return `"${text.replace(/"/g, "\"\"")}"`;
  return text;
}

export function csvNumero(value: number) {
  return value.toFixed(2).replace(".", ",");
}

function fechaVisible(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value || "";
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function serialExcel(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return "";
  const fecha = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const origen = Date.UTC(1899, 11, 30);
  return (fecha - origen) / 86400000;
}

export type FilaVisibleConsulta = {
  nivel: "Tipo" | "Mes" | "Familia" | "Subtotal" | "Movimiento";
  clase: string;
  tipo: string;
  mes: string;
  familia: string;
  grupo: string;
  subfamilia: string;
  movimiento: string;
  numero: string;
  contraparte: string;
  fecha: string;
  local: string;
  base: number | null;
  iva: number | null;
  importe: number | null;
  porcentaje: number | null;
  incluyeEnGasto: boolean;
  nota: string;
};

type VistaExportacion = {
  mesAbierto: (tipo: string, mes: string) => boolean;
  familiaAbierta: (tipo: string, mes: string, familia: string) => boolean;
};

function redondear(value: number) {
  return Math.round(value * 100) / 100;
}

function movimientoDeOrigen(origen: string | undefined) {
  switch (origen) {
    case "facturas-recibidas":
      return "Recibida";
    case "facturas-emitidas":
      return "Emitida";
    case "alquileres":
      return "Alquiler";
    case "notas-varias":
      return "Nota";
    case "personal":
      return "Personal";
    case "impuestos":
      return "Impuesto";
    case "gastos-bancarios":
      return "Gasto bancario";
    case "creditos":
      return "Credito";
    case "caja":
      return "Caja";
    default:
      return "Movimiento";
  }
}

function claveMovimiento(
  tipo: string,
  mes: string,
  familia: string,
  numero: string,
  fecha: string,
  contraparte: string,
  importe: number
) {
  return `${tipo}|${mes}|${familia}|${numero}|${fecha}|${contraparte}|${Math.abs(importe).toFixed(2)}`;
}

function notaDeLinea(linea: FacturaDetalleLinea, mes: string) {
  if (!mes || !linea.fecha || linea.fecha.startsWith(mes)) return "";
  return `Imputada a ${etiquetaMes(mes)}`;
}

function filaTotal(
  nivel: FilaVisibleConsulta["nivel"],
  clase: string,
  tipo: string,
  mes: string,
  familia: string,
  importe: number,
  porcentaje: number
): FilaVisibleConsulta {
  return {
    nivel,
    clase,
    tipo,
    mes,
    familia,
    grupo: "",
    subfamilia: "",
    movimiento: "",
    numero: "",
    contraparte: "",
    fecha: "",
    local: "",
    base: null,
    iva: null,
    importe,
    porcentaje,
    incluyeEnGasto: false,
    nota: "",
  };
}

function agregarMovimientosVisibles({
  filas,
  tipo,
  mesClave,
  mesEtiqueta,
  familia,
  grupo,
  lineas,
  movimientoFijo,
  signo,
  incluyeFijo,
  disponibles,
}: {
  filas: FilaVisibleConsulta[];
  tipo: string;
  mesClave: string;
  mesEtiqueta: string;
  familia: string;
  grupo: string;
  lineas: FacturaDetalleLinea[];
  movimientoFijo: string | null;
  signo: 1 | -1;
  incluyeFijo: boolean | null;
  disponibles: Map<string, MovimientoInforme[]>;
}) {
  lineas.forEach((linea) => {
    const movimiento = movimientoFijo ?? (linea.esEmitidaCaja ? "Caja emitida" : movimientoDeOrigen(linea.origen));
    const incluyeEnGasto = incluyeFijo ?? (movimiento !== "Caja" && movimiento !== "Caja emitida");
    const coincidencias = disponibles.get(
      claveMovimiento(tipo, mesClave, familia, linea.numeroFactura || "", linea.fecha || "", linea.contraparte || "", linea.total)
    );
    const conocido = coincidencias?.shift();
    filas.push({
      nivel: "Movimiento",
      clase: "Movimiento",
      tipo,
      mes: mesEtiqueta,
      familia,
      grupo,
      subfamilia: conocido?.subfamilia ?? "",
      movimiento: conocido?.movimiento ?? movimiento,
      numero: linea.numeroFactura || "",
      contraparte: linea.contraparte || "",
      fecha: linea.fecha || "",
      local: conocido?.local || linea.local || "",
      base: conocido?.base ?? redondear(linea.base * signo),
      iva: conocido?.iva ?? redondear(linea.iva * signo),
      importe: conocido?.importe ?? redondear(linea.total * signo),
      porcentaje: null,
      incluyeEnGasto: conocido?.incluyeEnGasto ?? incluyeEnGasto,
      nota: conocido?.nota ?? notaDeLinea(linea, mesClave),
    });
  });
}

export function filasVisiblesConsulta(
  informe: InformeConsulta,
  detalle: ResultadoDetalleMensual,
  vista: VistaExportacion
) {
  const disponibles = new Map<string, MovimientoInforme[]>();
  informe.movimientos.forEach((item) => {
    const clave = claveMovimiento(item.tipo, item.mes, item.familia, item.numero, item.fecha, item.contraparte, item.importe);
    const lista = disponibles.get(clave) ?? [];
    lista.push(item);
    disponibles.set(clave, lista);
  });

  const filas: FilaVisibleConsulta[] = [];
  detalle.tipos.forEach((tipo) => {
    filas.push(filaTotal("Tipo", "Tipo", tipo.tipo, "", "", tipo.total, tipo.porcentaje));
    tipo.meses.forEach((mes) => {
      filas.push(filaTotal("Mes", "Mes", tipo.tipo, mes.etiqueta, "", mes.total, mes.porcentaje));
      if (!vista.mesAbierto(tipo.tipo, mes.clave)) return;
      mes.familias.forEach((familia) => {
        filas.push(
          filaTotal("Familia", "Familia", tipo.tipo, mes.etiqueta, familia.familia, familia.neto, familia.porcentajeNeto)
        );
        if (!vista.familiaAbierta(tipo.tipo, mes.clave, familia.familia)) return;
        if (familia.bruto > 0) {
          filas.push(
            filaTotal(
              "Subtotal",
              "Total fras",
              tipo.tipo,
              mes.etiqueta,
              familia.familia,
              familia.bruto,
              familia.porcentajeBruto
            )
          );
        }
        if (familia.emitidas > 0) {
          filas.push(
            filaTotal(
              "Subtotal",
              "Total abonos",
              tipo.tipo,
              mes.etiqueta,
              familia.familia,
              redondear(-familia.emitidas),
              redondear(-familia.porcentajeEmitidas)
            )
          );
        }
        const contexto = {
          filas,
          tipo: tipo.tipo,
          mesClave: mes.clave,
          mesEtiqueta: mes.etiqueta,
          familia: familia.familia,
          disponibles,
        };
        agregarMovimientosVisibles({
          ...contexto,
          grupo: "Facturas recibidas",
          lineas: familia.recibidasDetalle,
          movimientoFijo: "Recibida",
          signo: 1,
          incluyeFijo: true,
        });
        agregarMovimientosVisibles({
          ...contexto,
          grupo: "Alquileres",
          lineas: familia.alquileresDetalle,
          movimientoFijo: "Alquiler",
          signo: 1,
          incluyeFijo: true,
        });
        agregarMovimientosVisibles({
          ...contexto,
          grupo: "Personal",
          lineas: familia.personalDetalle,
          movimientoFijo: null,
          signo: 1,
          incluyeFijo: null,
        });
        agregarMovimientosVisibles({
          ...contexto,
          grupo: "Impuestos",
          lineas: familia.impuestosDetalle,
          movimientoFijo: null,
          signo: 1,
          incluyeFijo: null,
        });
        agregarMovimientosVisibles({
          ...contexto,
          grupo: "Gastos bancarios",
          lineas: familia.gastosBancariosDetalle,
          movimientoFijo: null,
          signo: 1,
          incluyeFijo: null,
        });
        agregarMovimientosVisibles({
          ...contexto,
          grupo: "Creditos",
          lineas: familia.creditosDetalle,
          movimientoFijo: null,
          signo: 1,
          incluyeFijo: null,
        });
        agregarMovimientosVisibles({
          ...contexto,
          grupo: "Otros movimientos",
          lineas: familia.otrosDetalle,
          movimientoFijo: null,
          signo: 1,
          incluyeFijo: null,
        });
        agregarMovimientosVisibles({
          ...contexto,
          grupo: "Caja",
          lineas: familia.cajasDetalle,
          movimientoFijo: null,
          signo: 1,
          incluyeFijo: false,
        });
        agregarMovimientosVisibles({
          ...contexto,
          grupo: "Facturas emitidas",
          lineas: familia.emitidasDetalle.filter((linea) => !linea.esCompensatoria),
          movimientoFijo: "Emitida",
          signo: 1,
          incluyeFijo: false,
        });
        agregarMovimientosVisibles({
          ...contexto,
          grupo: "Facturas emitidas compensatorias",
          lineas: familia.emitidasDetalle.filter((linea) => linea.esCompensatoria),
          movimientoFijo: "Emitida compensatoria",
          signo: -1,
          incluyeFijo: true,
        });
        agregarMovimientosVisibles({
          ...contexto,
          grupo: "Notas varias",
          lineas: familia.notasVariasDetalle,
          movimientoFijo: "Nota",
          signo: 1,
          incluyeFijo: true,
        });
      });
    });
  });
  return filas;
}

const COLUMNAS_VISIBLES = [
  "Nivel",
  "Clase",
  "Tipo",
  "Mes",
  "Familia",
  "Grupo",
  "Subfamilia",
  "Movimiento",
  "Numero",
  "Contraparte",
  "Fecha",
  "Local",
  "Base",
  "IVA",
  "Importe",
  "Porcentaje",
  "Incluye en gasto",
  "Nota",
];

function numeroCsv(value: number | null) {
  return value === null ? "" : csvNumero(value);
}

export function textoCsvInforme(
  informe: InformeConsulta,
  detalle: ResultadoDetalleMensual,
  vista: VistaExportacion
) {
  const filas = filasVisiblesConsulta(informe, detalle, vista);
  const sumaVisible = redondear(
    filas.filter((fila) => fila.incluyeEnGasto && fila.importe !== null).reduce((acc, fila) => acc + (fila.importe ?? 0), 0)
  );
  const lineas: Array<Array<string | number>> = [
    ["Consulta detalle"],
    ["Locales", informe.locales],
    ["Desde", informe.desde],
    ["Hasta", informe.hasta],
    ["IVA", informe.modoIvaTexto],
    ["Tipos", informe.tipos],
    ["Familias", informe.familias],
    ["Subfamilias", informe.subfamilias],
    ["Caja total", csvNumero(informe.caja)],
    ["Gasto total", csvNumero(informe.gasto)],
    ["Porcentaje", csvNumero(informe.porcentaje)],
    ["Suma de movimientos desplegados incluidos en el gasto", csvNumero(sumaVisible)],
    [
      "Nota",
      "El gasto total es el calculado por Consultas y no cambia al abrir o cerrar apartados. La suma anterior solo incluye movimientos visibles. Las filas Tipo, Mes, Familia y Subtotal no se suman con los movimientos.",
    ],
  ];

  informe.avisos.forEach((aviso) => lineas.push(["Aviso", aviso]));
  lineas.push([]);
  lineas.push(COLUMNAS_VISIBLES);
  filas.forEach((fila) => {
    lineas.push([
      fila.nivel,
      fila.clase,
      fila.tipo,
      fila.mes,
      fila.familia,
      fila.grupo,
      fila.subfamilia,
      fila.movimiento,
      fila.numero,
      fila.contraparte,
      fechaVisible(fila.fecha),
      fila.local,
      numeroCsv(fila.base),
      numeroCsv(fila.iva),
      numeroCsv(fila.importe),
      numeroCsv(fila.porcentaje),
      fila.incluyeEnGasto ? "Sí" : "No",
      fila.nota,
    ]);
  });

  return `\uFEFF${lineas.map((row) => row.map((item) => csvTexto(item)).join(";")).join("\n")}`;
}

export function descargarCsvInforme(
  informe: InformeConsulta,
  detalle: ResultadoDetalleMensual,
  vista: VistaExportacion
) {
  const blob = new Blob([textoCsvInforme(informe, detalle, vista)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${informe.nombreBase}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

type LibroXlsx = {
  utils: {
    book_new: () => unknown;
    aoa_to_sheet: (data: unknown[][]) => HojaXlsx;
    book_append_sheet: (libro: unknown, hoja: HojaXlsx, nombre: string) => void;
    decode_range: (ref: string) => { s: { r: number; c: number }; e: { r: number; c: number } };
    encode_cell: (cell: { r: number; c: number }) => string;
    encode_range: (range: { s: { r: number; c: number }; e: { r: number; c: number } }) => string;
  };
  writeFile: (libro: unknown, nombre: string) => void;
};

type CeldaXlsx = { t?: string; v?: unknown; z?: string; f?: string };
type HojaXlsx = Record<string, unknown> & { "!ref"?: string; "!cols"?: Array<{ wch: number }>; "!autofilter"?: { ref: string } };

function aplicarFormato(
  hoja: HojaXlsx,
  xlsx: LibroXlsx,
  columnas: number[],
  formato: string,
  desde: number,
  hasta: number
) {
  for (let fila = desde; fila <= hasta; fila += 1) {
    columnas.forEach((columna) => {
      const item = hoja[xlsx.utils.encode_cell({ r: fila, c: columna })] as CeldaXlsx | undefined;
      if (item?.t === "n" || item?.f) item.z = formato;
    });
  }
}

export function crearLibroExcel(
  xlsx: LibroXlsx,
  informe: InformeConsulta,
  detalleMensual: ResultadoDetalleMensual,
  vista: VistaExportacion
) {
  const filas = filasVisiblesConsulta(informe, detalleMensual, vista);
  const resumen: unknown[][] = [
    ["Informe de consulta"],
    ["Locales", informe.locales],
    ["Desde", informe.desde],
    ["Hasta", informe.hasta],
    ["IVA", informe.modoIvaTexto],
    ["Tipos", informe.tipos],
    ["Familias", informe.familias],
    ["Subfamilias", informe.subfamilias],
    [],
    ["Caja total", informe.caja],
    ["Gasto total", informe.gasto],
    ["Porcentaje", informe.porcentaje],
    ["Suma de movimientos desplegados incluidos en el gasto", { t: "n", f: 'SUMIF(Detalle!Q:Q,"Sí",Detalle!O:O)' }],
    [
      "Nota",
      "Esta suma solo incluye los movimientos de familias abiertas dentro de meses abiertos. No sustituye al gasto total oficial cuando hay apartados cerrados. En Detalle, las filas Tipo, Mes, Familia y Subtotal no se suman con los movimientos.",
    ],
    [],
    ["Avisos"],
    ...informe.avisos.map((aviso) => [aviso]),
  ];

  const detalle: unknown[][] = [
    COLUMNAS_VISIBLES,
    ...filas.map((fila) => [
      fila.nivel,
      fila.clase,
      fila.tipo,
      fila.mes,
      fila.familia,
      fila.grupo,
      fila.subfamilia,
      fila.movimiento,
      fila.numero,
      fila.contraparte,
      fila.fecha ? serialExcel(fila.fecha) : "",
      fila.local,
      fila.base ?? "",
      fila.iva ?? "",
      fila.importe ?? "",
      fila.porcentaje ?? "",
      fila.incluyeEnGasto ? "Sí" : "No",
      fila.nota,
    ]),
  ];

  const libro = xlsx.utils.book_new();
  const hojaResumen = xlsx.utils.aoa_to_sheet(resumen);
  const hojaDetalle = xlsx.utils.aoa_to_sheet(detalle);
  hojaResumen["!cols"] = [42, 88].map((wch) => ({ wch }));
  hojaDetalle["!cols"] = [14, 22, 16, 16, 18, 28, 16, 22, 16, 36, 14, 14, 14, 14, 14, 12, 18, 28].map((wch) => ({ wch }));

  aplicarFormato(hojaResumen, xlsx, [1], FORMATO_IMPORTE, 9, 10);
  aplicarFormato(hojaResumen, xlsx, [1], FORMATO_PORCENTAJE, 11, 11);
  aplicarFormato(hojaResumen, xlsx, [1], FORMATO_IMPORTE, 12, 12);
  if (detalle.length > 1) {
    aplicarFormato(hojaDetalle, xlsx, [10], FORMATO_FECHA, 1, detalle.length - 1);
    aplicarFormato(hojaDetalle, xlsx, [12, 13, 14], FORMATO_IMPORTE, 1, detalle.length - 1);
    aplicarFormato(hojaDetalle, xlsx, [15], FORMATO_PORCENTAJE, 1, detalle.length - 1);
  }

  if (hojaDetalle["!ref"]) {
    const range = xlsx.utils.decode_range(hojaDetalle["!ref"]);
    hojaDetalle["!autofilter"] = { ref: xlsx.utils.encode_range({ s: { r: 0, c: 0 }, e: range.e }) };
  }

  xlsx.utils.book_append_sheet(libro, hojaResumen, "Resumen");
  xlsx.utils.book_append_sheet(libro, hojaDetalle, "Detalle");
  return libro;
}

export async function descargarExcelInforme(
  informe: InformeConsulta,
  detalle: ResultadoDetalleMensual,
  vista: VistaExportacion
) {
  const xlsx = (await import("xlsx")) as unknown as LibroXlsx;
  const libro = crearLibroExcel(xlsx, informe, detalle, vista);
  xlsx.writeFile(libro, `${informe.nombreBase}.xlsx`);
}

function euros(value: number) {
  return `${value.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`;
}

function porcentaje(value: number) {
  return `${value.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

const MESES_LARGOS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export type VistaPdfConsulta = {
  mesAbierto: (tipo: string, mes: string) => boolean;
  familiaAbierta: (tipo: string, mes: string, familia: string) => boolean;
};

export type BloquePdfConsulta =
  | { clase: "tipo"; texto: string; importe: number; porcentaje: number }
  | { clase: "aviso"; texto: string }
  | { clase: "mes"; texto: string; importe: number; porcentaje: number }
  | { clase: "familia"; texto: string; importe: number; porcentaje: number }
  | { clase: "fras"; importe: number; porcentaje: number }
  | { clase: "abonos"; importe: number; porcentaje: number }
  | { clase: "grupo"; texto: string }
  | { clase: "factura"; texto: string; importe: number };

function textoFechaFactura(linea: FacturaDetalleLinea) {
  const fecha = formatearFechaInforme(linea.fecha);
  if (!linea.mesImputacion || linea.fecha.startsWith(linea.mesImputacion)) return fecha;
  const indice = Number(linea.mesImputacion.slice(5, 7)) - 1;
  const nombre = MESES_LARGOS[indice];
  if (!nombre) return fecha;
  return `${fecha} · imputada a ${nombre} ${linea.mesImputacion.slice(0, 4)}`;
}

function textoFactura(linea: FacturaDetalleLinea) {
  return `${textoFechaFactura(linea)} | ${linea.contraparte} | ${euros(linea.total)}`;
}

function agregarFacturas(bloques: BloquePdfConsulta[], titulo: string, lineas: FacturaDetalleLinea[]) {
  if (lineas.length === 0) return;
  bloques.push({ clase: "grupo", texto: titulo });
  lineas.forEach((linea) => {
    bloques.push({ clase: "factura", texto: textoFactura(linea), importe: linea.total });
  });
}

function agregarFamiliaAbierta(bloques: BloquePdfConsulta[], familia: FamiliaMensual) {
  if (familia.bruto > 0) {
    bloques.push({ clase: "fras", importe: familia.bruto, porcentaje: familia.porcentajeBruto });
  }
  if (familia.emitidas > 0) {
    bloques.push({ clase: "abonos", importe: familia.emitidas, porcentaje: familia.porcentajeEmitidas });
  }
  agregarFacturas(bloques, "Facturas recibidas", familia.recibidasDetalle);
  agregarFacturas(bloques, "Alquileres", familia.alquileresDetalle);
  agregarFacturas(bloques, "Personal", familia.personalDetalle);
  agregarFacturas(bloques, "Impuestos", familia.impuestosDetalle);
  agregarFacturas(bloques, "Gastos bancarios", familia.gastosBancariosDetalle);
  agregarFacturas(bloques, "Creditos", familia.creditosDetalle);
  agregarFacturas(bloques, "Otros movimientos", familia.otrosDetalle);
  agregarFacturas(bloques, "Caja", familia.cajasDetalle);
  agregarFacturas(
    bloques,
    "Facturas emitidas",
    familia.emitidasDetalle.filter((linea) => !linea.esCompensatoria)
  );
  agregarFacturas(
    bloques,
    "Facturas emitidas compensatorias",
    familia.emitidasDetalle.filter((linea) => linea.esCompensatoria)
  );
  agregarFacturas(bloques, "Notas varias", familia.notasVariasDetalle);
}

export function bloquesPdfVisibles(detalle: ResultadoDetalleMensual, vista: VistaPdfConsulta) {
  const bloques: BloquePdfConsulta[] = [];
  detalle.tipos.forEach((tipo) => {
    bloques.push({
      clase: "tipo",
      texto: tipo.tipo.toLocaleUpperCase("es-ES"),
      importe: tipo.total,
      porcentaje: tipo.porcentaje,
    });
    tipo.avisos.forEach((aviso) => bloques.push({ clase: "aviso", texto: aviso }));
    tipo.meses.forEach((mes) => {
      bloques.push({
        clase: "mes",
        texto: mes.etiqueta,
        importe: mes.total,
        porcentaje: mes.porcentaje,
      });
      if (!vista.mesAbierto(tipo.tipo, mes.clave)) return;
      mes.familias.forEach((familia) => {
        bloques.push({
          clase: "familia",
          texto: familia.familia,
          importe: familia.neto,
          porcentaje: familia.porcentajeNeto,
        });
        if (!vista.familiaAbierta(tipo.tipo, mes.clave, familia.familia)) return;
        agregarFamiliaAbierta(bloques, familia);
      });
    });
  });
  return bloques;
}

export async function crearPdfInforme(
  informe: InformeConsulta,
  detalle: ResultadoDetalleMensual,
  vista: VistaPdfConsulta
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margen = 12;
  const ancho = 210 - margen * 2;
  const limite = 297 - 16;
  const izquierda = margen;
  const derechaImporte = margen + ancho - 24;
  const derechaPorcentaje = margen + ancho;
  let cursor = margen;

  const fondo = () => {
    doc.setFillColor(255, 253, 250);
    doc.rect(0, 0, 210, 297, "F");
  };

  const nuevaPagina = () => {
    doc.addPage();
    fondo();
    cursor = margen;
  };

  const reservar = (alto: number) => {
    if (cursor + alto > limite) nuevaPagina();
  };

  const derecha = (texto: string, x: number, y: number) => {
    doc.text(texto, x - doc.getTextWidth(texto), y);
  };

  fondo();
  doc.setTextColor(138, 100, 88);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("CONSULTA DETALLE", 105, cursor + 4, { align: "center" });
  cursor += 6;
  doc.setTextColor(61, 39, 33);
  doc.setFontSize(18);
  doc.text("Informe de consulta", 105, cursor + 6, { align: "center" });
  cursor += 8;
  doc.setFontSize(8);
  doc.setTextColor(138, 100, 88);
  doc.text(informe.modoIvaTexto.toLocaleUpperCase("es-ES"), 105, cursor + 3, { align: "center" });
  cursor += 7;

  const tarjetas = [
    ["LOCALES", informe.locales],
    ["DESDE", informe.desde],
    ["HASTA", informe.hasta],
    ["CAJA", euros(informe.caja)],
  ];
  const hueco = 2;
  const anchoTarjeta = (ancho - hueco * 3) / 4;
  reservar(18);
  tarjetas.forEach((tarjeta, indice) => {
    const x = izquierda + indice * (anchoTarjeta + hueco);
    doc.setDrawColor(231, 213, 206);
    doc.setFillColor(255, 250, 247);
    doc.roundedRect(x, cursor, anchoTarjeta, 16, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(138, 100, 88);
    doc.text(tarjeta[0], x + anchoTarjeta / 2, cursor + 5, { align: "center" });
    doc.setFontSize(8);
    doc.setTextColor(70, 47, 40);
    const valor = doc.splitTextToSize(tarjeta[1], anchoTarjeta - 3);
    doc.text(valor.slice(0, 2), x + anchoTarjeta / 2, cursor + 10, { align: "center" });
  });
  cursor += 20;

  reservar(6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(138, 100, 88);
  doc.text("TIPOS, MESES Y FAMILIAS", izquierda, cursor + 3);
  cursor += 7;

  const avisosDeTipo = new Set(detalle.tipos.flatMap((tipo) => tipo.avisos));
  const avisosGenerales = informe.avisos.filter((aviso) => !avisosDeTipo.has(aviso));
  if (avisosGenerales.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(138, 81, 68);
    avisosGenerales.forEach((aviso) => {
      const lineas = doc.splitTextToSize(aviso, ancho);
      const alto = lineas.length * 3.4 + 1.5;
      reservar(alto);
      doc.text(lineas, izquierda, cursor + 3);
      cursor += alto;
    });
    cursor += 2;
  }

  const bloques = bloquesPdfVisibles(detalle, vista);
  bloques.forEach((bloque) => {
    if (bloque.clase === "tipo") {
      reservar(9);
      doc.setFillColor(243, 231, 224);
      doc.rect(izquierda, cursor, ancho, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(110, 74, 64);
      doc.text(bloque.texto, izquierda + 3, cursor + 5.3);
      doc.setTextColor(67, 44, 38);
      derecha(euros(bloque.importe), derechaImporte, cursor + 5.3);
      doc.setFontSize(8);
      doc.setTextColor(138, 81, 68);
      derecha(porcentaje(bloque.porcentaje), derechaPorcentaje, cursor + 5.3);
      cursor += 8;
      return;
    }
    if (bloque.clase === "aviso") {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(138, 81, 68);
      const lineas = doc.splitTextToSize(bloque.texto, ancho - 6);
      const alto = lineas.length * 3.2 + 2;
      reservar(alto);
      doc.text(lineas, izquierda + 3, cursor + 3.2);
      cursor += alto;
      return;
    }
    if (bloque.clase === "mes") {
      reservar(8);
      doc.setFillColor(252, 246, 243);
      doc.rect(izquierda, cursor, ancho, 7.2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(122, 86, 76);
      doc.text(bloque.texto, izquierda + 6, cursor + 4.8);
      doc.setTextColor(67, 44, 38);
      derecha(euros(bloque.importe), derechaImporte, cursor + 4.8);
      doc.setTextColor(138, 100, 88);
      derecha(porcentaje(bloque.porcentaje), derechaPorcentaje, cursor + 4.8);
      cursor += 7.2;
      return;
    }
    if (bloque.clase === "familia") {
      reservar(7);
      doc.setDrawColor(240, 227, 222);
      doc.line(izquierda, cursor + 6.6, izquierda + ancho, cursor + 6.6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(96, 69, 61);
      doc.text(bloque.texto, izquierda + 12, cursor + 4.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(67, 44, 38);
      derecha(euros(bloque.importe), derechaImporte, cursor + 4.5);
      doc.setTextColor(138, 100, 88);
      derecha(porcentaje(bloque.porcentaje), derechaPorcentaje, cursor + 4.5);
      cursor += 6.6;
      return;
    }
    if (bloque.clase === "fras" || bloque.clase === "abonos") {
      reservar(5);
      const negativo = bloque.clase === "abonos";
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(negativo ? 155 : 138, negativo ? 109 : 112, negativo ? 96 : 103);
      doc.text(negativo ? "Total abonos" : "Total fras", izquierda + 16, cursor + 3.4);
      doc.setTextColor(negativo ? 139 : 107, negativo ? 67 : 84, negativo ? 52 : 77);
      derecha(`${negativo ? "-" : ""}${euros(bloque.importe)}`, derechaImporte, cursor + 3.4);
      derecha(`${negativo ? "-" : ""}${porcentaje(bloque.porcentaje)}`, derechaPorcentaje, cursor + 3.4);
      cursor += 4.8;
      return;
    }
    if (bloque.clase === "grupo") {
      reservar(5);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(138, 112, 103);
      doc.text(bloque.texto.toLocaleUpperCase("es-ES"), izquierda + 16, cursor + 3.4);
      cursor += 4.4;
      return;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(125, 100, 92);
    const lineas = doc.splitTextToSize(bloque.texto, ancho - 28);
    const alto = lineas.length * 3.2 + 1.2;
    reservar(alto);
    doc.setDrawColor(229, 210, 203);
    doc.line(izquierda + 18, cursor + 0.6, izquierda + 18, cursor + alto - 0.8);
    doc.line(izquierda + 18, cursor + alto - 1.4, izquierda + 20.2, cursor + alto - 1.4);
    doc.text(lineas, izquierda + 22, cursor + 3.1);
    cursor += alto;
  });

  cursor += 4;
  reservar(22);
  const pies = [
    ["CAJA TOTAL", euros(informe.caja), false],
    ["GASTO TOTAL", euros(informe.gasto), false],
    ["%", porcentaje(informe.porcentaje), true],
  ] as const;
  const anchoPie = (ancho - 4) / 3;
  pies.forEach((pie, indice) => {
    const x = izquierda + indice * (anchoPie + 2);
    if (pie[2]) {
      doc.setFillColor(242, 216, 207);
      doc.setDrawColor(185, 121, 109);
    } else {
      doc.setFillColor(255, 250, 247);
      doc.setDrawColor(226, 207, 200);
    }
    doc.roundedRect(x, cursor, anchoPie, 18, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(pie[2] ? 136 : 138, pie[2] ? 75 : 100, pie[2] ? 61 : 88);
    doc.text(pie[0], x + anchoPie / 2, cursor + 6, { align: "center" });
    doc.setFontSize(11);
    doc.setTextColor(pie[2] ? 107 : 67, pie[2] ? 48 : 44, pie[2] ? 34 : 38);
    doc.text(pie[1], x + anchoPie / 2, cursor + 13, { align: "center" });
  });

  const paginas = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina += 1) {
    doc.setPage(pagina);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(138, 100, 88);
    doc.text(`Página ${pagina} de ${paginas}`, 210 - margen, 291, { align: "right" });
  }

  return doc;
}

export async function descargarPdfInforme(
  informe: InformeConsulta,
  detalle: ResultadoDetalleMensual,
  vista: VistaPdfConsulta
) {
  const doc = await crearPdfInforme(informe, detalle, vista);
  doc.save(`${informe.nombreBase}.pdf`);
}
