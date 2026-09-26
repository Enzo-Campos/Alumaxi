import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import type { Material } from "@/lib/materiais";

const MOCK: Material[] = [
  {
    id: 1,
    nome: "Vidro temperado incolor 8mm",
    unidade: "m2",
    imagem_url: null,
    ativo: true,
    created_at: "2026-07-01T12:00:00Z",
  },
  {
    id: 2,
    nome: "Perfil de acabamento linha 25",
    unidade: "barra",
    imagem_url: null,
    ativo: true,
    created_at: "2026-07-01T12:00:00Z",
  },
  {
    id: 3,
    nome: "Silicone estrutural preto",
    unidade: "un",
    imagem_url: null,
    ativo: false,
    created_at: "2026-07-01T12:00:00Z",
  },
];

export async function getMateriais(): Promise<Material[]> {
  if (!supabaseConfigured) return MOCK;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materiais")
    .select("id,nome,unidade,imagem_url,ativo,created_at")
    .order("nome");

  if (error) throw new Error(`Falha ao carregar materiais: ${error.message}`);
  return (data ?? []) as Material[];
}
