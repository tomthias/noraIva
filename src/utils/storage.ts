/**
 * Gestione localStorage per le preferenze puramente locali a questo browser.
 *
 * I dati (fatture, movimenti, rettifiche) vivono su Supabase.
 */

// ===== RETTIFICHE INCASSI — solo residuo storico =====
//
// Le rettifiche stavano qui, quindi erano legate a un singolo browser e non si
// sincronizzavano. Ora vivono nella tabella `rettifiche_incassi` di Supabase.
// Queste funzioni restano per una cosa sola: recuperare i valori già salvati
// nel browser dell'utente e portarli su Supabase al primo avvio dopo la
// migrazione. Fatto quello, non si legge più da qui.

const RETTIFICHE_KEY = "rettifiche-incassi";
const RETTIFICHE_MIGRATE_KEY = "rettifiche-incassi-migrate-supabase";

/** Rettifiche eventualmente rimaste in questo browser, per la migrazione. */
export function caricaRettificheLocali(): Record<number, number> {
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

/**
 * true se la migrazione verso Supabase è già avvenuta su questo browser.
 *
 * Senza questo marcatore, azzerare tutte le rettifiche su Supabase le farebbe
 * ricomparire al reload successivo, ripescate da localStorage o dal seed.
 */
export function rettificheGiaMigrate(): boolean {
  try {
    return localStorage.getItem(RETTIFICHE_MIGRATE_KEY) === "1";
  } catch {
    return false;
  }
}

export function marcaRettificheMigrate(): void {
  try {
    localStorage.setItem(RETTIFICHE_MIGRATE_KEY, "1");
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
