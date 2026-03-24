"use client";

import type { ClasificacionMapa } from "@/lib/clasificacion";
import { supabase } from "@/lib/supabase";

type FormularioOperativa = {
  empresa: string;
  proveedor: string;
  cliente: string;
  fechaFactura: string;
  numeroFactura: string;
  tipo: string;
  familia: string;
  subfamilia: string;
  retencion: string;
  base0: string;
  base4: string;
  base10: string;
  base21: string;
  pagado: boolean;
  fechaPago: string;
  formaPago: string;
  banco: string;
  numeroPagare: string;
  observaciones: string;
};

type RegistroOperativa = FormularioOperativa & {
  id: number;
  adjunto: null;
};

type RegistroOperativaEntrada = Partial<FormularioOperativa> & {
  id: number;
  adjunto?: unknown;
};

type MaestroBasico = {
  id: number;
  nombre: string;
};

type FamiliaBasica = MaestroBasico & {
  tipo_id?: number | null;
};

type SubfamiliaBasica = MaestroBasico & {
  familia_id?: number | null;
};

type MaestrosPersistencia = {
  empresas: MaestroBasico[];
  proveedores: MaestroBasico[];
  clientes: MaestroBasico[];
  tipos: MaestroBasico[];
  familias: FamiliaBasica[];
  subfamilias: SubfamiliaBasica[];
  formasPago: MaestroBasico[];
  bancos: MaestroBasico[];
};

type ClasificacionIds = {
  tipoId: number | null;
  familiaId: number | null;
  subfamiliaId: number | null;
};

function parseDecimal(value?: string) {
  return Number((value ?? "").replace(",", ".")) || 0;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function toFormDecimal(value: number | null | undefined) {
  return value ? String(round2(Number(value))).replace(".", ",") : "";
}

function createEmptyRegistro(): RegistroOperativa {
  return {
    id: 0,
    empresa: "",
    proveedor: "",
    cliente: "",
    fechaFactura: "",
    numeroFactura: "",
    tipo: "",
    familia: "",
    subfamilia: "",
    retencion: "",
    base0: "",
    base4: "",
    base10: "",
    base21: "",
    pagado: false,
    fechaPago: "",
    formaPago: "",
    banco: "",
    numeroPagare: "",
    observaciones: "",
    adjunto: null,
  };
}

function buildRegistro(partial: Partial<RegistroOperativa>): RegistroOperativa {
  return {
    ...createEmptyRegistro(),
    ...partial,
    adjunto: null,
  };
}

function normalizarEntrada(registro: RegistroOperativaEntrada): RegistroOperativa {
  return buildRegistro({
    id: registro.id,
    empresa: registro.empresa ?? "",
    proveedor: registro.proveedor ?? "",
    cliente: registro.cliente ?? "",
    fechaFactura: registro.fechaFactura ?? "",
    numeroFactura: registro.numeroFactura ?? "",
    tipo: registro.tipo ?? "",
    familia: registro.familia ?? "",
    subfamilia: registro.subfamilia ?? "",
    retencion: registro.retencion ?? "",
    base0: registro.base0 ?? "",
    base4: registro.base4 ?? "",
    base10: registro.base10 ?? "",
    base21: registro.base21 ?? "",
    pagado: registro.pagado ?? false,
    fechaPago: registro.fechaPago ?? "",
    formaPago: registro.formaPago ?? "",
    banco: registro.banco ?? "",
    numeroPagare: registro.numeroPagare ?? "",
    observaciones: registro.observaciones ?? "",
  });
}

function typeKeyFromLabel(clasificacion: ClasificacionMapa, label: string) {
  return (
    Object.entries(clasificacion).find(([, value]) => normalize(value.label) === normalize(label))?.[0] ?? ""
  );
}

function familyKeyFromLabel(clasificacion: ClasificacionMapa, tipoKey: string, label: string) {
  const familias = clasificacion[tipoKey]?.familias ?? {};

  return (
    Object.entries(familias).find(([, value]) => normalize(value.label) === normalize(label))?.[0] ?? ""
  );
}

async function cargarMaestrosPersistencia(): Promise<MaestrosPersistencia> {
  const [
    empresasRes,
    proveedoresRes,
    clientesRes,
    tiposRes,
    familiasRes,
    subfamiliasRes,
    formasPagoRes,
    bancosRes,
  ] = await Promise.all([
    supabase.from("empresas").select("id, nombre"),
    supabase.from("proveedores").select("id, nombre"),
    supabase.from("clientes").select("id, nombre"),
    supabase.from("tipos").select("id, nombre"),
    supabase.from("familias").select("id, nombre, tipo_id"),
    supabase.from("subfamilias").select("id, nombre, familia_id"),
    supabase.from("formas_pago").select("id, nombre"),
    supabase.from("bancos").select("id, nombre"),
  ]);

  const errores = [
    empresasRes.error,
    proveedoresRes.error,
    clientesRes.error,
    tiposRes.error,
    familiasRes.error,
    subfamiliasRes.error,
    formasPagoRes.error,
    bancosRes.error,
  ].filter(Boolean);

  if (errores.length > 0) {
    throw new Error("No se pudieron cargar los maestros de persistencia");
  }

  return {
    empresas: (empresasRes.data ?? []) as MaestroBasico[],
    proveedores: (proveedoresRes.data ?? []) as MaestroBasico[],
    clientes: (clientesRes.data ?? []) as MaestroBasico[],
    tipos: (tiposRes.data ?? []) as MaestroBasico[],
    familias: (familiasRes.data ?? []) as FamiliaBasica[],
    subfamilias: (subfamiliasRes.data ?? []) as SubfamiliaBasica[],
    formasPago: (formasPagoRes.data ?? []) as MaestroBasico[],
    bancos: (bancosRes.data ?? []) as MaestroBasico[],
  };
}

function resolverId(items: MaestroBasico[], label: string) {
  return items.find((item) => normalize(item.nombre) === normalize(label))?.id ?? null;
}

function resolverFamiliaId(items: FamiliaBasica[], label: string, tipoId: number | null) {
  return (
    items.find(
      (item) =>
        normalize(item.nombre) === normalize(label) &&
        (tipoId === null || item.tipo_id === tipoId)
    )?.id ?? null
  );
}

function resolverSubfamiliaId(items: SubfamiliaBasica[], label: string, familiaId: number | null) {
  return (
    items.find(
      (item) =>
        normalize(item.nombre) === normalize(label) &&
        (familiaId === null || item.familia_id === familiaId)
    )?.id ?? null
  );
}

function resolverClasificacionIds(
  registro: Pick<RegistroOperativa, "tipo" | "familia" | "subfamilia">,
  clasificacion: ClasificacionMapa,
  maestros: MaestrosPersistencia
): ClasificacionIds {
  const tipoLabel = clasificacion[registro.tipo]?.label ?? "";
  const tipoId = tipoLabel ? resolverId(maestros.tipos, tipoLabel) : null;
  const familiaLabel = clasificacion[registro.tipo]?.familias[registro.familia]?.label ?? "";
  const familiaId = familiaLabel ? resolverFamiliaId(maestros.familias, familiaLabel, tipoId) : null;
  const subfamiliaId =
    registro.subfamilia && familiaId
      ? resolverSubfamiliaId(maestros.subfamilias, registro.subfamilia, familiaId)
      : null;

  return { tipoId, familiaId, subfamiliaId };
}

function resolverEtiquetasDesdeFila(
  row: Record<string, unknown>,
  maestros: MaestrosPersistencia,
  clasificacion: ClasificacionMapa
) {
  const empresa = maestros.empresas.find((item) => item.id === row.empresa_id)?.nombre ?? "";
  const proveedor = maestros.proveedores.find((item) => item.id === row.proveedor_id)?.nombre ?? "";
  const cliente = maestros.clientes.find((item) => item.id === row.cliente_id)?.nombre ?? "";
  const tipoLabel = maestros.tipos.find((item) => item.id === row.tipo_id)?.nombre ?? "";
  const tipo = typeKeyFromLabel(clasificacion, tipoLabel);
  const familiaLabel = maestros.familias.find((item) => item.id === row.familia_id)?.nombre ?? "";
  const familia = familyKeyFromLabel(clasificacion, tipo, familiaLabel);
  const subfamilia = maestros.subfamilias.find((item) => item.id === row.subfamilia_id)?.nombre ?? "";
  const formaPago =
    maestros.formasPago.find((item) => item.id === row.forma_pago_id || item.id === row.forma_cobro_id)?.nombre ??
    "";
  const banco = maestros.bancos.find((item) => item.id === row.banco_id)?.nombre ?? "";

  return {
    empresa,
    proveedor,
    cliente,
    tipo,
    familia,
    subfamilia,
    formaPago,
    banco,
  };
}

async function listarTabla(
  tabla: string,
  hidratar: (row: Record<string, unknown>, maestros: MaestrosPersistencia, clasificacion: ClasificacionMapa) => RegistroOperativa,
  clasificacion: ClasificacionMapa
) {
  const maestros = await cargarMaestrosPersistencia();
  const { data, error } = await supabase.from(tabla).select("*").order("id", { ascending: true });

  if (error) {
    throw new Error(`No se pudieron cargar registros de ${tabla}`);
  }

  return (data ?? []).map((row) => hidratar(row, maestros, clasificacion));
}

async function guardarTabla(
  tabla: string,
  registro: { id: number },
  dataGuardar: Record<string, unknown>,
  hidratar: (row: Record<string, unknown>, maestros: MaestrosPersistencia, clasificacion: ClasificacionMapa) => RegistroOperativa,
  clasificacion: ClasificacionMapa
) {
  const maestros = await cargarMaestrosPersistencia();
  const query = registro.id
    ? supabase.from(tabla).update(dataGuardar).eq("id", registro.id)
    : supabase.from(tabla).insert(dataGuardar);

  const { data, error } = await query.select("*").single();

  if (error) {
    throw new Error(`No se pudo guardar ${tabla}`);
  }

  return hidratar(data, maestros, clasificacion);
}

function hidratarFacturaRecibida(
  row: Record<string, unknown>,
  maestros: MaestrosPersistencia,
  clasificacion: ClasificacionMapa
) {
  const base = resolverEtiquetasDesdeFila(row, maestros, clasificacion);

  return buildRegistro({
    id: Number(row.id),
    ...base,
    fechaFactura: String(row.fecha_factura ?? ""),
    numeroFactura: String(row.numero_factura ?? ""),
    base0: toFormDecimal(Number(row.base_0 ?? 0)),
    base4: toFormDecimal(Number(row.base_4 ?? 0)),
    base10: toFormDecimal(Number(row.base_10 ?? 0)),
    base21: toFormDecimal(Number(row.base_21 ?? 0)),
    pagado: Boolean(row.pagado),
    fechaPago: String(row.fecha_pago ?? ""),
    numeroPagare: String(row.numero_pagare ?? ""),
    observaciones: String(row.observaciones ?? ""),
  });
}

function hidratarFacturaEmitida(
  row: Record<string, unknown>,
  maestros: MaestrosPersistencia,
  clasificacion: ClasificacionMapa
) {
  const base = resolverEtiquetasDesdeFila(row, maestros, clasificacion);

  return buildRegistro({
    id: Number(row.id),
    ...base,
    fechaFactura: String(row.fecha_factura ?? ""),
    numeroFactura: String(row.numero_factura ?? ""),
    base0: toFormDecimal(Number(row.base_0 ?? 0)),
    base4: toFormDecimal(Number(row.base_4 ?? 0)),
    base10: toFormDecimal(Number(row.base_10 ?? 0)),
    base21: toFormDecimal(Number(row.base_21 ?? 0)),
    pagado: Boolean(row.cobrado),
    fechaPago: String(row.fecha_cobro ?? ""),
    numeroPagare: String(row.numero_pagare ?? ""),
    observaciones: String(row.observaciones ?? ""),
  });
}

function hidratarAlquiler(
  row: Record<string, unknown>,
  maestros: MaestrosPersistencia,
  clasificacion: ClasificacionMapa
) {
  const base = resolverEtiquetasDesdeFila(row, maestros, clasificacion);

  return buildRegistro({
    id: Number(row.id),
    ...base,
    fechaFactura: String(row.fecha_alquiler ?? ""),
    numeroFactura: String(row.numero_factura ?? ""),
    retencion: toFormDecimal(Number(row.retencion ?? 0)),
    base0: toFormDecimal(Number(row.base_0 ?? 0)),
    base4: toFormDecimal(Number(row.base_4 ?? 0)),
    base10: toFormDecimal(Number(row.base_10 ?? 0)),
    base21: toFormDecimal(Number(row.base_21 ?? 0)),
    pagado: Boolean(row.pagado),
    fechaPago: String(row.fecha_pago ?? ""),
    numeroPagare: String(row.numero_pagare ?? ""),
    observaciones: String(row.observaciones ?? ""),
  });
}

function hidratarGastoBancario(
  row: Record<string, unknown>,
  maestros: MaestrosPersistencia,
  clasificacion: ClasificacionMapa
) {
  const base = resolverEtiquetasDesdeFila(row, maestros, clasificacion);

  return buildRegistro({
    id: Number(row.id),
    ...base,
    fechaFactura: String(row.fecha_gasto ?? ""),
    pagado: Boolean(row.pagado),
    fechaPago: String(row.fecha_pago ?? ""),
    observaciones: String(row.observaciones ?? ""),
    base21: toFormDecimal(Number(row.total_gasto ?? 0)),
  });
}

function hidratarCredito(
  row: Record<string, unknown>,
  maestros: MaestrosPersistencia,
  clasificacion: ClasificacionMapa
) {
  const base = resolverEtiquetasDesdeFila(row, maestros, clasificacion);

  return buildRegistro({
    id: Number(row.id),
    ...base,
    fechaFactura: String(row.fecha_credito ?? ""),
    pagado: Boolean(row.pagado),
    fechaPago: String(row.fecha_pago ?? ""),
    observaciones: String(row.observaciones ?? ""),
    base21: toFormDecimal(Number(row.total_credito ?? 0)),
  });
}

function hidratarImpuesto(
  row: Record<string, unknown>,
  maestros: MaestrosPersistencia,
  clasificacion: ClasificacionMapa
) {
  const base = resolverEtiquetasDesdeFila(row, maestros, clasificacion);

  return buildRegistro({
    id: Number(row.id),
    ...base,
    fechaFactura: String(row.fecha_impuesto ?? ""),
    pagado: Boolean(row.pagado),
    fechaPago: String(row.fecha_pago ?? ""),
    numeroPagare: String(row.numero_pagare ?? ""),
    observaciones: String(row.observaciones ?? ""),
    base21: toFormDecimal(Number(row.total_impuesto ?? 0)),
  });
}

function hidratarPersonal(
  row: Record<string, unknown>,
  maestros: MaestrosPersistencia,
  clasificacion: ClasificacionMapa
) {
  const base = resolverEtiquetasDesdeFila(row, maestros, clasificacion);

  return buildRegistro({
    id: Number(row.id),
    ...base,
    fechaFactura: String(row.fecha_personal ?? ""),
    base0: toFormDecimal(Number(row.base_0 ?? 0)),
    base21: toFormDecimal(Number(row.base_21 ?? 0)),
    pagado: true,
    observaciones: String(row.observaciones ?? ""),
  });
}

function hidratarCaja(
  row: Record<string, unknown>,
  maestros: MaestrosPersistencia,
  clasificacion: ClasificacionMapa
) {
  const base = resolverEtiquetasDesdeFila(row, maestros, clasificacion);

  return buildRegistro({
    id: Number(row.id),
    ...base,
    fechaFactura: String(row.fecha_caja ?? ""),
    base10: toFormDecimal(Number(row.total_caja ?? 0)),
    pagado: Boolean(row.cobrado),
    fechaPago: String(row.fecha_cobro ?? ""),
    observaciones: String(row.observaciones ?? ""),
  });
}

function hidratarNotaVaria(
  row: Record<string, unknown>,
  maestros: MaestrosPersistencia,
  clasificacion: ClasificacionMapa
) {
  const base = resolverEtiquetasDesdeFila(row, maestros, clasificacion);

  return buildRegistro({
    id: Number(row.id),
    ...base,
    fechaFactura: String(row.fecha_nota ?? ""),
    base21: toFormDecimal(Number(row.total_nota ?? 0)),
    pagado: true,
    observaciones: String(row.observaciones ?? ""),
  });
}

export async function listarFacturasRecibidasPersistidas(clasificacion: ClasificacionMapa) {
  return listarTabla("operativa_facturas_recibidas", hidratarFacturaRecibida, clasificacion);
}

export async function listarFacturasEmitidasPersistidas(clasificacion: ClasificacionMapa) {
  return listarTabla("operativa_facturas_emitidas", hidratarFacturaEmitida, clasificacion);
}

export async function listarAlquileresPersistidos(clasificacion: ClasificacionMapa) {
  return listarTabla("operativa_alquileres", hidratarAlquiler, clasificacion);
}

export async function listarGastosBancariosPersistidos(clasificacion: ClasificacionMapa) {
  return listarTabla("operativa_gastos_bancarios", hidratarGastoBancario, clasificacion);
}

export async function listarCreditosPersistidos(clasificacion: ClasificacionMapa) {
  return listarTabla("operativa_creditos", hidratarCredito, clasificacion);
}

export async function listarImpuestosPersistidos(clasificacion: ClasificacionMapa) {
  return listarTabla("operativa_impuestos", hidratarImpuesto, clasificacion);
}

export async function listarPersonalPersistido(clasificacion: ClasificacionMapa) {
  return listarTabla("operativa_personal", hidratarPersonal, clasificacion);
}

export async function listarCajaPersistida(clasificacion: ClasificacionMapa) {
  return listarTabla("operativa_caja", hidratarCaja, clasificacion);
}

export async function listarNotasVariasPersistidas(clasificacion: ClasificacionMapa) {
  return listarTabla("operativa_notas_varias", hidratarNotaVaria, clasificacion);
}

export async function guardarFacturaRecibidaPersistida(
  registro: RegistroOperativaEntrada,
  clasificacion: ClasificacionMapa
) {
  const actual = normalizarEntrada(registro);
  const maestros = await cargarMaestrosPersistencia();
  const empresaId = resolverId(maestros.empresas, actual.empresa);
  const proveedorId = resolverId(maestros.proveedores, actual.proveedor);
  const { tipoId, familiaId, subfamiliaId } = resolverClasificacionIds(actual, clasificacion, maestros);
  const formaPagoId = actual.formaPago ? resolverId(maestros.formasPago, actual.formaPago) : null;
  const bancoId = actual.banco ? resolverId(maestros.bancos, actual.banco) : null;
  const base0 = round2(parseDecimal(actual.base0));
  const base4 = round2(parseDecimal(actual.base4));
  const base10 = round2(parseDecimal(actual.base10));
  const base21 = round2(parseDecimal(actual.base21));
  const totalBase = round2(base0 + base4 + base10 + base21);
  const totalIva = round2(base4 * 0.04 + base10 * 0.1 + base21 * 0.21);
  const totalFactura = round2(totalBase + totalIva);

  if (!empresaId || !proveedorId) {
    throw new Error("No se pudo resolver Local o Proveedor en BBDD");
  }

  return guardarTabla(
    "operativa_facturas_recibidas",
    actual,
    {
      empresa_id: empresaId,
      proveedor_id: proveedorId,
      fecha_factura: actual.fechaFactura,
      numero_factura: actual.numeroFactura.trim(),
      tipo_id: tipoId,
      familia_id: familiaId,
      subfamilia_id: subfamiliaId,
      base_0: base0,
      base_4: base4,
      base_10: base10,
      base_21: base21,
      total_base: totalBase,
      total_iva: totalIva,
      total_factura: totalFactura,
      pagado: actual.pagado,
      fecha_pago: actual.fechaPago || null,
      forma_pago_id: formaPagoId,
      banco_id: bancoId,
      numero_pagare: actual.numeroPagare.trim() || null,
      observaciones: actual.observaciones.trim(),
      adjunto_nombre: null,
      adjunto_url: null,
    },
    hidratarFacturaRecibida,
    clasificacion
  );
}

export async function guardarFacturaEmitidaPersistida(
  registro: RegistroOperativaEntrada,
  clasificacion: ClasificacionMapa
) {
  const actual = normalizarEntrada(registro);
  const maestros = await cargarMaestrosPersistencia();
  const empresaId = resolverId(maestros.empresas, actual.empresa);
  const clienteId = resolverId(maestros.clientes, actual.cliente);
  const { tipoId, familiaId, subfamiliaId } = resolverClasificacionIds(actual, clasificacion, maestros);
  const formaCobroId = actual.formaPago ? resolverId(maestros.formasPago, actual.formaPago) : null;
  const bancoId = actual.banco ? resolverId(maestros.bancos, actual.banco) : null;
  const base0 = round2(parseDecimal(actual.base0));
  const base4 = round2(parseDecimal(actual.base4));
  const base10 = round2(parseDecimal(actual.base10));
  const base21 = round2(parseDecimal(actual.base21));
  const totalBase = round2(base0 + base4 + base10 + base21);
  const totalIva = round2(base4 * 0.04 + base10 * 0.1 + base21 * 0.21);
  const totalFactura = round2(totalBase + totalIva);

  if (!empresaId || !clienteId) {
    throw new Error("No se pudo resolver Local o Cliente en BBDD");
  }

  return guardarTabla(
    "operativa_facturas_emitidas",
    actual,
    {
      empresa_id: empresaId,
      cliente_id: clienteId,
      fecha_factura: actual.fechaFactura,
      numero_factura: actual.numeroFactura.trim(),
      tipo_id: tipoId,
      familia_id: familiaId,
      subfamilia_id: subfamiliaId,
      base_0: base0,
      base_4: base4,
      base_10: base10,
      base_21: base21,
      total_base: totalBase,
      total_iva: totalIva,
      total_factura: totalFactura,
      cobrado: actual.pagado,
      fecha_cobro: actual.fechaPago || null,
      forma_cobro_id: formaCobroId,
      banco_id: bancoId,
      numero_pagare: actual.numeroPagare.trim() || null,
      observaciones: actual.observaciones.trim(),
      adjunto_nombre: null,
      adjunto_url: null,
    },
    hidratarFacturaEmitida,
    clasificacion
  );
}

export async function guardarAlquilerPersistido(
  registro: RegistroOperativaEntrada,
  clasificacion: ClasificacionMapa
) {
  const actual = normalizarEntrada(registro);
  const maestros = await cargarMaestrosPersistencia();
  const empresaId = resolverId(maestros.empresas, actual.empresa);
  const proveedorId = resolverId(maestros.proveedores, actual.proveedor);
  const { tipoId, familiaId, subfamiliaId } = resolverClasificacionIds(actual, clasificacion, maestros);
  const formaPagoId = actual.formaPago ? resolverId(maestros.formasPago, actual.formaPago) : null;
  const bancoId = actual.banco ? resolverId(maestros.bancos, actual.banco) : null;
  const base0 = round2(parseDecimal(actual.base0));
  const base4 = round2(parseDecimal(actual.base4));
  const base10 = round2(parseDecimal(actual.base10));
  const base21 = round2(parseDecimal(actual.base21));
  const retencion = round2(base21 * 0.19);
  const totalBase = round2(base0 + base21);
  const totalIva = round2(base21 * 0.21);
  const totalFactura = round2(totalBase + totalIva);

  if (!empresaId || !proveedorId) {
    throw new Error("No se pudo resolver Local o Proveedor en BBDD");
  }

  return guardarTabla(
    "operativa_alquileres",
    actual,
    {
      empresa_id: empresaId,
      proveedor_id: proveedorId,
      fecha_alquiler: actual.fechaFactura,
      numero_factura: actual.numeroFactura.trim() || null,
      tipo_id: tipoId,
      familia_id: familiaId,
      subfamilia_id: subfamiliaId,
      retencion,
      base_0: base0,
      base_4: base4,
      base_10: base10,
      base_21: base21,
      total_base: totalBase,
      total_iva: totalIva,
      total_factura: totalFactura,
      pagado: actual.pagado,
      fecha_pago: actual.fechaPago || null,
      forma_pago_id: formaPagoId,
      banco_id: bancoId,
      numero_pagare: actual.numeroPagare.trim() || null,
      observaciones: actual.observaciones.trim(),
      adjunto_nombre: null,
      adjunto_url: null,
    },
    hidratarAlquiler,
    clasificacion
  );
}

export async function guardarGastoBancarioPersistido(
  registro: RegistroOperativaEntrada,
  clasificacion: ClasificacionMapa
) {
  const actual = normalizarEntrada(registro);
  const maestros = await cargarMaestrosPersistencia();
  const empresaId = resolverId(maestros.empresas, actual.empresa);
  const { tipoId, familiaId, subfamiliaId } = resolverClasificacionIds(actual, clasificacion, maestros);
  const formaPagoId = actual.formaPago ? resolverId(maestros.formasPago, actual.formaPago) : null;
  const bancoId = actual.banco ? resolverId(maestros.bancos, actual.banco) : null;
  const totalGasto = round2(parseDecimal(actual.base21));

  if (!empresaId) {
    throw new Error("No se pudo resolver Local en BBDD");
  }

  return guardarTabla(
    "operativa_gastos_bancarios",
    actual,
    {
      empresa_id: empresaId,
      fecha_gasto: actual.fechaFactura,
      tipo_id: tipoId,
      familia_id: familiaId,
      subfamilia_id: subfamiliaId,
      concepto_gasto_bancario_id: null,
      total_gasto: totalGasto,
      pagado: actual.pagado,
      fecha_pago: actual.fechaPago || null,
      forma_pago_id: formaPagoId,
      banco_id: bancoId,
      observaciones: actual.observaciones.trim(),
      adjunto_nombre: null,
      adjunto_url: null,
    },
    hidratarGastoBancario,
    clasificacion
  );
}

export async function guardarCreditoPersistido(
  registro: RegistroOperativaEntrada,
  clasificacion: ClasificacionMapa
) {
  const actual = normalizarEntrada(registro);
  const maestros = await cargarMaestrosPersistencia();
  const empresaId = resolverId(maestros.empresas, actual.empresa);
  const { tipoId, familiaId, subfamiliaId } = resolverClasificacionIds(actual, clasificacion, maestros);
  const formaPagoId = actual.formaPago ? resolverId(maestros.formasPago, actual.formaPago) : null;
  const bancoId = actual.banco ? resolverId(maestros.bancos, actual.banco) : null;
  const totalCredito = round2(parseDecimal(actual.base21));

  if (!empresaId) {
    throw new Error("No se pudo resolver Local en BBDD");
  }

  return guardarTabla(
    "operativa_creditos",
    actual,
    {
      empresa_id: empresaId,
      fecha_credito: actual.fechaFactura,
      tipo_id: tipoId,
      familia_id: familiaId,
      subfamilia_id: subfamiliaId,
      total_credito: totalCredito,
      pagado: actual.pagado,
      fecha_pago: actual.fechaPago || null,
      forma_pago_id: formaPagoId,
      banco_id: bancoId,
      observaciones: actual.observaciones.trim(),
      adjunto_nombre: null,
      adjunto_url: null,
    },
    hidratarCredito,
    clasificacion
  );
}

export async function guardarImpuestoPersistido(
  registro: RegistroOperativaEntrada,
  clasificacion: ClasificacionMapa
) {
  const actual = normalizarEntrada(registro);
  const maestros = await cargarMaestrosPersistencia();
  const empresaId = resolverId(maestros.empresas, actual.empresa);
  const proveedorId = resolverId(maestros.proveedores, actual.proveedor);
  const { tipoId, familiaId, subfamiliaId } = resolverClasificacionIds(actual, clasificacion, maestros);
  const formaPagoId = actual.formaPago ? resolverId(maestros.formasPago, actual.formaPago) : null;
  const bancoId = actual.banco ? resolverId(maestros.bancos, actual.banco) : null;
  const totalImpuesto = round2(parseDecimal(actual.base21));

  if (!empresaId || !proveedorId) {
    throw new Error("No se pudo resolver Local o Proveedor en BBDD");
  }

  return guardarTabla(
    "operativa_impuestos",
    actual,
    {
      empresa_id: empresaId,
      proveedor_id: proveedorId,
      fecha_impuesto: actual.fechaFactura,
      tipo_id: tipoId,
      familia_id: familiaId,
      subfamilia_id: subfamiliaId,
      total_impuesto: totalImpuesto,
      pagado: actual.pagado,
      fecha_pago: actual.fechaPago || null,
      forma_pago_id: formaPagoId,
      banco_id: bancoId,
      numero_pagare: actual.numeroPagare.trim() || null,
      observaciones: actual.observaciones.trim(),
      adjunto_nombre: null,
      adjunto_url: null,
    },
    hidratarImpuesto,
    clasificacion
  );
}

export async function guardarPersonalPersistido(
  registro: RegistroOperativaEntrada,
  clasificacion: ClasificacionMapa
) {
  const actual = normalizarEntrada(registro);
  const maestros = await cargarMaestrosPersistencia();
  const empresaId = resolverId(maestros.empresas, actual.empresa);
  const { tipoId, familiaId, subfamiliaId } = resolverClasificacionIds(actual, clasificacion, maestros);
  const base0 = round2(parseDecimal(actual.base0));
  const base21 = round2(parseDecimal(actual.base21));
  const totalBase = round2(base0 + base21);
  const totalIva = round2(base21 * 0.21);
  const totalPersonal = round2(totalBase + totalIva);

  if (!empresaId) {
    throw new Error("No se pudo resolver Local en BBDD");
  }

  return guardarTabla(
    "operativa_personal",
    actual,
    {
      empresa_id: empresaId,
      fecha_personal: actual.fechaFactura,
      tipo_id: tipoId,
      familia_id: familiaId,
      subfamilia_id: subfamiliaId,
      base_0: base0,
      base_21: base21,
      total_base: totalBase,
      total_iva: totalIva,
      total_personal: totalPersonal,
      observaciones: actual.observaciones.trim(),
      adjunto_nombre: null,
      adjunto_url: null,
    },
    hidratarPersonal,
    clasificacion
  );
}

export async function guardarCajaPersistida(
  registro: RegistroOperativaEntrada,
  clasificacion: ClasificacionMapa
) {
  const actual = normalizarEntrada(registro);
  const maestros = await cargarMaestrosPersistencia();
  const empresaId = resolverId(maestros.empresas, actual.empresa);
  const { tipoId, familiaId, subfamiliaId } = resolverClasificacionIds(actual, clasificacion, maestros);
  const formaCobroId = actual.formaPago ? resolverId(maestros.formasPago, actual.formaPago) : null;
  const bancoId = actual.banco ? resolverId(maestros.bancos, actual.banco) : null;
  const totalCaja = round2(parseDecimal(actual.base10));
  const totalBase = round2(totalCaja / 1.1);
  const totalIva = round2(totalCaja - totalBase);

  if (!empresaId) {
    throw new Error("No se pudo resolver Local en BBDD");
  }

  return guardarTabla(
    "operativa_caja",
    actual,
    {
      empresa_id: empresaId,
      fecha_caja: actual.fechaFactura,
      tipo_id: tipoId,
      familia_id: familiaId,
      subfamilia_id: subfamiliaId,
      total_base: totalBase,
      total_iva: totalIva,
      total_caja: totalCaja,
      cobrado: actual.pagado,
      fecha_cobro: actual.fechaPago || null,
      forma_cobro_id: formaCobroId,
      banco_id: bancoId,
      observaciones: actual.observaciones.trim(),
      adjunto_nombre: null,
      adjunto_url: null,
    },
    hidratarCaja,
    clasificacion
  );
}

export async function guardarNotaVariaPersistida(
  registro: RegistroOperativaEntrada,
  clasificacion: ClasificacionMapa
) {
  const actual = normalizarEntrada(registro);
  const maestros = await cargarMaestrosPersistencia();
  const empresaId = resolverId(maestros.empresas, actual.empresa);
  const { tipoId, familiaId, subfamiliaId } = resolverClasificacionIds(actual, clasificacion, maestros);
  const totalNota = round2(parseDecimal(actual.base21));

  if (!empresaId) {
    throw new Error("No se pudo resolver Local en BBDD");
  }

  return guardarTabla(
    "operativa_notas_varias",
    actual,
    {
      empresa_id: empresaId,
      fecha_nota: actual.fechaFactura,
      tipo_id: tipoId,
      familia_id: familiaId,
      subfamilia_id: subfamiliaId,
      total_nota: totalNota,
      observaciones: actual.observaciones.trim(),
      adjunto_nombre: null,
      adjunto_url: null,
    },
    hidratarNotaVaria,
    clasificacion
  );
}
