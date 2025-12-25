/**
 * Gestione localStorage per le fatture
 */

import { STORAGE_KEY } from "../constants/fiscali";
import type { Fattura } from "../types/fattura";

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
 * Genera un UUID v4 per le nuove fatture
 */
export function generaId(): string {
  return crypto.randomUUID();
}
