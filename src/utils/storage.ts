/**
 * Gestione localStorage per le preferenze locali (descrizioni salvate,
 * incassi dichiarati a mano)
 */

import { INCASSI_DICHIARATI_INIZIALI } from "../constants/fiscali";

// I dati (fatture, prelievi, uscite, entrate) vivono su Supabase: qui resta
// solo ciò che è puramente locale a questo browser.

// ===== INCASSI DICHIARATI A MANO (override per anno) =====

const INCASSI_OVERRIDE_KEY = "incassi-override";

/**
 * Incassi effettivi dichiarati a mano, per anno fiscale.
 *
 * Serve quando le fatture registrate non rispecchiano l'incassato reale
 * (date di emissione invece che di incasso, o anni non presenti in database).
 *
 * NOTA: stanno in localStorage, quindi sono legati a QUESTO browser e non
 * sono sincronizzati fra dispositivi. Se questo diventa un problema vanno
 * spostati su Supabase in una tabella `incassi_annuali`.
 */
/**
 * Chiave del seed: garantisce che i valori iniziali vengano scritti UNA volta
 * sola. Senza, rimuovere un override lo farebbe ricomparire al reload.
 */
const INCASSI_SEED_KEY = "incassi-override-seed-v1";

function leggiIncassi(): Record<number, number> {
  const data = localStorage.getItem(INCASSI_OVERRIDE_KEY);
  if (!data) return {};
  const parsed = JSON.parse(data) as Record<string, number>;
  return Object.fromEntries(
    Object.entries(parsed)
      .map(([anno, importo]) => [Number(anno), Number(importo)])
      .filter(([anno, importo]) => Number.isFinite(anno) && Number.isFinite(importo))
  );
}

/** Precarica i valori noti al primo avvio, senza sovrascrivere scelte esistenti. */
function seedIniziale(): void {
  if (localStorage.getItem(INCASSI_SEED_KEY)) return;

  const attuali = leggiIncassi();
  for (const [anno, importo] of Object.entries(INCASSI_DICHIARATI_INIZIALI)) {
    if (attuali[Number(anno)] === undefined) attuali[Number(anno)] = importo;
  }
  localStorage.setItem(INCASSI_OVERRIDE_KEY, JSON.stringify(attuali));
  localStorage.setItem(INCASSI_SEED_KEY, "1");
}

export function caricaIncassiOverride(): Record<number, number> {
  try {
    seedIniziale();
    return leggiIncassi();
  } catch (error) {
    console.error("Errore nel caricamento degli incassi dichiarati:", error);
    return {};
  }
}

export function salvaIncassoOverride(anno: number, importo: number): void {
  try {
    const attuali = caricaIncassiOverride();
    attuali[anno] = importo;
    localStorage.setItem(INCASSI_OVERRIDE_KEY, JSON.stringify(attuali));
  } catch (error) {
    console.error("Errore nel salvataggio dell'incasso dichiarato:", error);
  }
}

/** Rimuove l'override: l'anno torna a essere calcolato dalle fatture. */
export function rimuoviIncassoOverride(anno: number): void {
  try {
    const attuali = caricaIncassiOverride();
    delete attuali[anno];
    localStorage.setItem(INCASSI_OVERRIDE_KEY, JSON.stringify(attuali));
  } catch (error) {
    console.error("Errore nella rimozione dell'incasso dichiarato:", error);
  }
}

// ===== DESCRIZIONI SALVATE =====

const DESCRIZIONI_SALVATE_KEY = "descrizioni-salvate";

/**
 * Carica le descrizioni salvate da localStorage
 */
export function caricaDescrizioniSalvate(): string[] {
  try {
    const data = localStorage.getItem(DESCRIZIONI_SALVATE_KEY);
    if (!data) return [];
    return JSON.parse(data) as string[];
  } catch (error) {
    console.error("Errore nel caricamento delle descrizioni:", error);
    return [];
  }
}

/**
 * Salva una descrizione per usi futuri
 */
export function salvaDescrizione(descrizione: string): void {
  try {
    const esistenti = caricaDescrizioniSalvate();
    if (!esistenti.includes(descrizione)) {
      const aggiornate = [...esistenti, descrizione].sort();
      localStorage.setItem(DESCRIZIONI_SALVATE_KEY, JSON.stringify(aggiornate));
    }
  } catch (error) {
    console.error("Errore nel salvataggio della descrizione:", error);
  }
}

/**
 * Rimuove una descrizione salvata
 */
export function rimuoviDescrizione(descrizione: string): void {
  try {
    const esistenti = caricaDescrizioniSalvate();
    const aggiornate = esistenti.filter(d => d !== descrizione);
    localStorage.setItem(DESCRIZIONI_SALVATE_KEY, JSON.stringify(aggiornate));
  } catch (error) {
    console.error("Errore nella rimozione della descrizione:", error);
  }
}

/**
 * Resetta tutte le descrizioni salvate
 */
export function resettaDescrizioniSalvate(): void {
  try {
    localStorage.removeItem(DESCRIZIONI_SALVATE_KEY);
  } catch (error) {
    console.error("Errore nel reset delle descrizioni:", error);
  }
}
