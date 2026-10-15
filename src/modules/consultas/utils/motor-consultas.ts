"use client";

import type { ClasificacionMapa } from "@/lib/clasificacion";
import type { MaestrosFormulario } from "@/modules/maestros/varios/data/obtener-maestros-formulario";
import type { ConsultaState } from "@/modules/consultas/utils/estado-consultas";
import {
  etiquetaMesLarga,
  mesDeFecha,
  mesIntersectaPeriodo,
  repartirPorPesos,
  repartirPorPorcentajes,
  tratamientoEmitida,
  trozosDeMovimiento,
  type TratamientoEmitida,
} from "./imputacion-consulta";
import type { RepartoEspecial } from "@/modules/consultas/utils/reparto-especial";
import type { RepartoRiverocioManual } from "@/modules/consultas/utils/reparto-riverocio";

export type RegistroBase = {
  id: number;
  empresa: string;
  proveedor?: string;
  cliente?: string;
  numeroFactura?: string;
  pagado?: boolean;
  fechaFactura: string;
  tipo: string;
  familia: string;
  subfamilia: string;
  base0: string;
  base4: string;
  base10: string;
  base21: string;
};

export type FacturaDetalleLinea = {
  movimientoId: string;
  numeroFactura: string;
  contraparte: string;
  fecha: string;
  base: number;
  iva: number;
  total: number;
  pagado: boolean;
  local: string;
  importe: number;
  porcentaje: number;
  esEmitidaCaja?: boolean;
  esCompensatoria?: boolean;
  origen?: string;
  imputacionId?: string;
  mesImputacion?: string;
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
  numeroFactura: string;
  proveedor: string;
  cliente: string;
  pagado: boolean;
  mesImputacion?: string;
  especial?: boolean;
  tratamiento?: TratamientoEmitida | "no-emitida";
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
  recibidasDetalle: FacturaDetalleLinea[];
  emitidasDetalle: FacturaDetalleLinea[];
  alquileresDetalle: FacturaDetalleLinea[];
  notasVariasDetalle: FacturaDetalleLinea[];
  otrosDetalle: FacturaDetalleLinea[];
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

function construirClaveCoincidencia(item: Pick<Movimiento, "local" | "tipoLabel" | "familiaLabel" | "subfamilia">) {
  return [
    norm(item.local),
    norm(item.tipoLabel),
    norm(item.familiaLabel),
    norm(item.subfamilia),
  ].join("|||");
}

export function obtenerFamiliaIngresosEmitidasVisible(clasificacion: ClasificacionMapa) {
  const tipoIngresos = Object.values(clasificacion).find((item) => item.label === TIPO_INGRESOS);
  if (!tipoIngresos) {
    return null;
  }

  return (
    Object.values(tipoIngresos.familias)
      .map((familia) => familia.label)
      .find((familia) => norm(familia).includes("emitid")) ?? null
  );
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

function alquiler(base0: string, base4: string, base10: string, base21: string) {
  return factura(base0, base4, base10, base21);
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

function excluirFacturaRecibidaSeguridadRiverocio(
  origen: Movimiento["origen"],
  registro: RegistroBase,
  clasificacion: ClasificacionMapa
) {
  if (origen !== "facturas-recibidas") return false;

  const tipo = norm(tipoLabel(clasificacion, registro.tipo));
  const familia = norm(familyLabel(clasificacion, registro.tipo, registro.familia));

  return esLocalEmpresa(registro.empresa) && tipo === "personal" && familia === "seguridad";
}

function mkMovimiento(
  origen: Movimiento["origen"],
  clase: Movimiento["clase"],
  registro: RegistroBase,
  clasificacion: ClasificacionMapa
) {
  if (excluirFacturaRecibidaSeguridadRiverocio(origen, registro, clasificacion)) {
    return null;
  }

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
      totales = alquiler(registro.base0, registro.base4, registro.base10, registro.base21);
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
    numeroFactura: registro.numeroFactura ?? "",
    proveedor: registro.proveedor ?? "",
    cliente: registro.cliente ?? "",
    pagado: Boolean(registro.pagado),
  } satisfies Movimiento;
}

export function obtenerMovimientosConsulta(
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
  ].filter((item): item is Movimiento => item !== null);
}

export function obtenerLocalesDisponibles(
  maestros: MaestrosFormulario,
  clasificacion: ClasificacionMapa,
  operativa: OperativaConsultaData
) {
  const movimientos = obtenerMovimientosConsulta(clasificacion, operativa);
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
    base.push(FAMILIA_CAJA);
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
  repartosRiverocio = [],
  repartosEspeciales = [],
}: {
  clasificacion: ClasificacionMapa;
  maestros: MaestrosFormulario;
  operativa: OperativaConsultaData;
  state: ConsultaState;
  repartosRiverocio?: RepartoRiverocioManual[];
  repartosEspeciales?: RepartoEspecial[];
}) {
  const movimientos = obtenerMovimientosConsulta(clasificacion, operativa);
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
  const familiaIngresosEmitidasVisible = obtenerFamiliaIngresosEmitidasVisible(clasificacion);
  const familiasIngreso = new Set(obtenerFamiliasPorTipoConsulta(clasificacion, TIPO_INGRESOS));

  const localesSeleccionadosOperativos = state.localesSeleccionados.filter(
    (item) => !esLocalEmpresa(item)
  );
  const empresaSeleccionada = state.localesSeleccionados.some((item) => esLocalEmpresa(item));
  const aplicarReparto =
    localesSeleccionadosOperativos.length > 0 && !empresaSeleccionada;
  const locales = state.localesSeleccionados.length > 0 ? state.localesSeleccionados : localesDisponibles;
  const setLocales = new Set(locales);
  const setLocalesSeleccionadosOperativos = new Set(localesSeleccionadosOperativos);
  const importe = (item: Movimiento) =>
    state.modoIva === "con" ? item.conIva : item.sinIva;
  const ingresosActivo = state.tiposSeleccionados.includes(TIPO_INGRESOS);
  const incluyeCaja =
    ingresosActivo &&
    (state.familiasSeleccionadas.length === 0 ||
      state.familiasSeleccionadas.includes(FAMILIA_CAJA));
  const incluyeEmitidasSinCoincidencia =
    ingresosActivo &&
    (state.familiasSeleccionadas.length === 0 ||
      (familiaIngresosEmitidasVisible !== null &&
        state.familiasSeleccionadas.includes(familiaIngresosEmitidasVisible)));
  const tiposGasto = state.tiposSeleccionados.filter((item) => item !== TIPO_INGRESOS);
  const familiasGasto = state.familiasSeleccionadas.filter(
    (item) => !familiasIngreso.has(item)
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

  const repartoEspecialPorId = new Map(repartosEspeciales.map((item) => [item.movimientoId, item]));
  const calculo = movimientos.flatMap((item) => {
    const trozos = trozosDeMovimiento(item, repartoEspecialPorId.get(item.id));
    return trozos.map((trozo) => {
      const tratamiento = item.clase === "emitida" ? tratamientoEmitida(item) : "no-emitida";
      return {
        ...item,
        mesImputacion: trozo.mes,
        especial: trozo.especial,
        conIva: trozo.conIva,
        sinIva: trozo.sinIva,
        iva: trozo.iva,
        tratamiento,
        clase: tratamiento === "caja" ? ("caja" as const) : item.clase,
      } satisfies Movimiento;
    });
  }).filter((item) => item.tratamiento !== "contabilidad");

  const enPeriodo = (item: Movimiento) =>
    item.especial
      ? mesIntersectaPeriodo(item.mesImputacion ?? "", state.desde, state.hasta)
      : inRange(item.fecha, state.desde, state.hasta);

  const base = calculo.filter((item) => {
    const localIncluido = aplicarReparto
      ? setLocales.has(item.local) || item.esEmpresa
      : setLocales.has(item.local);

    return localIncluido && enPeriodo(item);
  });
  const setLocalesOperativosNegocio = new Set(localesOperativosNegocio);
  const cajas = base.filter((item) => {
    if (item.clase !== "caja") return false;
    if (!aplicarReparto) return true;
    return !item.esEmpresa && setLocalesSeleccionadosOperativos.has(item.local);
  });
  const emitidas = base.filter((item) => item.clase === "emitida");
  const gastos = base.filter((item) => item.clase === "gasto");
  const pesosCajaPorMes = new Map<string, Map<string, number>>();
  calculo.forEach((item) => {
    if (item.clase !== "caja" || item.esEmpresa) return;
    if (!setLocalesOperativosNegocio.has(item.local)) return;
    const mes = item.mesImputacion || mesDeFecha(item.fecha);
    if (!mes) return;
    const delMes = pesosCajaPorMes.get(mes) ?? new Map<string, number>();
    delMes.set(item.local, round2((delMes.get(item.local) ?? 0) + importe(item)));
    pesosCajaPorMes.set(mes, delMes);
  });

  const cajaUsada = round2(cajas.reduce((acc, item) => acc + importe(item), 0));
  const ivaCaja = round2(cajas.reduce((acc, item) => acc + item.iva, 0));
  const clavesGasto = new Set(gastos.map((item) => construirClaveCoincidencia(item)));
  const emitidasCompensadas = emitidas.filter(
    (item) =>
      item.tratamiento === "compensacion" || clavesGasto.has(construirClaveCoincidencia(item))
  );
  const emitidasSinCoincidencia = emitidas.filter(
    (item) =>
      item.tratamiento !== "compensacion" && !clavesGasto.has(construirClaveCoincidencia(item))
  );
  const emitidasCajaIncluidas = round2(
    cajas.filter((item) => item.origen === "facturas-emitidas").reduce((acc, item) => acc + importe(item), 0)
  );
  const emitidasCompensacionTotal = round2(
    emitidasCompensadas.reduce((acc, item) => acc + importe(item), 0)
  );

  const gastosSel = gastos.filter(matchGasto);
  const emitidasSel = emitidasCompensadas.filter(matchGasto);
  const emitidasSinCoincidenciaSel = emitidasSinCoincidencia;
  const gastosEmpresa = gastosSel.filter((item) => item.esEmpresa);
  const gastosLocales = gastosSel.filter((item) => !item.esEmpresa);
  const emitidasEmpresa = emitidasSel.filter((item) => item.esEmpresa);
  const emitidasLocales = emitidasSel.filter((item) => !item.esEmpresa);

  const ivaGasto = round2(gastosSel.reduce((acc, item) => acc + item.iva, 0));
  const ivaEmitidas = round2(emitidasSel.reduce((acc, item) => acc + item.iva, 0));
  const bruto = round2(gastosSel.reduce((acc, item) => acc + importe(item), 0));
  const repartoRiverocioMap = new Map(
    repartosRiverocio.map((item) => [item.movimientoId, item])
  );
  const avisosReparto: string[] = [];
  const avisosRepartoVistos = new Set<string>();

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

  function registrarRepartoPendiente(item: Movimiento) {
    const mes = item.mesImputacion || mesDeFecha(item.fecha) || "";
    const clave = `${item.id}|${mes}`;
    if (avisosRepartoVistos.has(clave)) return;
    avisosRepartoVistos.add(clave);
    const quien = item.cliente || item.proveedor || item.numeroFactura || item.id;
    avisosReparto.push(
      `${etiquetaMesLarga(mes)} no tiene Caja suficiente en Cue, Hangar y Tarantino para calcular porcentajes. ${quien} no se ha repartido. Revisa la Caja de ese mes o guarda un reparto manual en Reparto Riverocio.`
    );
  }

  function pesosDelMes(mes: string) {
    const delMes = pesosCajaPorMes.get(mes);
    return localesOperativosNegocio.map((local) => ({
      local,
      peso: delMes?.get(local) ?? 0,
    }));
  }

  function mesPuedeRepartirse(mes: string) {
    const pesos = pesosDelMes(mes);
    if (pesos.some((item) => item.peso < 0)) return false;
    return pesos.reduce((acc, item) => acc + item.peso, 0) > 0;
  }

  function construirRepartoEmpresa(item: Movimiento, total: number) {
    const configuracion = repartoRiverocioMap.get(item.id);
    if (configuracion) {
      return repartirPorPorcentajes(total, localesOperativosNegocio, configuracion.porcentajes);
    }

    const mes = item.mesImputacion || mesDeFecha(item.fecha) || "";
    if (!mesPuedeRepartirse(mes)) {
      registrarRepartoPendiente(item);
      return null;
    }

    return repartirPorPesos(total, pesosDelMes(mes));
  }

  function visibleEmpresa(item: Movimiento, total: number) {
    if (!(item.esEmpresa && aplicarReparto)) return total;
    const reparto = construirRepartoEmpresa(item, total);
    if (!reparto) return null;
    return round2(
      [...setLocalesSeleccionadosOperativos].reduce(
        (acc, local) => acc + (reparto.get(local) ?? 0),
        0
      )
    );
  }

  if (aplicarReparto) {
    gastosEmpresa.forEach((item) => {
      const reparto = construirRepartoEmpresa(item, importe(item));
      if (!reparto) return;
      [...porLocal.values()].forEach((row) => {
        row.empresa = round2(row.empresa + (reparto.get(row.local) ?? 0));
      });
    });

    emitidasEmpresa.forEach((item) => {
      const reparto = construirRepartoEmpresa(item, importe(item));
      if (!reparto) return;
      [...porLocal.values()].forEach((row) => {
        row.empresa = round2(row.empresa - (reparto.get(row.local) ?? 0));
      });
    });
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
  const emitidasSinCoincidenciaVisible = round2(
    emitidasSinCoincidenciaSel.reduce(
      (acc, item) => acc + (visibleEmpresa(item, importe(item)) ?? 0),
      0
    )
  );
  const ingresoSeleccionado = round2(
    (incluyeCaja ? cajaUsada : 0) +
      (incluyeEmitidasSinCoincidencia ? emitidasSinCoincidenciaVisible : 0)
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
  const beneficio = round2(cajaUsada + emitidasSinCoincidenciaVisible - gastoNeto);

  function mkFacturaDetalleLinea(
    item: Movimiento,
    options?: { esCompensatoria?: boolean }
  ): FacturaDetalleLinea | null {
    const totalFull = importe(item);
    const totalVis = visibleEmpresa(item, totalFull);
    if (totalVis === null) return null;
    const factor = totalFull !== 0 ? totalVis / totalFull : 1;
    const contraparte =
      item.origen === "facturas-emitidas"
        ? item.cliente || item.proveedor || "-"
        : item.proveedor || "-";

    return {
      movimientoId: item.id,
      imputacionId: `${item.id}|${item.mesImputacion ?? item.fecha}`,
      mesImputacion: item.mesImputacion,
      numeroFactura: item.numeroFactura || "-",
      contraparte,
      fecha: item.fecha,
      base: round2(item.sinIva * factor),
      iva: round2(item.iva * factor),
      total: totalVis,
      pagado: item.pagado,
      local: item.local,
      importe: totalVis,
      porcentaje: cajaUsada > 0 ? round2((totalVis / cajaUsada) * 100) : 0,
      esEmitidaCaja: item.esEmitidaCaja,
      esCompensatoria: options?.esCompensatoria,
      origen: item.origen,
    };
  }

  function filaDetalleVacia(
    key: string,
    tipo: string,
    familia: string,
    subfamilia: string
  ): ResumenClasificacion {
    return {
      key,
      tipo,
      familia,
      subfamilia,
      gastoBruto: 0,
      emitidas: 0,
      gastoNeto: 0,
      iva: 0,
      recibidasDetalle: [],
      emitidasDetalle: [],
      alquileresDetalle: [],
      notasVariasDetalle: [],
      otrosDetalle: [],
    };
  }

  const detalleMap = new Map<string, ResumenClasificacion>();
  gastosSel.forEach((item) => {
    const importeVisible = visibleEmpresa(item, importe(item));
    if (importeVisible === null) return;
    const key = `${item.tipoLabel}|||${item.familiaLabel}|||${item.subfamilia}`;
    const row = detalleMap.get(key) ?? filaDetalleVacia(key, item.tipoLabel, item.familiaLabel, item.subfamilia);
    const ivaVisible = visibleEmpresa(item, item.iva) ?? 0;
    const linea = mkFacturaDetalleLinea(item);
    if (!linea) return;
    row.gastoBruto = round2(row.gastoBruto + importeVisible);
    row.iva = round2(row.iva + ivaVisible);
    if (item.origen === "facturas-recibidas") {
      row.recibidasDetalle = [...row.recibidasDetalle, linea];
    }
    if (item.origen === "alquileres") {
      row.alquileresDetalle = [...row.alquileresDetalle, linea];
    }
    if (item.origen === "notas-varias") {
      row.notasVariasDetalle = [
        ...row.notasVariasDetalle,
        { ...linea, contraparte: "Desconocido" },
      ];
    }
    if (
      item.origen !== "facturas-recibidas" &&
      item.origen !== "alquileres" &&
      item.origen !== "notas-varias"
    ) {
      row.otrosDetalle = [...row.otrosDetalle, linea];
    }
    detalleMap.set(key, row);
  });
  emitidasSel.forEach((item) => {
    const emitidasVisibles = visibleEmpresa(item, importe(item));
    if (emitidasVisibles === null) return;
    const linea = mkFacturaDetalleLinea(item, { esCompensatoria: true });
    if (!linea) return;
    const key = `${item.tipoLabel}|||${item.familiaLabel}|||${item.subfamilia}`;
    const row = detalleMap.get(key) ?? filaDetalleVacia(key, item.tipoLabel, item.familiaLabel, item.subfamilia);
    row.emitidas = round2(row.emitidas + emitidasVisibles);
    row.emitidasDetalle = [...row.emitidasDetalle, linea];
    detalleMap.set(key, row);
  });

  if (familiaIngresosEmitidasVisible) {
    emitidasSinCoincidenciaSel.forEach((item) => {
      const importeVisible = visibleEmpresa(item, importe(item));
      if (importeVisible === null) return;
      const linea = mkFacturaDetalleLinea(item);
      if (!linea) return;
      const key = `${TIPO_INGRESOS}|||${familiaIngresosEmitidasVisible}|||`;
      const row = detalleMap.get(key) ??
        filaDetalleVacia(key, TIPO_INGRESOS, familiaIngresosEmitidasVisible, "");
      const ivaVisible = visibleEmpresa(item, item.iva) ?? 0;
      row.gastoBruto = round2(row.gastoBruto + importeVisible);
      row.iva = round2(row.iva + ivaVisible);
      row.emitidasDetalle = [...row.emitidasDetalle, linea];
      detalleMap.set(key, row);
    });
  }

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
      emitidasCajaIncluidas,
      emitidasCompensacionTotal,
      emitidasSinCoincidenciaTotal: emitidasSinCoincidenciaVisible,
      avisosReparto,
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
      cajasDetalle: cajas.map((item) => {
        const total = importe(item);
        const emitida = item.origen === "facturas-emitidas";
        return {
          movimientoId: item.id,
          imputacionId: `${item.id}|${item.mesImputacion ?? item.fecha}`,
          mesImputacion: item.mesImputacion,
          numeroFactura: item.numeroFactura || "-",
          contraparte: emitida ? `Emitida · ${item.cliente || item.local || "-"}` : item.local || "-",
          fecha: item.fecha,
          base: item.sinIva,
          iva: item.iva,
          total,
          pagado: item.pagado,
          local: item.local,
          importe: total,
          porcentaje: cajaUsada > 0 ? round2((total / cajaUsada) * 100) : 0,
          esEmitidaCaja: emitida,
          origen: item.origen,
        } satisfies FacturaDetalleLinea;
      }),
    },
  };
}
