/**
 * Gestione localStorage per fatture, prelievi e uscite
 */

import { STORAGE_KEY, ANNO } from "../constants/fiscali";
import type { Fattura, Prelievo, Uscita } from "../types/fattura";

const PRELIEVI_KEY = `prelievi-${ANNO}`;
const USCITE_KEY = `uscite-${ANNO}`;

/**
 * Carica le fatture da localStorage
 */
export function caricaFatture(): Fattura[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as Fattura[];
  } catch (error) {
    console.error("Errore nel caricamento delle fatture:", error);
    return [];
  }
}

/**
 * Salva le fatture in localStorage
 */
export function salvaFatture(fatture: Fattura[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fatture));
  } catch (error) {
    console.error("Errore nel salvataggio delle fatture:", error);
  }
}

/**
 * Carica i prelievi da localStorage
 */
export function caricaPrelievi(): Prelievo[] {
  try {
    const data = localStorage.getItem(PRELIEVI_KEY);
    if (!data) return [];
    return JSON.parse(data) as Prelievo[];
  } catch (error) {
    console.error("Errore nel caricamento dei prelievi:", error);
    return [];
  }
}

/**
 * Salva i prelievi in localStorage
 */
export function salvaPrelievi(prelievi: Prelievo[]): void {
  try {
    localStorage.setItem(PRELIEVI_KEY, JSON.stringify(prelievi));
  } catch (error) {
    console.error("Errore nel salvataggio dei prelievi:", error);
  }
}

/**
 * Carica le uscite da localStorage
 */
export function caricaUscite(): Uscita[] {
  try {
    const data = localStorage.getItem(USCITE_KEY);
    if (!data) return [];
    return JSON.parse(data) as Uscita[];
  } catch (error) {
    console.error("Errore nel caricamento delle uscite:", error);
    return [];
  }
}

/**
 * Salva le uscite in localStorage
 */
export function salvaUscite(uscite: Uscita[]): void {
  try {
    localStorage.setItem(USCITE_KEY, JSON.stringify(uscite));
  } catch (error) {
    console.error("Errore nel salvataggio delle uscite:", error);
  }
}

/**
 * Genera un UUID v4
 */
export function generaId(): string {
  return crypto.randomUUID();
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
