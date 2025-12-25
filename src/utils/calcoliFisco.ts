/**
 * Funzioni di calcolo fiscale per il Regime Forfettario 2025
 *
 * REGOLE DI CALCOLO:
 * 1. Reddito Imponibile Lordo = Fatturato Incassato × Coefficiente Redditività (78%)
 * 2. Contributi INPS = Reddito Imponibile Lordo × Aliquota Gestione Separata (26,07%)
 * 3. Reddito Imponibile Netto = Reddito Imponibile Lordo - Contributi INPS
 * 4. Imposta Sostitutiva = Reddito Imponibile Netto × Aliquota Imposta (5%)
 * 5. Totale Tasse = Contributi INPS + Imposta Sostitutiva
 * 6. Netto Annuo = Fatturato Incassato - Totale Tasse
 *
 * Per singola fattura (pro-quota):
 * - quota = incassatoFattura / fatturatoIncassatoTotale
 * - tasseProQuota = tasseTotali × quota
 * - nettoStimato = incassato - tasseProQuota
 */

import {
  ALIQUOTA_IMPOSTA_SOSTITUTIVA,
  ALIQUOTA_CONTRIBUTI_GS,
  COEFFICIENTE_REDDITIVITA,
} from "../constants/fiscali";
import type { Fattura, RiepilogoFattura, RiepilogoAnnuale } from "../types/fattura";

/**
 * Calcola il totale fatturato incassato (somma di tutti gli importi incassati)
 */
export function calcolaFatturatoIncassato(fatture: Fattura[]): number {
  return fatture.reduce((sum, f) => sum + f.incassato, 0);
}

/**
 * Calcola il totale importi lordi (somma di tutti gli importi fatturati)
 */
export function calcolaTotaleFatture(fatture: Fattura[]): number {
  return fatture.reduce((sum, f) => sum + f.importoLordo, 0);
}

/**
 * Calcola il reddito imponibile lordo
 * Formula: Fatturato Incassato × Coefficiente Redditività (78%)
 */
export function calcolaRedditoImponibileLordo(fatture: Fattura[]): number {
  const fatturatoIncassato = calcolaFatturatoIncassato(fatture);
  return fatturatoIncassato * COEFFICIENTE_REDDITIVITA;
}

/**
 * Calcola i contributi INPS Gestione Separata
 * Formula: Reddito Imponibile Lordo × Aliquota GS (26,07%)
 */
export function calcolaContributi(fatture: Fattura[]): number {
  const redditoImponibileLordo = calcolaRedditoImponibileLordo(fatture);
  return redditoImponibileLordo * ALIQUOTA_CONTRIBUTI_GS;
}

/**
 * Calcola il reddito imponibile netto (base per l'imposta sostitutiva)
 * Formula: Reddito Imponibile Lordo - Contributi INPS
 */
export function calcolaRedditoImponibileNetto(fatture: Fattura[]): number {
  const redditoImponibileLordo = calcolaRedditoImponibileLordo(fatture);
  const contributi = calcolaContributi(fatture);
  return redditoImponibileLordo - contributi;
}

/**
 * Calcola l'imposta sostitutiva
 * Formula: Reddito Imponibile Netto × Aliquota Imposta (5%)
 */
export function calcolaImposta(fatture: Fattura[]): number {
  const redditoImponibileNetto = calcolaRedditoImponibileNetto(fatture);
  return redditoImponibileNetto * ALIQUOTA_IMPOSTA_SOSTITUTIVA;
}

/**
 * Calcola il totale tasse e contributi
 * Formula: Contributi INPS + Imposta Sostitutiva
 */
export function calcolaTasseTotali(fatture: Fattura[]): number {
  const contributi = calcolaContributi(fatture);
  const imposta = calcolaImposta(fatture);
  return contributi + imposta;
}

/**
 * Calcola il netto annuo effettivo
 * Formula: Fatturato Incassato - Totale Tasse
 */
export function calcolaNettoAnnuo(fatture: Fattura[]): number {
  const fatturatoIncassato = calcolaFatturatoIncassato(fatture);
  const tasseTotali = calcolaTasseTotali(fatture);
  return fatturatoIncassato - tasseTotali;
}

/**
 * Calcola il riepilogo pro-quota per ogni fattura
 *
 * Per ripartire tasse e contributi proporzionalmente:
 * - quota = incassatoFattura / fatturatoIncassatoTotale
 * - tasseProQuota = tasseTotali × quota
 * - nettoStimato = incassato - tasseProQuota
 */
export function calcolaRiepilogoPerFattura(fatture: Fattura[]): RiepilogoFattura[] {
  const fatturatoIncassatoTotale = calcolaFatturatoIncassato(fatture);
  const tasseTotali = calcolaTasseTotali(fatture);

  return fatture.map((f) => {
    // Evita divisione per zero
    const quota = fatturatoIncassatoTotale > 0 ? f.incassato / fatturatoIncassatoTotale : 0;
    const tasseProQuota = tasseTotali * quota;
    const nettoStimato = f.incassato - tasseProQuota;

    return {
      id: f.id,
      importoLordo: f.importoLordo,
      incassato: f.incassato,
      tasseProQuota,
      nettoStimato,
    };
  });
}

/**
 * Calcola il riepilogo annuale completo
 */
export function calcolaRiepilogoAnnuale(fatture: Fattura[]): RiepilogoAnnuale {
  return {
    totaleFatture: calcolaTotaleFatture(fatture),
    totaleIncassato: calcolaFatturatoIncassato(fatture),
    redditoImponibileLordo: calcolaRedditoImponibileLordo(fatture),
    contributiINPS: calcolaContributi(fatture),
    impostaSostitutiva: calcolaImposta(fatture),
    tasseTotali: calcolaTasseTotali(fatture),
    nettoAnnuo: calcolaNettoAnnuo(fatture),
  };
}

/**
 * Simula l'impatto di una nuova fattura ipotetica
 * Restituisce il riepilogo annuale con la fattura aggiuntiva
 */
export function simulaNuovaFattura(
  fatture: Fattura[],
  importoNuovaFattura: number
): RiepilogoAnnuale {
  // Crea una fattura simulata (considerata già incassata)
  const fatturaSiumlata: Fattura = {
    id: "simulata",
    data: new Date().toISOString().split("T")[0],
    descrizione: "Fattura simulata",
    cliente: "",
    importoLordo: importoNuovaFattura,
    incassato: importoNuovaFattura,
    stato: "incassata",
  };

  return calcolaRiepilogoAnnuale([...fatture, fatturaSiumlata]);
}

/**
 * Calcola la percentuale di tasse sul fatturato incassato
 */
export function calcolaPercentualeTasse(fatture: Fattura[]): number {
  const fatturatoIncassato = calcolaFatturatoIncassato(fatture);
  if (fatturatoIncassato === 0) return 0;
  const tasseTotali = calcolaTasseTotali(fatture);
  return (tasseTotali / fatturatoIncassato) * 100;
}
