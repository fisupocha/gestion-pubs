export function aplicarAlturaAlContenido(campo: { style: { height: string; overflow: string }; scrollHeight: number }) {
  campo.style.overflow = "hidden";
  campo.style.height = "auto";
  const alto = Number.isFinite(campo.scrollHeight) ? Math.max(0, campo.scrollHeight) : 0;
  campo.style.height = `${alto}px`;
}
