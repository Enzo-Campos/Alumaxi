/**
 * Tipos do banco Alumaxi (PostgreSQL / Supabase).
 *
 * Escrito a mao a partir de `schema_supabase.sql`. Cobre o que o app usa hoje.
 * Para substituir pela versao gerada:
 *   npx supabase gen types typescript --project-id <ref> > lib/supabase/database.types.ts
 */

type Timestamptz = string;
type DateStr = string;

export type Database = {
  public: {
    Tables: {
      clientes: {
        Row: {
          id: number;
          nome: string;
          documento: string | null;
          telefone: string | null;
          email: string | null;
          endereco: string | null;
          obs: string | null;
          created_at: Timestamptz;
          updated_at: Timestamptz;
        };
        Insert: {
          id?: never;
          nome: string;
          documento?: string | null;
          telefone?: string | null;
          email?: string | null;
          endereco?: string | null;
          obs?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["clientes"]["Insert"]>;
        Relationships: [];
      };
      etapas: {
        Row: { id: number; nome: string; ordem: number; ativa: boolean };
        Insert: { id?: never; nome: string; ordem?: number; ativa?: boolean };
        Update: Partial<Database["public"]["Tables"]["etapas"]["Insert"]>;
        Relationships: [];
      };
      materiais: {
        Row: {
          id: number;
          nome: string;
          unidade: Database["public"]["Enums"]["material_unidade"];
          ativo: boolean;
          created_at: Timestamptz;
        };
        Insert: {
          id?: never;
          nome: string;
          unidade?: Database["public"]["Enums"]["material_unidade"];
          ativo?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["materiais"]["Insert"]>;
        Relationships: [];
      };
      obras: {
        Row: {
          id: number;
          id_cliente: number | null;
          nome: string;
          descricao: string | null;
          status: Database["public"]["Enums"]["obra_status"];
          orcamento_material: number;
          percentual_receita: number;
          data_inicio: DateStr | null;
          data_prevista_termino: DateStr | null;
          created_at: Timestamptz;
          updated_at: Timestamptz;
        };
        Insert: {
          id?: never;
          id_cliente?: number | null;
          nome: string;
          descricao?: string | null;
          status?: Database["public"]["Enums"]["obra_status"];
          orcamento_material?: number;
          percentual_receita?: number;
          data_inicio?: DateStr | null;
          data_prevista_termino?: DateStr | null;
        };
        Update: Partial<Database["public"]["Tables"]["obras"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "fk_obra_cliente";
            columns: ["id_cliente"];
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
        ];
      };
      obra_etapas: {
        Row: {
          id_obra: number;
          id_etapa: number;
          status: Database["public"]["Enums"]["obra_etapa_status"];
          data_inicio: Timestamptz | null;
          data_conclusao: Timestamptz | null;
          data_prevista: Timestamptz | null;
        };
        Insert: {
          id_obra: number;
          id_etapa: number;
          status?: Database["public"]["Enums"]["obra_etapa_status"];
          data_inicio?: Timestamptz | null;
          data_conclusao?: Timestamptz | null;
          data_prevista?: Timestamptz | null;
        };
        Update: Partial<Database["public"]["Tables"]["obra_etapas"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "fk_obraetapa_obra";
            columns: ["id_obra"];
            referencedRelation: "obras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_obraetapa_etapa";
            columns: ["id_etapa"];
            referencedRelation: "etapas";
            referencedColumns: ["id"];
          },
        ];
      };
      falta_materiais: {
        Row: {
          id: number;
          id_obra: number;
          id_etapa: number;
          id_material: number;
          quantidade: number;
          especificacoes: string | null;
          data_solicitacao: Timestamptz;
          prazo_entrega: DateStr | null;
          status: Database["public"]["Enums"]["falta_material_status"];
          observacoes: string | null;
        };
        Insert: {
          id?: never;
          id_obra: number;
          id_etapa: number;
          id_material: number;
          quantidade: number;
          especificacoes?: string | null;
          data_solicitacao?: Timestamptz;
          prazo_entrega?: DateStr | null;
          status?: Database["public"]["Enums"]["falta_material_status"];
          observacoes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["falta_materiais"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "fk_falta_obra_etapa";
            columns: ["id_obra", "id_etapa"];
            referencedRelation: "obra_etapas";
            referencedColumns: ["id_obra", "id_etapa"];
          },
          {
            foreignKeyName: "falta_materiais_id_material_fkey";
            columns: ["id_material"];
            referencedRelation: "materiais";
            referencedColumns: ["id"];
          },
        ];
      };
      saidas_financeiras: {
        Row: {
          id: number;
          id_obra: number;
          valor_retirado: number;
          categoria: Database["public"]["Enums"]["saida_categoria"];
          descricao: string | null;
          created_at: Timestamptz;
        };
        Insert: {
          id?: never;
          id_obra: number;
          valor_retirado: number;
          categoria: Database["public"]["Enums"]["saida_categoria"];
          descricao?: string | null;
          created_at?: Timestamptz;
        };
        Update: Partial<Database["public"]["Tables"]["saidas_financeiras"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "fk_saida_obra";
            columns: ["id_obra"];
            referencedRelation: "obras";
            referencedColumns: ["id"];
          },
        ];
      };
      funcionarios: {
        Row: {
          id: number;
          nome: string;
          link_doc: string | null;
          salario: number | null;
          data_admissao: DateStr | null;
          cargo: string | null;
          status: Database["public"]["Enums"]["funcionario_status"];
          data_demissao: DateStr | null;
          obs: string | null;
          created_at: Timestamptz;
          updated_at: Timestamptz;
        };
        Insert: {
          id?: never;
          nome: string;
          link_doc?: string | null;
          salario?: number | null;
          data_admissao?: DateStr | null;
          cargo?: string | null;
          status?: Database["public"]["Enums"]["funcionario_status"];
          data_demissao?: DateStr | null;
          obs?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["funcionarios"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      vw_obras_financeiro: {
        Row: {
          id: number | null;
          nome: string | null;
          status: Database["public"]["Enums"]["obra_status"] | null;
          orcamento_material: number | null;
          percentual_receita: number | null;
          valor_a_receber_total: number | null;
          total_compra_material: number | null;
          total_retirada_lucro: number | null;
          total_saidas: number | null;
          saldo_a_receber: number | null;
          em_prejuizo: boolean | null;
        };
        Relationships: [];
      };
      vw_painel_compras: {
        Row: {
          id: number | null;
          obra: string | null;
          etapa: string | null;
          material: string | null;
          quantidade: number | null;
          unidade: Database["public"]["Enums"]["material_unidade"] | null;
          especificacoes: string | null;
          data_solicitacao: Timestamptz | null;
          prazo_entrega: DateStr | null;
          dias_de_atraso: number | null;
          status: Database["public"]["Enums"]["falta_material_status"] | null;
          observacoes: string | null;
        };
        Relationships: [];
      };
    };
    Functions: Record<never, never>;
    Enums: {
      funcionario_status: "ativo" | "desligado";
      ferramenta_status: "disponivel" | "em_uso" | "manutencao";
      obra_status:
        | "planejamento"
        | "em_andamento"
        | "pausada"
        | "finalizada"
        | "cancelada";
      obra_etapa_status: "pendente" | "em_andamento" | "concluida" | "pausada";
      material_unidade: "un" | "m" | "m2" | "barra" | "kg" | "par" | "conjunto";
      falta_material_status: "a_comprar" | "comprado" | "entregue" | "cancelado";
      saida_categoria: "compra_material" | "retirada_lucro";
    };
    CompositeTypes: Record<never, never>;
  };
};
