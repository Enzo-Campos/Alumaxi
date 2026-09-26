import Link from "next/link";
import { Hammer } from "lucide-react";
import { Card } from "@/components/card";

/** Placeholder para secoes do menu que ainda nao foram implementadas. */
export function EmConstrucao({
  titulo,
  descricao,
}: {
  titulo: string;
  descricao: string;
}) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-[32px] leading-none tracking-tight text-ink">
          {titulo}
        </h1>
        <p className="mt-2 text-[13px] text-muted">{descricao}</p>
      </header>

      <Card>
        <div className="flex flex-col items-center px-4 py-14 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-steel/10 text-steel">
            <Hammer size={22} />
          </span>
          <h2 className="mt-4 text-[16px] font-semibold text-ink">
            Secao em construcao
          </h2>
          <p className="mt-1.5 max-w-sm text-[13px] text-muted">
            Esta parte do sistema ainda esta sendo desenvolvida e estara
            disponivel em breve.
          </p>
          <Link
            href="/obras"
            className="mt-6 rounded-lg bg-steel px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-steel-600"
          >
            Voltar para Obras
          </Link>
        </div>
      </Card>
    </div>
  );
}
