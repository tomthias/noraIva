/**
 * Tipi per la gestione del cash flow nel regime forfettario
 */

export interface Fattura {
  id: string;
  /**
   * Data di INCASSO (ISO YYYY-MM-DD), non di emissione.
   *
   * Il regime forfettario tassa per CASSA: contano i compensi percepiti
   * nell'anno, non le fatture emesse. Una fattura di dicembre incassata a
   * gennaio appartiene fiscalmente all'anno successivo — e lo stesso vale per
   * il limite degli 85.000 € (Agenzia delle Entrate, Telefisco 18/09/2025).
   *
   * Tutti i filtri per anno di questa app usano questo campo.
   */
  data: string;
  descrizione: string;
  cliente: string;
  importoLordo: number; // Importo totale incassato
  note?: string;
}

/**
 * Una riga del conto, così come sta nella tabella unificata `movimenti`.
 *
 * A differenza di `Prelievo`/`Uscita`/`Entrata` (che tengono l'importo sempre
 * positivo e affidano il segno al tipo di lista) qui l'importo è CON SEGNO:
 * entrate positive, uscite negative. È il formato in cui arrivano i movimenti
 * dell'export BBVA, ed è ciò che rende superflua la conversione fra tabelle.
 */
export interface Movimento {
  id: string;
  /** Data valuta (ISO YYYY-MM-DD). */
  data: string;
  descrizione: string;
  /** es. "Stipendio", "Tasse - Acconto", "Interessi BBVA". */
  categoria?: string;
  /** CON SEGNO: entrate > 0, uscite < 0. */
  importo: number;
  /** 'manuale' | 'import_bbva' | 'migrazione'. */
  fonte: string;
  /** Saldo del conto dopo il movimento (colonna "Disponibile" dell'export BBVA). */
  saldoDopo?: number;
  note?: string;
  escludiDaGrafico?: boolean;
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

export interface Entrata {
  id: string;
  data: string; // ISO date format (YYYY-MM-DD)
  descrizione: string; // es. "Rimborso", "Bonus"
  categoria?: string; // es. "Rimborso", "Bonus", "Altro"
  importo: number;
  note?: string;
  escludiDaGrafico?: boolean; // Se true, esclude l'entrata dai grafici (ma non dai totali)
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
  /**
   * Somma degli importi LORDI fatturati.
   * (Si chiamava `nettoFatture` pur contenendo un lordo: nome corretto perché
   * qui la distinzione lordo/netto decide quanto si può prelevare.)
   */
  totaleFatturato: number;
  totalePrelievi: number;
  totaleUscite: number;
  totaleEntrate: number; // Entrate extra (non fatture)
  nettoDisponibile: number; // totaleFatturato + entrate - prelievi - uscite
}
