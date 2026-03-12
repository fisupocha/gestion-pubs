import type { Metadata } from "next";
import "./globals.css";
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
        <div className="app-frame">
          <MenuLateral />
          <main className="app-main">
            <div className="page-body">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
