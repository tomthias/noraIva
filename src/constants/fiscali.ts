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

/**
 * Aliquota imposta sostitutiva: 5%
 * Applicata ai primi 5 anni di attività (regime startup)
 * Altrimenti sarebbe 15% per il regime ordinario forfettario
 */
export const ALIQUOTA_IMPOSTA_SOSTITUTIVA = 0.05;

/**
 * Aliquota contributi INPS Gestione Separata 2025: 26,07%
 * Per professionisti senza cassa previdenziale propria
 */
export const ALIQUOTA_CONTRIBUTI_GS = 0.2607;

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
