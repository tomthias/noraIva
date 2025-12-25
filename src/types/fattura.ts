/**
 * Tipi per la gestione delle fatture nel regime forfettario
 */

export type StatoIncasso = "non_incassata" | "parzialmente_incassata" | "incassata";

export interface Fattura {
  id: string;
  data: string; // ISO date format (YYYY-MM-DD)
  descrizione: string;
  cliente: string;
  importoLordo: number; // Importo totale della fattura
  incassato: number; // Quanto effettivamente incassato (0 - importoLordo)
  stato: StatoIncasso;
  note?: string;
}

export interface RiepilogoFattura {
  id: string;
  importoLordo: number;
  incassato: number;
  tasseProQuota: number;
  nettoStimato: number;
}

export interface RiepilogoAnnuale {
  totaleFatture: number; // Somma importi lordi
  totaleIncassato: number;
  redditoImponibileLordo: number;
  contributiINPS: number;
  impostaSostitutiva: number;
  tasseTotali: number;
  nettoAnnuo: number;
}
