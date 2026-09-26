"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Building2,
  Boxes,
  Users,
  HardHat,
  Wrench,
  Wallet,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { Logo } from "@/components/logo";

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavGroup = { title: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    title: "Operacao",
    items: [
      { href: "/painel", label: "Painel", icon: LayoutDashboard },
      { href: "/compras", label: "Compras", icon: ShoppingCart },
      { href: "/obras", label: "Obras", icon: Building2 },
    ],
  },
  {
    title: "Cadastros",
    items: [
      { href: "/materiais", label: "Materiais", icon: Boxes },
      { href: "/funcionarios", label: "Funcionarios", icon: Users },
      { href: "/epis", label: "EPIs", icon: HardHat },
      { href: "/ferramentas", label: "Ferramentas", icon: Wrench },
    ],
  },
  {
    title: "Financeiro",
    items: [{ href: "/financeiro", label: "Contas a pagar", icon: Wallet }],
  },
];

export type SidebarUser = { label: string; sub: string; initials: string };

export function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col text-white lg:flex">
      {/* marca */}
      <div className="flex h-20 items-center px-6">
        <Logo variant="full" priority className="h-12 w-auto" />
      </div>

      <nav className="flex-1 space-y-7 overflow-y-auto px-3 py-4">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={[
                        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition-colors",
                        active
                          ? "bg-white/10 font-semibold text-white"
                          : "text-white/60 hover:bg-white/5 hover:text-white",
                      ].join(" ")}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-steel" />
                      )}
                      <Icon
                        size={17}
                        strokeWidth={2}
                        className={active ? "text-white" : "text-white/45 group-hover:text-white/80"}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* usuario */}
      <div className="m-3 flex items-center gap-3 rounded-xl bg-white/[0.06] px-3 py-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-steel/90 text-[12px] font-semibold">
          {user.initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium">{user.label}</p>
          <p className="truncate text-[11px] text-white/45">{user.sub}</p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            aria-label="Sair"
            className="grid h-7 w-7 place-items-center rounded-lg text-white/45 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut size={15} />
          </button>
        </form>
      </div>
    </aside>
  );
}
