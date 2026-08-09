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
 * Un movimento di conto corrente. Tabella unica: entrate, uscite e stipendi
 * sono lo stesso oggetto, distinto solo dal segno dell'importo e dalla
 * categoria.
 *
 * Prima esistevano tre tabelle (`prelievi`, `uscite`, `entrate`) e cambiare il
 * tipo di un movimento significava cancellarlo da una e reinserirlo in
 * un'altra. Con una tabella sola cambiare tipo = cambiare categoria o segno.
 */
export interface Movimento {
  id: string;
  /**
   * Data VALUTA (ISO YYYY-MM-DD): il giorno in cui i soldi sono realmente
   * entrati o usciti dal conto. Per gli import BBVA è la colonna B, non la
   * data contabile.
   */
  data: string;
  descrizione: string;
  categoria?: string;
  /** CON SEGNO: entrate positive, uscite negative. */
  importo: number;
  /** Da dove arriva il dato: inserito a mano, importato, o migrato. */
  fonte: FonteMovimento;
  /** Chiave di dedup degli import; assente sui movimenti manuali. */
  importHash?: string;
  /** Saldo del conto dopo il movimento (colonna "Disponibile" dell'estratto). */
  saldoDopo?: number;
  /** Data contabile dell'estratto: può essere futura, serve solo all'ordine. */
  dataContabile?: string;
  /** Flag di sola presentazione: esclude dai grafici, mai dai totali. */
  escludiDaGrafico?: boolean;
  note?: string;
  /** Se è l'incasso di una fattura registrata, il suo id. */
  fatturaId?: string;
}

export type FonteMovimento = "manuale" | "import_bbva" | "migrazione";

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
