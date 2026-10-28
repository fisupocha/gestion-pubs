export type TipoIvaRecibida = "4" | "10" | "21";
export type IvaManualRecibida = Partial<Record<TipoIvaRecibida, { base: number; cuota: string }>>;
export const tiposIvaRecibida: TipoIvaRecibida[] = ["4", "10", "21"];
const redondear = (n: number) => Math.round(n * 100) / 100;

export function cuotasFacturaRecibida(
  bases: { base0: number; base4: number; base10: number; base21: number },
  manual?: IvaManualRecibida | null,
) {
  if (manual && (typeof manual !== "object" || Array.isArray(manual) || Object.keys(manual).some(k => !tiposIvaRecibida.includes(k as TipoIvaRecibida)))) throw new Error("Desglose de IVA manual no válido.");
  const cuotas = {} as Record<TipoIvaRecibida, number>;
  for (const tipo of tiposIvaRecibida) {
    const base = bases[`base${tipo}`];
    if (!Number.isFinite(base)) throw new Error("Base imponible no válida.");
    const ajuste = manual?.[tipo];
    cuotas[tipo] = redondear(base * Number(tipo) / 100);
    if (ajuste !== undefined) {
      if (!ajuste || typeof ajuste.cuota !== "string" || !/^-?\d+(?:[.,]\d{1,2})?$/.test(ajuste.cuota) || !Number.isFinite(ajuste.base) || redondear(ajuste.base) !== redondear(base)) throw new Error(`Revisa la cuota IVA ${tipo}%: la base cambió o el importe no es válido.`);
      const cuota = Number(ajuste.cuota.replace(",", "."));
      if (!Number.isFinite(cuota) || (base === 0 && cuota !== 0) || base * cuota < 0) throw new Error(`Cuota IVA ${tipo}% incompatible con su base.`);
      cuotas[tipo] = cuota;
    }
  }
  const totalBase = redondear(bases.base0 + bases.base4 + bases.base10 + bases.base21);
  // Sin correcciones conserva exactamente el cálculo histórico de persistencia.
  const totalIva = redondear(manual && Object.keys(manual).length
    ? cuotas["4"] + cuotas["10"] + cuotas["21"]
    : bases.base4 * .04 + bases.base10 * .1 + bases.base21 * .21);
  return { cuotas, totalBase, totalIva, totalFactura: redondear(totalBase + totalIva) };
}
