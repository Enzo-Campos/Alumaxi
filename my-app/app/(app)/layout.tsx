import { redirect } from "next/navigation";
import { MobileNav, Sidebar, type SidebarUser } from "@/components/sidebar";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";

function initialsFrom(email: string): string {
  const name = email.split("@")[0] ?? "";
  const parts = name.split(/[.\-_]+/).filter(Boolean);
  const chars = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "");
  return chars.toUpperCase() || "U";
}

export default async function AppLayout({ children }: LayoutProps<"/">) {
  let user: SidebarUser = {
    label: "Modo demonstracao",
    sub: "Supabase nao configurado",
    initials: "AX",
  };

  if (supabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) redirect("/login");
    user = {
      label: authUser.email ?? "Usuario",
      sub: "Autenticado",
      initials: initialsFrom(authUser.email ?? "u"),
    };
  }

  return (
    <div className="relative min-h-full bg-navy">
      {/* fundo marinho com gradiente + grao, igual ao login */}
      <div
        aria-hidden
        className="grain fixed inset-0 -z-10 overflow-hidden bg-brand-gradient"
      >
        <div className="absolute -bottom-48 -right-40 h-[540px] w-[540px] rounded-full bg-steel/20 blur-[150px]" />
        <div className="absolute -left-44 -top-44 h-[440px] w-[440px] rounded-full bg-[#02030c]/80 blur-[130px]" />
      </div>

      <Sidebar user={user} />

      {/* topo + gaveta mobile (sidebar fica oculta abaixo de lg) */}
      <MobileNav user={user} />

      <div className="lg:pl-60">
        {/* parte clara do app como painel arredondado sobre o marinho */}
        <div className="p-2.5 sm:p-3.5 lg:py-3.5 lg:pr-3.5">
          <main className="min-h-[calc(100dvh-1.25rem)] rounded-[26px] bg-surface px-5 py-6 shadow-[0_1px_2px_rgba(0,0,0,0.25)] ring-1 ring-black/5 sm:px-8 sm:py-8 lg:min-h-[calc(100dvh-1.75rem)]">
            <div className="mx-auto max-w-[1180px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
