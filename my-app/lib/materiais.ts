/**
 * Tipos e constantes de materiais (seguro para client e server).
 * A consulta ao banco fica em `lib/materiais-data.ts` (so server).
 */

export type MaterialUnidade =
  | "un"
  | "m"
  | "m2"
  | "barra"
  | "kg"
  | "par"
  | "conjunto";

export const UNIDADES: { value: MaterialUnidade; label: string }[] = [
  { value: "un", label: "un — unidade" },
  { value: "m", label: "m — metro" },
  { value: "m2", label: "m² — metro quadrado" },
  { value: "barra", label: "barra" },
  { value: "kg", label: "kg — quilograma" },
  { value: "par", label: "par" },
  { value: "conjunto", label: "conjunto" },
];

export type Material = {
  id: number;
  nome: string;
  unidade: MaterialUnidade;
  imagem_url: string | null;
  ativo: boolean;
  created_at: string;
};
