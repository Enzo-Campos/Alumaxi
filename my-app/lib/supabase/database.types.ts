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
          imagem_url: string | null;
          ativo: boolean;
          created_at: Timestamptz;
        };
        Insert: {
          id?: never;
          nome: string;
          unidade?: Database["public"]["Enums"]["material_unidade"];
          imagem_url?: string | null;
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
          cpf: string | null; // so digitos (11)
          rg: string | null;
          telefone: string | null; // so digitos: DDD + numero
          vale_alimentacao: number;
          vale_alimentacao_por_fora: boolean;
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
          cpf?: string | null;
          rg?: string | null;
          telefone?: string | null;
          vale_alimentacao?: number;
          vale_alimentacao_por_fora?: boolean;
          obs?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["funcionarios"]["Insert"]>;
        Relationships: [];
      };
      /* ---------- financeiro (supabase/migrations/2026092612*) ---------- */
      grupos_despesa: {
        Row: { id: number; nome: string; ordem: number; ativo: boolean };
        Insert: { id?: never; nome: string; ordem?: number; ativo?: boolean };
        Update: Partial<Database["public"]["Tables"]["grupos_despesa"]["Insert"]>;
        Relationships: [];
      };
      categorias_despesa: {
        Row: { id: number; id_grupo: number; nome: string; ativa: boolean };
        Insert: { id?: never; id_grupo: number; nome: string; ativa?: boolean };
        Update: Partial<Database["public"]["Tables"]["categorias_despesa"]["Insert"]>;
        Relationships: [];
      };
      fornecedores: {
        Row: {
          id: number;
          nome: string;
          documento: string | null; // so digitos: CPF (11) ou CNPJ (14)
          telefone: string | null; // so digitos
          email: string | null;
          chave_pix: string | null;
          obs: string | null;
          ativo: boolean;
          created_at: Timestamptz;
          updated_at: Timestamptz;
        };
        Insert: {
          id?: never;
          nome: string;
          documento?: string | null;
          telefone?: string | null;
          email?: string | null;
          chave_pix?: string | null;
          obs?: string | null;
          ativo?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["fornecedores"]["Insert"]>;
        Relationships: [];
      };
      veiculos: {
        Row: {
          id: number;
          nome: string;
          placa: string | null; // sem hifen, maiusculas
          modelo: string | null;
          ano: number | null;
          renavam: string | null;
          ativo: boolean;
          created_at: Timestamptz;
          updated_at: Timestamptz;
        };
        Insert: {
          id?: never;
          nome: string;
          placa?: string | null;
          modelo?: string | null;
          ano?: number | null;
          renavam?: string | null;
          ativo?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["veiculos"]["Insert"]>;
        Relationships: [];
      };
      locais: {
        Row: {
          id: number;
          nome: string;
          endereco: string | null;
          ativo: boolean;
          created_at: Timestamptz;
          updated_at: Timestamptz;
        };
        Insert: { id?: never; nome: string; endereco?: string | null; ativo?: boolean };
        Update: Partial<Database["public"]["Tables"]["locais"]["Insert"]>;
        Relationships: [];
      };
      recorrencias: {
        Row: {
          id: number;
          descricao: string;
          id_categoria: number;
          id_fornecedor: number | null;
          id_funcionario: number | null;
          id_veiculo: number | null;
          id_local: number | null;
          valor: number | null; // null = conta variavel (lancada a mao)
          intervalo_meses: number;
          competencia_inicio: DateStr;
          competencia_fim: DateStr | null;
          regra_vencimento: Database["public"]["Enums"]["regra_vencimento"];
          dia_vencimento: number;
          meses_apos_competencia: number;
          sabado_dia_util: boolean;
          ajuste_nao_util: Database["public"]["Enums"]["ajuste_nao_util"];
          forma_pagamento: Database["public"]["Enums"]["forma_pagamento"] | null;
          por_fora: boolean;
          ativa: boolean;
          obs: string | null;
          created_at: Timestamptz;
          updated_at: Timestamptz;
        };
        Insert: {
          id?: never;
          descricao: string;
          id_categoria: number;
          id_fornecedor?: number | null;
          id_funcionario?: number | null;
          id_veiculo?: number | null;
          id_local?: number | null;
          valor?: number | null;
          intervalo_meses?: number;
          competencia_inicio: DateStr;
          competencia_fim?: DateStr | null;
          regra_vencimento?: Database["public"]["Enums"]["regra_vencimento"];
          dia_vencimento: number;
          meses_apos_competencia?: number;
          sabado_dia_util?: boolean;
          ajuste_nao_util?: Database["public"]["Enums"]["ajuste_nao_util"];
          forma_pagamento?: Database["public"]["Enums"]["forma_pagamento"] | null;
          por_fora?: boolean;
          ativa?: boolean;
          obs?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["recorrencias"]["Insert"]>;
        Relationships: [];
      };
      folha_regras: {
        Row: {
          id: number;
          nome: string;
          tipo: Database["public"]["Enums"]["folha_regra_tipo"];
          id_categoria: number;
          percentual: number | null; // null = restante do salario
          regra_vencimento: Database["public"]["Enums"]["regra_vencimento"];
          dia_vencimento: number;
          meses_apos_competencia: number;
          sabado_dia_util: boolean;
          ajuste_nao_util: Database["public"]["Enums"]["ajuste_nao_util"];
          corte_hora_extra: number | null;
          id_categoria_hora_extra: number | null;
          ordem: number;
          ativa: boolean;
        };
        // editado so por SQL por enquanto (regras da folha raramente mudam)
        Insert: {
          id?: never;
          nome: string;
          tipo: Database["public"]["Enums"]["folha_regra_tipo"];
          id_categoria: number;
          percentual?: number | null;
          regra_vencimento: Database["public"]["Enums"]["regra_vencimento"];
          dia_vencimento: number;
          meses_apos_competencia?: number;
          sabado_dia_util?: boolean;
          ajuste_nao_util?: Database["public"]["Enums"]["ajuste_nao_util"];
          corte_hora_extra?: number | null;
          id_categoria_hora_extra?: number | null;
          ordem?: number;
          ativa?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["folha_regras"]["Insert"]>;
        Relationships: [];
      };
      dividas: {
        Row: {
          id: number;
          descricao: string;
          id_categoria: number;
          id_fornecedor: number | null;
          id_veiculo: number | null;
          id_local: number | null;
          valor_contratado: number | null;
          valor_parcela: number;
          numero_parcelas: number;
          parcelas_anteriores: number;
          primeiro_vencimento: DateStr;
          data_contratacao: DateStr | null;
          forma_pagamento: Database["public"]["Enums"]["forma_pagamento"] | null;
          obs: string | null;
          created_at: Timestamptz;
          updated_at: Timestamptz;
        };
        Insert: {
          id?: never;
          descricao: string;
          id_categoria: number;
          id_fornecedor?: number | null;
          id_veiculo?: number | null;
          id_local?: number | null;
          valor_contratado?: number | null;
          valor_parcela: number;
          numero_parcelas: number;
          parcelas_anteriores?: number;
          primeiro_vencimento: DateStr;
          data_contratacao?: DateStr | null;
          forma_pagamento?: Database["public"]["Enums"]["forma_pagamento"] | null;
          obs?: string | null;
        };
        // condicoes (parcela, quantidade, 1o vencimento) sao imutaveis no banco
        Update: Partial<Database["public"]["Tables"]["dividas"]["Insert"]>;
        Relationships: [];
      };
      contas_pagar: {
        Row: {
          id: number;
          descricao: string;
          id_categoria: number;
          id_fornecedor: number | null;
          id_funcionario: number | null;
          id_veiculo: number | null;
          id_local: number | null;
          competencia: DateStr; // sempre dia 1
          vencimento: DateStr;
          valor: number;
          status: Database["public"]["Enums"]["conta_status"];
          data_pagamento: DateStr | null;
          valor_pago: number | null;
          forma_pagamento: Database["public"]["Enums"]["forma_pagamento"] | null;
          por_fora: boolean;
          comprovante_url: string | null;
          id_recorrencia: number | null;
          id_folha_regra: number | null;
          id_divida: number | null;
          parcela: number | null;
          obs: string | null;
          created_at: Timestamptz;
          updated_at: Timestamptz;
        };
        Insert: {
          id?: never;
          descricao: string;
          id_categoria: number;
          id_fornecedor?: number | null;
          id_funcionario?: number | null;
          id_veiculo?: number | null;
          id_local?: number | null;
          competencia: DateStr;
          vencimento: DateStr;
          valor: number;
          status?: Database["public"]["Enums"]["conta_status"];
          data_pagamento?: DateStr | null; // trigger preenche ao pagar
          valor_pago?: number | null; // trigger preenche ao pagar
          forma_pagamento?: Database["public"]["Enums"]["forma_pagamento"] | null;
          por_fora?: boolean;
          comprovante_url?: string | null;
          id_recorrencia?: number | null;
          id_folha_regra?: number | null;
          id_divida?: number | null;
          parcela?: number | null;
          obs?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["contas_pagar"]["Insert"]>;
        Relationships: [];
      };
      horas_extras: {
        Row: {
          id: number;
          id_funcionario: number;
          data: DateStr;
          horas: number | null;
          valor: number;
          obs: string | null;
          id_folha_regra: number; // preenchido pelo trigger
          competencia: DateStr; // preenchido pelo trigger
          created_at: Timestamptz;
          updated_at: Timestamptz;
        };
        Insert: {
          id?: never;
          id_funcionario: number;
          data: DateStr;
          horas?: number | null;
          valor: number;
          obs?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["horas_extras"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      vw_contas_pagar: {
        Row: {
          id: number;
          descricao: string;
          competencia: DateStr;
          vencimento: DateStr;
          valor: number;
          status: Database["public"]["Enums"]["conta_status"];
          data_pagamento: DateStr | null;
          valor_pago: number | null;
          valor_efetivo: number;
          forma_pagamento: Database["public"]["Enums"]["forma_pagamento"] | null;
          por_fora: boolean;
          comprovante_url: string | null;
          obs: string | null;
          id_categoria: number;
          categoria: string;
          id_grupo: number;
          grupo: string;
          id_fornecedor: number | null;
          fornecedor: string | null;
          id_funcionario: number | null;
          funcionario: string | null;
          id_veiculo: number | null;
          veiculo: string | null;
          id_local: number | null;
          local: string | null;
          id_recorrencia: number | null;
          id_folha_regra: number | null;
          id_divida: number | null;
          divida: string | null;
          parcela: number | null;
          numero_parcelas: number | null;
          origem: "recorrencia" | "folha" | "divida" | "avulsa";
          situacao: "pago" | "cancelado" | "vencido" | "vence_hoje" | "vence_em_breve" | "a_vencer";
          dias_para_vencer: number | null;
          pago_em_atraso: boolean;
          created_at: Timestamptz;
          updated_at: Timestamptz;
        };
        Relationships: [];
      };
      vw_contas_a_lancar: {
        Row: {
          id_recorrencia: number;
          descricao: string;
          competencia: DateStr;
          vencimento_previsto: DateStr;
          situacao: "vencido" | "vence_hoje" | "vence_em_breve" | "a_vencer";
          dias_para_vencer: number;
          id_categoria: number;
          categoria: string;
          id_grupo: number;
          grupo: string;
          id_fornecedor: number | null;
          fornecedor: string | null;
          id_veiculo: number | null;
          veiculo: string | null;
          id_local: number | null;
          local: string | null;
          ultimo_valor: number | null;
          ultima_competencia: DateStr | null;
        };
        Relationships: [];
      };
      vw_financeiro_mensal: {
        Row: {
          competencia: DateStr;
          id_grupo: number;
          grupo: string;
          id_categoria: number;
          categoria: string;
          qtd_contas: number;
          total: number;
          total_pago: number;
          total_pendente: number;
          total_vencido: number;
          qtd_vencidas: number;
          total_por_fora: number;
        };
        Relationships: [];
      };
      vw_dividas: {
        Row: {
          id: number;
          descricao: string;
          id_categoria: number;
          id_fornecedor: number | null;
          credor: string | null;
          id_veiculo: number | null;
          veiculo: string | null;
          valor_contratado: number | null;
          valor_parcela: number;
          numero_parcelas: number;
          parcelas_anteriores: number;
          parcelas_pagas: number;
          parcelas_restantes: number;
          total_pago_no_sistema: number;
          saldo_devedor: number;
          proximo_vencimento: DateStr | null;
          parcelas_vencidas: number;
          quitada: boolean;
        };
        Relationships: [];
      };
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
    Functions: {
      /** Gera contas fixas + folha da competencia. Idempotente. Retorna quantas criou. */
      gerar_contas_competencia: {
        Args: { p_competencia: DateStr; p_incluir_folha?: boolean };
        Returns: number;
      };
    };
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
      conta_status: "pendente" | "pago" | "cancelado";
      forma_pagamento:
        | "pix"
        | "boleto"
        | "transferencia"
        | "dinheiro"
        | "cartao_credito"
        | "cartao_debito"
        | "debito_automatico";
      regra_vencimento: "dia_fixo" | "dia_util";
      ajuste_nao_util: "manter" | "antecipar" | "postergar";
      folha_regra_tipo: "salario" | "vale_alimentacao";
    };
    CompositeTypes: Record<never, never>;
  };
};
