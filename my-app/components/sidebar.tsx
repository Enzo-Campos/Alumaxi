"use client";

import { useEffect, useState } from "react";
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
  Menu,
  X,
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

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
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
                    onClick={onNavigate}
                    className={[
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] transition-colors lg:py-2 lg:text-[13.5px]",
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
  );
}

function UserCard({ user }: { user: SidebarUser }) {
  return (
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
          className="grid h-9 w-9 place-items-center rounded-lg text-white/45 transition-colors hover:bg-white/10 hover:text-white lg:h-7 lg:w-7"
        >
          <LogOut size={15} />
        </button>
      </form>
    </div>
  );
}

export function Sidebar({ user }: { user: SidebarUser }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col text-white lg:flex">
      {/* marca */}
      <div className="flex h-20 items-center px-6">
        <Logo variant="full" priority className="h-12 w-auto" />
      </div>
      <NavLinks />
      <UserCard user={user} />
    </aside>
  );
}

/** Topo + gaveta de navegacao para telas abaixo de lg. */
export function MobileNav({ user }: { user: SidebarUser }) {
  const [open, setOpen] = useState(false);

  // trava o scroll do fundo e fecha com Esc
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <header className="flex h-14 items-center justify-between px-3 lg:hidden">
        <Logo variant="full" priority className="ml-2 h-7 w-auto" />
        <button
          type="button"
          aria-label="Abrir menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Menu size={22} />
        </button>
      </header>

      <div
        className={`fixed inset-0 z-40 lg:hidden ${open ? "" : "pointer-events-none"}`}
        inert={!open}
      >
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/50 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className={`absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-navy bg-brand-gradient pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-white shadow-2xl transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex h-16 items-center justify-between pl-6 pr-3">
            <Logo variant="full" className="h-9 w-auto" />
            <button
              type="button"
              aria-label="Fechar menu"
              onClick={() => setOpen(false)}
              className="grid h-10 w-10 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
          <NavLinks onNavigate={() => setOpen(false)} />
          <UserCard user={user} />
        </aside>
      </div>
    </>
  );
}
