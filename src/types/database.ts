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
      /**
       * Tabella unificata dei movimenti di conto: sostituisce `prelievi`,
       * `uscite` ed `entrate`. `importo` ha SEGNO (entrate > 0, uscite < 0) e
       * il "tipo" del movimento è ora solo la sua categoria.
       */
      movimenti: {
        Row: {
          id: string
          user_id: string
          /** Data VALUTA (colonna B dell'estratto BBVA). */
          data: string
          descrizione: string
          categoria: string | null
          /** Con segno: entrate positive, uscite negative. */
          importo: number
          fonte: string
          import_hash: string | null
          /** Colonna "Disponibile": saldo del conto dopo il movimento. */
          saldo_dopo: number | null
          data_contabile: string | null
          escludi_da_grafico: boolean
          note: string | null
          fattura_id: string | null
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
          fonte?: string
          import_hash?: string | null
          saldo_dopo?: number | null
          data_contabile?: string | null
          escludi_da_grafico?: boolean
          note?: string | null
          fattura_id?: string | null
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
          fonte?: string
          import_hash?: string | null
          saldo_dopo?: number | null
          data_contabile?: string | null
          escludi_da_grafico?: boolean
          note?: string | null
          fattura_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      rettifiche_incassi: {
        Row: {
          user_id: string
          anno: number
          importo: number
          updated_at: string
        }
        Insert: {
          user_id: string
          anno: number
          importo: number
          updated_at?: string
        }
        Update: {
          user_id?: string
          anno?: number
          importo?: number
          updated_at?: string
        }
      }
      stime_fiscozen: {
        Row: {
          user_id: string
          anno_pagamento: number
          tasse_min: number | null
          tasse_max: number | null
          incassato_dichiarato: number | null
          aggiornato_il: string | null
        }
        Insert: {
          user_id: string
          anno_pagamento: number
          tasse_min?: number | null
          tasse_max?: number | null
          incassato_dichiarato?: number | null
          aggiornato_il?: string | null
        }
        Update: {
          user_id?: string
          anno_pagamento?: number
          tasse_min?: number | null
          tasse_max?: number | null
          incassato_dichiarato?: number | null
          aggiornato_il?: string | null
        }
      }
      regole_categorie: {
        Row: {
          user_id: string
          pattern: string
          categoria: string
          created_at: string
        }
        Insert: {
          user_id: string
          pattern: string
          categoria: string
          created_at?: string
        }
        Update: {
          user_id?: string
          pattern?: string
          categoria?: string
          created_at?: string
        }
      }
      /**
       * Storico degli import e ANCORA del saldo di banca: il saldo non si
       * ricostruisce riordinando i movimenti, lo si registra qui al momento
       * dell'import leggendolo dalla riga più recente del file.
       */
      import_estratti: {
        Row: {
          id: string
          user_id: string
          nome_file: string | null
          data_saldo: string
          saldo: number
          movimenti_nuovi: number
          movimenti_saltati: number
          importato_il: string
        }
        Insert: {
          id?: string
          user_id: string
          nome_file?: string | null
          data_saldo: string
          saldo: number
          movimenti_nuovi?: number
          movimenti_saltati?: number
          importato_il?: string
        }
        Update: {
          id?: string
          user_id?: string
          nome_file?: string | null
          data_saldo?: string
          saldo?: number
          movimenti_nuovi?: number
          movimenti_saltati?: number
          importato_il?: string
        }
      }
      preferenze: {
        Row: {
          user_id: string
          chiave: string
          valore: Json
          updated_at: string
        }
        Insert: {
          user_id: string
          chiave: string
          valore: Json
          updated_at?: string
        }
        Update: {
          user_id?: string
          chiave?: string
          valore?: Json
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
          escludi_da_grafico: boolean | null
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
          escludi_da_grafico?: boolean | null
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
          escludi_da_grafico?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }
      entrate: {
        Row: {
          id: string
          user_id: string
          data: string
          descrizione: string
          categoria: string | null
          importo: number
          note: string | null
          escludi_da_grafico: boolean | null
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
          escludi_da_grafico?: boolean | null
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
          escludi_da_grafico?: boolean | null
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
