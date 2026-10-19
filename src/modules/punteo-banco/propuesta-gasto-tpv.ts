import { formatearImporte, redondear } from "./celdas";
import type { BancoPunteoId } from "./modelo";
import { nombreBanco } from "./modelo";
import type { ClaveGastoTpv } from "./resumen-tpv-calculo";

export type PropuestaGastoTpv = {
  banco: BancoPunteoId;
  anio: number;
  mes: number;
  empresa: "Riverocio";
  totalGasto: number;
  fechaGasto: string;
  observaciones: string;
  duplicado: boolean;
};

export function claveGastoTpv(banco: BancoPunteoId, anio: number, mes: number) {
  return `punteo-tpv:${banco}:${anio}-${String(mes).padStart(2, "0")}`;
}

export function proponerGastoComisiones(opciones: {
  banco: BancoPunteoId;
  anio: number;
  mes: number;
  comisiones: number;
  gastosRegistrados: ClaveGastoTpv[];
}): PropuestaGastoTpv {
  const clave = claveGastoTpv(opciones.banco, opciones.anio, opciones.mes);
  const ultimoDia = new Date(Date.UTC(opciones.anio, opciones.mes, 0)).getUTCDate();

  return {
    banco: opciones.banco,
    anio: opciones.anio,
    mes: opciones.mes,
    empresa: "Riverocio",
    totalGasto: redondear(Math.abs(opciones.comisiones)),
    fechaGasto: `${opciones.anio}-${String(opciones.mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`,
    observaciones: `${clave} Comisiones TPV ${nombreBanco(opciones.banco)} ${formatearImporte(Math.abs(opciones.comisiones))} €. Origen Riverocio. Sin reparto entre locales.`,
    duplicado: opciones.gastosRegistrados.some(
      (gasto) =>
        gasto.banco === opciones.banco && gasto.anio === opciones.anio && gasto.mes === opciones.mes
    ),
  };
}
