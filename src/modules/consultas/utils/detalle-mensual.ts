import type { ClasificacionMapa } from "@/lib/clasificacion";
import type { FacturaDetalleLinea, ResumenClasificacion } from "@/modules/consultas/utils/motor-consultas";
import {
  FAMILIA_CAJA,
  TIPO_INGRESOS,
  obtenerFamiliaIngresosEmitidasVisible,
  obtenerFamiliasPorTipoConsulta,
  obtenerTiposDisponibles,
} from "@/modules/consultas/utils/motor-consultas";

/**
 * Asignación mensual:
 * cada línea usa su mes de imputación. Si no tiene, usa el mes de su fecha.
 * El importe ya viene calculado con la caja de ese mes. Sumar meses no recalcula porcentajes.
 * Una diferencia de céntimos se avisa y no se mueve a otro mes.
 */

const NOMBRES_MES = [
  "ENERO",
  "FEBRERO",
  "MARZO",
  "ABRIL",
  "MAYO",
  "JUNIO",
  "JULIO",
  "AGOSTO",
  "SEPTIEMBRE",
  "OCTUBRE",
  "NOVIEMBRE",
  "DICIEMBRE",
];

export type GrupoLineaDetalle =
  | "recibidas"
  | "alquileres"
  | "notas"
  | "personal"
  | "impuestos"
  | "gastosBancarios"
  | "creditos"
  | "otros"
  | "cajas"
  | "emitidas"
  | "emitidasCompensatorias";

export type FamiliaMensual = {
  familia: string;
  bruto: number;
  emitidas: number;
  neto: number;
  porcentajeBruto: number;
  porcentajeEmitidas: number;
  porcentajeNeto: number;
  recibidasDetalle: FacturaDetalleLinea[];
  emitidasDetalle: FacturaDetalleLinea[];
  alquileresDetalle: FacturaDetalleLinea[];
  notasVariasDetalle: FacturaDetalleLinea[];
  personalDetalle: FacturaDetalleLinea[];
  impuestosDetalle: FacturaDetalleLinea[];
  gastosBancariosDetalle: FacturaDetalleLinea[];
  creditosDetalle: FacturaDetalleLinea[];
  otrosDetalle: FacturaDetalleLinea[];
  cajasDetalle: FacturaDetalleLinea[];
};

export type MesMensual = {
  clave: string;
  etiqueta: string;
  total: number;
  porcentaje: number;
  familias: FamiliaMensual[];
};

export type TipoMensual = {
  tipo: string;
  total: number;
  porcentaje: number;
  meses: MesMensual[];
  avisos: string[];
};

export type ResultadoDetalleMensual = {
  tipos: TipoMensual[];
  avisos: string[];
};

type Aporte = {
  mes: string;
  linea: FacturaDetalleLinea;
  brutoCents: number;
  emitidasCents: number;
  grupo: GrupoLineaDetalle;
};

type BucketMes = {
  brutoCents: number;
  emitidasCents: number;
  aportes: Aporte[];
};

type OficialFamilia = {
  familia: string;
  bruto: number;
  emitidas: number;
  neto: number;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function toCents(value: number) {
  return Math.round(value * 100);
}

function fromCents(cents: number) {
  return cents / 100;
}

function porcentajeSobreCaja(importe: number, cajaUsada: number) {
  return cajaUsada > 0 ? round2((importe / cajaUsada) * 100) : 0;
}

export function formatearFechaInforme(value: string) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

export function etiquetaMes(clave: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(clave);
  if (!match) return clave;
  const indice = Number(match[2]) - 1;
  if (indice < 0 || indice > 11) return clave;
  return `${NOMBRES_MES[indice]} ${match[1]}`;
}

export function mesDeFecha(fecha: string) {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(fecha);
  return match ? `${match[1]}-${match[2]}` : null;
}

function ordenarLineas(lineas: FacturaDetalleLinea[]) {
  return [...lineas].sort((a, b) => {
    if (a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha);
    return b.movimientoId.localeCompare(a.movimientoId);
  });
}

function compararTexto(a: string, b: string) {
  return a.localeCompare(b, "es", { sensitivity: "base" });
}

function esFilaCajaMostrada(row: Pick<ResumenClasificacion, "tipo" | "familia">) {
  return row.tipo === TIPO_INGRESOS && row.familia === FAMILIA_CAJA;
}

function grupoGasto(origen: string | undefined): GrupoLineaDetalle {
  switch (origen) {
    case "facturas-recibidas":
      return "recibidas";
    case "alquileres":
      return "alquileres";
    case "notas-varias":
      return "notas";
    case "personal":
      return "personal";
    case "impuestos":
      return "impuestos";
    case "gastos-bancarios":
      return "gastosBancarios";
    case "creditos":
      return "creditos";
    case "caja":
      return "cajas";
    case "facturas-emitidas":
      return "emitidas";
    default:
      return "otros";
  }
}

function etiquetaGrupo(grupo: GrupoLineaDetalle) {
  switch (grupo) {
    case "recibidas":
      return "Recibida";
    case "emitidas":
      return "Emitida";
    case "emitidasCompensatorias":
      return "Emitida compensatoria";
    case "alquileres":
      return "Alquiler";
    case "notas":
      return "Nota";
    case "personal":
      return "Personal";
    case "impuestos":
      return "Impuesto";
    case "gastosBancarios":
      return "Gasto bancario";
    case "creditos":
      return "Credito";
    case "cajas":
      return "Caja";
    default:
      return "Movimiento";
  }
}

function familiasBaseDelTipo(
  clasificacion: ClasificacionMapa,
  tipo: string,
  familiasSeleccionadas: string[],
  familiaIngresosEmitidasVisible: string | null
) {
  let familiasBase =
    familiasSeleccionadas.length > 0
      ? familiasSeleccionadas.filter((familia) =>
          obtenerFamiliasPorTipoConsulta(clasificacion, tipo).includes(familia)
        )
      : obtenerFamiliasPorTipoConsulta(clasificacion, tipo);

  if (tipo === TIPO_INGRESOS) {
    familiasBase = [...new Set([...familiasBase, FAMILIA_CAJA])];
    if (familiaIngresosEmitidasVisible) {
      familiasBase = [...new Set([...familiasBase, familiaIngresosEmitidasVisible])];
    }
  }

  return [...new Set(familiasBase)].sort(compararTexto);
}

function oficialesDelTipo(
  tipo: string,
  familiasBase: string[],
  detalleClasificacion: ResumenClasificacion[],
  cajaUsada: number
) {
  const familiaMap = new Map<string, { bruto: number; emitidas: number; neto: number }>();

  detalleClasificacion.forEach((row) => {
    if (row.tipo !== tipo) return;
    const key = row.familia;
    const actual = familiaMap.get(key) ?? { bruto: 0, emitidas: 0, neto: 0 };
    familiaMap.set(key, {
      bruto: round2(actual.bruto + row.gastoBruto),
      emitidas: round2(actual.emitidas + row.emitidas),
      neto: round2(actual.neto + row.gastoNeto),
    });
  });

  return familiasBase.map((familia) => {
    const resumen = familiaMap.get(familia) ?? { bruto: 0, emitidas: 0, neto: 0 };
    if (tipo === TIPO_INGRESOS && familia === FAMILIA_CAJA) {
      resumen.bruto = cajaUsada;
      resumen.neto = cajaUsada;
    }
    return {
      familia,
      bruto: resumen.bruto,
      emitidas: resumen.emitidas,
      neto: resumen.neto,
    } satisfies OficialFamilia;
  });
}

function lineasDelGrupo(aportes: Aporte[], grupo: GrupoLineaDetalle) {
  return ordenarLineas(aportes.filter((aporte) => aporte.grupo === grupo).map((aporte) => aporte.linea));
}

function familiaDesdeBucket(bucket: BucketMes, familia: string, cajaUsada: number): FamiliaMensual {
  const netoCents = bucket.brutoCents - bucket.emitidasCents;
  const bruto = fromCents(bucket.brutoCents);
  const emitidas = fromCents(bucket.emitidasCents);
  const neto = fromCents(netoCents);

  return {
    familia,
    bruto,
    emitidas,
    neto,
    porcentajeBruto: porcentajeSobreCaja(bruto, cajaUsada),
    porcentajeEmitidas: porcentajeSobreCaja(emitidas, cajaUsada),
    porcentajeNeto: porcentajeSobreCaja(neto, cajaUsada),
    recibidasDetalle: lineasDelGrupo(bucket.aportes, "recibidas"),
    emitidasDetalle: [
      ...lineasDelGrupo(bucket.aportes, "emitidas"),
      ...lineasDelGrupo(bucket.aportes, "emitidasCompensatorias"),
    ],
    alquileresDetalle: lineasDelGrupo(bucket.aportes, "alquileres"),
    notasVariasDetalle: lineasDelGrupo(bucket.aportes, "notas"),
    personalDetalle: lineasDelGrupo(bucket.aportes, "personal"),
    impuestosDetalle: lineasDelGrupo(bucket.aportes, "impuestos"),
    gastosBancariosDetalle: lineasDelGrupo(bucket.aportes, "gastosBancarios"),
    creditosDetalle: lineasDelGrupo(bucket.aportes, "creditos"),
    otrosDetalle: lineasDelGrupo(bucket.aportes, "otros"),
    cajasDetalle: lineasDelGrupo(bucket.aportes, "cajas"),
  };
}

export function familiaTieneMovimientos(familia: FamiliaMensual) {
  return (
    familia.recibidasDetalle.length > 0 ||
    familia.emitidasDetalle.length > 0 ||
    familia.alquileresDetalle.length > 0 ||
    familia.notasVariasDetalle.length > 0 ||
    familia.personalDetalle.length > 0 ||
    familia.impuestosDetalle.length > 0 ||
    familia.gastosBancariosDetalle.length > 0 ||
    familia.creditosDetalle.length > 0 ||
    familia.otrosDetalle.length > 0 ||
    familia.cajasDetalle.length > 0
  );
}

export function construirDetalleMensual({
  clasificacion,
  detalleClasificacion,
  cajasDetalle,
  cajaUsada,
  tiposSeleccionados,
  familiasSeleccionadas,
}: {
  clasificacion: ClasificacionMapa;
  detalleClasificacion: ResumenClasificacion[];
  cajasDetalle: FacturaDetalleLinea[];
  cajaUsada: number;
  tiposSeleccionados: string[];
  familiasSeleccionadas: string[];
}): ResultadoDetalleMensual {
  const avisosGlobales: string[] = [];
  const familiaIngresosEmitidasVisible = obtenerFamiliaIngresosEmitidasVisible(clasificacion);
  const tiposBase =
    tiposSeleccionados.length > 0 ? tiposSeleccionados : obtenerTiposDisponibles(clasificacion);
  const tiposOrdenados = [...new Set(tiposBase)].sort(compararTexto);

  const filasCajaClasificada = detalleClasificacion.filter((row) => esFilaCajaMostrada(row));
  const netoCajaClasificado = round2(
    filasCajaClasificada.reduce((acc, row) => acc + row.gastoNeto, 0)
  );
  const cajaClasificadaConLineas = filasCajaClasificada.some(
    (row) =>
      row.recibidasDetalle.length +
        row.emitidasDetalle.length +
        row.alquileresDetalle.length +
        row.notasVariasDetalle.length +
        row.otrosDetalle.length >
      0
  );
  if (Math.abs(netoCajaClasificado) >= 0.01 || cajaClasificadaConLineas) {
    avisosGlobales.push(
      "Hay movimientos clasificados como Ingresos / Caja que no son la caja del periodo. El total de Caja sigue siendo la caja consultada y esos movimientos no se reparten en un mes inventado."
    );
  }

  const tipos = tiposOrdenados.map((tipo) => {
    const avisos: string[] = [];
    const familiasOficiales = oficialesDelTipo(
      tipo,
      familiasBaseDelTipo(clasificacion, tipo, familiasSeleccionadas, familiaIngresosEmitidasVisible),
      detalleClasificacion,
      cajaUsada
    );
    const total = round2(familiasOficiales.reduce((acc, item) => acc + item.neto, 0));
    const aportesPorFamilia = new Map<string, Aporte[]>();
    const huerfanosPorFamilia = new Map<string, number>();

    const guardar = (
      familia: string,
      linea: FacturaDetalleLinea,
      rol: "bruto" | "emitida",
      grupo: GrupoLineaDetalle
    ) => {
      const cents = toCents(linea.total);
      const mes = linea.mesImputacion || mesDeFecha(linea.fecha);
      if (!mes) {
        const signo = rol === "emitida" ? -cents : cents;
        huerfanosPorFamilia.set(familia, (huerfanosPorFamilia.get(familia) ?? 0) + signo);
        return;
      }
      const aporte: Aporte = {
        mes,
        linea,
        brutoCents: rol === "bruto" ? cents : 0,
        emitidasCents: rol === "emitida" ? cents : 0,
        grupo,
      };
      const lista = aportesPorFamilia.get(familia) ?? [];
      lista.push(aporte);
      aportesPorFamilia.set(familia, lista);
    };

    if (tipo === TIPO_INGRESOS) {
      cajasDetalle.forEach((linea) => guardar(FAMILIA_CAJA, linea, "bruto", "cajas"));
    }

    detalleClasificacion.forEach((row) => {
      if (row.tipo !== tipo || esFilaCajaMostrada(row)) return;
      row.recibidasDetalle.forEach((linea) => guardar(row.familia, linea, "bruto", "recibidas"));
      row.alquileresDetalle.forEach((linea) => guardar(row.familia, linea, "bruto", "alquileres"));
      row.notasVariasDetalle.forEach((linea) => guardar(row.familia, linea, "bruto", "notas"));
      row.otrosDetalle.forEach((linea) =>
        guardar(row.familia, linea, "bruto", grupoGasto(linea.origen))
      );
      row.emitidasDetalle.forEach((linea) => {
        if (linea.esCompensatoria) {
          guardar(row.familia, linea, "emitida", "emitidasCompensatorias");
          return;
        }
        guardar(row.familia, linea, "bruto", "emitidas");
      });
    });

    const bucketsPorMes = new Map<string, Map<string, BucketMes>>();

    familiasOficiales.forEach((oficial) => {
      const aportes = aportesPorFamilia.get(oficial.familia) ?? [];
      const huerfano = huerfanosPorFamilia.get(oficial.familia) ?? 0;
      const porMes = new Map<string, Aporte[]>();
      aportes.forEach((aporte) => {
        const lista = porMes.get(aporte.mes) ?? [];
        lista.push(aporte);
        porMes.set(aporte.mes, lista);
      });
      const meses = [...porMes.keys()].sort();
      if (meses.length === 0) {
        if (toCents(oficial.neto) !== 0 || huerfano !== 0) {
          avisos.push(
            `${tipo} / ${oficial.familia} tiene ${oficial.neto.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR sin una fecha mensual utilizable. No se ha repartido ese importe.`
          );
        }
        return;
      }

      const buckets = meses.map((mes) => {
        const lista = porMes.get(mes) ?? [];
        return {
          mes,
          brutoCents: lista.reduce((acc, aporte) => acc + aporte.brutoCents, 0),
          emitidasCents: lista.reduce((acc, aporte) => acc + aporte.emitidasCents, 0),
          aportes: lista,
        };
      });
      const suma = buckets.reduce((acc, bucket) => acc + bucket.brutoCents - bucket.emitidasCents, 0);
      const delta = toCents(oficial.neto) - suma;

      if (huerfano !== 0) {
        avisos.push(
          `${tipo} / ${oficial.familia} tiene movimientos sin fecha YYYY-MM-DD. Su mes no se ha inventado.`
        );
      } else if (delta !== 0) {
        avisos.push(
          `${tipo} / ${oficial.familia} no cuadra por meses: diferencia de ${fromCents(delta).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR. No se ha movido ese importe a otro mes.`
        );
      }

      buckets.forEach((bucket) => {
        const familias = bucketsPorMes.get(bucket.mes) ?? new Map<string, BucketMes>();
        familias.set(oficial.familia, bucket);
        bucketsPorMes.set(bucket.mes, familias);
      });
    });

    const mesesBase = [...bucketsPorMes.keys()].sort().map((clave) => {
      const familias = [...(bucketsPorMes.get(clave)?.entries() ?? [])]
        .sort((a, b) => compararTexto(a[0], b[0]))
        .map(([familia, bucket]) => ({ familia, bucket }));
      return { clave, familias };
    });

    const sumaMeses = mesesBase.reduce(
      (acc, mes) =>
        acc + mes.familias.reduce((totalMes, item) => totalMes + item.bucket.brutoCents - item.bucket.emitidasCents, 0),
      0
    );
    const deltaTipo = toCents(total) - sumaMeses;

    if (deltaTipo !== 0 && avisos.length === 0) {
      avisos.push(
        `${tipo} no cuadra la suma de sus meses con el total del periodo (${fromCents(deltaTipo).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR). No se ha movido ese importe a otro mes.`
      );
    }

    const meses = mesesBase.map((mes) => {
      const familias = mes.familias.map((item) =>
        familiaDesdeBucket(item.bucket, item.familia, cajaUsada)
      );
      const totalMes = fromCents(
        mes.familias.reduce((acc, item) => acc + item.bucket.brutoCents - item.bucket.emitidasCents, 0)
      );
      return {
        clave: mes.clave,
        etiqueta: etiquetaMes(mes.clave),
        total: totalMes,
        porcentaje: porcentajeSobreCaja(totalMes, cajaUsada),
        familias,
      } satisfies MesMensual;
    });

    return {
      tipo,
      total,
      porcentaje: porcentajeSobreCaja(total, cajaUsada),
      meses,
      avisos,
    } satisfies TipoMensual;
  });

  return { tipos, avisos: avisosGlobales };
}

export function filasCuerpoMensual(tipos: TipoMensual[]) {
  return tipos.flatMap((bloque) => [
    [bloque.tipo, "", "", bloque.total, bloque.porcentaje],
    ...bloque.meses.flatMap((mes) => [
      [`  ${mes.etiqueta}`, "", "", mes.total, mes.porcentaje],
      ...mes.familias.flatMap((familia) => [
        [
          `    ${familia.familia}`,
          familia.bruto,
          familia.emitidas ? -familia.emitidas : 0,
          familia.neto,
          familia.porcentajeNeto,
        ],
        ...filasMovimientos(familia),
      ]),
    ]),
  ]);
}

function filasMovimientos(familia: FamiliaMensual) {
  const grupos: Array<[GrupoLineaDetalle, FacturaDetalleLinea[], "bruto" | "emitida"]> = [
    ["recibidas", familia.recibidasDetalle, "bruto"],
    ["alquileres", familia.alquileresDetalle, "bruto"],
    ["personal", familia.personalDetalle, "bruto"],
    ["impuestos", familia.impuestosDetalle, "bruto"],
    ["gastosBancarios", familia.gastosBancariosDetalle, "bruto"],
    ["creditos", familia.creditosDetalle, "bruto"],
    ["otros", familia.otrosDetalle, "bruto"],
    ["cajas", familia.cajasDetalle, "bruto"],
    ["notas", familia.notasVariasDetalle, "bruto"],
    ["emitidas", familia.emitidasDetalle.filter((linea) => !linea.esCompensatoria), "bruto"],
    ["emitidasCompensatorias", familia.emitidasDetalle.filter((linea) => linea.esCompensatoria), "emitida"],
  ];

  return grupos.flatMap(([grupo, lineas, rol]) =>
    lineas.map((linea) => {
      const imputacion =
        linea.mesImputacion && !linea.fecha.startsWith(linea.mesImputacion)
          ? ` imputada a ${etiquetaMes(linea.mesImputacion)}`
          : "";
      const texto = `      ${etiquetaGrupo(grupo)} ${linea.numeroFactura} ${linea.contraparte} ${formatearFechaInforme(linea.fecha)}${imputacion}`;
      if (rol === "emitida") {
        return [texto, "", -linea.total, -linea.total, ""];
      }
      return [texto, linea.total, "", linea.total, ""];
    })
  );
}
