import type { Metadata } from "next";
import "./globals.css";
import {
  MarcoContenidoApp,
  ProveedorAccesoApp,
} from "@/components/acceso/control-acceso-app";
import { MenuLateral } from "@/components/layout/menu-lateral";

export const metadata: Metadata = {
  title: "Gestion Pubs",
  description: "Aplicacion de gestion para pubs y locales",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="app-shell bg-stone-100 text-stone-900">
        <ProveedorAccesoApp>
          <div className="app-frame">
            <MenuLateral />
            <MarcoContenidoApp>{children}</MarcoContenidoApp>
          </div>
        </ProveedorAccesoApp>
      </body>
    </html>
  );
}
