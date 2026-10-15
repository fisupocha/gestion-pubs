import type { ConsultaState } from "@/modules/consultas/utils/estado-consultas";
import {
  etiquetaMes,
  formatearFechaInforme,
  type ResultadoDetalleMensual,
} from "@/modules/consultas/utils/detalle-mensual";
import {
  FAMILIA_CAJA,
  TIPO_INGRESOS,
  type FacturaDetalleLinea,
  type ResumenClasificacion,
} from "@/modules/consultas/utils/motor-consultas";

/**
 * Reorganiza el detalle que Consultas ya ha calculado.
 * No vuelve a prorratear, ni reparte meses, ni cambia importes.
 */

export type MovimientoInforme = {
  tipo: string;
  mes: string;
  mesEtiqueta: string;
  familia: string;
  subfamilia: string;
  movimiento: string;
  numero: string;
  contraparte: string;
  fecha: string;
  local: string;
  base: number;
  iva: number;
  importe: number;
  incluyeEnGasto: boolean;
  nota: string;
};

export type FilaResumenInforme = {
  tipo: string;
  mes: string;
  mesEtiqueta: string;
  familia: string;
  bruto: number;
  emitidas: number;
  neto: number;
  porcentaje: number;
  apartado: "Caja" | "Ingreso" | "Gasto";
};

export type InformeConsulta = {
  locales: string;
  desdeIso: string;
  hastaIso: string;
  desde: string;
  hasta: string;
  modoIva: "con" | "sin";
  modoIvaTexto: string;
  tipos: string;
  familias: string;
  subfamilias: string;
  caja: number;
  gasto: number;
  porcentaje: number;
  avisos: string[];
  resumen: FilaResumenInforme[];
  movimientos: MovimientoInforme[];
  sumaGastoDetalle: number;
  nombreBase: string;
};

function textoLista(values: string[]) {
  return values.length > 0 ? values.join(", ") : "Todos";
}

function slug(value: string) {
  const limpio = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (limpio || "consulta").slice(0, 48);
}

function fechaIso(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "sin-fecha";
}

function mesDeLinea(linea: FacturaDetalleLinea) {
  if (linea.mesImputacion && /^\d{4}-\d{2}$/.test(linea.mesImputacion)) return linea.mesImputacion;
  const match = /^(\d{4}-\d{2})-\d{2}$/.exec(linea.fecha);
  return match?.[1] ?? "";
}

function notaDe(linea: FacturaDetalleLinea, mes: string) {
  if (!mes || !linea.fecha || linea.fecha.startsWith(mes)) return "";
  return `Imputada a ${etiquetaMes(mes)}`;
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

function apartadoDe(tipo: string, familia: string): FilaResumenInforme["apartado"] {
  if (tipo === TIPO_INGRESOS && familia === FAMILIA_CAJA) return "Caja";
  if (tipo === TIPO_INGRESOS) return "Ingreso";
  return "Gasto";
}

function redondear(value: number) {
  return Math.round(value * 100) / 100;
}

function sumaCentesimas(values: number[]) {
  return redondear(values.reduce((acc, value) => acc + Math.round(value * 100), 0) / 100);
}

function esFilaCajaClasificada(row: ResumenClasificacion) {
  return row.tipo === TIPO_INGRESOS && row.familia === FAMILIA_CAJA;
}

function pushLinea(
  destino: MovimientoInforme[],
  row: { tipo: string; familia: string; subfamilia: string },
  linea: FacturaDetalleLinea,
  movimiento: string,
  signo: 1 | -1,
  incluyeEnGasto: boolean
) {
  const mes = mesDeLinea(linea);
  destino.push({
    tipo: row.tipo,
    mes,
    mesEtiqueta: mes ? etiquetaMes(mes) : "",
    familia: row.familia,
    subfamilia: row.subfamilia,
    movimiento,
    numero: linea.numeroFactura || "",
    contraparte: linea.contraparte || "",
    fecha: linea.fecha || "",
    local: linea.local || "",
    base: redondear(linea.base * signo),
    iva: redondear(linea.iva * signo),
    importe: redondear(linea.total * signo),
    incluyeEnGasto,
    nota: notaDe(linea, mes),
  });
}

export function construirInformeConsulta({
  state,
  locales,
  caja,
  gasto,
  porcentaje,
  avisosCalculo,
  avisosDetalle,
  avisoPersistencia,
  detalle,
  detalleClasificacion,
  cajasDetalle,
}: {
  state: ConsultaState;
  locales: string;
  caja: number;
  gasto: number;
  porcentaje: number;
  avisosCalculo: string[];
  avisosDetalle: string[];
  avisoPersistencia: string | null;
  detalle: ResultadoDetalleMensual;
  detalleClasificacion: ResumenClasificacion[];
  cajasDetalle: FacturaDetalleLinea[];
}): InformeConsulta {
  const movimientos: MovimientoInforme[] = [];

  detalleClasificacion.forEach((row) => {
    if (esFilaCajaClasificada(row)) return;
    const comunes = { tipo: row.tipo, familia: row.familia, subfamilia: row.subfamilia };
    row.recibidasDetalle.forEach((linea) => pushLinea(movimientos, comunes, linea, "Recibida", 1, true));
    row.alquileresDetalle.forEach((linea) => pushLinea(movimientos, comunes, linea, "Alquiler", 1, true));
    row.notasVariasDetalle.forEach((linea) => pushLinea(movimientos, comunes, linea, "Nota", 1, true));
    row.otrosDetalle.forEach((linea) => {
      const movimiento = movimientoDeOrigen(linea.origen);
      pushLinea(movimientos, comunes, linea, movimiento, 1, movimiento !== "Caja");
    });
    row.emitidasDetalle.forEach((linea) => {
      if (linea.esCompensatoria) {
        pushLinea(movimientos, comunes, linea, "Emitida compensatoria", -1, true);
        return;
      }
      pushLinea(movimientos, comunes, linea, "Emitida", 1, false);
    });
  });

  cajasDetalle.forEach((linea) => {
    pushLinea(
      movimientos,
      { tipo: TIPO_INGRESOS, familia: FAMILIA_CAJA, subfamilia: "" },
      linea,
      linea.esEmitidaCaja ? "Caja emitida" : "Caja",
      1,
      false
    );
  });

  const ordenTipo = new Map(detalle.tipos.map((tipo, index) => [tipo.tipo, index]));
  movimientos.sort((a, b) => {
    const tipo = (ordenTipo.get(a.tipo) ?? 99) - (ordenTipo.get(b.tipo) ?? 99);
    if (tipo !== 0) return tipo;
    if (a.mes !== b.mes) return a.mes.localeCompare(b.mes);
    const familia = a.familia.localeCompare(b.familia, "es");
    if (familia !== 0) return familia;
    const subfamilia = a.subfamilia.localeCompare(b.subfamilia, "es");
    if (subfamilia !== 0) return subfamilia;
    if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
    return a.numero.localeCompare(b.numero, "es");
  });

  const resumen: FilaResumenInforme[] = [];
  detalle.tipos.forEach((tipo) => {
    tipo.meses.forEach((mes) => {
      mes.familias.forEach((familia) => {
        const tieneImporte = familia.neto !== 0 || familia.bruto !== 0 || familia.emitidas !== 0;
        const tieneMovimientos = movimientos.some(
          (item) => item.tipo === tipo.tipo && item.mes === mes.clave && item.familia === familia.familia
        );
        if (!tieneImporte && !tieneMovimientos) return;
        resumen.push({
          tipo: tipo.tipo,
          mes: mes.clave,
          mesEtiqueta: mes.etiqueta,
          familia: familia.familia,
          bruto: familia.bruto,
          emitidas: familia.emitidas === 0 ? 0 : redondear(-familia.emitidas),
          neto: familia.neto,
          porcentaje: familia.porcentajeNeto,
          apartado: apartadoDe(tipo.tipo, familia.familia),
        });
      });
    });
  });

  const avisos = [...new Set([avisoPersistencia, ...avisosCalculo, ...avisosDetalle].filter(Boolean) as string[])];
  const modoIva = state.modoIva === "sin" ? "sin" : "con";
  const desdeIso = fechaIso(state.desde);
  const hastaIso = fechaIso(state.hasta);

  return {
    locales,
    desdeIso: state.desde && desdeIso !== "sin-fecha" ? state.desde : "",
    hastaIso: state.hasta && hastaIso !== "sin-fecha" ? state.hasta : "",
    desde: formatearFechaInforme(state.desde),
    hasta: formatearFechaInforme(state.hasta),
    modoIva,
    modoIvaTexto: modoIva === "sin" ? "Sin IVA" : "Con IVA",
    tipos: textoLista(state.tiposSeleccionados),
    familias: textoLista(state.familiasSeleccionadas),
    subfamilias: textoLista(state.subfamiliasSeleccionadas),
    caja,
    gasto,
    porcentaje,
    avisos,
    resumen,
    movimientos,
    sumaGastoDetalle: sumaCentesimas(
      movimientos.filter((item) => item.incluyeEnGasto).map((item) => item.importe)
    ),
    nombreBase: `consulta-${slug(locales)}-${desdeIso}-${hastaIso}-${modoIva === "sin" ? "sin-iva" : "con-iva"}`,
  };
}
