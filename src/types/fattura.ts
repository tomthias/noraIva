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
   *
   * `null` = fattura emessa ma non ancora incassata: non conta né per le tasse
   * né per il limite degli 85.000 €, finché non arriva il bonifico.
   */
  data: string | null;
  /** Numero Fiscozen, es. "13/2026". Unico per utente. */
  numero?: string;
  /** Data di emissione (ISO). Serve per il bollo e per l'elenco, mai per le tasse. */
  dataEmissione?: string;
  descrizione: string;
  cliente: string;
  importoLordo: number; // Importo totale incassato
  note?: string;
}

/** Una fattura con la data di incasso valorizzata. */
export type FatturaIncassata = Fattura & { data: string };

export const eIncassata = (f: Fattura): f is FatturaIncassata => f.data !== null;

// ============================================================================
// SCADENZARIO FISCALE
// ============================================================================

export type Tributo = "inps" | "imposta" | "bollo" | "altro";
export type TipoScadenza = "saldo" | "acconto1" | "acconto2" | "bollo";

/**
 * Una riga di F24: un tributo, per un anno d'imposta, a una scadenza.
 *
 * Un F24 reale è fatto di più righe (es. luglio 2026 = saldo 2025 INPS +
 * acconto1 2026 INPS + saldo 2025 imposta + acconto1 2026 imposta). Tenerle
 * separate serve a sapere quanto INPS è stato versato in ogni anno, che è la
 * base della deduzione dall'imposta sostitutiva.
 *
 * Importo NEGATIVO = credito compensato nell'F24 (es. saldo a favore).
 */
export interface ScadenzaFiscale {
  id?: string;
  annoImposta: number;
  tributo: Tributo;
  tipo: TipoScadenza;
  /** Data entro cui pagare (ISO). Per le righe pagate, quella dell'F24. */
  dataScadenza: string;
  importo: number;
  /** Data del pagamento; assente = ancora da pagare. */
  pagataIl?: string;
  /** Movimento di conto che ha pagato questa riga (un F24 = un movimento). */
  movimentoId?: string;
  /** true se l'importo è calcolato dall'app, false se viene da un F24 reale. */
  calcolata: boolean;
  note?: string;
}

export interface AperturaConto {
  /** Il saldo vale alla FINE di questo giorno: contano i movimenti successivi. */
  data: string;
  saldo: number;
}

export type TipoStrumento = "pensione" | "investimento" | "moneyfarm";

export interface StrumentoPatrimonio {
  id: string;
  nome: string;
  tipo: TipoStrumento;
}

export interface ValorePatrimonio {
  id: string;
  strumentoId: string;
  data: string;
  valore: number;
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
  /** Se è un versamento su un fondo del patrimonio, il suo id. */
  strumentoId?: string;
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
