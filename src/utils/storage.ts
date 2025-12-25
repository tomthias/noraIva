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
