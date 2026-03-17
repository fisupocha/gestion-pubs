import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export default function FamiliasPage() {
  redirect("/maestros/clasificacion");
}
