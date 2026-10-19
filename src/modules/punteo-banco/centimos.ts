export function aCentimos(valor: number) {
  const negativo = valor < 0;
  const [euros, decimales = "00"] = Math.abs(valor).toFixed(2).split(".");
  const centimos = Number(euros) * 100 + Number(decimales.slice(0, 2));
  return negativo ? -centimos : centimos;
}

export function desdeCentimos(centimos: number) {
  const negativo = centimos < 0;
  const absoluto = Math.abs(centimos);
  const euros = Math.trunc(absoluto / 100);
  const resto = absoluto % 100;
  return Number(`${negativo ? "-" : ""}${euros}.${String(resto).padStart(2, "0")}`);
}

export function formatearCentimos(centimos: number) {
  const negativo = centimos < 0;
  const absoluto = Math.abs(centimos);
  const euros = Math.trunc(absoluto / 100);
  const resto = absoluto % 100;
  return `${negativo ? "-" : ""}${euros.toLocaleString("es-ES")},${String(resto).padStart(2, "0")}`;
}
