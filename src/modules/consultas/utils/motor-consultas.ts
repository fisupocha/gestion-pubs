"use client";

import type { ClasificacionMapa } from "@/lib/clasificacion";
import type { MaestrosFormulario } from "@/modules/maestros/varios/data/obtener-maestros-formulario";
import type { ConsultaState } from "@/modules/consultas/utils/estado-consultas";

export type RegistroBase = {
  id: number;
  empresa: string;
  fechaFactura: string;
  tipo: string;
  familia: string;
  subfamilia: string;
  base0: string;
  base4: string;
  base10: string;
  base21: string;
};

export type OperativaConsultaData = {
  caja: RegistroBase[];
  facturasEmitidas: RegistroBase[];
  facturasRecibidas: RegistroBase[];
  alquileres: RegistroBase[];
  impuestos: RegistroBase[];
  personal: RegistroBase[];
  gastosBancarios: RegistroBase[];
  creditos: RegistroBase[];
  notasVarias: RegistroBase[];
};

export const OPERATIVA_CONSULTA_VACIA: OperativaConsultaData = {
  caja: [],
  facturasEmitidas: [],
  facturasRecibidas: [],
  alquileres: [],
  impuestos: [],
  personal: [],
  gastosBancarios: [],
  creditos: [],
  notasVarias: [],
};

export type Movimiento = {
  id: string;
  origen: string;
  clase: "caja" | "emitida" | "gasto";
  local: string;
  fecha: string;
  tipoLabel: string;
  familiaLabel: string;
  subfamilia: string;
  conIva: number;
  sinIva: number;
  iva: number;
  esEmpresa: boolean;
  esEmitidaCaja: boolean;
};

export type ResumenLocal = {
  local: string;
  caja: number;
  directo: number;
  emitidas: number;
  empresa: number;
  neto: number;
  porcentaje: number;
};

export type ResumenClasificacion = {
  key: string;
  tipo: string;
  familia: string;
  subfamilia: string;
  gastoBruto: number;
  emitidas: number;
  gastoNeto: number;
  iva: number;
};

export const TIPO_INGRESOS = "Ingresos";
export const FAMILIA_CAJA = "Caja";
export const FAMILIA_FACTURAS_EMITIDAS = "Facturas emitidas";

function ordenarAlfabetico(values: string[]) {
  return [...values].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function parseDecimal(value?: string) {
  return Number((value ?? "").replace(",", ".")) || 0;
}

function norm(value?: string) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function esLocalEmpresa(value?: string) {
  const normalized = norm(value);
  return normalized === "empresa" || normalized === "riverocio";
}

function inRange(fecha: string, desde: string, hasta: string) {
  if (!fecha) return false;
  if (desde && fecha < desde) return false;
  if (hasta && fecha > hasta) return false;
  return true;
}

function factura(base0: string, base4: string, base10: string, base21: string) {
  const b0 = parseDecimal(base0);
  const b4 = parseDecimal(base4);
  const b10 = parseDecimal(base10);
  const b21 = parseDecimal(base21);
  const iva = round2((b4 * 4) / 100 + (b10 * 10) / 100 + (b21 * 21) / 100);
  const sinIva = round2(b0 + b4 + b10 + b21);
  return { sinIva, conIva: round2(sinIva + iva), iva };
}

function alquiler(base4: string, base10: string, base21: string) {
  return factura("0", base4, base10, base21);
}

function personal(base0: string, base21: string) {
  const b0 = parseDecimal(base0);
  const b21 = parseDecimal(base21);
  const iva = round2((b21 * 21) / 100);
  const sinIva = round2(b0 + b21);
  return { sinIva, conIva: round2(sinIva + iva), iva };
}

function caja(base10: string) {
  const conIva = round2(parseDecimal(base10));
  const sinIva = round2(conIva / 1.1);
  return { sinIva, conIva, iva: round2(conIva - sinIva) };
}

function simple(base21: string) {
  const total = round2(parseDecimal(base21));
  return { sinIva: total, conIva: total, iva: 0 };
}

function familyLabel(clasificacion: ClasificacionMapa, tipoKey: string, familiaKey: string) {
  return clasificacion[tipoKey]?.familias?.[familiaKey]?.label ?? familiaKey;
}

function tipoLabel(clasificacion: ClasificacionMapa, tipoKey: string) {
  return clasificacion[tipoKey]?.label ?? tipoKey;
}

function mkMovimiento(
  origen: Movimiento["origen"],
  clase: Movimiento["clase"],
  registro: RegistroBase,
  clasificacion: ClasificacionMapa
) {
  let totales = { sinIva: 0, conIva: 0, iva: 0 };

  switch (origen) {
    case "caja":
      totales = caja(registro.base10);
      break;
    case "facturas-emitidas":
    case "facturas-recibidas":
      totales = factura(registro.base0, registro.base4, registro.base10, registro.base21);
      break;
    case "alquileres":
      totales = alquiler(registro.base4, registro.base10, registro.base21);
      break;
    case "personal":
      totales = personal(registro.base0, registro.base21);
      break;
    default:
      totales = simple(registro.base21);
      break;
  }

  const tipo = origen === "caja" ? TIPO_INGRESOS : tipoLabel(clasificacion, registro.tipo);
  const familia =
    origen === "caja" ? FAMILIA_CAJA : familyLabel(clasificacion, registro.tipo, registro.familia);
  const esEmitidaCaja =
    origen === "facturas-emitidas" &&
    [registro.tipo, tipo, registro.familia, familia, registro.subfamilia].some(
      (item) => norm(item) === "caja"
    );

  return {
    id: `${origen}-${registro.id}`,
    origen,
    clase,
    local: registro.empresa,
    fecha: registro.fechaFactura,
    tipoLabel: tipo,
    familiaLabel: familia,
    subfamilia: registro.subfamilia,
    conIva: totales.conIva,
    sinIva: totales.sinIva,
    iva: totales.iva,
    esEmpresa: esLocalEmpresa(registro.empresa),
    esEmitidaCaja,
  } satisfies Movimiento;
}

function obtenerMovimientos(
  clasificacion: ClasificacionMapa,
  operativa: OperativaConsultaData
) {
  return [
    ...operativa.caja.map((r) =>
      mkMovimiento("caja", "caja", r as unknown as RegistroBase, clasificacion)
    ),
    ...operativa.facturasEmitidas.map((r) =>
      mkMovimiento("facturas-emitidas", "emitida", r as unknown as RegistroBase, clasificacion)
    ),
    ...operativa.facturasRecibidas.map((r) =>
      mkMovimiento("facturas-recibidas", "gasto", r as unknown as RegistroBase, clasificacion)
    ),
    ...operativa.alquileres.map((r) =>
      mkMovimiento("alquileres", "gasto", r as unknown as RegistroBase, clasificacion)
    ),
    ...operativa.impuestos.map((r) =>
      mkMovimiento("impuestos", "gasto", r as unknown as RegistroBase, clasificacion)
    ),
    ...operativa.personal.map((r) =>
      mkMovimiento("personal", "gasto", r as unknown as RegistroBase, clasificacion)
    ),
    ...operativa.gastosBancarios.map((r) =>
      mkMovimiento("gastos-bancarios", "gasto", r as unknown as RegistroBase, clasificacion)
    ),
    ...operativa.creditos.map((r) =>
      mkMovimiento("creditos", "gasto", r as unknown as RegistroBase, clasificacion)
    ),
    ...operativa.notasVarias.map((r) =>
      mkMovimiento("notas-varias", "gasto", r as unknown as RegistroBase, clasificacion)
    ),
  ];
}

export function obtenerLocalesDisponibles(
  maestros: MaestrosFormulario,
  clasificacion: ClasificacionMapa,
  operativa: OperativaConsultaData
) {
  const movimientos = obtenerMovimientos(clasificacion, operativa);
  return [
    ...new Set([...maestros.locales, ...movimientos.map((item) => item.local)].filter(Boolean)),
  ];
}

export function obtenerTiposDisponibles(clasificacion: ClasificacionMapa) {
  const base = ordenarAlfabetico(Object.values(clasificacion).map((item) => item.label));
  return base.includes(TIPO_INGRESOS) ? base : [...base, TIPO_INGRESOS];
}

export function obtenerFamiliasPorTipoConsulta(clasificacion: ClasificacionMapa, tipo: string) {
  const base =
    Object.values(clasificacion).find((item) => item.label === tipo)
      ? Object.values(
          Object.values(clasificacion).find((item) => item.label === tipo)?.familias ?? {}
        ).map((familia) => familia.label)
      : [];

  if (tipo === TIPO_INGRESOS) {
    base.push(FAMILIA_CAJA, FAMILIA_FACTURAS_EMITIDAS);
  }

  return ordenarAlfabetico([...new Set(base)]);
}

export function obtenerFamiliasDisponibles(
  clasificacion: ClasificacionMapa,
  tiposSeleccionados: string[]
) {
  if (tiposSeleccionados.length === 0) return [];

  const out = tiposSeleccionados.flatMap((tipo) => obtenerFamiliasPorTipoConsulta(clasificacion, tipo));

  return ordenarAlfabetico([...new Set(out)]);
}

export function obtenerSubfamiliasDisponibles(
  clasificacion: ClasificacionMapa,
  familiasSeleccionadas: string[]
) {
  if (familiasSeleccionadas.length === 0) return [];

  return [
    ...new Set(
      Object.values(clasificacion)
        .flatMap((item) => Object.values(item.familias))
        .filter((item) => familiasSeleccionadas.includes(item.label))
        .flatMap((item) => item.subfamilias)
    ),
  ];
}

export function calcularConsulta({
  clasificacion,
  maestros,
  operativa,
  state,
}: {
  clasificacion: ClasificacionMapa;
  maestros: MaestrosFormulario;
  operativa: OperativaConsultaData;
  state: ConsultaState;
}) {
  const movimientos = obtenerMovimientos(clasificacion, operativa);
  const localesDisponibles = [
    ...new Set([...maestros.locales, ...movimientos.map((item) => item.local)].filter(Boolean)),
  ];
  const localesOperativosNegocio = localesDisponibles.filter((item) => !esLocalEmpresa(item));
  const tiposDisponibles = obtenerTiposDisponibles(clasificacion);
  const familiasDisponibles = obtenerFamiliasDisponibles(clasificacion, state.tiposSeleccionados);
  const subfamiliasDisponibles = obtenerSubfamiliasDisponibles(
    clasificacion,
    state.familiasSeleccionadas
  );

  const localesSeleccionadosOperativos = state.localesSeleccionados.filter(
    (item) => !esLocalEmpresa(item)
  );
  const empresaSeleccionada = state.localesSeleccionados.some((item) => esLocalEmpresa(item));
  const aplicarReparto =
    localesSeleccionadosOperativos.length > 0 && !empresaSeleccionada;
  const locales = state.localesSeleccionados.length > 0 ? state.localesSeleccionados : localesDisponibles;
  const setLocales = new Set(locales);
  const importe = (item: Movimiento) =>
    state.modoIva === "con" ? item.conIva : item.sinIva;
  const ingresosActivo = state.tiposSeleccionados.includes(TIPO_INGRESOS);
  const incluyeCaja =
    ingresosActivo &&
    (state.familiasSeleccionadas.length === 0 ||
      state.familiasSeleccionadas.includes(FAMILIA_CAJA));
  const incluyeEmitidas =
    ingresosActivo &&
    (state.familiasSeleccionadas.length === 0 ||
      state.familiasSeleccionadas.includes(FAMILIA_FACTURAS_EMITIDAS));
  const tiposGasto = state.tiposSeleccionados.filter((item) => item !== TIPO_INGRESOS);
  const familiasGasto = state.familiasSeleccionadas.filter(
    (item) => item !== FAMILIA_CAJA && item !== FAMILIA_FACTURAS_EMITIDAS
  );
  const hayFiltroGasto =
    tiposGasto.length > 0 ||
    familiasGasto.length > 0 ||
    state.subfamiliasSeleccionadas.length > 0;
  const matchGasto = (item: Movimiento) => {
    if (!hayFiltroGasto) return true;
    if (tiposGasto.length > 0 && !tiposGasto.includes(item.tipoLabel)) return false;
    if (familiasGasto.length > 0 && !familiasGasto.includes(item.familiaLabel)) return false;
    if (
      state.subfamiliasSeleccionadas.length > 0 &&
      !state.subfamiliasSeleccionadas.includes(item.subfamilia)
    ) {
      return false;
    }
    return true;
  };

  const base = movimientos.filter((item) => {
    const localIncluido = aplicarReparto
      ? setLocales.has(item.local) || item.esEmpresa
      : setLocales.has(item.local);

    return localIncluido && inRange(item.fecha, state.desde, state.hasta);
  });
  const setLocalesOperativosNegocio = new Set(localesOperativosNegocio);
  const baseRepartoEmpresa = movimientos.filter(
    (item) =>
      !item.esEmpresa &&
      setLocalesOperativosNegocio.has(item.local) &&
      inRange(item.fecha, state.desde, state.hasta)
  );
  const cajas = base.filter((item) => item.clase === "caja");
  const emitidas = base.filter((item) => item.clase === "emitida");
  const gastos = base.filter((item) => item.clase === "gasto");
  const cajasRepartoEmpresa = baseRepartoEmpresa.filter((item) => item.clase === "caja");

  const cajaUsada = round2(cajas.reduce((acc, item) => acc + importe(item), 0));
  const ivaCaja = round2(cajas.reduce((acc, item) => acc + item.iva, 0));
  const emitidasCaja = emitidas.filter((item) => item.esEmitidaCaja);
  const emitidasNoCaja = emitidas.filter((item) => !item.esEmitidaCaja);
  const emitidasCajaIgnoradas = round2(
    emitidasCaja.reduce((acc, item) => acc + importe(item), 0)
  );
  const emitidasCompensacionTotal = round2(
    emitidasNoCaja.reduce((acc, item) => acc + importe(item), 0)
  );

  const gastosSel = gastos.filter(matchGasto);
  const emitidasSel = emitidasNoCaja.filter(matchGasto);
  const gastosEmpresa = gastosSel.filter((item) => item.esEmpresa);
  const gastosLocales = gastosSel.filter((item) => !item.esEmpresa);
  const emitidasEmpresa = emitidasSel.filter((item) => item.esEmpresa);
  const emitidasLocales = emitidasSel.filter((item) => !item.esEmpresa);

  const ivaGasto = round2(gastosSel.reduce((acc, item) => acc + item.iva, 0));
  const ivaEmitidas = round2(emitidasSel.reduce((acc, item) => acc + item.iva, 0));
  const bruto = round2(gastosSel.reduce((acc, item) => acc + importe(item), 0));

  const porLocal = new Map<string, ResumenLocal>();
  locales.forEach((local) => {
    if (aplicarReparto && esLocalEmpresa(local)) return;
    porLocal.set(local, {
      local,
      caja: 0,
      directo: 0,
      emitidas: 0,
      empresa: 0,
      neto: 0,
      porcentaje: 0,
    });
  });

  cajas.forEach((item) => {
    const row = porLocal.get(item.local);
    if (row) row.caja = round2(row.caja + importe(item));
  });
  gastosLocales.forEach((item) => {
    const row = porLocal.get(item.local);
    if (row) row.directo = round2(row.directo + importe(item));
  });
  emitidasLocales.forEach((item) => {
    const row = porLocal.get(item.local);
    if (row) row.emitidas = round2(row.emitidas + importe(item));
  });

  const netoEmpresa = round2(
    gastosEmpresa.reduce((acc, item) => acc + importe(item), 0) -
      emitidasEmpresa.reduce((acc, item) => acc + importe(item), 0)
  );
  const cajaOperativa = round2(
    cajasRepartoEmpresa.reduce((acc, item) => acc + importe(item), 0)
  );
  const cajaSeleccionOperativa = round2(
    cajasRepartoEmpresa
      .filter((item) => setLocales.has(item.local))
      .reduce((acc, item) => acc + importe(item), 0)
  );
  const factorRepartoDetalle =
    aplicarReparto && cajaOperativa > 0 ? cajaSeleccionOperativa / cajaOperativa : 1;

  if (aplicarReparto) {
    if (cajaOperativa > 0) {
      const cajaPorLocal = new Map<string, number>();
      cajasRepartoEmpresa.forEach((item) => {
        cajaPorLocal.set(item.local, round2((cajaPorLocal.get(item.local) ?? 0) + importe(item)));
      });
      [...porLocal.values()].forEach((row) => {
        const cajaLocal = cajaPorLocal.get(row.local) ?? 0;
        row.empresa = round2(netoEmpresa * (cajaLocal / cajaOperativa));
      });
    }
  } else {
    const localEmpresa = [...porLocal.keys()].find((item) => esLocalEmpresa(item));
    const row = localEmpresa ? porLocal.get(localEmpresa) : undefined;
    if (row) {
      row.directo = round2(
        row.directo + gastosEmpresa.reduce((acc, item) => acc + importe(item), 0)
      );
      row.emitidas = round2(
        row.emitidas + emitidasEmpresa.reduce((acc, item) => acc + importe(item), 0)
      );
    }
  }

  [...porLocal.values()].forEach((row) => {
    row.neto = round2(row.directo - row.emitidas + row.empresa);
    row.porcentaje = row.caja > 0 ? round2((row.neto / row.caja) * 100) : 0;
  });

  const gastoNeto = round2([...porLocal.values()].reduce((acc, item) => acc + item.neto, 0));
  const ingresoSeleccionado = round2(
    (incluyeCaja ? cajaUsada : 0) +
      (incluyeEmitidas
        ? emitidasCompensacionTotal + (incluyeCaja ? 0 : emitidasCajaIgnoradas)
        : 0)
  );
  const gastoSeleccionado =
    hayFiltroGasto ||
    (!ingresosActivo &&
      state.familiasSeleccionadas.length === 0 &&
      state.subfamiliasSeleccionadas.length === 0)
      ? gastoNeto
      : 0;
  const importeSeleccion = round2(ingresoSeleccionado + gastoSeleccionado);
  const porcentaje = cajaUsada > 0 ? round2((gastoNeto / cajaUsada) * 100) : 0;
  const beneficio = round2(cajaUsada - gastoNeto);

  const detalleMap = new Map<string, ResumenClasificacion>();
  gastosSel.forEach((item) => {
    const key = `${item.tipoLabel}|||${item.familiaLabel}|||${item.subfamilia}`;
    const row = detalleMap.get(key) ?? {
      key,
      tipo: item.tipoLabel,
      familia: item.familiaLabel,
      subfamilia: item.subfamilia,
      gastoBruto: 0,
      emitidas: 0,
      gastoNeto: 0,
      iva: 0,
    };
    const factor = item.esEmpresa ? factorRepartoDetalle : 1;
    row.gastoBruto = round2(row.gastoBruto + importe(item) * factor);
    row.iva = round2(row.iva + item.iva * factor);
    detalleMap.set(key, row);
  });
  emitidasSel.forEach((item) => {
    const key = `${item.tipoLabel}|||${item.familiaLabel}|||${item.subfamilia}`;
    const row = detalleMap.get(key) ?? {
      key,
      tipo: item.tipoLabel,
      familia: item.familiaLabel,
      subfamilia: item.subfamilia,
      gastoBruto: 0,
      emitidas: 0,
      gastoNeto: 0,
      iva: 0,
    };
    const factor = item.esEmpresa ? factorRepartoDetalle : 1;
    row.emitidas = round2(row.emitidas + importe(item) * factor);
    detalleMap.set(key, row);
  });

  const detalleClasificacion = [...detalleMap.values()]
    .map((row) => ({
      ...row,
      gastoNeto: round2(row.gastoBruto - row.emitidas),
    }))
    .sort((a, b) => b.gastoNeto - a.gastoNeto);

  const textoLocales =
    state.localesSeleccionados.length === 0 ? "Total grupo" : state.localesSeleccionados.join(" + ");

  return {
    movimientos,
    localesDisponibles,
    tiposDisponibles,
    familiasDisponibles,
    subfamiliasDisponibles,
    textoLocales,
    datos: {
      aplicarReparto,
      cajaUsada,
      ivaCaja,
      emitidasCajaIgnoradas,
      emitidasCompensacionTotal,
      ingresoSeleccionado,
      bruto,
      gastoNeto,
      ivaGasto,
      ivaEmitidas,
      importeSeleccion,
      porcentaje,
      beneficio,
      porLocal: [...porLocal.values()],
      detalleClasificacion,
    },
  };
}
