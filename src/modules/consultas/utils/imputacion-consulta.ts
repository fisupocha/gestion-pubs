import type { RepartoEspecial } from "@/modules/consultas/utils/reparto-especial";

export type TratamientoEmitida = "caja" | "contabilidad" | "compensacion" | "clasico";

export type TrozoImputacion = {
  mes: string;
  conIva: number;
  sinIva: number;
  iva: number;
  especial: boolean;
};

const MESES = [
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

export function compactarEtiqueta(value?: string) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function mesDeFecha(fecha: string) {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(fecha);
  return match ? `${match[1]}-${match[2]}` : null;
}

export function ultimoDiaMes(mes: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(mes);
  if (!match) return `${mes}-28`;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${mes}-${String(day).padStart(2, "0")}`;
}

export function mesIntersectaPeriodo(mes: string, desde: string, hasta: string) {
  if (!/^\d{4}-\d{2}$/.test(mes)) return false;
  const inicio = `${mes}-01`;
  const fin = ultimoDiaMes(mes);
  if (desde && fin < desde) return false;
  if (hasta && inicio > hasta) return false;
  return true;
}

export function etiquetaMesLarga(mes: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(mes);
  if (!match) return mes;
  const nombre = MESES[Number(match[2]) - 1];
  if (!nombre) return mes;
  return `${nombre} de ${match[1]}`;
}

export function dividirCentesimas(total: number, partes: number) {
  if (partes <= 0) return [];
  const cents = Math.round(total * 100);
  const sign = cents < 0 ? -1 : 1;
  const abs = Math.abs(cents);
  const base = Math.floor(abs / partes);
  let resto = abs - base * partes;
  return Array.from({ length: partes }, () => {
    const extra = resto > 0 ? 1 : 0;
    if (resto > 0) resto -= 1;
    return (sign * (base + extra)) / 100;
  });
}

export function trozosDeMovimiento(
  item: {
    origen: string;
    fecha: string;
    conIva: number;
    sinIva: number;
    iva: number;
  },
  reparto: Pick<RepartoEspecial, "meses"> | undefined
): TrozoImputacion[] {
  const meses = [...(reparto?.meses ?? [])].filter((mes) => /^\d{4}-\d{2}$/.test(mes));
  const aplica =
    (item.origen === "facturas-emitidas" || item.origen === "facturas-recibidas") &&
    meses.length > 0;

  if (!aplica) {
    const mes = mesDeFecha(item.fecha);
    if (!mes) return [];
    return [
      {
        mes,
        conIva: item.conIva,
        sinIva: item.sinIva,
        iva: item.iva,
        especial: false,
      },
    ];
  }

  const ordenados = [...new Set(meses)].sort();
  const con = dividirCentesimas(item.conIva, ordenados.length);
  const sin = dividirCentesimas(item.sinIva, ordenados.length);
  return ordenados.map((mes, index) => ({
    mes,
    conIva: con[index] ?? 0,
    sinIva: sin[index] ?? 0,
    iva: Math.round(((con[index] ?? 0) - (sin[index] ?? 0)) * 100) / 100,
    especial: true,
  }));
}

export function tratamientoEmitida(item: {
  clase: string;
  tipoLabel: string;
  familiaLabel: string;
  esEmitidaCaja: boolean;
}): TratamientoEmitida {
  if (item.clase !== "emitida") return "clasico";
  if (item.esEmitidaCaja || compactarEtiqueta(item.familiaLabel) === "caja") return "caja";

  const tipo = compactarEtiqueta(item.tipoLabel);
  const familia = compactarEtiqueta(item.familiaLabel);
  if (
    tipo === "ingresos" &&
    (familia.includes("emitid") || familia === "tabaco" || familia.startsWith("maqrec"))
  ) {
    return "contabilidad";
  }
  if (tipo === "mercaderias") return "compensacion";
  return "clasico";
}

export function repartirPorPesos(total: number, pesos: { local: string; peso: number }[]) {
  const cents = Math.round(total * 100);
  const validos = pesos.map((item) => ({
    local: item.local,
    peso: item.peso > 0 ? item.peso : 0,
  }));
  const salida = new Map<string, number>();
  const suma = validos.reduce((acc, item) => acc + item.peso, 0);

  if (suma <= 0 || validos.length === 0) {
    validos.forEach((item) => salida.set(item.local, 0));
    return salida;
  }

  const sign = cents < 0 ? -1 : 1;
  const abs = Math.abs(cents);
  const bruto = validos.map((item) => {
    const exacto = (abs * item.peso) / suma;
    const base = Math.floor(exacto);
    return { ...item, base, fraccion: exacto - base };
  });
  let resto = abs - bruto.reduce((acc, item) => acc + item.base, 0);
  const orden = [...bruto].sort(
    (a, b) => b.fraccion - a.fraccion || b.peso - a.peso || a.local.localeCompare(b.local, "es")
  );
  const extras = new Map<string, number>();
  orden.forEach((item) => {
    if (resto <= 0 || item.peso <= 0) return;
    extras.set(item.local, 1);
    resto -= 1;
  });

  bruto.forEach((item) => {
    salida.set(item.local, (sign * (item.base + (extras.get(item.local) ?? 0))) / 100);
  });
  return salida;
}

export function repartirPorPorcentajes(
  total: number,
  locales: string[],
  porcentajes: Record<string, number>
) {
  const pesos = locales.map((local) => ({
    local,
    peso: Number(porcentajes[local] ?? 0),
  }));
  const suma = pesos.reduce((acc, item) => acc + (Number.isFinite(item.peso) ? item.peso : 0), 0);
  if (Math.abs(suma - 100) <= 0.02) {
    return repartirPorPesos(total, pesos);
  }

  const salida = new Map<string, number>();
  locales.forEach((local) => {
    const porcentaje = Number(porcentajes[local] ?? 0);
    salida.set(local, Math.round(total * (porcentaje / 100) * 100) / 100);
  });
  return salida;
}

export function sumaImportes(values: number[]) {
  return Math.round(values.reduce((acc, item) => acc + Math.round(item * 100), 0)) / 100;
}
