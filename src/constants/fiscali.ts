/**
 * Costanti fiscali per il Regime Forfettario
 *
 * Queste costanti sono fisse e non configurabili dall'utente.
 * Seguono le regole del regime forfettario italiano.
 */

// Anno fiscale corrente (basato sulla data di sistema)
export const ANNO_CORRENTE = new Date().getFullYear();

// Anno di default per la visualizzazione (anno corrente)
export const ANNO = ANNO_CORRENTE;

// Tipo di regime fiscale
export const REGIME = "forfettario" as const;

// ============================================================================
// ALIQUOTE PER ANNO FISCALE
// ============================================================================
// Le aliquote NON sono costanti nel tempo: l'INPS le rivede ogni anno e
// l'imposta sostitutiva agevolata scade dopo i primi 5 periodi d'imposta.
// Usare sempre i getter, mai i valori nudi.

/**
 * Anno di inizio attività (P.IVA aperta il 23/06/2022).
 * Determina quando scade l'aliquota agevolata del regime startup.
 */
export const ANNO_INIZIO_ATTIVITA = 2022;

/** Il 5% vale per i primi 5 periodi d'imposta; dal 6° si passa al 15%. */
export const ANNI_REGIME_STARTUP = 5;

export const ALIQUOTA_STARTUP = 0.05;
export const ALIQUOTA_ORDINARIA = 0.15;

/**
 * Aliquota imposta sostitutiva per anno fiscale.
 *
 * Inizio attività 2022 → 5% per i periodi 2022-2026, 15% dal 2027.
 * Fonte: art. 1 c.65 L.190/2014 (regime forfettario start-up).
 */
export function getAliquotaSostitutiva(anno: number): number {
  return anno < ANNO_INIZIO_ATTIVITA + ANNI_REGIME_STARTUP
    ? ALIQUOTA_STARTUP
    : ALIQUOTA_ORDINARIA;
}

/**
 * Aliquota INPS Gestione Separata per anno, professionisti senza altra
 * copertura previdenziale.
 *
 * 2026: 26,07% = 25% IVS + 0,72% maternità/ANF + 0,35% ISCRO (invariata dal 2025).
 * Nessun minimale contributivo per i professionisti in GS; il massimale
 * (122.295 € nel 2026) è sopra il tetto forfettario di 85.000 €, quindi
 * non è mai vincolante qui.
 */
const ALIQUOTE_INPS_GS: Record<number, number> = {
  2024: 0.2607,
  2025: 0.2607,
  2026: 0.2607,
};

/** Ultimo anno con aliquota INPS confermata: oltre, si stima. */
export const ULTIMO_ANNO_ALIQUOTE_NOTE = Math.max(
  ...Object.keys(ALIQUOTE_INPS_GS).map(Number)
);

export function getAliquotaInps(anno: number): number {
  return ALIQUOTE_INPS_GS[anno] ?? ALIQUOTE_INPS_GS[ULTIMO_ANNO_ALIQUOTE_NOTE];
}

/** true se per quell'anno l'aliquota INPS è una stima, non un dato ufficiale. */
export function aliquoteStimate(anno: number): boolean {
  return !(anno in ALIQUOTE_INPS_GS);
}

/**
 * Coefficiente di redditività: 78%
 * Codice ATECO 74.12.01 - Attività di design di grafica e comunicazione visiva
 * Questo coefficiente determina quale percentuale del fatturato
 * è considerata reddito imponibile ai fini fiscali
 */
export const COEFFICIENTE_REDDITIVITA = 0.78;

// ============================================================================
// CATEGORIE STRUTTURALI DEI MOVIMENTI
// ============================================================================
// Con la tabella unica `movimenti` il "tipo" di un movimento è la sua
// categoria. Queste tre hanno significato per i calcoli, non solo per i
// grafici, quindi vanno riconosciute in modo tollerante (maiuscole, singolare
// o plurale) e scritte sempre nella forma normalizzata.

/**
 * Stipendio verso il conto personale. Forma plurale perché è quella prodotta
 * da `normalizzaCategoria` ("Stipendio" → "Stipendi"): scrivere il singolare
 * creerebbe due categorie distinte nei grafici.
 */
export const CATEGORIA_STIPENDIO = "Stipendi";

/**
 * Bonifico ricevuto che salda una fattura. Escluso dal cash bottom-up: i
 * compensi entrano già dalla tabella `fatture`, contarli anche come movimento
 * li conterebbe due volte.
 */
export const CATEGORIA_INCASSO_FATTURA = "Incasso Fattura";

/** Punto di partenza del conto, non denaro fresco. */
export const CATEGORIA_SALDO_INIZIALE = "Saldo Iniziale";

/**
 * Pagamento di un F24. Una categoria sola: saldo o acconto, INPS o imposta,
 * lo dice lo scadenzario (`scadenze_fiscali`), non il nome della categoria.
 */
export const CATEGORIA_TASSE = "Tasse";

/** Versamento su un fondo del patrimonio: esce dalla cassa, non è una spesa. */
export const CATEGORIA_INVESTIMENTI = "Investimenti";

/** Costi dell'attività (Fiscozen, software…): fuori dal costo di vita. */
export const CATEGORIA_LAVORO = "Lavoro";

/** Accredito mensile degli interessi sulla liquidità BBVA. */
export const CATEGORIA_INTERESSI = "Interessi BBVA";

/** true per "Stipendio", "Stipendi", "STIPENDI"… */
export const eStipendio = (categoria: string | null | undefined): boolean =>
  /^stipendi/i.test((categoria ?? "").trim());

/** true per "Saldo Iniziale" e per la variante DB "saldo_iniziale". */
export const eSaldoIniziale = (categoria: string | null | undefined): boolean =>
  /^saldo[ _]iniziale/i.test((categoria ?? "").trim());

/** true per "Incasso Fattura" e per la vecchia categoria "Fatture". */
export const eIncassoFattura = (categoria: string | null | undefined): boolean =>
  /^(incasso fattura|fatture?)$/i.test((categoria ?? "").trim());

/** true per "Tasse", "Tasse - Saldo", "TASSE"… (pagamenti di F24). */
export const eTassa = (categoria: string | null | undefined): boolean =>
  /^tasse/i.test((categoria ?? "").trim());

/** true per "Investimenti", "Investimento", "Moneyfarm", "Pensione…". */
export const eInvestimento = (categoria: string | null | undefined): boolean =>
  /^(invest|moneyfarm|pension)/i.test((categoria ?? "").trim());

/** true per "Lavoro": costi dell'attività, tenuti fuori dal costo di vita. */
export const eLavoro = (categoria: string | null | undefined): boolean =>
  /^lavoro/i.test((categoria ?? "").trim());

/**
 * Le categorie che pilotano i calcoli, per i menu di scelta: sbagliarle sposta
 * il netto prelevabile o il costo di vita, non solo un grafico.
 */
export const CATEGORIE_STRUTTURALI = [
  CATEGORIA_TASSE,
  CATEGORIA_STIPENDIO,
  CATEGORIA_INVESTIMENTI,
  CATEGORIA_LAVORO,
  CATEGORIA_INCASSO_FATTURA,
] as const;

/** true per "Interessi" (storico) e "Interessi BBVA" (import). */
export const eInteressi = (categoria: string | null | undefined): boolean =>
  /^interessi/i.test((categoria ?? "").trim());

// ============================================================================
// ACCONTI
// ============================================================================
// I due tributi seguono regole DIVERSE: applicare 40%/60% al totale delle
// tasse sovrastima l'acconto INPS del 20%.

/** INPS Gestione Separata: acconto totale 80%, in due rate uguali. */
export const ACCONTO_INPS_1 = 0.4; // scadenza 30 giugno
export const ACCONTO_INPS_2 = 0.4; // scadenza 30 novembre

/**
 * Imposta sostitutiva: acconto totale 100%, in due rate UGUALI del 50%.
 *
 * La regola generale (art. 17 DPR 435/2001) sarebbe 40% + 60%, ma l'art. 58
 * DL 124/2019 porta le rate al 50% + 50% per chi esercita un'attività soggetta
 * a ISA, e la risoluzione AdE 93/E/2019 estende la regola ai forfettari.
 * Il design grafico (ATECO 74.12) rientra: gli F24 reali lo confermano
 * (803,50 + 803,50 nel 2024, 613 + 613 nel 2025, 724 + 724 nel 2026).
 */
export const ACCONTO_IMPOSTA_1 = 0.5;
export const ACCONTO_IMPOSTA_2 = 0.5;

/** Sotto questa imposta dell'anno precedente non è dovuto alcun acconto. */
export const SOGLIA_ACCONTO_MINIMA = 51.65;

/**
 * Fra SOGLIA_ACCONTO_MINIMA e questa soglia l'acconto dell'imposta sostitutiva
 * si versa in un'unica rata a novembre (niente rata di giugno).
 */
export const SOGLIA_ACCONTO_RATA_UNICA = 257.52;

/**
 * Imposta di bollo sulle fatture elettroniche senza IVA: 2 € per ogni fattura
 * sopra 77,47 €. Si versa a trimestri; sotto i 5.000 € annui i primi tre
 * trimestri si possono pagare insieme entro il 30 novembre, il quarto entro
 * fine febbraio dell'anno dopo (è quello che fa Fiscozen).
 */
export const BOLLO_FATTURA = 2;
export const SOGLIA_BOLLO_FATTURA = 77.47;

// ============================================================================
// LIMITI DEL REGIME FORFETTARIO
// ============================================================================

/** Oltre 85.000 € di ricavi si esce dal forfettario dall'anno SUCCESSIVO. */
export const LIMITE_RICAVI_FORFETTARIO = 85_000;

/** Oltre 100.000 € si esce dal regime nell'anno STESSO, con IVA dovuta. */
export const LIMITE_USCITA_IMMEDIATA = 100_000;
