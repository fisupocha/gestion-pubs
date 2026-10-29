import { leerEscandalloPrivado } from "@/modules/mercaderias-escandallos/escandallo-privado";
import { configuracionVacia } from "@/modules/mercaderias-escandallos/escandallo";
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
  let rojas: Awaited<ReturnType<typeof leerBajadaPrivada>> = {referencias:[],compras:[]};
  let errorRojas = "";
  try { rojas = await leerBajadaPrivada(supabase,"rojas"); }
  catch { errorRojas = "No se ha podido leer la prueba privada de Rojas Barrios. Los otros proveedores siguen disponibles."; }
  let escandallo={datos:configuracionVacia,configurada:false},errorEscandallo="";
  try { escandallo=await leerEscandalloPrivado(supabase); }
  catch(e) { errorEscandallo=e instanceof Error?e.message:"No se pudieron leer los escandallos."; }
  return <PantallaMercaderias configEscandallo={escandallo.datos} escandalloConfigurado={escandallo.configurada} errorEscandallo={errorEscandallo} referenciasCoca={coca.referencias} comprasCoca={coca.compras} errorCoca={errorCoca} bajada={bajada} errorBajada={errorBajada} rojas={rojas} errorRojas={errorRojas} />;
}
