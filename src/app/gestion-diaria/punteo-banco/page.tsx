import type { Metadata } from "next";
import { PunteoBancoClient } from "./punteo-banco-client";

export const metadata: Metadata = {
  title: "Punteo banco",
};

export default function PunteoBancoPage() {
  return <PunteoBancoClient />;
}
