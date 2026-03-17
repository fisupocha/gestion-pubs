import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export default function BancosPage() {
  redirect("/maestros/varios");
}
