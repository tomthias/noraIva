/**
 * Gestione localStorage per le preferenze locali (descrizioni salvate).
 */

// I dati (fatture, movimenti, rettifiche) vivono su Supabase: qui resta solo
// ciò che è puramente locale a questo browser.

// ===== RETTIFICHE INCASSI: residuo locale da importare una volta sola =====
//
// Le rettifiche stanno su Supabase (tabella `rettifiche_incassi`, hook
// useRettificheIncassi). Restavano in localStorage, quindi legate a un solo
// browser: bastava aprire l'app dal telefono per vedere numeri diversi.
// Quello che resta qui sotto serve solo a recuperare i valori dei browser che
// avevano ancora le rettifiche locali, una volta, al primo avvio.

const RETTIFICHE_KEY = "rettifiche-incassi";
const RETTIFICHE_MIGRATE_KEY = "rettifiche-incassi-migrate-supabase-v1";

/** Le rettifiche rimaste in questo browser, da riversare su Supabase. */
export function leggiRettificheLocali(): Record<number, number> {
  try {
    const data = localStorage.getItem(RETTIFICHE_KEY);
    if (!data) return {};
    const parsed = JSON.parse(data) as Record<string, number>;
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([anno, importo]) => [Number(anno), Number(importo)])
        .filter(([anno, importo]) => Number.isFinite(anno) && Number.isFinite(importo))
    );
  } catch (error) {
    console.error("Errore nella lettura delle rettifiche locali:", error);
    return {};
  }
}

export function rettificheGiaMigrate(): boolean {
  try {
    return localStorage.getItem(RETTIFICHE_MIGRATE_KEY) !== null;
  } catch {
    return false;
  }
}

export function segnaRettificheMigrate(): void {
  try {
    localStorage.setItem(RETTIFICHE_MIGRATE_KEY, new Date().toISOString());
  } catch (error) {
    console.error("Errore nel marcare le rettifiche come migrate:", error);
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
