import { PantallaMercaderias } from "@/modules/mercaderias-escandallos/pantalla";
import { crearSupabaseServidor } from "@/lib/supabase-servidor";
import { redirect } from "next/navigation";
import { leerCocaPrivada } from "@/modules/mercaderias-escandallos/cocacola-privado";
import { leerBajadaPrivada } from "@/modules/mercaderias-escandallos/bajada-privado";

export const metadata = { title: "Mercaderías y escandallos | Gestión Pubs" };

export default async function MercaderiasPage() {
  // Las condiciones comerciales no se incrustan en archivos JavaScript públicos.
  // Se entregan solo tras comprobar identidad y rol con la sesión normal, sin claves administrativas.
  const supabase = await crearSupabaseServidor();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  const { data: perfil, error: errorPerfil } = await supabase.from("perfiles").select("rol").eq("user_id", data.user.id).maybeSingle();
  if (errorPerfil || perfil?.rol !== "admin") redirect("/facturas-recibidas");
  let coca: Awaited<ReturnType<typeof leerCocaPrivada>> = {referencias:[],compras:[]};
  let errorCoca = "";
  try { coca = await leerCocaPrivada(supabase); }
  catch { errorCoca = "No se ha podido leer la prueba privada de Coca-Cola. Reyes Magos sigue disponible."; }
  let bajada: Awaited<ReturnType<typeof leerBajadaPrivada>> = {referencias:[],compras:[]};
  let errorBajada = "";
  try { bajada = await leerBajadaPrivada(supabase); }
  catch { errorBajada = "No se ha podido leer la prueba privada de La Bajada. Los otros proveedores siguen disponibles."; }
  return <PantallaMercaderias referenciasCoca={coca.referencias} comprasCoca={coca.compras} errorCoca={errorCoca} bajada={bajada} errorBajada={errorBajada} />;
}
