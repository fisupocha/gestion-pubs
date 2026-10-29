/** Fecha de vigencia empresarial en Madrid, independiente del huso del servidor. */
export function fechaNegocio(instante:Date=new Date()):string {
  const partes=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Madrid",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(instante);
  const valor=(tipo:string)=>partes.find(p=>p.type===tipo)!.value;
  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}
