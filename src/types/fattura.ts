/**
 * Tipi per la gestione del cash flow nel regime forfettario
 */

export interface Fattura {
  id: string;
  data: string; // ISO date format (YYYY-MM-DD)
  descrizione: string;
  cliente: string;
  importoLordo: number; // Importo totale della fattura (sempre incassato)
  note?: string;
}

export interface Prelievo {
  id: string;
  data: string; // ISO date format (YYYY-MM-DD)
  descrizione: string; // es. "Stipendio Gennaio", "Prelievo emergenza"
  importo: number;
  note?: string;
}

export interface Uscita {
  id: string;
  data: string; // ISO date format (YYYY-MM-DD)
  descrizione: string; // es. "Affitto", "Commercialista"
  categoria?: string; // es. "Affitto", "Servizi", "Attrezzature"
  importo: number;
  note?: string;
  escludiDaGrafico?: boolean; // Se true, esclude l'uscita dai grafici (ma non dai totali)
}

export interface RiepilogoFattura {
  id: string;
  importoLordo: number;
  tasseContributi: number; // INPS + Imposta sostitutiva
  netto: number; // Quanto rimane netto dalla fattura
}

export interface RiepilogoAnnuale {
  totaleFatture: number; // Somma importi lordi
  redditoImponibileLordo: number; // 78% del totale fatture
  contributiINPS: number;
  impostaSostitutiva: number;
  tasseTotali: number; // INPS + Imposta
  nettoFatture: number; // Totale lordo - tasse
}

export interface SituazioneCashFlow {
  nettoFatture: number; // Dal riepilogo annuale
  totalePrelievi: number;
  totaleUscite: number;
  nettoDisponibile: number; // nettoFatture - prelievi - uscite
}
