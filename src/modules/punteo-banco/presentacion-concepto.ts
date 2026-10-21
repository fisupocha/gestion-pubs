export function textoPrincipalMovimiento(nuestroConcepto: string, conceptoBancario: string) {
  const propio = nuestroConcepto.trim();

  if (propio) {
    return propio;
  }

  const banco = conceptoBancario.trim();
  return banco || "Sin concepto";
}

export function conceptoBancarioSecundario(nuestroConcepto: string, conceptoBancario: string) {
  if (!nuestroConcepto.trim()) {
    return null;
  }

  const banco = conceptoBancario.trim();
  return banco || null;
}
