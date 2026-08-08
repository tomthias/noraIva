/**
 * Gestione localStorage per le preferenze locali (descrizioni salvate,
 * incassi dichiarati a mano)
 */

import { RETTIFICHE_INCASSI_INIZIALI } from "../constants/fiscali";

// I dati (fatture, prelievi, uscite, entrate) vivono su Supabase: qui resta
// solo ciò che è puramente locale a questo browser.

// ===== RETTIFICHE INCASSI (per anno) =====

const RETTIFICHE_KEY = "rettifiche-incassi";

/**
 * Incassato che le fatture registrate NON rappresentano, per anno fiscale.
 *
 * Serve quando le fatture hanno date di emissione invece che di incasso, o
 * quando un anno non è in database. Si somma al totale calcolato:
 *
 *     incassi anno = somma fatture + rettifica
 *
 * NOTA: stanno in localStorage, quindi sono legate a QUESTO browser e non
 * sono sincronizzate fra dispositivi. Se questo diventa un problema vanno
 * spostate su Supabase in una tabella `rettifiche_incassi`.
 */
/**
 * Chiave del seed: garantisce che i valori iniziali vengano scritti UNA volta
 * sola. Senza, azzerare una rettifica la farebbe ricomparire al reload.
 */
const RETTIFICHE_SEED_KEY = "rettifiche-incassi-seed-v1";

function leggiRettifiche(): Record<number, number> {
  const data = localStorage.getItem(RETTIFICHE_KEY);
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
  if (localStorage.getItem(RETTIFICHE_SEED_KEY)) return;

  const attuali = leggiRettifiche();
  for (const [anno, importo] of Object.entries(RETTIFICHE_INCASSI_INIZIALI)) {
    if (attuali[Number(anno)] === undefined) attuali[Number(anno)] = importo;
  }
  localStorage.setItem(RETTIFICHE_KEY, JSON.stringify(attuali));
  localStorage.setItem(RETTIFICHE_SEED_KEY, "1");
}

export function caricaRettificheIncassi(): Record<number, number> {
  try {
    seedIniziale();
    return leggiRettifiche();
  } catch (error) {
    console.error("Errore nel caricamento delle rettifiche incassi:", error);
    return {};
  }
}

export function salvaRettificaIncassi(anno: number, importo: number): void {
  try {
    const attuali = caricaRettificheIncassi();
    if (importo === 0) delete attuali[anno];
    else attuali[anno] = importo;
    localStorage.setItem(RETTIFICHE_KEY, JSON.stringify(attuali));
  } catch (error) {
    console.error("Errore nel salvataggio della rettifica incassi:", error);
  }
}

/** Azzera la rettifica: l'anno torna a contare solo le fatture registrate. */
export function rimuoviRettificaIncassi(anno: number): void {
  salvaRettificaIncassi(anno, 0);
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
