/**
 * Costanti fiscali per il Regime Forfettario 2025
 *
 * Queste costanti sono fisse e non configurabili dall'utente.
 * Seguono le regole del regime forfettario italiano per l'anno 2025.
 */

// Anno fiscale di riferimento
export const ANNO = 2025;

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
