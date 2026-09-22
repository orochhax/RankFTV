export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      arena_accounts: {
        Row: {
          arena_id: string
          asaas_account_id: string | null
          asaas_wallet_id: string | null
          chave_pix: string | null
          chave_pix_atualizada_em: string | null
          cpf_cnpj: string
          created_at: string
          habilitado: boolean
          id: string
          telefone: string
          user_id: string
        }
        Insert: {
          arena_id: string
          asaas_account_id?: string | null
          asaas_wallet_id?: string | null
          chave_pix?: string | null
          chave_pix_atualizada_em?: string | null
          cpf_cnpj: string
          created_at?: string
          habilitado?: boolean
          id?: string
          telefone: string
          user_id: string
        }
        Update: {
          arena_id?: string
          asaas_account_id?: string | null
          asaas_wallet_id?: string | null
          chave_pix?: string | null
          chave_pix_atualizada_em?: string | null
          cpf_cnpj?: string
          created_at?: string
          habilitado?: boolean
          id?: string
          telefone?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arena_accounts_arena_id_fkey"
            columns: ["arena_id"]
            isOneToOne: true
            referencedRelation: "arenas"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_attendance: {
        Row: {
          arena_id: string
          asaas_customer_id: string | null
          asaas_payment_id: string | null
          charged_at: string | null
          class_id: string
          created_at: string
          data: string
          finalized_at: string | null
          finalized_by: string | null
          id: string
          pagamento_erro: string | null
          pagamento_status: string
          repasse_data_prevista: string | null
          repasse_erro: string | null
          repasse_status: string
          repasse_transfer_id: string | null
          status: string
          tipo_cobranca: string
          user_id: string
          valor_avulso: number | null
        }
        Insert: {
          arena_id: string
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          charged_at?: string | null
          class_id: string
          created_at?: string
          data?: string
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          pagamento_erro?: string | null
          pagamento_status?: string
          repasse_data_prevista?: string | null
          repasse_erro?: string | null
          repasse_status?: string
          repasse_transfer_id?: string | null
          status?: string
          tipo_cobranca?: string
          user_id: string
          valor_avulso?: number | null
        }
        Update: {
          arena_id?: string
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          charged_at?: string | null
          class_id?: string
          created_at?: string
          data?: string
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          pagamento_erro?: string | null
          pagamento_status?: string
          repasse_data_prevista?: string | null
          repasse_erro?: string | null
          repasse_status?: string
          repasse_transfer_id?: string | null
          status?: string
          tipo_cobranca?: string
          user_id?: string
          valor_avulso?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "arena_attendance_arena_id_fkey"
            columns: ["arena_id"]
            isOneToOne: false
            referencedRelation: "arenas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "arena_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_classes: {
        Row: {
          arena_id: string
          ativo: boolean
          created_at: string
          dias_semana: number[] | null
          duracao_minutos: number
          hora_fim: string | null
          hora_inicio: string | null
          horario: string | null
          id: string
          max_alunos: number | null
          nivel: string | null
          professor_id: string | null
          publico: string
          titulo: string
          valor_avulso: number | null
        }
        Insert: {
          arena_id: string
          ativo?: boolean
          created_at?: string
          dias_semana?: number[] | null
          duracao_minutos?: number
          hora_fim?: string | null
          hora_inicio?: string | null
          horario?: string | null
          id?: string
          max_alunos?: number | null
          nivel?: string | null
          professor_id?: string | null
          publico?: string
          titulo: string
          valor_avulso?: number | null
        }
        Update: {
          arena_id?: string
          ativo?: boolean
          created_at?: string
          dias_semana?: number[] | null
          duracao_minutos?: number
          hora_fim?: string | null
          hora_inicio?: string | null
          horario?: string | null
          id?: string
          max_alunos?: number | null
          nivel?: string | null
          professor_id?: string | null
          publico?: string
          titulo?: string
          valor_avulso?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "arena_classes_arena_id_fkey"
            columns: ["arena_id"]
            isOneToOne: false
            referencedRelation: "arenas"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_daily_passes: {
        Row: {
          arena_id: string
          asaas_customer_id: string | null
          asaas_payment_id: string | null
          billing_type: string | null
          created_at: string
          data: string
          id: string
          plan_id: string
          repasse_data_prevista: string | null
          repasse_erro: string | null
          repasse_status: string
          repasse_transfer_id: string | null
          status_pagamento: string
          user_id: string
          valor: number
        }
        Insert: {
          arena_id: string
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          billing_type?: string | null
          created_at?: string
          data: string
          id?: string
          plan_id: string
          repasse_data_prevista?: string | null
          repasse_erro?: string | null
          repasse_status?: string
          repasse_transfer_id?: string | null
          status_pagamento?: string
          user_id: string
          valor: number
        }
        Update: {
          arena_id?: string
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          billing_type?: string | null
          created_at?: string
          data?: string
          id?: string
          plan_id?: string
          repasse_data_prevista?: string | null
          repasse_erro?: string | null
          repasse_status?: string
          repasse_transfer_id?: string | null
          status_pagamento?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "arena_daily_passes_arena_id_fkey"
            columns: ["arena_id"]
            isOneToOne: false
            referencedRelation: "arenas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_daily_passes_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "arena_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_photos: {
        Row: {
          arena_id: string
          created_at: string
          id: string
          ordem: number
          url: string
        }
        Insert: {
          arena_id: string
          created_at?: string
          id?: string
          ordem?: number
          url: string
        }
        Update: {
          arena_id?: string
          created_at?: string
          id?: string
          ordem?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "arena_photos_arena_id_fkey"
            columns: ["arena_id"]
            isOneToOne: false
            referencedRelation: "arenas"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_plans: {
        Row: {
          aceita_credito: boolean
          aceita_debito: boolean
          arena_id: string
          ativo: boolean
          aulas_por_semana: number | null
          created_at: string
          descricao: string | null
          dia_vencimento: number
          id: string
          nome: string
          ordem: number
          tipo: string
          valor: number
        }
        Insert: {
          aceita_credito?: boolean
          aceita_debito?: boolean
          arena_id: string
          ativo?: boolean
          aulas_por_semana?: number | null
          created_at?: string
          descricao?: string | null
          dia_vencimento?: number
          id?: string
          nome: string
          ordem?: number
          tipo: string
          valor: number
        }
        Update: {
          aceita_credito?: boolean
          aceita_debito?: boolean
          arena_id?: string
          ativo?: boolean
          aulas_por_semana?: number | null
          created_at?: string
          descricao?: string | null
          dia_vencimento?: number
          id?: string
          nome?: string
          ordem?: number
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "arena_plans_arena_id_fkey"
            columns: ["arena_id"]
            isOneToOne: false
            referencedRelation: "arenas"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_rentals: {
        Row: {
          arena_id: string
          asaas_customer_id: string | null
          asaas_payment_id: string | null
          billing_type: string | null
          created_at: string
          data: string
          hora: string
          id: string
          plan_id: string
          repasse_data_prevista: string | null
          repasse_erro: string | null
          repasse_status: string
          repasse_transfer_id: string | null
          status_pagamento: string
          user_id: string
          valor: number
        }
        Insert: {
          arena_id: string
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          billing_type?: string | null
          created_at?: string
          data: string
          hora: string
          id?: string
          plan_id: string
          repasse_data_prevista?: string | null
          repasse_erro?: string | null
          repasse_status?: string
          repasse_transfer_id?: string | null
          status_pagamento?: string
          user_id: string
          valor: number
        }
        Update: {
          arena_id?: string
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          billing_type?: string | null
          created_at?: string
          data?: string
          hora?: string
          id?: string
          plan_id?: string
          repasse_data_prevista?: string | null
          repasse_erro?: string | null
          repasse_status?: string
          repasse_transfer_id?: string | null
          status_pagamento?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "arena_rentals_arena_id_fkey"
            columns: ["arena_id"]
            isOneToOne: false
            referencedRelation: "arenas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_rentals_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "arena_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_staff: {
        Row: {
          arena_id: string
          created_at: string
          id: string
          invited_by: string
          papel: string
          status: string
          user_id: string
        }
        Insert: {
          arena_id: string
          created_at?: string
          id?: string
          invited_by: string
          papel: string
          status?: string
          user_id: string
        }
        Update: {
          arena_id?: string
          created_at?: string
          id?: string
          invited_by?: string
          papel?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arena_staff_arena_id_fkey"
            columns: ["arena_id"]
            isOneToOne: false
            referencedRelation: "arenas"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_student_cards: {
        Row: {
          arena_id: string
          asaas_card_token: string
          asaas_customer_id: string
          brand: string | null
          created_at: string
          exp_month: number | null
          exp_year: number | null
          id: string
          last4: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          arena_id: string
          asaas_card_token: string
          asaas_customer_id: string
          brand?: string | null
          created_at?: string
          exp_month?: number | null
          exp_year?: number | null
          id?: string
          last4?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          arena_id?: string
          asaas_card_token?: string
          asaas_customer_id?: string
          brand?: string | null
          created_at?: string
          exp_month?: number | null
          exp_year?: number | null
          id?: string
          last4?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arena_student_cards_arena_id_fkey"
            columns: ["arena_id"]
            isOneToOne: false
            referencedRelation: "arenas"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_students: {
        Row: {
          arena_id: string
          asaas_customer_id: string | null
          asaas_subscription_id: string | null
          created_at: string
          data_entrada: string | null
          id: string
          plan_id: string | null
          status: string
          user_id: string
          valor_mensalidade: number | null
        }
        Insert: {
          arena_id: string
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          created_at?: string
          data_entrada?: string | null
          id?: string
          plan_id?: string | null
          status?: string
          user_id: string
          valor_mensalidade?: number | null
        }
        Update: {
          arena_id?: string
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          created_at?: string
          data_entrada?: string | null
          id?: string
          plan_id?: string | null
          status?: string
          user_id?: string
          valor_mensalidade?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "arena_students_arena_id_fkey"
            columns: ["arena_id"]
            isOneToOne: false
            referencedRelation: "arenas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_students_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "arena_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_students_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      arena_subscriptions: {
        Row: {
          arena_id: string
          asaas_subscription_id: string | null
          created_at: string
          id: string
          plano: string
          proximo_vencimento: string | null
          status: string
          user_id: string
        }
        Insert: {
          arena_id: string
          asaas_subscription_id?: string | null
          created_at?: string
          id?: string
          plano?: string
          proximo_vencimento?: string | null
          status?: string
          user_id: string
        }
        Update: {
          arena_id?: string
          asaas_subscription_id?: string | null
          created_at?: string
          id?: string
          plano?: string
          proximo_vencimento?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arena_subscriptions_arena_id_fkey"
            columns: ["arena_id"]
            isOneToOne: true
            referencedRelation: "arenas"
            referencedColumns: ["id"]
          },
        ]
      }
      arenas: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          cancel_horas_antes: number
          cidade: string
          created_at: string
          descricao: string | null
          dono_id: string
          estado: string
          handle: string
          id: string
          invite_code: string
          nome: string
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          cancel_horas_antes?: number
          cidade: string
          created_at?: string
          descricao?: string | null
          dono_id: string
          estado: string
          handle: string
          id?: string
          invite_code?: string
          nome: string
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          cancel_horas_antes?: number
          cidade?: string
          created_at?: string
          descricao?: string | null
          dono_id?: string
          estado?: string
          handle?: string
          id?: string
          invite_code?: string
          nome?: string
        }
        Relationships: []
      }
      asaas_payment_event_state: {
        Row: {
          highest_event_id: string | null
          highest_event_rank: number
          highest_event_type: string | null
          payment_id: string
          updated_at: string
        }
        Insert: {
          highest_event_id?: string | null
          highest_event_rank?: number
          highest_event_type?: string | null
          payment_id: string
          updated_at?: string
        }
        Update: {
          highest_event_id?: string | null
          highest_event_rank?: number
          highest_event_type?: string | null
          payment_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      asaas_webhook_events: {
        Row: {
          attempt_count: number
          correlation_id: string | null
          created_at: string
          event_id: string
          event_rank: number
          event_type: string
          external_reference: string | null
          last_error: string | null
          payment_id: string
          processed_at: string | null
          processing_started_at: string
          provider_created_at: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          correlation_id?: string | null
          created_at?: string
          event_id: string
          event_rank: number
          event_type: string
          external_reference?: string | null
          last_error?: string | null
          payment_id: string
          processed_at?: string | null
          processing_started_at?: string
          provider_created_at?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          correlation_id?: string | null
          created_at?: string
          event_id?: string
          event_rank?: number
          event_type?: string
          external_reference?: string | null
          last_error?: string | null
          payment_id?: string
          processed_at?: string | null
          processing_started_at?: string
          provider_created_at?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      athlete_ticket_change_challenges: {
        Row: {
          athlete_ticket_id: string
          attempts: number
          created_at: string
          current_code_hash: string
          current_email: string
          expires_at: string
          id: string
          new_buyer_email: string | null
          new_email_code_hash: string | null
          requested_changes: Json
          used_at: string | null
        }
        Insert: {
          athlete_ticket_id: string
          attempts?: number
          created_at?: string
          current_code_hash: string
          current_email: string
          expires_at: string
          id?: string
          new_buyer_email?: string | null
          new_email_code_hash?: string | null
          requested_changes: Json
          used_at?: string | null
        }
        Update: {
          athlete_ticket_id?: string
          attempts?: number
          created_at?: string
          current_code_hash?: string
          current_email?: string
          expires_at?: string
          id?: string
          new_buyer_email?: string | null
          new_email_code_hash?: string | null
          requested_changes?: Json
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_ticket_change_challenges_athlete_ticket_id_fkey"
            columns: ["athlete_ticket_id"]
            isOneToOne: false
            referencedRelation: "athlete_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_ticket_credential_events: {
        Row: {
          actor_id: string | null
          athlete_ticket_id: string
          championship_id: string
          created_at: string
          credential_id: string
          details: Json
          event_type: string
          id: string
        }
        Insert: {
          actor_id?: string | null
          athlete_ticket_id: string
          championship_id: string
          created_at?: string
          credential_id: string
          details?: Json
          event_type: string
          id?: string
        }
        Update: {
          actor_id?: string | null
          athlete_ticket_id?: string
          championship_id?: string
          created_at?: string
          credential_id?: string
          details?: Json
          event_type?: string
          id?: string
        }
        Relationships: []
      }
      athlete_ticket_credentials: {
        Row: {
          access_email_claimed_at: string | null
          access_email_sent_at: string | null
          access_token: string
          athlete_slot: number
          athlete_ticket_id: string
          championship_id: string
          checked_in: boolean
          checked_in_by: string | null
          checkin_at: string | null
          code: string
          created_at: string
          display_name_snapshot: string
          id: string
          qr_token: string
          updated_at: string
        }
        Insert: {
          access_email_claimed_at?: string | null
          access_email_sent_at?: string | null
          access_token?: string
          athlete_slot: number
          athlete_ticket_id: string
          championship_id: string
          checked_in?: boolean
          checked_in_by?: string | null
          checkin_at?: string | null
          code?: string
          created_at?: string
          display_name_snapshot: string
          id?: string
          qr_token?: string
          updated_at?: string
        }
        Update: {
          access_email_claimed_at?: string | null
          access_email_sent_at?: string | null
          access_token?: string
          athlete_slot?: number
          athlete_ticket_id?: string
          championship_id?: string
          checked_in?: boolean
          checked_in_by?: string | null
          checkin_at?: string | null
          code?: string
          created_at?: string
          display_name_snapshot?: string
          id?: string
          qr_token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_ticket_credentials_athlete_ticket_id_fkey"
            columns: ["athlete_ticket_id"]
            isOneToOne: false
            referencedRelation: "athlete_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_ticket_credentials_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_tickets: {
        Row: {
          access_token: string
          asaas_payment_id: string | null
          billing_type: string | null
          categoria_nome: string | null
          category_id: string | null
          championship_id: string
          checked_in: boolean
          checkin_at: string | null
          checkout_expires_at: string | null
          checkout_reservation_id: string | null
          code: string | null
          comprador_camisa: string | null
          comprador_cpf: string
          comprador_email: string
          comprador_genero: string | null
          comprador_nascimento: string | null
          comprador_nome: string
          comprador_rating: number | null
          comprador_zap: string | null
          coupon_released_at: string | null
          created_at: string
          cupom_id: string | null
          id: string
          inventory_released_at: string | null
          invoice_url: string | null
          lote_id: string | null
          parceiro_camisa: string | null
          parceiro_cpf: string
          parceiro_email: string | null
          parceiro_genero: string | null
          parceiro_nome: string
          parceiro_rating: number | null
          parceiro_user_id: string | null
          parceiro_zap: string | null
          pix_copy_paste: string | null
          pix_qr_code_base64: string | null
          privacy_version: string | null
          qr_token: string | null
          repasse_data_prevista: string | null
          repasse_erro: string | null
          repasse_status: string
          repasse_transfer_id: string | null
          status_pagamento: string
          terms_accepted_at: string | null
          terms_version: string | null
          user_id: string | null
          valor: number
        }
        Insert: {
          access_token: string
          asaas_payment_id?: string | null
          billing_type?: string | null
          categoria_nome?: string | null
          category_id?: string | null
          championship_id: string
          checked_in?: boolean
          checkin_at?: string | null
          checkout_expires_at?: string | null
          checkout_reservation_id?: string | null
          code?: string | null
          comprador_camisa?: string | null
          comprador_cpf: string
          comprador_email: string
          comprador_genero?: string | null
          comprador_nascimento?: string | null
          comprador_nome: string
          comprador_rating?: number | null
          comprador_zap?: string | null
          coupon_released_at?: string | null
          created_at?: string
          cupom_id?: string | null
          id?: string
          inventory_released_at?: string | null
          invoice_url?: string | null
          lote_id?: string | null
          parceiro_camisa?: string | null
          parceiro_cpf: string
          parceiro_email?: string | null
          parceiro_genero?: string | null
          parceiro_nome: string
          parceiro_rating?: number | null
          parceiro_user_id?: string | null
          parceiro_zap?: string | null
          pix_copy_paste?: string | null
          pix_qr_code_base64?: string | null
          privacy_version?: string | null
          qr_token?: string | null
          repasse_data_prevista?: string | null
          repasse_erro?: string | null
          repasse_status?: string
          repasse_transfer_id?: string | null
          status_pagamento?: string
          terms_accepted_at?: string | null
          terms_version?: string | null
          user_id?: string | null
          valor?: number
        }
        Update: {
          access_token?: string
          asaas_payment_id?: string | null
          billing_type?: string | null
          categoria_nome?: string | null
          category_id?: string | null
          championship_id?: string
          checked_in?: boolean
          checkin_at?: string | null
          checkout_expires_at?: string | null
          checkout_reservation_id?: string | null
          code?: string | null
          comprador_camisa?: string | null
          comprador_cpf?: string
          comprador_email?: string
          comprador_genero?: string | null
          comprador_nascimento?: string | null
          comprador_nome?: string
          comprador_rating?: number | null
          comprador_zap?: string | null
          coupon_released_at?: string | null
          created_at?: string
          cupom_id?: string | null
          id?: string
          inventory_released_at?: string | null
          invoice_url?: string | null
          lote_id?: string | null
          parceiro_camisa?: string | null
          parceiro_cpf?: string
          parceiro_email?: string | null
          parceiro_genero?: string | null
          parceiro_nome?: string
          parceiro_rating?: number | null
          parceiro_user_id?: string | null
          parceiro_zap?: string | null
          pix_copy_paste?: string | null
          pix_qr_code_base64?: string | null
          privacy_version?: string | null
          qr_token?: string | null
          repasse_data_prevista?: string | null
          repasse_erro?: string | null
          repasse_status?: string
          repasse_transfer_id?: string | null
          status_pagamento?: string
          terms_accepted_at?: string | null
          terms_version?: string | null
          user_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "athlete_tickets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "championship_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_tickets_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_tickets_checkout_reservation_fkey"
            columns: ["checkout_reservation_id"]
            isOneToOne: false
            referencedRelation: "checkout_reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_tickets_cupom_id_fkey"
            columns: ["cupom_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_tickets_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "pricing_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      bracket_matches: {
        Row: {
          bracket_section: string
          called_at: string | null
          category_id: string
          championship_id: string
          court_label: string | null
          created_at: string | null
          finished_at: string | null
          id: string
          is_third_place: boolean
          match_index: number
          next_loser_match_id: string | null
          next_loser_slot: string | null
          next_winner_match_id: string | null
          next_winner_slot: string | null
          operational_status: string
          participant_a_id: string | null
          participant_b_id: string | null
          round_index: number
          scheduled_at: string | null
          section_round_index: number
          set_details: Json | null
          sets_a: number | null
          sets_b: number | null
          started_at: string | null
          team_a_id: string | null
          team_b_id: string | null
          updated_at: string | null
          winner_id: string | null
          winner_participant_id: string | null
        }
        Insert: {
          bracket_section?: string
          called_at?: string | null
          category_id: string
          championship_id: string
          court_label?: string | null
          created_at?: string | null
          finished_at?: string | null
          id?: string
          is_third_place?: boolean
          match_index: number
          next_loser_match_id?: string | null
          next_loser_slot?: string | null
          next_winner_match_id?: string | null
          next_winner_slot?: string | null
          operational_status?: string
          participant_a_id?: string | null
          participant_b_id?: string | null
          round_index: number
          scheduled_at?: string | null
          section_round_index?: number
          set_details?: Json | null
          sets_a?: number | null
          sets_b?: number | null
          started_at?: string | null
          team_a_id?: string | null
          team_b_id?: string | null
          updated_at?: string | null
          winner_id?: string | null
          winner_participant_id?: string | null
        }
        Update: {
          bracket_section?: string
          called_at?: string | null
          category_id?: string
          championship_id?: string
          court_label?: string | null
          created_at?: string | null
          finished_at?: string | null
          id?: string
          is_third_place?: boolean
          match_index?: number
          next_loser_match_id?: string | null
          next_loser_slot?: string | null
          next_winner_match_id?: string | null
          next_winner_slot?: string | null
          operational_status?: string
          participant_a_id?: string | null
          participant_b_id?: string | null
          round_index?: number
          scheduled_at?: string | null
          section_round_index?: number
          set_details?: Json | null
          sets_a?: number | null
          sets_b?: number | null
          started_at?: string | null
          team_a_id?: string | null
          team_b_id?: string | null
          updated_at?: string | null
          winner_id?: string | null
          winner_participant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bracket_matches_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "championship_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_matches_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_matches_next_loser_match_id_fkey"
            columns: ["next_loser_match_id"]
            isOneToOne: false
            referencedRelation: "bracket_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_matches_next_winner_match_id_fkey"
            columns: ["next_winner_match_id"]
            isOneToOne: false
            referencedRelation: "bracket_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_matches_participant_a_id_fkey"
            columns: ["participant_a_id"]
            isOneToOne: false
            referencedRelation: "bracket_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_matches_participant_b_id_fkey"
            columns: ["participant_b_id"]
            isOneToOne: false
            referencedRelation: "bracket_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_matches_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_matches_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_matches_winner_participant_id_fkey"
            columns: ["winner_participant_id"]
            isOneToOne: false
            referencedRelation: "bracket_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      bracket_participants: {
        Row: {
          active: boolean
          athlete_ticket_id: string | null
          category_id: string
          championship_id: string
          created_at: string
          display_name_snapshot: string
          id: string
          source_type: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          athlete_ticket_id?: string | null
          category_id: string
          championship_id: string
          created_at?: string
          display_name_snapshot: string
          id?: string
          source_type: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          athlete_ticket_id?: string | null
          category_id?: string
          championship_id?: string
          created_at?: string
          display_name_snapshot?: string
          id?: string
          source_type?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bracket_participants_athlete_ticket_id_fkey"
            columns: ["athlete_ticket_id"]
            isOneToOne: true
            referencedRelation: "athlete_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_participants_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "championship_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_participants_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      championship_categories: {
        Row: {
          bracket_confirmed_at: string | null
          bracket_format: string
          championship_id: string
          corte_rating_max: number
          corte_rating_min: number
          created_at: string | null
          genero: string
          id: string
          max_duplas: number | null
          nome: string
          valor_inscricao: number
        }
        Insert: {
          bracket_confirmed_at?: string | null
          bracket_format?: string
          championship_id: string
          corte_rating_max?: number
          corte_rating_min?: number
          created_at?: string | null
          genero: string
          id?: string
          max_duplas?: number | null
          nome: string
          valor_inscricao?: number
        }
        Update: {
          bracket_confirmed_at?: string | null
          bracket_format?: string
          championship_id?: string
          corte_rating_max?: number
          corte_rating_min?: number
          created_at?: string | null
          genero?: string
          id?: string
          max_duplas?: number | null
          nome?: string
          valor_inscricao?: number
        }
        Relationships: [
          {
            foreignKeyName: "championship_categories_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
        ]
      }
      championship_category_waitlist: {
        Row: {
          category_id: string
          championship_id: string
          consented_at: string
          converted_at: string | null
          created_at: string
          email: string
          id: string
          invite_expires_at: string | null
          invite_token_hash: string | null
          invited_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          category_id: string
          championship_id: string
          consented_at: string
          converted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invite_expires_at?: string | null
          invite_token_hash?: string | null
          invited_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          championship_id?: string
          consented_at?: string
          converted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invite_expires_at?: string | null
          invite_token_hash?: string | null
          invited_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "championship_category_waitlist_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "championship_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "championship_category_waitlist_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
        ]
      }
      championship_notice_deliveries: {
        Row: {
          accepted_at: string | null
          attempt_count: number
          championship_id: string
          claimed_at: string | null
          created_at: string
          id: string
          last_error_category: string | null
          next_attempt_at: string
          notice_id: string
          provider_message_id: string | null
          recipient_hash: string
          recipient_ref: string
          recipient_slot: string
          recipient_source: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          attempt_count?: number
          championship_id: string
          claimed_at?: string | null
          created_at?: string
          id?: string
          last_error_category?: string | null
          next_attempt_at?: string
          notice_id: string
          provider_message_id?: string | null
          recipient_hash: string
          recipient_ref: string
          recipient_slot: string
          recipient_source: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          attempt_count?: number
          championship_id?: string
          claimed_at?: string | null
          created_at?: string
          id?: string
          last_error_category?: string | null
          next_attempt_at?: string
          notice_id?: string
          provider_message_id?: string | null
          recipient_hash?: string
          recipient_ref?: string
          recipient_slot?: string
          recipient_source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "championship_notice_deliveries_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "championship_notice_deliveries_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "championship_notices"
            referencedColumns: ["id"]
          },
        ]
      }
      championship_notices: {
        Row: {
          championship_id: string
          created_at: string
          created_by: string | null
          dedupe_key: string
          id: string
          kind: string
          message: string
          title: string
        }
        Insert: {
          championship_id: string
          created_at?: string
          created_by?: string | null
          dedupe_key: string
          id?: string
          kind: string
          message: string
          title: string
        }
        Update: {
          championship_id?: string
          created_at?: string
          created_by?: string | null
          dedupe_key?: string
          id?: string
          kind?: string
          message?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "championship_notices_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
        ]
      }
      championship_staff: {
        Row: {
          can_chaveamento: boolean
          can_inscricoes: boolean
          can_qrcode: boolean
          championship_id: string
          created_at: string | null
          id: string
          invited_by: string
          status: string
          user_id: string
        }
        Insert: {
          can_chaveamento?: boolean
          can_inscricoes?: boolean
          can_qrcode?: boolean
          championship_id: string
          created_at?: string | null
          id?: string
          invited_by: string
          status?: string
          user_id: string
        }
        Update: {
          can_chaveamento?: boolean
          can_inscricoes?: boolean
          can_qrcode?: boolean
          championship_id?: string
          created_at?: string | null
          id?: string
          invited_by?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "championship_staff_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
        ]
      }
      championships: {
        Row: {
          banner_from: string
          banner_position_x: number | null
          banner_position_y: number | null
          banner_to: string
          banner_url: string | null
          cidade: string
          created_at: string | null
          data_fim: string
          data_inicio: string
          descricao: string | null
          estado: string
          id: string
          inscricoes_fim: string | null
          inscricoes_inicio: string | null
          is_elite: boolean | null
          is_vitrine: boolean
          live_url: string | null
          local: string
          max_parcelas_ingresso: number
          max_parcelas_inscricao: number
          nome: string
          organizador_id: string
          premium_fee_pendente: number | null
          prevenda_fim: string | null
          prevenda_inicio: string | null
          regulamento: string | null
          regulamento_pdf_url: string | null
          status: string | null
          taxa_plataforma: number | null
          tier: string
          tier_quiz: Json | null
          usa_motor_categoria: boolean
        }
        Insert: {
          banner_from?: string
          banner_position_x?: number | null
          banner_position_y?: number | null
          banner_to?: string
          banner_url?: string | null
          cidade: string
          created_at?: string | null
          data_fim: string
          data_inicio: string
          descricao?: string | null
          estado: string
          id?: string
          inscricoes_fim?: string | null
          inscricoes_inicio?: string | null
          is_elite?: boolean | null
          is_vitrine?: boolean
          live_url?: string | null
          local: string
          max_parcelas_ingresso?: number
          max_parcelas_inscricao?: number
          nome: string
          organizador_id: string
          premium_fee_pendente?: number | null
          prevenda_fim?: string | null
          prevenda_inicio?: string | null
          regulamento?: string | null
          regulamento_pdf_url?: string | null
          status?: string | null
          taxa_plataforma?: number | null
          tier?: string
          tier_quiz?: Json | null
          usa_motor_categoria?: boolean
        }
        Update: {
          banner_from?: string
          banner_position_x?: number | null
          banner_position_y?: number | null
          banner_to?: string
          banner_url?: string | null
          cidade?: string
          created_at?: string | null
          data_fim?: string
          data_inicio?: string
          descricao?: string | null
          estado?: string
          id?: string
          inscricoes_fim?: string | null
          inscricoes_inicio?: string | null
          is_elite?: boolean | null
          is_vitrine?: boolean
          live_url?: string | null
          local?: string
          max_parcelas_ingresso?: number
          max_parcelas_inscricao?: number
          nome?: string
          organizador_id?: string
          premium_fee_pendente?: number | null
          prevenda_fim?: string | null
          prevenda_inicio?: string | null
          regulamento?: string | null
          regulamento_pdf_url?: string | null
          status?: string | null
          taxa_plataforma?: number | null
          tier?: string
          tier_quiz?: Json | null
          usa_motor_categoria?: boolean
        }
        Relationships: []
      }
      checkout_reservations: {
        Row: {
          category_id: string
          championship_id: string
          converted_at: string | null
          created_at: string
          expires_at: string
          id: string
          kind: string
          price_snapshot: number
          pricing_tier_id: string | null
          quantity: number
          released_at: string | null
          status: string
          token_hash: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category_id: string
          championship_id: string
          converted_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          kind?: string
          price_snapshot: number
          pricing_tier_id?: string | null
          quantity?: number
          released_at?: string | null
          status?: string
          token_hash: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category_id?: string
          championship_id?: string
          converted_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          kind?: string
          price_snapshot?: number
          pricing_tier_id?: string | null
          quantity?: number
          released_at?: string | null
          status?: string
          token_hash?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkout_reservations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "championship_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_reservations_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_reservations_pricing_tier_id_fkey"
            columns: ["pricing_tier_id"]
            isOneToOne: false
            referencedRelation: "pricing_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      conquistas: {
        Row: {
          cor: string
          created_at: string | null
          data_conquistada: string | null
          descricao: string | null
          destaque_ordem: number | null
          icone: string
          id: string
          titulo: string
          user_id: string
        }
        Insert: {
          cor?: string
          created_at?: string | null
          data_conquistada?: string | null
          descricao?: string | null
          destaque_ordem?: number | null
          icone?: string
          id?: string
          titulo: string
          user_id: string
        }
        Update: {
          cor?: string
          created_at?: string | null
          data_conquistada?: string | null
          descricao?: string | null
          destaque_ordem?: number | null
          icone?: string
          id?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          aplica_em: string
          ativo: boolean
          championship_id: string
          codigo: string
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          id: string
          quantidade_maxima: number | null
          tipo_desconto: string
          usos_atuais: number
          valor_desconto: number
        }
        Insert: {
          aplica_em?: string
          ativo?: boolean
          championship_id: string
          codigo: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          quantidade_maxima?: number | null
          tipo_desconto: string
          usos_atuais?: number
          valor_desconto: number
        }
        Update: {
          aplica_em?: string
          ativo?: boolean
          championship_id?: string
          codigo?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          quantidade_maxima?: number | null
          tipo_desconto?: string
          usos_atuais?: number
          valor_desconto?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
        ]
      }
      credentials: {
        Row: {
          championship_id: string
          checked_in: boolean
          checked_in_by: string | null
          checkin_at: string | null
          code: string
          created_at: string | null
          id: string
          qr_token: string
          role: string
          user_id: string
        }
        Insert: {
          championship_id: string
          checked_in?: boolean
          checked_in_by?: string | null
          checkin_at?: string | null
          code?: string
          created_at?: string | null
          id?: string
          qr_token?: string
          role?: string
          user_id: string
        }
        Update: {
          championship_id?: string
          checked_in?: boolean
          checked_in_by?: string | null
          checkin_at?: string | null
          code?: string
          created_at?: string | null
          id?: string
          qr_token?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credentials_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
        ]
      }
      external_athletes: {
        Row: {
          created_at: string | null
          genero: string
          id: string
          instagram: string | null
          nome: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          genero: string
          id?: string
          instagram?: string | null
          nome: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          genero?: string
          id?: string
          instagram?: string | null
          nome?: string
          user_id?: string | null
        }
        Relationships: []
      }
      external_results: {
        Row: {
          athlete_id: string
          categoria: string | null
          colocacao: number
          created_at: string | null
          id: string
          parceiro_nome: string | null
          pontos: number
          tournament_id: string
        }
        Insert: {
          athlete_id: string
          categoria?: string | null
          colocacao: number
          created_at?: string | null
          id?: string
          parceiro_nome?: string | null
          pontos: number
          tournament_id: string
        }
        Update: {
          athlete_id?: string
          categoria?: string | null
          colocacao?: number
          created_at?: string | null
          id?: string
          parceiro_nome?: string | null
          pontos?: number
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_results_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "external_athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_results_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "ranking_entries"
            referencedColumns: ["athlete_id"]
          },
          {
            foreignKeyName: "external_results_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "external_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      external_tournaments: {
        Row: {
          created_at: string | null
          data: string
          id: string
          nome_circuito: string
          tier: string
        }
        Insert: {
          created_at?: string | null
          data: string
          id?: string
          nome_circuito: string
          tier?: string
        }
        Update: {
          created_at?: string | null
          data?: string
          id?: string
          nome_circuito?: string
          tier?: string
        }
        Relationships: []
      }
      financial_operations: {
        Row: {
          actor_id: string | null
          amount: number | null
          attempt_count: number
          billing_type: string | null
          completed_at: string | null
          correlation_id: string | null
          created_at: string
          external_reference: string
          flow: string
          id: string
          last_error_code: string | null
          last_error_message: string | null
          metadata: Json
          next_reconcile_at: string | null
          operation_type: string
          processing_started_at: string | null
          provider_id: string | null
          provider_status: string | null
          record_id: string
          status: string
          updated_at: string
        }
        Insert: {
          actor_id?: string | null
          amount?: number | null
          attempt_count?: number
          billing_type?: string | null
          completed_at?: string | null
          correlation_id?: string | null
          created_at?: string
          external_reference: string
          flow: string
          id?: string
          last_error_code?: string | null
          last_error_message?: string | null
          metadata?: Json
          next_reconcile_at?: string | null
          operation_type: string
          processing_started_at?: string | null
          provider_id?: string | null
          provider_status?: string | null
          record_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          actor_id?: string | null
          amount?: number | null
          attempt_count?: number
          billing_type?: string | null
          completed_at?: string | null
          correlation_id?: string | null
          created_at?: string
          external_reference?: string
          flow?: string
          id?: string
          last_error_code?: string | null
          last_error_message?: string | null
          metadata?: Json
          next_reconcile_at?: string | null
          operation_type?: string
          processing_started_at?: string | null
          provider_id?: string | null
          provider_status?: string | null
          record_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      financial_outbox: {
        Row: {
          attempt_count: number
          available_at: string
          completed_at: string | null
          created_at: string
          event_type: string
          id: string
          last_error: string | null
          locked_at: string | null
          operation_id: string
          status: string
        }
        Insert: {
          attempt_count?: number
          available_at?: string
          completed_at?: string | null
          created_at?: string
          event_type?: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          operation_id: string
          status?: string
        }
        Update: {
          attempt_count?: number
          available_at?: string
          completed_at?: string | null
          created_at?: string
          event_type?: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          operation_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_outbox_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "financial_operations"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_budget_categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      monthly_budget_expenses: {
        Row: {
          amount_carlos: number
          amount_julia: number
          category_id: string | null
          created_at: string
          due_date: string | null
          id: string
          is_paid: boolean
          month_key: string
          name: string
          paid_at: string | null
          repeat_group_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_carlos?: number
          amount_julia?: number
          category_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          is_paid?: boolean
          month_key: string
          name: string
          paid_at?: string | null
          repeat_group_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_carlos?: number
          amount_julia?: number
          category_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          is_paid?: boolean
          month_key?: string
          name?: string
          paid_at?: string | null
          repeat_group_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mb_expenses_category_fk"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "monthly_budget_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_budget_history_events: {
        Row: {
          action: string
          affected_months: string[]
          after_snapshot: Json | null
          anchor_entry_id: string | null
          anchor_month_key: string
          before_snapshot: Json | null
          created_at: string
          edit_scope: string | null
          entity_group_id: string | null
          entity_kind: string
          id: string
          metadata: Json
          occurred_at: string
          previous_event_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          affected_months?: string[]
          after_snapshot?: Json | null
          anchor_entry_id?: string | null
          anchor_month_key: string
          before_snapshot?: Json | null
          created_at?: string
          edit_scope?: string | null
          entity_group_id?: string | null
          entity_kind: string
          id?: string
          metadata?: Json
          occurred_at?: string
          previous_event_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          affected_months?: string[]
          after_snapshot?: Json | null
          anchor_entry_id?: string | null
          anchor_month_key?: string
          before_snapshot?: Json | null
          created_at?: string
          edit_scope?: string | null
          entity_group_id?: string | null
          entity_kind?: string
          id?: string
          metadata?: Json
          occurred_at?: string
          previous_event_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_budget_history_events_previous_event_id_fkey"
            columns: ["previous_event_id"]
            isOneToOne: false
            referencedRelation: "monthly_budget_history_events"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_budget_incomes: {
        Row: {
          amount_carlos: number
          amount_julia: number
          category_id: string | null
          created_at: string
          id: string
          month_key: string
          name: string
          repeat_group_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_carlos?: number
          amount_julia?: number
          category_id?: string | null
          created_at?: string
          id?: string
          month_key: string
          name: string
          repeat_group_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_carlos?: number
          amount_julia?: number
          category_id?: string | null
          created_at?: string
          id?: string
          month_key?: string
          name?: string
          repeat_group_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mb_incomes_category_fk"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "monthly_budget_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_budget_savings_jars: {
        Row: { created_at: string; id: string; institution: string | null; name: string; note: string | null; updated_at: string; user_id: string }
        Insert: { created_at?: string; id?: string; institution?: string | null; name: string; note?: string | null; updated_at?: string; user_id: string }
        Update: { created_at?: string; id?: string; institution?: string | null; name?: string; note?: string | null; updated_at?: string; user_id?: string }
        Relationships: []
      }
      monthly_budget_savings_movements: {
        Row: { amount_delta: number; created_at: string; id: string; jar_id: string; movement_date: string; movement_type: string; note: string | null; repayment_id: string | null; user_id: string; withdrawal_id: string | null }
        Insert: { amount_delta: number; created_at?: string; id?: string; jar_id: string; movement_date: string; movement_type: string; note?: string | null; repayment_id?: string | null; user_id: string; withdrawal_id?: string | null }
        Update: { amount_delta?: number; created_at?: string; id?: string; jar_id?: string; movement_date?: string; movement_type?: string; note?: string | null; repayment_id?: string | null; user_id?: string; withdrawal_id?: string | null }
        Relationships: [
          { foreignKeyName: "monthly_budget_savings_movements_jar_id_fkey"; columns: ["jar_id"]; isOneToOne: false; referencedRelation: "monthly_budget_savings_jars"; referencedColumns: ["id"] },
          { foreignKeyName: "monthly_budget_savings_movements_repayment_id_fkey"; columns: ["repayment_id"]; isOneToOne: false; referencedRelation: "monthly_budget_savings_repayments"; referencedColumns: ["id"] },
          { foreignKeyName: "monthly_budget_savings_movements_withdrawal_id_fkey"; columns: ["withdrawal_id"]; isOneToOne: false; referencedRelation: "monthly_budget_savings_withdrawals"; referencedColumns: ["id"] },
        ]
      }
      monthly_budget_savings_repayments: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string | null
          repaid_on: string
          user_id: string
          withdrawal_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          repaid_on: string
          user_id: string
          withdrawal_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          repaid_on?: string
          user_id?: string
          withdrawal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_budget_savings_repayments_withdrawal_id_fkey"
            columns: ["withdrawal_id"]
            isOneToOne: false
            referencedRelation: "monthly_budget_savings_withdrawals"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_budget_savings_withdrawals: {
        Row: {
          amount: number
          created_at: string
          id: string
          jar_id: string
          jar_name: string
          note: string | null
          purpose: string
          updated_at: string
          user_id: string
          withdrawn_on: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          jar_id: string
          jar_name: string
          note?: string | null
          purpose: string
          updated_at?: string
          user_id: string
          withdrawn_on: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          jar_id?: string
          jar_name?: string
          note?: string | null
          purpose?: string
          updated_at?: string
          user_id?: string
          withdrawn_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "mb_savings_withdrawals_jar_fk"
            columns: ["jar_id"]
            isOneToOne: false
            referencedRelation: "monthly_budget_savings_jars"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          conteudo: string
          created_at: string
          id: string
          imagem_url: string | null
          resumo: string
          tamanho_fonte: string
          titulo: string
          titulo_story: string | null
        }
        Insert: {
          conteudo: string
          created_at?: string
          id?: string
          imagem_url?: string | null
          resumo: string
          tamanho_fonte?: string
          titulo: string
          titulo_story?: string | null
        }
        Update: {
          conteudo?: string
          created_at?: string
          id?: string
          imagem_url?: string | null
          resumo?: string
          tamanho_fonte?: string
          titulo?: string
          titulo_story?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          championship_id: string | null
          created_at: string | null
          id: string
          lida: boolean
          mensagem: string
          source_notice_id: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          championship_id?: string | null
          created_at?: string | null
          id?: string
          lida?: boolean
          mensagem: string
          source_notice_id?: string | null
          tipo?: string
          titulo: string
          user_id: string
        }
        Update: {
          championship_id?: string | null
          created_at?: string | null
          id?: string
          lida?: boolean
          mensagem?: string
          source_notice_id?: string | null
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_source_notice_id_fkey"
            columns: ["source_notice_id"]
            isOneToOne: false
            referencedRelation: "championship_notices"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_alert_settings: {
        Row: {
          assisted_refund_enabled: boolean
          enabled: boolean
          id: number
          payment_pending_enabled: boolean
          payment_pending_minutes: number
          payout_rejected_enabled: boolean
          updated_at: string
          webhook_failed_enabled: boolean
        }
        Insert: {
          assisted_refund_enabled?: boolean
          enabled?: boolean
          id?: number
          payment_pending_enabled?: boolean
          payment_pending_minutes?: number
          payout_rejected_enabled?: boolean
          updated_at?: string
          webhook_failed_enabled?: boolean
        }
        Update: {
          assisted_refund_enabled?: boolean
          enabled?: boolean
          id?: number
          payment_pending_enabled?: boolean
          payment_pending_minutes?: number
          payout_rejected_enabled?: boolean
          updated_at?: string
          webhook_failed_enabled?: boolean
        }
        Relationships: []
      }
      operational_alerts: {
        Row: {
          dedupe_key: string
          detected_at: string
          entity_id: string
          entity_type: string
          id: string
          kind: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          title: string
        }
        Insert: {
          dedupe_key: string
          detected_at?: string
          entity_id: string
          entity_type: string
          id?: string
          kind: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          status?: string
          title: string
        }
        Update: {
          dedupe_key?: string
          detected_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          kind?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      organizer_financial_notification_deliveries: {
        Row: {
          accepted_at: string | null
          amount: number | null
          attempt_count: number
          championship_id: string
          claimed_at: string | null
          created_at: string
          event_kind: string
          id: string
          last_error_category: string | null
          next_attempt_at: string
          organizer_id: string
          payment_id: string
          provider_message_id: string | null
          recipient_hash: string | null
          record_id: string
          record_type: string
          source_key: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          amount?: number | null
          attempt_count?: number
          championship_id: string
          claimed_at?: string | null
          created_at?: string
          event_kind: string
          id?: string
          last_error_category?: string | null
          next_attempt_at?: string
          organizer_id: string
          payment_id: string
          provider_message_id?: string | null
          recipient_hash?: string | null
          record_id: string
          record_type: string
          source_key: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          amount?: number | null
          attempt_count?: number
          championship_id?: string
          claimed_at?: string | null
          created_at?: string
          event_kind?: string
          id?: string
          last_error_category?: string | null
          next_attempt_at?: string
          organizer_id?: string
          payment_id?: string
          provider_message_id?: string | null
          recipient_hash?: string | null
          record_id?: string
          record_type?: string
          source_key?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "organizer_financial_notification_deliveries_championship_id_fkey"; columns: ["championship_id"]; isOneToOne: false; referencedRelation: "championships"; referencedColumns: ["id"] },
        ]
      }
      organizer_accounts: {
        Row: {
          asaas_account_id: string | null
          asaas_wallet_id: string | null
          chave_pix: string | null
          chave_pix_atualizada_em: string | null
          cpf_cnpj: string | null
          created_at: string | null
          data_nascimento: string | null
          habilitado: boolean
          id: string
          telefone: string
          tipo_chave_pix: string | null
          user_id: string
        }
        Insert: {
          asaas_account_id?: string | null
          asaas_wallet_id?: string | null
          chave_pix?: string | null
          chave_pix_atualizada_em?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          habilitado?: boolean
          id?: string
          telefone: string
          tipo_chave_pix?: string | null
          user_id: string
        }
        Update: {
          asaas_account_id?: string | null
          asaas_wallet_id?: string | null
          chave_pix?: string | null
          chave_pix_atualizada_em?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          habilitado?: boolean
          id?: string
          telefone?: string
          tipo_chave_pix?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payment_card_attempts: {
        Row: {
          actor_id: string | null
          card_fingerprint: string
          card_last4: string
          completed_at: string | null
          created_at: string
          flow: string
          id: string
          ip_hash: string
          order_reference: string
          outcome: string
          provider_code: string | null
          scope_keys: string[]
        }
        Insert: {
          actor_id?: string | null
          card_fingerprint: string
          card_last4: string
          completed_at?: string | null
          created_at?: string
          flow: string
          id?: string
          ip_hash: string
          order_reference: string
          outcome?: string
          provider_code?: string | null
          scope_keys: string[]
        }
        Update: {
          actor_id?: string | null
          card_fingerprint?: string
          card_last4?: string
          completed_at?: string | null
          created_at?: string
          flow?: string
          id?: string
          ip_hash?: string
          order_reference?: string
          outcome?: string
          provider_code?: string | null
          scope_keys?: string[]
        }
        Relationships: []
      }
      payment_card_guards: {
        Row: {
          attempt_count: number
          blocked_until: string | null
          decline_count: number
          last_attempt_at: string
          scope_key: string
          updated_at: string
          window_start: string
        }
        Insert: {
          attempt_count?: number
          blocked_until?: string | null
          decline_count?: number
          last_attempt_at?: string
          scope_key: string
          updated_at?: string
          window_start?: string
        }
        Update: {
          attempt_count?: number
          blocked_until?: string | null
          decline_count?: number
          last_attempt_at?: string
          scope_key?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      perf_academy_workout_template: {
        Row: {
          created_at: string
          id: string
          muscle_groups: string[]
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          muscle_groups: string[]
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          muscle_groups?: string[]
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      perf_activity: {
        Row: {
          area: string
          created_at: string
          date: string
          duration_minutes: number | null
          evidence_url: string | null
          goal_id: string | null
          id: string
          intensity: number | null
          learning: string | null
          legacy_id: string | null
          legacy_source: string | null
          metadata: Json
          notes: string | null
          personal_rating: number | null
          result: string | null
          status: string
          study_item_id: string | null
          title: string
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          area: string
          created_at?: string
          date: string
          duration_minutes?: number | null
          evidence_url?: string | null
          goal_id?: string | null
          id?: string
          intensity?: number | null
          learning?: string | null
          legacy_id?: string | null
          legacy_source?: string | null
          metadata?: Json
          notes?: string | null
          personal_rating?: number | null
          result?: string | null
          status?: string
          study_item_id?: string | null
          title: string
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: string
          created_at?: string
          date?: string
          duration_minutes?: number | null
          evidence_url?: string | null
          goal_id?: string | null
          id?: string
          intensity?: number | null
          learning?: string | null
          legacy_id?: string | null
          legacy_source?: string | null
          metadata?: Json
          notes?: string | null
          personal_rating?: number | null
          result?: string | null
          status?: string
          study_item_id?: string | null
          title?: string
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perf_activity_study_item_id_fkey"
            columns: ["study_item_id"]
            isOneToOne: false
            referencedRelation: "perf_study_roadmap_item"
            referencedColumns: ["id"]
          },
        ]
      }
      perf_ai_insight: {
        Row: {
          analysis_end: string
          analysis_start: string
          created_at: string
          diagnosis: string
          feedback: string | null
          id: string
          main_area: string | null
          main_error: string | null
          priority: number
          projection: string | null
          recommended_action: string | null
          risk: string | null
          source_data: Json
          status: string
          type: string
          user_id: string
        }
        Insert: {
          analysis_end: string
          analysis_start: string
          created_at?: string
          diagnosis: string
          feedback?: string | null
          id?: string
          main_area?: string | null
          main_error?: string | null
          priority?: number
          projection?: string | null
          recommended_action?: string | null
          risk?: string | null
          source_data?: Json
          status?: string
          type?: string
          user_id: string
        }
        Update: {
          analysis_end?: string
          analysis_start?: string
          created_at?: string
          diagnosis?: string
          feedback?: string | null
          id?: string
          main_area?: string | null
          main_error?: string | null
          priority?: number
          projection?: string | null
          recommended_action?: string | null
          risk?: string | null
          source_data?: Json
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      perf_category: {
        Row: {
          active: boolean
          area: string | null
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          area?: string | null
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          area?: string | null
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      perf_event: {
        Row: {
          active: boolean
          all_day: boolean
          category_id: string | null
          created_at: string
          description: string | null
          end_at: string
          external_calendar_id: string | null
          external_id: string | null
          id: string
          link: string | null
          location: string | null
          recurrence_group_id: string | null
          recurrence_rule: Json | null
          source: string
          start_at: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          all_day?: boolean
          category_id?: string | null
          created_at?: string
          description?: string | null
          end_at: string
          external_calendar_id?: string | null
          external_id?: string | null
          id?: string
          link?: string | null
          location?: string | null
          recurrence_group_id?: string | null
          recurrence_rule?: Json | null
          source?: string
          start_at: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          all_day?: boolean
          category_id?: string | null
          created_at?: string
          description?: string | null
          end_at?: string
          external_calendar_id?: string | null
          external_id?: string | null
          id?: string
          link?: string | null
          location?: string | null
          recurrence_group_id?: string | null
          recurrence_rule?: Json | null
          source?: string
          start_at?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perf_event_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "perf_category"
            referencedColumns: ["id"]
          },
        ]
      }
      perf_goal: {
        Row: {
          active: boolean
          allow_over_target: boolean
          area: string
          created_at: string
          current_value: number
          deadline: string | null
          description: string | null
          goal_type: string
          id: string
          initial_value: number
          name: string
          notes: string | null
          priority: number
          start_date: string
          status: string
          target_value: number
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          allow_over_target?: boolean
          area?: string
          created_at?: string
          current_value?: number
          deadline?: string | null
          description?: string | null
          goal_type?: string
          id?: string
          initial_value?: number
          name: string
          notes?: string | null
          priority?: number
          start_date?: string
          status?: string
          target_value: number
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          allow_over_target?: boolean
          area?: string
          created_at?: string
          current_value?: number
          deadline?: string | null
          description?: string | null
          goal_type?: string
          id?: string
          initial_value?: number
          name?: string
          notes?: string | null
          priority?: number
          start_date?: string
          status?: string
          target_value?: number
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      perf_google_calendar_connection: {
        Row: {
          access_token_encrypted: string | null
          active: boolean
          created_at: string
          expires_at: string | null
          google_account_id: string | null
          id: string
          last_sync_at: string | null
          refresh_token_encrypted: string | null
          selected_calendars: Json
          sync_direction: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_encrypted?: string | null
          active?: boolean
          created_at?: string
          expires_at?: string | null
          google_account_id?: string | null
          id?: string
          last_sync_at?: string | null
          refresh_token_encrypted?: string | null
          selected_calendars?: Json
          sync_direction?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_encrypted?: string | null
          active?: boolean
          created_at?: string
          expires_at?: string | null
          google_account_id?: string | null
          id?: string
          last_sync_at?: string | null
          refresh_token_encrypted?: string | null
          selected_calendars?: Json
          sync_direction?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      perf_habit: {
        Row: {
          alvo: number | null
          ativo: boolean
          category_id: string | null
          color: string | null
          created_at: string
          description: string | null
          end_date: string | null
          frequency_type: string
          icon: string | null
          id: string
          label: string
          monthly_target: number | null
          ordem: number
          period: string
          priority: number
          reminder_time: string | null
          start_date: string | null
          tipo: string
          unidade: string | null
          updated_at: string
          user_id: string
          weekdays: number[] | null
          weekly_target: number | null
        }
        Insert: {
          alvo?: number | null
          ativo?: boolean
          category_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          frequency_type?: string
          icon?: string | null
          id?: string
          label: string
          monthly_target?: number | null
          ordem?: number
          period?: string
          priority?: number
          reminder_time?: string | null
          start_date?: string | null
          tipo?: string
          unidade?: string | null
          updated_at?: string
          user_id: string
          weekdays?: number[] | null
          weekly_target?: number | null
        }
        Update: {
          alvo?: number | null
          ativo?: boolean
          category_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          frequency_type?: string
          icon?: string | null
          id?: string
          label?: string
          monthly_target?: number | null
          ordem?: number
          period?: string
          priority?: number
          reminder_time?: string | null
          start_date?: string | null
          tipo?: string
          unidade?: string | null
          updated_at?: string
          user_id?: string
          weekdays?: number[] | null
          weekly_target?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "perf_habit_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "perf_category"
            referencedColumns: ["id"]
          },
        ]
      }
      perf_habit_log: {
        Row: {
          completed_at: string | null
          created_at: string
          data: string
          habit_id: string
          id: string
          note: string | null
          points: number | null
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          data: string
          habit_id: string
          id?: string
          note?: string | null
          points?: number | null
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          data?: string
          habit_id?: string
          id?: string
          note?: string | null
          points?: number | null
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "perf_habit_log_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "perf_habit"
            referencedColumns: ["id"]
          },
        ]
      }
      perf_habit_schedule_period: {
        Row: {
          created_at: string
          effective_from: string
          effective_to: string | null
          frequency_type: string
          habit_id: string
          id: string
          user_id: string
          weekdays: number[]
        }
        Insert: {
          created_at?: string
          effective_from: string
          effective_to?: string | null
          frequency_type: string
          habit_id: string
          id?: string
          user_id: string
          weekdays?: number[]
        }
        Update: {
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          frequency_type?: string
          habit_id?: string
          id?: string
          user_id?: string
          weekdays?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "perf_habit_schedule_period_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "perf_habit"
            referencedColumns: ["id"]
          },
        ]
      }
      perf_investment_contribution: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          institution: string | null
          notes: string | null
          source: string
          source_entry_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date: string
          id?: string
          institution?: string | null
          notes?: string | null
          source?: string
          source_entry_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          institution?: string | null
          notes?: string | null
          source?: string
          source_entry_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      perf_investment_plan: {
        Row: {
          active: boolean
          archived_at: string | null
          completed_at: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          archived_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          archived_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      perf_investment_plan_revision: {
        Row: {
          annual_inflation: number
          annual_return_base: number
          annual_return_conservative: number
          annual_return_favorable: number
          baseline_date: string
          baseline_value: number
          change_note: string | null
          created_at: string
          effective_from: string
          id: string
          plan_id: string
          planned_monthly_contribution: number
          target_date: string
          target_value: number
          user_id: string
          value_mode: string
          value_reference_date: string
          version: number
        }
        Insert: {
          annual_inflation: number
          annual_return_base: number
          annual_return_conservative: number
          annual_return_favorable: number
          baseline_date: string
          baseline_value: number
          change_note?: string | null
          created_at?: string
          effective_from: string
          id?: string
          plan_id: string
          planned_monthly_contribution: number
          target_date: string
          target_value: number
          user_id: string
          value_mode: string
          value_reference_date: string
          version: number
        }
        Update: {
          annual_inflation?: number
          annual_return_base?: number
          annual_return_conservative?: number
          annual_return_favorable?: number
          baseline_date?: string
          baseline_value?: number
          change_note?: string | null
          created_at?: string
          effective_from?: string
          id?: string
          plan_id?: string
          planned_monthly_contribution?: number
          target_date?: string
          target_value?: number
          user_id?: string
          value_mode?: string
          value_reference_date?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "perf_investment_revision_plan_owner_fk"
            columns: ["plan_id", "user_id"]
            isOneToOne: false
            referencedRelation: "perf_investment_plan"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      perf_investment_withdrawal: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          institution: string | null
          notes: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date: string
          id?: string
          institution?: string | null
          notes?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          institution?: string | null
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      perf_match: {
        Row: {
          adversario: string | null
          created_at: string
          data: string
          id: string
          obs: string | null
          parceiro: string | null
          placar: string | null
          resultado: string
          user_id: string
        }
        Insert: {
          adversario?: string | null
          created_at?: string
          data: string
          id?: string
          obs?: string | null
          parceiro?: string | null
          placar?: string | null
          resultado: string
          user_id: string
        }
        Update: {
          adversario?: string | null
          created_at?: string
          data?: string
          id?: string
          obs?: string | null
          parceiro?: string | null
          placar?: string | null
          resultado?: string
          user_id?: string
        }
        Relationships: []
      }
      perf_portfolio_snapshot: {
        Row: {
          created_at: string
          date: string
          id: string
          movement: string
          notes: string | null
          previous_value: number | null
          total_value: number
          updated_at: string
          user_id: string
          variation_amount: number | null
          variation_percentage: number | null
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          movement?: string
          notes?: string | null
          previous_value?: number | null
          total_value: number
          updated_at?: string
          user_id: string
          variation_amount?: number | null
          variation_percentage?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          movement?: string
          notes?: string | null
          previous_value?: number | null
          total_value?: number
          updated_at?: string
          user_id?: string
          variation_amount?: number | null
          variation_percentage?: number | null
        }
        Relationships: []
      }
      perf_profile: {
        Row: {
          altura_cm: number | null
          created_at: string
          data_nascimento: string | null
          insight_time: string | null
          lado: string | null
          pe_dominante: string | null
          peso_meta: number | null
          rating_meta: number | null
          timezone: string
          treinos_semana_meta: number | null
          updated_at: string
          user_id: string
          week_starts_on: number
        }
        Insert: {
          altura_cm?: number | null
          created_at?: string
          data_nascimento?: string | null
          insight_time?: string | null
          lado?: string | null
          pe_dominante?: string | null
          peso_meta?: number | null
          rating_meta?: number | null
          timezone?: string
          treinos_semana_meta?: number | null
          updated_at?: string
          user_id: string
          week_starts_on?: number
        }
        Update: {
          altura_cm?: number | null
          created_at?: string
          data_nascimento?: string | null
          insight_time?: string | null
          lado?: string | null
          pe_dominante?: string | null
          peso_meta?: number | null
          rating_meta?: number | null
          timezone?: string
          treinos_semana_meta?: number | null
          updated_at?: string
          user_id?: string
          week_starts_on?: number
        }
        Relationships: []
      }
      perf_rating: {
        Row: {
          created_at: string
          data: string
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          created_at?: string
          data: string
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: []
      }
      perf_review: {
        Row: {
          adjustment: string | null
          ai_insight_id: string | null
          created_at: string
          failures: string | null
          id: string
          main_error: string | null
          neglected_area: string | null
          period_end: string
          period_start: string
          priority: string | null
          progress: string | null
          rating: number | null
          risk: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          adjustment?: string | null
          ai_insight_id?: string | null
          created_at?: string
          failures?: string | null
          id?: string
          main_error?: string | null
          neglected_area?: string | null
          period_end: string
          period_start: string
          priority?: string | null
          progress?: string | null
          rating?: number | null
          risk?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          adjustment?: string | null
          ai_insight_id?: string | null
          created_at?: string
          failures?: string | null
          id?: string
          main_error?: string | null
          neglected_area?: string | null
          period_end?: string
          period_start?: string
          priority?: string | null
          progress?: string | null
          rating?: number | null
          risk?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      perf_study_assessment_attempt: {
        Row: {
          answers: Json
          correct_count: number
          id: string
          item_id: string
          score: number
          submitted_at: string
          total_count: number
          user_id: string
        }
        Insert: {
          answers: Json
          correct_count: number
          id?: string
          item_id: string
          score: number
          submitted_at?: string
          total_count: number
          user_id: string
        }
        Update: {
          answers?: Json
          correct_count?: number
          id?: string
          item_id?: string
          score?: number
          submitted_at?: string
          total_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perf_study_assessment_attempt_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "perf_study_roadmap_item"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perf_study_attempt_item_owner_fk"
            columns: ["item_id", "user_id"]
            isOneToOne: false
            referencedRelation: "perf_study_roadmap_item"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      perf_study_assessment_question: {
        Row: {
          correct_option: number | null
          correct_order: Json
          created_at: string
          explanation: string
          id: string
          item_id: string
          options: Json
          order_index: number
          prompt: string
          question_type: string
          user_id: string
        }
        Insert: {
          correct_option?: number | null
          correct_order?: Json
          created_at?: string
          explanation: string
          id?: string
          item_id: string
          options: Json
          order_index?: number
          prompt: string
          question_type?: string
          user_id: string
        }
        Update: {
          correct_option?: number | null
          correct_order?: Json
          created_at?: string
          explanation?: string
          id?: string
          item_id?: string
          options?: Json
          order_index?: number
          prompt?: string
          question_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perf_study_assessment_question_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "perf_study_roadmap_item"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perf_study_question_item_owner_fk"
            columns: ["item_id", "user_id"]
            isOneToOne: false
            referencedRelation: "perf_study_roadmap_item"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      perf_study_check_progress: {
        Row: {
          check_group: string
          checked: boolean
          id: string
          item_id: string
          item_index: number
          updated_at: string
          user_id: string
        }
        Insert: {
          check_group: string
          checked?: boolean
          id?: string
          item_id: string
          item_index: number
          updated_at?: string
          user_id: string
        }
        Update: {
          check_group?: string
          checked?: boolean
          id?: string
          item_id?: string
          item_index?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perf_study_check_progress_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "perf_study_roadmap_item"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perf_study_check_progress_item_owner_fk"
            columns: ["item_id", "user_id"]
            isOneToOne: false
            referencedRelation: "perf_study_roadmap_item"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      perf_study_roadmap: {
        Row: {
          created_at: string
          description: string | null
          difficulty_level: string | null
          generation_id: string | null
          id: string
          quality_score: number | null
          recommended_target_date: string | null
          roadmap_kind: string
          setup: Json
          source: string
          start_date: string
          status: string
          target_date: string | null
          target_level: string | null
          template_key: string | null
          template_version: number | null
          title: string
          total_estimated_minutes: number | null
          updated_at: string
          user_id: string
          workload_score: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          generation_id?: string | null
          id?: string
          quality_score?: number | null
          recommended_target_date?: string | null
          roadmap_kind?: string
          setup?: Json
          source?: string
          start_date?: string
          status?: string
          target_date?: string | null
          target_level?: string | null
          template_key?: string | null
          template_version?: number | null
          title: string
          total_estimated_minutes?: number | null
          updated_at?: string
          user_id: string
          workload_score?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          generation_id?: string | null
          id?: string
          quality_score?: number | null
          recommended_target_date?: string | null
          roadmap_kind?: string
          setup?: Json
          source?: string
          start_date?: string
          status?: string
          target_date?: string | null
          target_level?: string | null
          template_key?: string | null
          template_version?: number | null
          title?: string
          total_estimated_minutes?: number | null
          updated_at?: string
          user_id?: string
          workload_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "perf_study_roadmap_generation_fk"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "perf_study_roadmap_generation"
            referencedColumns: ["id"]
          },
        ]
      }
      perf_study_roadmap_generation: {
        Row: {
          accepted_at: string | null
          answers: Json
          created_at: string
          error_message: string | null
          generated_plan: Json | null
          id: string
          input_tokens: number | null
          model: string | null
          module_count: number | null
          origin: string
          original_filename: string | null
          output_tokens: number | null
          preview_description: string | null
          preview_title: string | null
          prompt_version: string
          provider_response_id: string | null
          source_sha256: string | null
          status: string
          step_count: number | null
          total_estimated_minutes: number | null
          updated_at: string
          user_id: string
          web_search_calls: number
        }
        Insert: {
          accepted_at?: string | null
          answers?: Json
          created_at?: string
          error_message?: string | null
          generated_plan?: Json | null
          id?: string
          input_tokens?: number | null
          model?: string | null
          module_count?: number | null
          origin?: string
          original_filename?: string | null
          output_tokens?: number | null
          preview_description?: string | null
          preview_title?: string | null
          prompt_version?: string
          provider_response_id?: string | null
          source_sha256?: string | null
          status?: string
          step_count?: number | null
          total_estimated_minutes?: number | null
          updated_at?: string
          user_id: string
          web_search_calls?: number
        }
        Update: {
          accepted_at?: string | null
          answers?: Json
          created_at?: string
          error_message?: string | null
          generated_plan?: Json | null
          id?: string
          input_tokens?: number | null
          model?: string | null
          module_count?: number | null
          origin?: string
          original_filename?: string | null
          output_tokens?: number | null
          preview_description?: string | null
          preview_title?: string | null
          prompt_version?: string
          provider_response_id?: string | null
          source_sha256?: string | null
          status?: string
          step_count?: number | null
          total_estimated_minutes?: number | null
          updated_at?: string
          user_id?: string
          web_search_calls?: number
        }
        Relationships: []
      }
      perf_study_roadmap_item: {
        Row: {
          completed_at: string | null
          completion_checklist: Json
          completion_criteria: string | null
          content_role: string | null
          counts_for_progress: boolean
          created_at: string
          description: string | null
          estimated_minutes: number | null
          evidence_prompt: string | null
          id: string
          instructions: string | null
          item_code: string | null
          item_kind: string
          legacy_completion_preserved: boolean
          level_code: string | null
          module_id: string | null
          order_index: number
          parent_item_id: string | null
          practice_exercises: Json
          preparation_steps: Json
          project_spec: Json
          reflection_questions: Json
          requirements: string | null
          resource_channel: string | null
          resource_title: string | null
          resource_url: string | null
          roadmap_id: string
          scheduled_date: string | null
          section: string | null
          status: string
          subtopics: Json
          template_node_id: string | null
          title: string
          updated_at: string
          user_id: string
          workspace: string | null
        }
        Insert: {
          completed_at?: string | null
          completion_checklist?: Json
          completion_criteria?: string | null
          content_role?: string | null
          counts_for_progress?: boolean
          created_at?: string
          description?: string | null
          estimated_minutes?: number | null
          evidence_prompt?: string | null
          id?: string
          instructions?: string | null
          item_code?: string | null
          item_kind?: string
          legacy_completion_preserved?: boolean
          level_code?: string | null
          module_id?: string | null
          order_index?: number
          parent_item_id?: string | null
          practice_exercises?: Json
          preparation_steps?: Json
          project_spec?: Json
          reflection_questions?: Json
          requirements?: string | null
          resource_channel?: string | null
          resource_title?: string | null
          resource_url?: string | null
          roadmap_id: string
          scheduled_date?: string | null
          section?: string | null
          status?: string
          subtopics?: Json
          template_node_id?: string | null
          title: string
          updated_at?: string
          user_id: string
          workspace?: string | null
        }
        Update: {
          completed_at?: string | null
          completion_checklist?: Json
          completion_criteria?: string | null
          content_role?: string | null
          counts_for_progress?: boolean
          created_at?: string
          description?: string | null
          estimated_minutes?: number | null
          evidence_prompt?: string | null
          id?: string
          instructions?: string | null
          item_code?: string | null
          item_kind?: string
          legacy_completion_preserved?: boolean
          level_code?: string | null
          module_id?: string | null
          order_index?: number
          parent_item_id?: string | null
          practice_exercises?: Json
          preparation_steps?: Json
          project_spec?: Json
          reflection_questions?: Json
          requirements?: string | null
          resource_channel?: string | null
          resource_title?: string | null
          resource_url?: string | null
          roadmap_id?: string
          scheduled_date?: string | null
          section?: string | null
          status?: string
          subtopics?: Json
          template_node_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          workspace?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perf_study_item_module_owner_fk"
            columns: ["module_id", "user_id", "roadmap_id"]
            isOneToOne: false
            referencedRelation: "perf_study_roadmap_module"
            referencedColumns: ["id", "user_id", "roadmap_id"]
          },
          {
            foreignKeyName: "perf_study_item_parent_fk"
            columns: ["parent_item_id", "user_id", "roadmap_id"]
            isOneToOne: false
            referencedRelation: "perf_study_roadmap_item"
            referencedColumns: ["id", "user_id", "roadmap_id"]
          },
          {
            foreignKeyName: "perf_study_item_roadmap_owner_fk"
            columns: ["roadmap_id", "user_id"]
            isOneToOne: false
            referencedRelation: "perf_study_roadmap"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "perf_study_roadmap_item_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "perf_study_roadmap_module"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perf_study_roadmap_item_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "perf_study_roadmap"
            referencedColumns: ["id"]
          },
        ]
      }
      perf_study_roadmap_module: {
        Row: {
          created_at: string
          estimated_minutes: number | null
          id: string
          level_code: string | null
          module_code: string | null
          module_kind: string | null
          objective: string | null
          order_index: number
          roadmap_id: string
          success_criteria: string | null
          template_node_id: string | null
          title: string
          topics: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          estimated_minutes?: number | null
          id?: string
          level_code?: string | null
          module_code?: string | null
          module_kind?: string | null
          objective?: string | null
          order_index?: number
          roadmap_id: string
          success_criteria?: string | null
          template_node_id?: string | null
          title: string
          topics?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          estimated_minutes?: number | null
          id?: string
          level_code?: string | null
          module_code?: string | null
          module_kind?: string | null
          objective?: string | null
          order_index?: number
          roadmap_id?: string
          success_criteria?: string | null
          template_node_id?: string | null
          title?: string
          topics?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perf_study_module_roadmap_owner_fk"
            columns: ["roadmap_id", "user_id"]
            isOneToOne: false
            referencedRelation: "perf_study_roadmap"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "perf_study_roadmap_module_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "perf_study_roadmap"
            referencedColumns: ["id"]
          },
        ]
      }
      perf_study_workspace_download: {
        Row: {
          artifact_sha256: string
          bundle_kind: string
          downloaded_at: string
          id: string
          module_id: string | null
          roadmap_id: string
          template_version: number
          user_id: string
        }
        Insert: {
          artifact_sha256: string
          bundle_kind: string
          downloaded_at?: string
          id?: string
          module_id?: string | null
          roadmap_id: string
          template_version: number
          user_id: string
        }
        Update: {
          artifact_sha256?: string
          bundle_kind?: string
          downloaded_at?: string
          id?: string
          module_id?: string | null
          roadmap_id?: string
          template_version?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perf_study_workspace_download_module_owner_fk"
            columns: ["module_id", "user_id", "roadmap_id"]
            isOneToOne: false
            referencedRelation: "perf_study_roadmap_module"
            referencedColumns: ["id", "user_id", "roadmap_id"]
          },
          {
            foreignKeyName: "perf_study_workspace_download_roadmap_owner_fk"
            columns: ["roadmap_id", "user_id"]
            isOneToOne: false
            referencedRelation: "perf_study_roadmap"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      perf_subscription: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string
          provider: string
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan: string
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      perf_task: {
        Row: {
          active: boolean
          created_at: string
          id: string
          recurrence_end_date: string | null
          recurrence_type: string
          start_date: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          recurrence_end_date?: string | null
          recurrence_type?: string
          start_date: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          recurrence_end_date?: string | null
          recurrence_type?: string
          start_date?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      perf_task_log: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          occurrence_date: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          occurrence_date: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          occurrence_date?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perf_task_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "perf_task"
            referencedColumns: ["id"]
          },
        ]
      }
      perf_test: {
        Row: {
          created_at: string
          data: string
          id: string
          tipo_teste: string
          unidade: string | null
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          data: string
          id?: string
          tipo_teste: string
          unidade?: string | null
          user_id: string
          valor: number
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          tipo_teste?: string
          unidade?: string | null
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      perf_training: {
        Row: {
          created_at: string
          data: string
          duracao_min: number | null
          id: string
          obs: string | null
          tipo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: string
          duracao_min?: number | null
          id?: string
          obs?: string | null
          tipo: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: string
          duracao_min?: number | null
          id?: string
          obs?: string | null
          tipo?: string
          user_id?: string
        }
        Relationships: []
      }
      perf_weekly_report: {
        Row: {
          created_at: string
          fechado: boolean
          id: string
          nota: number | null
          respostas: Json
          semana_inicio: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fechado?: boolean
          id?: string
          nota?: number | null
          respostas?: Json
          semana_inicio: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fechado?: boolean
          id?: string
          nota?: number | null
          respostas?: Json
          semana_inicio?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      perf_weight: {
        Row: {
          cintura_cm: number | null
          created_at: string
          data: string
          gordura_pct: number | null
          id: string
          peso_kg: number
          user_id: string
        }
        Insert: {
          cintura_cm?: number | null
          created_at?: string
          data: string
          gordura_pct?: number | null
          id?: string
          peso_kg: number
          user_id: string
        }
        Update: {
          cintura_cm?: number | null
          created_at?: string
          data?: string
          gordura_pct?: number | null
          id?: string
          peso_kg?: number
          user_id?: string
        }
        Relationships: []
      }
      personal_finance_categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_finance_entries: {
        Row: {
          amount: number
          bank: string
          category: string
          created_at: string
          entry_date: string
          id: string
          installment_group_id: string | null
          installment_number: number
          installment_total: number
          investment_cdi_percent: number | null
          investment_yield_mode: string | null
          is_installment: boolean
          is_recurring: boolean
          name: string
          payment_method: string
          person: string
          recurrence_day: number | null
          recurrence_day_mode: string | null
          shared_entry_group_id: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          bank: string
          category: string
          created_at?: string
          entry_date: string
          id?: string
          installment_group_id?: string | null
          installment_number?: number
          installment_total?: number
          investment_cdi_percent?: number | null
          investment_yield_mode?: string | null
          is_installment?: boolean
          is_recurring?: boolean
          name: string
          payment_method: string
          person: string
          recurrence_day?: number | null
          recurrence_day_mode?: string | null
          shared_entry_group_id?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          bank?: string
          category?: string
          created_at?: string
          entry_date?: string
          id?: string
          installment_group_id?: string | null
          installment_number?: number
          installment_total?: number
          investment_cdi_percent?: number | null
          investment_yield_mode?: string | null
          is_installment?: boolean
          is_recurring?: boolean
          name?: string
          payment_method?: string
          person?: string
          recurrence_day?: number | null
          recurrence_day_mode?: string | null
          shared_entry_group_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_finance_investment_settings: {
        Row: {
          id: string
          last_cdi_annual: number | null
          last_cdi_reference_date: string | null
          mercado_pago_bonus_cdi_percent: number
          mercado_pago_bonus_limit: number
          mercado_pago_excess_cdi_percent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          last_cdi_annual?: number | null
          last_cdi_reference_date?: string | null
          mercado_pago_bonus_cdi_percent?: number
          mercado_pago_bonus_limit?: number
          mercado_pago_excess_cdi_percent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          last_cdi_annual?: number | null
          last_cdi_reference_date?: string | null
          mercado_pago_bonus_cdi_percent?: number
          mercado_pago_bonus_limit?: number
          mercado_pago_excess_cdi_percent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_finance_recurring_overrides: {
        Row: {
          amount: number | null
          bank: string | null
          category: string | null
          created_at: string
          deleted: boolean
          entry_date: string | null
          id: string
          investment_cdi_percent: number | null
          investment_yield_mode: string | null
          month_key: string
          name: string | null
          payment_method: string | null
          person: string | null
          recurrence_day: number | null
          recurrence_day_mode: string | null
          recurring_entry_id: string
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          bank?: string | null
          category?: string | null
          created_at?: string
          deleted?: boolean
          entry_date?: string | null
          id?: string
          investment_cdi_percent?: number | null
          investment_yield_mode?: string | null
          month_key: string
          name?: string | null
          payment_method?: string | null
          person?: string | null
          recurrence_day?: number | null
          recurrence_day_mode?: string | null
          recurring_entry_id: string
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          bank?: string | null
          category?: string | null
          created_at?: string
          deleted?: boolean
          entry_date?: string | null
          id?: string
          investment_cdi_percent?: number | null
          investment_yield_mode?: string | null
          month_key?: string
          name?: string | null
          payment_method?: string | null
          person?: string | null
          recurrence_day?: number | null
          recurrence_day_mode?: string | null
          recurring_entry_id?: string
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_finance_recurring_overrides_recurring_entry_id_fkey"
            columns: ["recurring_entry_id"]
            isOneToOne: false
            referencedRelation: "personal_finance_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_config: {
        Row: {
          arenas_destaques_ids: string[] | null
          atleta_credito_7a12_extra: number
          destaques_ids: string[]
          home_banners: Json
          id: number
          noticias_destaques_ids: string[]
          plataforma_credito_fixo: number
          plataforma_credito_percent: number
          plataforma_debito_fixo: number
          plataforma_debito_percent: number
          plataforma_pix_fixo: number
          premium_credito_fixo: number | null
          premium_credito_percent: number | null
          premium_debito_fixo: number | null
          premium_debito_percent: number | null
          premium_pix_fixo: number | null
          updated_at: string
        }
        Insert: {
          arenas_destaques_ids?: string[] | null
          atleta_credito_7a12_extra?: number
          destaques_ids?: string[]
          home_banners?: Json
          id?: number
          noticias_destaques_ids?: string[]
          plataforma_credito_fixo?: number
          plataforma_credito_percent?: number
          plataforma_debito_fixo?: number
          plataforma_debito_percent?: number
          plataforma_pix_fixo?: number
          premium_credito_fixo?: number | null
          premium_credito_percent?: number | null
          premium_debito_fixo?: number | null
          premium_debito_percent?: number | null
          premium_pix_fixo?: number | null
          updated_at?: string
        }
        Update: {
          arenas_destaques_ids?: string[] | null
          atleta_credito_7a12_extra?: number
          destaques_ids?: string[]
          home_banners?: Json
          id?: number
          noticias_destaques_ids?: string[]
          plataforma_credito_fixo?: number
          plataforma_credito_percent?: number
          plataforma_debito_fixo?: number
          plataforma_debito_percent?: number
          plataforma_pix_fixo?: number
          premium_credito_fixo?: number | null
          premium_credito_percent?: number | null
          premium_debito_fixo?: number | null
          premium_debito_percent?: number | null
          premium_pix_fixo?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      pricing_tiers: {
        Row: {
          ativo: boolean
          category_id: string | null
          created_at: string
          data_fim: string | null
          id: string
          nome: string
          ordem: number
          quantidade_maxima: number | null
          ticket_type_id: string | null
          valor: number
          vendidos: number
        }
        Insert: {
          ativo?: boolean
          category_id?: string | null
          created_at?: string
          data_fim?: string | null
          id?: string
          nome: string
          ordem?: number
          quantidade_maxima?: number | null
          ticket_type_id?: string | null
          valor: number
          vendidos?: number
        }
        Update: {
          ativo?: boolean
          category_id?: string | null
          created_at?: string
          data_fim?: string | null
          id?: string
          nome?: string
          ordem?: number
          quantidade_maxima?: number | null
          ticket_type_id?: string | null
          valor?: number
          vendidos?: number
        }
        Relationships: [
          {
            foreignKeyName: "pricing_tiers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "championship_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_tiers_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "spectator_ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          cidade: string | null
          created_at: string | null
          estado: string | null
          foto_url: string | null
          genero: string | null
          id: string
          nome: string
          rating: number | null
          role: string
          tamanho_camisa: string | null
          username: string
        }
        Insert: {
          bio?: string | null
          cidade?: string | null
          created_at?: string | null
          estado?: string | null
          foto_url?: string | null
          genero?: string | null
          id: string
          nome: string
          rating?: number | null
          role?: string
          tamanho_camisa?: string | null
          username: string
        }
        Update: {
          bio?: string | null
          cidade?: string | null
          created_at?: string | null
          estado?: string | null
          foto_url?: string | null
          genero?: string | null
          id?: string
          nome?: string
          rating?: number | null
          role?: string
          tamanho_camisa?: string | null
          username?: string
        }
        Relationships: []
      }
      profiles_private: {
        Row: {
          cpf: string | null
          data_nascimento: string | null
          questionario: Json | null
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cpf?: string | null
          data_nascimento?: string | null
          questionario?: Json | null
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cpf?: string | null
          data_nascimento?: string | null
          questionario?: Json | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      public_funnel_events: {
        Row: {
          category_id: string | null
          championship_id: string | null
          created_at: string
          event_name: string
          experience_version: string
          id: string
          occurred_at: string
          session_id: string
        }
        Insert: {
          category_id?: string | null
          championship_id?: string | null
          created_at?: string
          event_name: string
          experience_version: string
          id?: string
          occurred_at?: string
          session_id: string
        }
        Update: {
          category_id?: string | null
          championship_id?: string | null
          created_at?: string
          event_name?: string
          experience_version?: string
          id?: string
          occurred_at?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_funnel_events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "championship_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_funnel_events_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
        ]
      }
      ranking_dupla: {
        Row: {
          atleta1: string
          atleta1_foto: string | null
          atleta1_username: string | null
          atleta2: string
          atleta2_foto: string | null
          atleta2_username: string | null
          created_at: string
          genero: string
          id: string
          pontos: number
          posicao: number | null
          posicao_anterior: number | null
        }
        Insert: {
          atleta1: string
          atleta1_foto?: string | null
          atleta1_username?: string | null
          atleta2: string
          atleta2_foto?: string | null
          atleta2_username?: string | null
          created_at?: string
          genero: string
          id?: string
          pontos?: number
          posicao?: number | null
          posicao_anterior?: number | null
        }
        Update: {
          atleta1?: string
          atleta1_foto?: string | null
          atleta1_username?: string | null
          atleta2?: string
          atleta2_foto?: string | null
          atleta2_username?: string | null
          created_at?: string
          genero?: string
          id?: string
          pontos?: number
          posicao?: number | null
          posicao_anterior?: number | null
        }
        Relationships: []
      }
      ranking_individual: {
        Row: {
          created_at: string
          foto_url: string | null
          genero: string
          id: string
          instagram: string | null
          nome: string
          pontos: number
          posicao: number | null
          posicao_anterior: number | null
          username: string | null
        }
        Insert: {
          created_at?: string
          foto_url?: string | null
          genero: string
          id?: string
          instagram?: string | null
          nome: string
          pontos?: number
          posicao?: number | null
          posicao_anterior?: number | null
          username?: string | null
        }
        Update: {
          created_at?: string
          foto_url?: string | null
          genero?: string
          id?: string
          instagram?: string | null
          nome?: string
          pontos?: number
          posicao?: number | null
          posicao_anterior?: number | null
          username?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          hits: number
          key: string
          window_start: string
        }
        Insert: {
          hits?: number
          key: string
          window_start?: string
        }
        Update: {
          hits?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      rating_history: {
        Row: {
          atleta_id: string
          championship_id: string
          created_at: string | null
          id: string
          match_id: string | null
          rating_antes: number
          rating_depois: number
          resultado: string
        }
        Insert: {
          atleta_id: string
          championship_id: string
          created_at?: string | null
          id?: string
          match_id?: string | null
          rating_antes: number
          rating_depois: number
          resultado: string
        }
        Update: {
          atleta_id?: string
          championship_id?: string
          created_at?: string | null
          id?: string
          match_id?: string | null
          rating_antes?: number
          rating_depois?: number
          resultado?: string
        }
        Relationships: [
          {
            foreignKeyName: "rating_history_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rating_history_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "bracket_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          asaas_payment_id: string | null
          billing_type: string | null
          category_id: string
          championship_id: string
          coupon_released_at: string | null
          created_at: string | null
          cupom_id: string | null
          elite_fee_coletada: number
          id: string
          inventory_released_at: string | null
          invoice_url: string | null
          lote_id: string | null
          pix_copy_paste: string | null
          pix_qr_code_base64: string | null
          privacy_version: string | null
          repasse_data_prevista: string | null
          repasse_erro: string | null
          repasse_status: string
          repasse_transfer_id: string | null
          status_pagamento: string
          team_id: string
          terms_accepted_at: string | null
          terms_version: string | null
          valor: number
        }
        Insert: {
          asaas_payment_id?: string | null
          billing_type?: string | null
          category_id: string
          championship_id: string
          coupon_released_at?: string | null
          created_at?: string | null
          cupom_id?: string | null
          elite_fee_coletada?: number
          id?: string
          inventory_released_at?: string | null
          invoice_url?: string | null
          lote_id?: string | null
          pix_copy_paste?: string | null
          pix_qr_code_base64?: string | null
          privacy_version?: string | null
          repasse_data_prevista?: string | null
          repasse_erro?: string | null
          repasse_status?: string
          repasse_transfer_id?: string | null
          status_pagamento?: string
          team_id: string
          terms_accepted_at?: string | null
          terms_version?: string | null
          valor: number
        }
        Update: {
          asaas_payment_id?: string | null
          billing_type?: string | null
          category_id?: string
          championship_id?: string
          coupon_released_at?: string | null
          created_at?: string | null
          cupom_id?: string | null
          elite_fee_coletada?: number
          id?: string
          inventory_released_at?: string | null
          invoice_url?: string | null
          lote_id?: string | null
          pix_copy_paste?: string | null
          pix_qr_code_base64?: string | null
          privacy_version?: string | null
          repasse_data_prevista?: string | null
          repasse_erro?: string | null
          repasse_status?: string
          repasse_transfer_id?: string | null
          status_pagamento?: string
          team_id?: string
          terms_accepted_at?: string | null
          terms_version?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "registrations_category_championship_fkey"
            columns: ["category_id", "championship_id"]
            isOneToOne: false
            referencedRelation: "championship_categories"
            referencedColumns: ["id", "championship_id"]
          },
          {
            foreignKeyName: "registrations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "championship_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_cupom_id_fkey"
            columns: ["cupom_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "pricing_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          acao: string
          actor_id: string | null
          alvo_id: string | null
          alvo_tabela: string | null
          created_at: string
          detalhes: Json | null
          id: string
          ip: string | null
        }
        Insert: {
          acao: string
          actor_id?: string | null
          alvo_id?: string | null
          alvo_tabela?: string | null
          created_at?: string
          detalhes?: Json | null
          id?: string
          ip?: string | null
        }
        Update: {
          acao?: string
          actor_id?: string | null
          alvo_id?: string | null
          alvo_tabela?: string | null
          created_at?: string
          detalhes?: Json | null
          id?: string
          ip?: string | null
        }
        Relationships: []
      }
      shirt_production: {
        Row: {
          athlete_id: string
          championship_id: string
          data_retirada: string | null
          id: string
          produced: boolean
          retirado_por: string | null
          updated_at: string | null
        }
        Insert: {
          athlete_id: string
          championship_id: string
          data_retirada?: string | null
          id?: string
          produced?: boolean
          retirado_por?: string | null
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string
          championship_id?: string
          data_retirada?: string | null
          id?: string
          produced?: boolean
          retirado_por?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shirt_production_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
        ]
      }
      spectator_ticket_items: {
        Row: {
          created_at: string
          id: string
          inventory_released_at: string | null
          line_number: number
          lote_nome_snapshot: string | null
          pricing_tier_id: string | null
          quantidade: number
          ticket_id: string
          ticket_type_id: string | null
          tipo_nome_snapshot: string
          valor_unitario: number
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_released_at?: string | null
          line_number: number
          lote_nome_snapshot?: string | null
          pricing_tier_id?: string | null
          quantidade: number
          ticket_id: string
          ticket_type_id?: string | null
          tipo_nome_snapshot: string
          valor_unitario: number
        }
        Update: {
          created_at?: string
          id?: string
          inventory_released_at?: string | null
          line_number?: number
          lote_nome_snapshot?: string | null
          pricing_tier_id?: string | null
          quantidade?: number
          ticket_id?: string
          ticket_type_id?: string | null
          tipo_nome_snapshot?: string
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "spectator_ticket_items_pricing_tier_id_fkey"
            columns: ["pricing_tier_id"]
            isOneToOne: false
            referencedRelation: "pricing_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spectator_ticket_items_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "spectator_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spectator_ticket_items_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "spectator_ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      spectator_ticket_items_backfill_report: {
        Row: {
          expected_lines: number
          inspected_at: string
          legacy_items: Json | null
          migrated_lines: number
          reason: string | null
          status: string
          ticket_id: string
        }
        Insert: {
          expected_lines?: number
          inspected_at?: string
          legacy_items?: Json | null
          migrated_lines?: number
          reason?: string | null
          status: string
          ticket_id: string
        }
        Update: {
          expected_lines?: number
          inspected_at?: string
          legacy_items?: Json | null
          migrated_lines?: number
          reason?: string | null
          status?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spectator_ticket_items_backfill_report_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "spectator_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      spectator_ticket_types: {
        Row: {
          ativo: boolean
          championship_id: string
          created_at: string
          id: string
          max_quantidade: number | null
          nome: string
          ordem: number
          valor: number
          vendidos: number
        }
        Insert: {
          ativo?: boolean
          championship_id: string
          created_at?: string
          id?: string
          max_quantidade?: number | null
          nome: string
          ordem?: number
          valor?: number
          vendidos?: number
        }
        Update: {
          ativo?: boolean
          championship_id?: string
          created_at?: string
          id?: string
          max_quantidade?: number | null
          nome?: string
          ordem?: number
          valor?: number
          vendidos?: number
        }
        Relationships: [
          {
            foreignKeyName: "spectator_ticket_types_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
        ]
      }
      spectator_tickets: {
        Row: {
          access_token: string
          asaas_payment_id: string | null
          billing_type: string | null
          championship_id: string
          checked_in: boolean
          checkin_at: string | null
          code: string | null
          comprador_cpf: string | null
          comprador_email: string
          comprador_nome: string
          coupon_released_at: string | null
          created_at: string
          cupom_id: string | null
          id: string
          inventory_released_at: string | null
          invoice_url: string | null
          items_normalized: boolean
          itens: Json | null
          pix_copy_paste: string | null
          pix_qr_code_base64: string | null
          privacy_version: string | null
          qr_token: string
          quantidade: number
          repasse_data_prevista: string | null
          repasse_erro: string | null
          repasse_status: string
          repasse_transfer_id: string | null
          status_pagamento: string
          terms_accepted_at: string | null
          terms_version: string | null
          ticket_type_id: string | null
          tipo_nome: string | null
          user_id: string | null
          valor: number
        }
        Insert: {
          access_token: string
          asaas_payment_id?: string | null
          billing_type?: string | null
          championship_id: string
          checked_in?: boolean
          checkin_at?: string | null
          code?: string | null
          comprador_cpf?: string | null
          comprador_email: string
          comprador_nome: string
          coupon_released_at?: string | null
          created_at?: string
          cupom_id?: string | null
          id?: string
          inventory_released_at?: string | null
          invoice_url?: string | null
          items_normalized?: boolean
          itens?: Json | null
          pix_copy_paste?: string | null
          pix_qr_code_base64?: string | null
          privacy_version?: string | null
          qr_token?: string
          quantidade?: number
          repasse_data_prevista?: string | null
          repasse_erro?: string | null
          repasse_status?: string
          repasse_transfer_id?: string | null
          status_pagamento?: string
          terms_accepted_at?: string | null
          terms_version?: string | null
          ticket_type_id?: string | null
          tipo_nome?: string | null
          user_id?: string | null
          valor?: number
        }
        Update: {
          access_token?: string
          asaas_payment_id?: string | null
          billing_type?: string | null
          championship_id?: string
          checked_in?: boolean
          checkin_at?: string | null
          code?: string | null
          comprador_cpf?: string | null
          comprador_email?: string
          comprador_nome?: string
          coupon_released_at?: string | null
          created_at?: string
          cupom_id?: string | null
          id?: string
          inventory_released_at?: string | null
          invoice_url?: string | null
          items_normalized?: boolean
          itens?: Json | null
          pix_copy_paste?: string | null
          pix_qr_code_base64?: string | null
          privacy_version?: string | null
          qr_token?: string
          quantidade?: number
          repasse_data_prevista?: string | null
          repasse_erro?: string | null
          repasse_status?: string
          repasse_transfer_id?: string | null
          status_pagamento?: string
          terms_accepted_at?: string | null
          terms_version?: string | null
          ticket_type_id?: string | null
          tipo_nome?: string | null
          user_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "spectator_tickets_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spectator_tickets_cupom_id_fkey"
            columns: ["cupom_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spectator_tickets_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "spectator_ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      student_charges: {
        Row: {
          arena_id: string
          arena_student_id: string
          asaas_payment_id: string | null
          competencia: string
          created_at: string
          id: string
          invoice_url: string | null
          pago_em: string | null
          pix_copy_paste: string | null
          pix_qr_code_base64: string | null
          repasse_data_prevista: string | null
          repasse_erro: string | null
          repasse_status: string
          repasse_transfer_id: string | null
          status_pagamento: string
          user_id: string
          valor: number
        }
        Insert: {
          arena_id: string
          arena_student_id: string
          asaas_payment_id?: string | null
          competencia: string
          created_at?: string
          id?: string
          invoice_url?: string | null
          pago_em?: string | null
          pix_copy_paste?: string | null
          pix_qr_code_base64?: string | null
          repasse_data_prevista?: string | null
          repasse_erro?: string | null
          repasse_status?: string
          repasse_transfer_id?: string | null
          status_pagamento?: string
          user_id: string
          valor: number
        }
        Update: {
          arena_id?: string
          arena_student_id?: string
          asaas_payment_id?: string | null
          competencia?: string
          created_at?: string
          id?: string
          invoice_url?: string | null
          pago_em?: string | null
          pix_copy_paste?: string | null
          pix_qr_code_base64?: string | null
          repasse_data_prevista?: string | null
          repasse_erro?: string | null
          repasse_status?: string
          repasse_transfer_id?: string | null
          status_pagamento?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_charges_arena_id_fkey"
            columns: ["arena_id"]
            isOneToOne: false
            referencedRelation: "arenas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_charges_arena_student_id_fkey"
            columns: ["arena_student_id"]
            isOneToOne: false
            referencedRelation: "arena_students"
            referencedColumns: ["id"]
          },
        ]
      }
      support_case_attachments: {
        Row: {
          case_id: string
          created_at: string
          id: string
          mime_type: string
          original_name: string
          size_bytes: number
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          mime_type: string
          original_name: string
          size_bytes: number
          storage_path: string
          uploaded_by: string
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          mime_type?: string
          original_name?: string
          size_bytes?: number
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_case_attachments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "support_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      support_case_notes: {
        Row: {
          author_id: string
          case_id: string
          created_at: string
          id: string
          note: string
        }
        Insert: {
          author_id: string
          case_id: string
          created_at?: string
          id?: string
          note: string
        }
        Update: {
          author_id?: string
          case_id?: string
          created_at?: string
          id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_case_notes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "support_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      support_cases: {
        Row: {
          assigned_to: string | null
          athlete_ticket_id: string | null
          case_type: string
          created_at: string
          created_by: string
          credential_id: string | null
          id: string
          priority: string
          resolved_at: string | null
          sla_due_at: string | null
          status: string
          summary: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          athlete_ticket_id?: string | null
          case_type?: string
          created_at?: string
          created_by: string
          credential_id?: string | null
          id?: string
          priority?: string
          resolved_at?: string | null
          sla_due_at?: string | null
          status?: string
          summary: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          athlete_ticket_id?: string | null
          case_type?: string
          created_at?: string
          created_by?: string
          credential_id?: string | null
          id?: string
          priority?: string
          resolved_at?: string | null
          sla_due_at?: string | null
          status?: string
          summary?: string
          updated_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          atleta1_id: string
          atleta2_id: string | null
          category_id: string
          championship_id: string
          created_at: string | null
          id: string
          invite_token: string
          parceiro_username: string | null
          rating_dupla: number | null
          sandbagging_flag: boolean
          status: string
        }
        Insert: {
          atleta1_id: string
          atleta2_id?: string | null
          category_id: string
          championship_id: string
          created_at?: string | null
          id?: string
          invite_token?: string
          parceiro_username?: string | null
          rating_dupla?: number | null
          sandbagging_flag?: boolean
          status?: string
        }
        Update: {
          atleta1_id?: string
          atleta2_id?: string | null
          category_id?: string
          championship_id?: string
          created_at?: string | null
          id?: string
          invite_token?: string
          parceiro_username?: string | null
          rating_dupla?: number | null
          sandbagging_flag?: boolean
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_category_championship_fkey"
            columns: ["category_id", "championship_id"]
            isOneToOne: false
            referencedRelation: "championship_categories"
            referencedColumns: ["id", "championship_id"]
          },
          {
            foreignKeyName: "teams_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "championship_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_recovery_codes: {
        Row: {
          codigo_hash: string
          cpf: string
          created_at: string
          email: string
          expira_em: string
          id: string
          tentativas: number
          usado_em: string | null
        }
        Insert: {
          codigo_hash: string
          cpf: string
          created_at?: string
          email: string
          expira_em: string
          id?: string
          tentativas?: number
          usado_em?: string | null
        }
        Update: {
          codigo_hash?: string
          cpf?: string
          created_at?: string
          email?: string
          expira_em?: string
          id?: string
          tentativas?: number
          usado_em?: string | null
        }
        Relationships: []
      }
      transactional_email_events: {
        Row: {
          accepted_at: string | null
          created_at: string
          delivered_at: string | null
          failure_category: string | null
          id: string
          last_event_at: string
          metadata: Json
          provider: string
          provider_message_id: string | null
          recipient_hash: string
          requested_at: string
          status: string
          template_key: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          delivered_at?: string | null
          failure_category?: string | null
          id?: string
          last_event_at?: string
          metadata?: Json
          provider?: string
          provider_message_id?: string | null
          recipient_hash: string
          requested_at?: string
          status?: string
          template_key: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          delivered_at?: string | null
          failure_category?: string | null
          id?: string
          last_event_at?: string
          metadata?: Json
          provider?: string
          provider_message_id?: string | null
          recipient_hash?: string
          requested_at?: string
          status?: string
          template_key?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      ranking_entries: {
        Row: {
          ano: number | null
          athlete_id: string | null
          categoria: string | null
          colocacao: number | null
          data: string | null
          genero: string | null
          id: string | null
          instagram: string | null
          nome: string | null
          nome_circuito: string | null
          parceiro_nome: string | null
          pontos: number | null
          tier: string | null
          tournament_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_results_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "external_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_championship_directory: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: Json
      }
      admin_user_directory: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: Json
      }
      apply_bracket_match_rating: {
        Args: { p_match_id: string }
        Returns: undefined
      }
      arena_cancel_attendance: {
        Args: { p_attendance_id: string }
        Returns: boolean
      }
      arena_claim_attendance_charge: {
        Args: { p_attendance_id: string }
        Returns: Json
      }
      arena_confirm_attendance: {
        Args: {
          p_avulsa_confirmada?: boolean
          p_class_id: string
          p_data: string
        }
        Returns: Json
      }
      arena_finalize_attendance: {
        Args: { p_attendance_id: string; p_status: string }
        Returns: Json
      }
      arena_resolve_attendance_charge: {
        Args: {
          p_asaas_customer_id: string
          p_asaas_payment_id: string
          p_attendance_id: string
          p_erro: string
          p_sucesso: boolean
        }
        Returns: undefined
      }
      ativar_championship_elite: {
        Args: { p_champ_id: string; p_preco_elite: number }
        Returns: Json
      }
      atualizar_chave_pix_arena: {
        Args: { p_arena_id: string; p_chave: string }
        Returns: undefined
      }
      atualizar_chave_pix_organizador: {
        Args: { p_chave: string }
        Returns: undefined
      }
      auto_update_championship_status: { Args: never; Returns: undefined }
      begin_card_payment_attempt: {
        Args: {
          p_actor_id: string
          p_card_fingerprint: string
          p_card_last4: string
          p_flow: string
          p_ip_hash: string
          p_order_reference: string
        }
        Returns: Json
      }
      can_select_athlete_ticket_credential: {
        Args: { p_athlete_slot: number; p_athlete_ticket_id: string }
        Returns: boolean
      }
      cancelar_championship_elite: {
        Args: { p_champ_id: string; p_preco_elite: number }
        Returns: Json
      }
      check_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number }
        Returns: boolean
      }
      checkout_server_now: { Args: never; Returns: string }
      claim_asaas_webhook_event: {
        Args: {
          p_correlation_id?: string
          p_event_id: string
          p_event_rank: number
          p_event_type: string
          p_external_reference?: string
          p_payment_id: string
          p_provider_created_at?: string
          p_source?: string
        }
        Returns: Json
      }
      claim_athlete_ticket_change_challenge: {
        Args: {
          p_athlete_ticket_id: string
          p_challenge_id: string
          p_current_code_hash: string
          p_new_email_code_hash?: string
        }
        Returns: boolean
      }
      claim_championship_notice_deliveries: {
        Args: { p_limit?: number; p_notice_id?: string }
        Returns: {
          attempt_count: number
          championship_id: string
          id: string
          notice_id: string
          recipient_hash: string
          recipient_ref: string
          recipient_slot: string
          recipient_source: string
        }[]
      }
      claim_organizer_financial_notification_deliveries: {
        Args: { p_limit?: number }
        Returns: { amount: number | null; attempt_count: number; championship_id: string; event_kind: string; id: string; organizer_id: string; payment_id: string; record_id: string; record_type: string }[]
      }
      claim_coupon_use: { Args: { p_coupon_id: string }; Returns: boolean }
      claim_elite_fee: {
        Args: { p_champ_id: string; p_max: number }
        Returns: number
      }
      claim_pricing_tier: {
        Args: { p_qty: number; p_tier_id: string }
        Returns: boolean
      }
      claim_registration_elite_fee_once: {
        Args: { p_max: number; p_registration_id: string }
        Returns: number
      }
      claim_ticket_type_quantity: {
        Args: { p_qty: number; p_type_id: string }
        Returns: boolean
      }
      complete_asaas_webhook_event: {
        Args: { p_error?: string; p_event_id: string; p_success: boolean }
        Returns: undefined
      }
      create_spectator_ticket_order: {
        Args: {
          p_access_token: string
          p_championship_id: string
          p_code: string
          p_comprador_cpf: string
          p_comprador_email: string
          p_comprador_nome: string
          p_coupon_code: string
          p_items: Json
          p_user_id?: string
        }
        Returns: {
          quantidade: number
          resumo: string
          ticket_id: string
          valor: number
        }[]
      }
      delete_championship_transaction: {
        Args: { p_championship_id: string }
        Returns: undefined
      }
      expire_athlete_checkout_reservations: {
        Args: { p_limit?: number }
        Returns: number
      }
      expire_athlete_ticket_inventory_if_pending: {
        Args: { p_ticket_id: string }
        Returns: boolean
      }
      financial_begin_operation: {
        Args: {
          p_actor_id?: string
          p_amount?: number
          p_billing_type?: string
          p_correlation_id?: string
          p_external_reference: string
          p_flow: string
          p_lease_seconds?: number
          p_metadata?: Json
          p_operation_type: string
          p_record_id: string
        }
        Returns: Json
      }
      financial_claim_outbox: {
        Args: { p_limit?: number }
        Returns: {
          actor_id: string | null
          amount: number | null
          attempt_count: number
          billing_type: string | null
          completed_at: string | null
          correlation_id: string | null
          created_at: string
          external_reference: string
          flow: string
          id: string
          last_error_code: string | null
          last_error_message: string | null
          metadata: Json
          next_reconcile_at: string | null
          operation_type: string
          processing_started_at: string | null
          provider_id: string | null
          provider_status: string | null
          record_id: string
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "financial_operations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      financial_complete_operation: {
        Args: {
          p_operation_id: string
          p_provider_id: string
          p_provider_status: string
          p_status?: string
        }
        Returns: undefined
      }
      financial_fail_operation: {
        Args: {
          p_ambiguous: boolean
          p_error_code: string
          p_error_message: string
          p_operation_id: string
          p_retry_seconds?: number
        }
        Returns: undefined
      }
      financial_reschedule_outbox: {
        Args: {
          p_error: string
          p_operation_id: string
          p_retry_seconds?: number
        }
        Returns: undefined
      }
      financial_resolve_transfer_reference: {
        Args: { p_base_reference: string; p_flow: string; p_record_id: string }
        Returns: string
      }
      financial_resolve_refund_reference: {
        Args: {
          p_base_reference: string
          p_flow: string
          p_record_id: string
        }
        Returns: string
      }
      finish_card_payment_attempt: {
        Args: {
          p_attempt_id: string
          p_outcome: string
          p_provider_code?: string
        }
        Returns: Json
      }
      list_public_arena_cards: {
        Args: {
          p_estado?: string
          p_ids?: string[]
          p_limit?: number
          p_offset?: number
          p_query?: string
        }
        Returns: {
          alunos: number
          avatar_url: string
          banner_url: string
          cidade: string
          descricao: string
          dias_semana: number[]
          estado: string
          handle: string
          id: string
          nome: string
          total_count: number
        }[]
      }
      mb_remove_monthly_category: { Args: { p_id: string }; Returns: undefined }
      mb_create_savings_jar: {
        Args: { p_as_of: string; p_institution: string | null; p_name: string; p_note?: string | null; p_opening_balance: number }
        Returns: string
      }
      mb_add_savings_contribution: {
        Args: { p_amount: number; p_contributed_on: string; p_jar_id: string; p_note?: string | null }
        Returns: string
      }
      mb_create_savings_withdrawal: {
        Args: { p_amount: number; p_jar_id: string; p_note?: string | null; p_purpose: string; p_withdrawn_on: string }
        Returns: string
      }
      mb_add_savings_repayment: {
        Args: {
          p_amount: number
          p_note?: string | null
          p_repaid_on: string
          p_withdrawal_id: string
        }
        Returns: string
      }
      mb_toggle_expense_paid: {
        Args: { p_event: Json; p_id: string; p_paid: boolean }
        Returns: string
      }
      mb_write_expense_event: {
        Args: {
          p_event: Json
          p_ids_to_delete: string[]
          p_rows_to_insert: Json
          p_updates: Json
        }
        Returns: string
      }
      mb_write_income_event: {
        Args: {
          p_event: Json
          p_ids_to_delete: string[]
          p_rows_to_insert: Json
          p_updates: Json
        }
        Returns: string
      }
      notify_page_championship_invite: {
        Args: { p_championship_id: string; p_page_id: string }
        Returns: Json
      }
      organizer_championship_financial_metrics: {
        Args: { p_championship_id: string }
        Returns: Json
      }
      organizer_championship_recipients: {
        Args: { p_championship_id: string; p_user_ids?: string[] }
        Returns: {
          email: string
          genero: string
          nome: string
          user_id: string
        }[]
      }
      organizer_credential_directory: {
        Args: {
          p_championship_id: string
          p_filter?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: Json
      }
      organizer_dashboard_metrics: {
        Args: { p_user_id: string }
        Returns: Json
      }
      organizer_profile_contacts: {
        Args: { p_championship_id: string; p_user_ids: string[] }
        Returns: {
          email: string
          id: string
          nome: string
          telefone: string
          username: string
        }[]
      }
      organizer_spectator_financial_metrics: {
        Args: { p_championship_id: string }
        Returns: Json
      }
      perf_activate_study_roadmap: {
        Args: { p_roadmap_id: string }
        Returns: undefined
      }
      perf_close_investment_plan: {
        Args: { p_plan_id: string; p_status: string }
        Returns: boolean
      }
      perf_create_investment_plan: {
        Args: {
          p_annual_inflation: number
          p_annual_return_base: number
          p_annual_return_conservative: number
          p_annual_return_favorable: number
          p_baseline_date: string
          p_baseline_value: number
          p_change_note: string
          p_create_initial_snapshot: boolean
          p_effective_from: string
          p_initial_snapshot_notes: string
          p_initial_snapshot_value: number
          p_name: string
          p_planned_monthly_contribution: number
          p_target_date: string
          p_target_value: number
          p_value_mode: string
          p_value_reference_date: string
        }
        Returns: string
      }
      perf_create_investment_plan_revision: {
        Args: {
          p_annual_inflation: number
          p_annual_return_base: number
          p_annual_return_conservative: number
          p_annual_return_favorable: number
          p_baseline_date: string
          p_baseline_value: number
          p_change_note: string
          p_effective_from: string
          p_expected_version: number
          p_name: string
          p_plan_id: string
          p_planned_monthly_contribution: number
          p_target_date: string
          p_target_value: number
          p_value_mode: string
          p_value_reference_date: string
        }
        Returns: string
      }
      perf_recompute_study_item: {
        Args: { p_item_id: string; p_user_id: string }
        Returns: boolean
      }
      perf_submit_study_attempt: {
        Args: { p_answers: Json; p_item_id: string }
        Returns: {
          correct_count: number
          score: number
          total_count: number
        }[]
      }
      perf_toggle_study_check: {
        Args: {
          p_checked: boolean
          p_group: string
          p_index: number
          p_item_id: string
        }
        Returns: boolean
      }
      purge_rankftv_operational_data: { Args: never; Returns: Json }
      rankftv_lock_participant_keys: {
        Args: { p_keys: string[] }
        Returns: undefined
      }
      release_athlete_checkout_reservation: {
        Args: { p_force?: boolean; p_token_hash: string }
        Returns: boolean
      }
      release_athlete_ticket_inventory: {
        Args: { p_target_status: string; p_ticket_id: string }
        Returns: boolean
      }
      release_coupon_use: { Args: { p_coupon_id: string }; Returns: undefined }
      release_elite_fee: {
        Args: { p_amount: number; p_champ_id: string }
        Returns: undefined
      }
      release_pricing_tier: {
        Args: { p_qty: number; p_tier_id: string }
        Returns: undefined
      }
      release_registration_elite_fee_once: {
        Args: { p_registration_id: string }
        Returns: number
      }
      release_registration_inventory: {
        Args: { p_registration_id: string; p_target_status: string }
        Returns: boolean
      }
      release_spectator_ticket_order: {
        Args: { p_target_status: string; p_ticket_id: string }
        Returns: boolean
      }
      release_ticket_type_quantity: {
        Args: { p_qty: number; p_type_id: string }
        Returns: undefined
      }
      reserve_athlete_checkout: {
        Args: {
          p_category_id: string
          p_championship_id: string
          p_duration_minutes?: number
          p_token_hash: string
          p_user_id?: string
        }
        Returns: Json
      }
      reverse_bracket_category_ratings: {
        Args: { p_category_id: string; p_championship_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      update_championship_transaction: {
        Args: {
          p_category_operations?: Json
          p_championship: Json
          p_championship_id: string
          p_deliveries?: Json
          p_notice?: Json
          p_notification_user_ids?: Json
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
