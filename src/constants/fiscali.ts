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

// ---------------------------------------------------------------------------
// Retrocompatibilità: valori dell'anno corrente.
// Preferire sempre i getter sopra nei calcoli che dipendono dall'anno.
// ---------------------------------------------------------------------------
export const ALIQUOTA_IMPOSTA_SOSTITUTIVA = getAliquotaSostitutiva(
  new Date().getFullYear()
);
export const ALIQUOTA_CONTRIBUTI_GS = getAliquotaInps(new Date().getFullYear());

/**
 * Coefficiente di redditività: 78%
 * Codice ATECO 74.12.01 - Attività di design di grafica e comunicazione visiva
 * Questo coefficiente determina quale percentuale del fatturato
 * è considerata reddito imponibile ai fini fiscali
 */
export const COEFFICIENTE_REDDITIVITA = 0.78;

/**
 * Chiave localStorage per salvare le fatture
 */
export const STORAGE_KEY = "fatture-mattia-2025";

/**
 * Categorie per le tasse - usate per distinguere tra:
 * - Saldo: pagamento del saldo anno precedente
 * - Acconto: pagamento acconti anno corrente
 * - INPS: contributi previdenziali
 * - Imposta Sostitutiva: imposta sostitutiva IRPEF
 */
export const CATEGORIE_TASSE = {
  SALDO: "Tasse - Saldo",
  ACCONTO: "Tasse - Acconto",
  INPS: "Tasse - INPS",
  IMPOSTA_SOSTITUTIVA: "Tasse - Imposta Sostitutiva",
  // Categoria generica per retrocompatibilità
  GENERICO: "Tasse",
} as const;

/**
 * Array di tutte le categorie tasse per suggerimenti
 */
export const CATEGORIE_TASSE_LISTA = [
  CATEGORIE_TASSE.ACCONTO,
  CATEGORIE_TASSE.SALDO,
  CATEGORIE_TASSE.INPS,
  CATEGORIE_TASSE.IMPOSTA_SOSTITUTIVA,
] as const;

// ============================================================================
// ACCONTI
// ============================================================================
// I due tributi seguono regole DIVERSE: applicare 40%/60% al totale delle
// tasse sovrastima l'acconto INPS del 20%.

/** INPS Gestione Separata: acconto totale 80%, in due rate uguali. */
export const ACCONTO_INPS_1 = 0.4; // scadenza 30 giugno
export const ACCONTO_INPS_2 = 0.4; // scadenza 30 novembre

/** Imposta sostitutiva: acconto totale 100%, 40% a giugno e 60% a novembre. */
export const ACCONTO_IMPOSTA_1 = 0.4;
export const ACCONTO_IMPOSTA_2 = 0.6;

/** Sotto questa imposta dell'anno precedente non è dovuto alcun acconto. */
export const SOGLIA_ACCONTO_MINIMA = 51.65;

/**
 * Fra SOGLIA_ACCONTO_MINIMA e questa soglia l'acconto dell'imposta sostitutiva
 * si versa in un'unica rata a novembre (niente rata di giugno).
 */
export const SOGLIA_ACCONTO_RATA_UNICA = 257.52;

// ============================================================================
// LIMITI DEL REGIME FORFETTARIO
// ============================================================================

/** Oltre 85.000 € di ricavi si esce dal forfettario dall'anno SUCCESSIVO. */
export const LIMITE_RICAVI_FORFETTARIO = 85_000;

/** Oltre 100.000 € si esce dal regime nell'anno STESSO, con IVA dovuta. */
export const LIMITE_USCITA_IMMEDIATA = 100_000;

/**
 * Anni precedenti a questo non sono selezionabili nei filtri: i dati sono
 * stati resettati e quelli storici non sono attendibili.
 */
export const ANNO_MINIMO_VISIBILE = 2026;

/**
 * Rettifiche degli incassi, precaricate al primo avvio.
 *
 * Una rettifica è l'incassato che le fatture registrate NON rappresentano:
 * fatture datate per emissione invece che per incasso, o anni non presenti in
 * database. Si SOMMA al totale calcolato, non lo sostituisce — così ogni nuova
 * fattura continua a incrementare il totale normalmente.
 *
 *     incassi anno = somma fatture dell'anno + rettifica
 *
 * 2026: il commercialista riportava 52.924 € incassati contro 44.464 € di
 * fatture registrate → rettifica di 8.460 €.
 *
 * Va ridotta man mano che le fatture vengono ridatate per cassa, altrimenti
 * quell'importo viene contato due volte. La Dashboard mostra sempre la
 * scomposizione "da fatture + rettifica" per tenerlo sotto controllo.
 *
 * ⚠️ Manca il 2025. Il commercialista ha fornito il *fatturato* 2025
 * (54.796 €), non l'*incassato*, e i due valori non coincidono. Senza quel
 * dato gli acconti 2026 restano a zero.
 */
export const RETTIFICHE_INCASSI_INIZIALI: Record<number, number> = {
  2026: 8_460,
};
