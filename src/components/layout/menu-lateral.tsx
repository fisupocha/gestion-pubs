"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  itemConsultas,
  itemsMaestros,
  itemsOperativa,
} from "@/config/menu/items-menu";

function MenuLink({
  href,
  label,
  activo,
}: {
  href: string;
  label: string;
  activo: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        activo
          ? "rounded-xl border border-[#cdb08b] bg-[linear-gradient(180deg,#fff3dc_0%,#e8cfab_100%)] px-2.5 py-1.5 text-[12px] font-bold text-[#221815] shadow-[0_10px_20px_rgba(19,13,10,0.18)]"
          : "rounded-xl px-2.5 py-1.5 text-[12px] text-[#d7c7b5] transition hover:bg-[rgba(255,244,226,0.08)] hover:text-[#fff5e7]"
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
}: {
  titulo: string;
  items: Array<{ href: string; label: string }>;
  pathname: string;
}) {
  return (
    <div className="rounded-[18px] border border-[rgba(224,195,158,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0.015)_100%)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="mb-1 px-1 text-center text-[9px] font-black uppercase tracking-[0.24em] text-[#c7ae8d]">
        {titulo}
      </div>

      <div className="grid gap-0.5">
        {items.map((item) => (
          <MenuLink
            key={item.href}
            href={item.href}
            label={item.label}
            activo={pathname === item.href}
          />
        ))}
      </div>
    </div>
  );
}

export function MenuLateral() {
  const pathname = usePathname();

  return (
    <aside className="w-full md:h-full md:min-h-0 md:w-[256px] md:flex-none">
      <div className="flex h-full min-h-0 flex-col rounded-[24px] border border-[#584334] bg-[linear-gradient(180deg,#30241d_0%,#231914_48%,#1a1310_100%)] px-2.5 py-1.5 shadow-[0_28px_58px_rgba(24,16,12,0.24)] backdrop-blur">
        <nav className="flex flex-1 flex-col gap-0.75">
          <MenuBox titulo="Operativa" items={itemsOperativa} pathname={pathname} />
          <MenuBox titulo="Maestros" items={itemsMaestros} pathname={pathname} />

          <div className="pt-0.25">
            <Link
              href={itemConsultas.href}
              className={
                pathname === itemConsultas.href
                  ? "block rounded-xl border border-[#d2b085] bg-[linear-gradient(180deg,#fff2d7_0%,#dfbf95_100%)] px-2.5 py-1.5 text-center text-[12px] font-black text-[#1f1612] shadow-[0_10px_20px_rgba(17,12,9,0.18)]"
                  : "block rounded-xl border border-[#5e4638] bg-[linear-gradient(180deg,#3a2b23_0%,#2b2019_100%)] px-2.5 py-1.5 text-center text-[12px] font-black text-[#f3e6d7] shadow-[0_8px_16px_rgba(14,10,8,0.18)] transition hover:bg-[linear-gradient(180deg,#433128_0%,#32241d_100%)]"
              }
            >
              {itemConsultas.label}
            </Link>
          </div>
        </nav>
      </div>
    </aside>
  );
}
