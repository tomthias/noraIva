export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      fatture: {
        Row: {
          id: string
          user_id: string
          data: string
          descrizione: string
          cliente: string
          importo_lordo: number
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          data: string
          descrizione: string
          cliente: string
          importo_lordo: number
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          data?: string
          descrizione?: string
          cliente?: string
          importo_lordo?: number
          note?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      prelievi: {
        Row: {
          id: string
          user_id: string
          data: string
          descrizione: string
          importo: number
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          data: string
          descrizione: string
          importo: number
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          data?: string
          descrizione?: string
          importo?: number
          note?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      uscite: {
        Row: {
          id: string
          user_id: string
          data: string
          descrizione: string
          categoria: string | null
          importo: number
          note: string | null
          esclusa_da_statistiche: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          data: string
          descrizione: string
          categoria?: string | null
          importo: number
          note?: string | null
          esclusa_da_statistiche?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          data?: string
          descrizione?: string
          categoria?: string | null
          importo?: number
          note?: string | null
          esclusa_da_statistiche?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
