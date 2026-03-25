"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ResumenAccesoMenu,
  useAccesoApp,
} from "@/components/acceso/control-acceso-app";
import {
  itemConsultas,
  itemsGestionDiaria,
  itemsMaestros,
  itemsOperativa,
} from "@/config/menu/items-menu";

function MenuLink({
  href,
  label,
  activo,
  onClick,
  className = "",
}: {
  href: string;
  label: string;
  activo: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={
        activo
          ? `flex h-full w-full items-center rounded-xl border border-[#cdb08b] bg-[linear-gradient(180deg,#fff3dc_0%,#e8cfab_100%)] px-3.5 text-[15px] font-bold text-[#221815] shadow-[0_10px_20px_rgba(19,13,10,0.18)] ${className}`
          : `flex h-full w-full items-center rounded-xl px-3.5 text-[15px] text-[#d7c7b5] transition hover:bg-[rgba(255,244,226,0.08)] hover:text-[#fff5e7] ${className}`
      }
    >
      {label}
    </Link>
  );
}

function MenuBox({
  titulo,
  items,
  pathname,
  colapsable = false,
  abierto = true,
  onToggle,
  onItemClick,
  className = "",
  itemsClassName = "grid gap-1",
  itemClassName = "",
}: {
  titulo: string;
  items: Array<{ href: string; label: string }>;
  pathname: string;
  colapsable?: boolean;
  abierto?: boolean;
  onToggle?: () => void;
  onItemClick?: () => void;
  className?: string;
  itemsClassName?: string;
  itemClassName?: string;
}) {
  return (
    <div
      className={`rounded-[18px] border border-[rgba(224,195,158,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0.015)_100%)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${className}`}
    >
      {colapsable ? (
        <button
          type="button"
          onClick={onToggle}
          className="relative mb-1 flex w-full items-center justify-end rounded-xl px-2 py-1.75 text-left transition hover:bg-[rgba(255,244,226,0.05)]"
        >
          <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-[0.22em] text-[#c7ae8d]">
            {titulo}
          </span>

          <span className="text-[12px] font-black text-[#c7ae8d]">
            {abierto ? "-" : "+"}
          </span>
        </button>
      ) : (
        <div className="mb-1 px-1 text-center text-[9px] font-black uppercase tracking-[0.24em] text-[#c7ae8d]">
          {titulo}
        </div>
      )}

      {abierto ? (
        <div className={itemsClassName}>
          {items.map((item) => (
            <MenuLink
              key={item.href}
              href={item.href}
              label={item.label}
              activo={pathname === item.href}
              onClick={onItemClick}
              className={itemClassName}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function MenuLateral() {
  const pathname = usePathname();
  const acceso = useAccesoApp();

  if (
    pathname === "/consultas/reparto-riverocio" ||
    pathname.startsWith("/maestros/empleados/cuadrante-demo") ||
    pathname.startsWith("/gestion-diaria/empleados/cuadrante-demo") ||
    pathname.startsWith("/gestion-diaria/caja-diaria")
  ) {
    return null;
  }

  const itemsOperativaVisibles = acceso.esAdmin
    ? itemsOperativa
    : itemsOperativa.filter(
        (item) =>
          item.href === "/facturas-recibidas" ||
          item.href === "/alquileres" ||
          item.href === "/gastos-bancarios" ||
          item.href === "/creditos" ||
          item.href === "/impuestos" ||
          item.href === "/facturas-emitidas"
      );

  return (
    <aside className="w-full md:h-full md:min-h-0 md:w-[256px] md:flex-none">
      <div className="flex h-full min-h-0 flex-col rounded-[24px] border border-[#584334] bg-[linear-gradient(180deg,#30241d_0%,#231914_48%,#1a1310_100%)] px-2.5 py-1.5 shadow-[0_28px_58px_rgba(24,16,12,0.24)] backdrop-blur">
        <nav className="flex flex-1 min-h-0 flex-col">
          <div className="flex-1 min-h-0">
            <MenuBox
              titulo="Operativa"
              items={itemsOperativaVisibles}
              pathname={pathname}
              className="flex h-full flex-col"
              itemsClassName="grid h-full gap-0.5"
              itemClassName=""
            />
          </div>

          <div className="mt-1.5 flex flex-col gap-1.5">
            <MenuBox
              titulo="Maestros"
              items={itemsMaestros}
              pathname={pathname}
              itemsClassName="grid gap-1.5"
              itemClassName="min-h-[40px]"
            />

            <MenuBox
              titulo="Gestión diaria"
              items={itemsGestionDiaria}
              pathname={pathname}
              itemsClassName="grid gap-1.5"
              itemClassName="min-h-[40px]"
            />

            {acceso.esAdmin ? (
              <Link
                href={itemConsultas.href}
                className={
                  pathname === itemConsultas.href
                    ? "block rounded-xl border border-[#d2b085] bg-[linear-gradient(180deg,#fff2d7_0%,#dfbf95_100%)] px-3 py-2.5 text-center text-[14px] font-black text-[#1f1612] shadow-[0_10px_20px_rgba(17,12,9,0.18)]"
                    : "block rounded-xl border border-[#5e4638] bg-[linear-gradient(180deg,#3a2b23_0%,#2b2019_100%)] px-3 py-2.5 text-center text-[14px] font-black text-[#f3e6d7] shadow-[0_8px_16px_rgba(14,10,8,0.18)] transition hover:bg-[linear-gradient(180deg,#433128_0%,#32241d_100%)]"
                }
              >
                {itemConsultas.label}
              </Link>
            ) : null}

            <ResumenAccesoMenu />
          </div>
        </nav>
      </div>
    </aside>
  );
}
