export function presentacionConcepto(nuestroConcepto: string, conceptoBancario: string): [string, string | null] {
  const banco = conceptoBancario.trim();

  return [nuestroConcepto, banco || null];
}
