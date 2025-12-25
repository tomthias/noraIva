/**
 * Funzioni di calcolo fiscale per il Regime Forfettario 2025
 *
 * REGOLE DI CALCOLO:
 * 1. Reddito Imponibile Lordo = Fatturato Totale × Coefficiente Redditività (78%)
 * 2. Contributi INPS = Reddito Imponibile Lordo × Aliquota Gestione Separata (26,07%)
 * 3. Reddito Imponibile Netto = Reddito Imponibile Lordo - Contributi INPS
 * 4. Imposta Sostitutiva = Reddito Imponibile Netto × Aliquota Imposta (5%)
 * 5. Totale Tasse = Contributi INPS + Imposta Sostitutiva
 * 6. Netto Fatture = Fatturato Totale - Totale Tasse
 * 7. Netto Disponibile = Netto Fatture - Prelievi - Uscite
 *
 * Per singola fattura:
 * - tasseContributi = (importoLordo × 78% × 26.07%) + (importoLordo × 78% × (1 - 26.07%) × 5%)
 * - netto = importoLordo - tasseContributi
 */

import {
  ALIQUOTA_IMPOSTA_SOSTITUTIVA,
  ALIQUOTA_CONTRIBUTI_GS,
  COEFFICIENTE_REDDITIVITA,
} from "../constants/fiscali";
import type {
  Fattura,
  Prelievo,
  Uscita,
  RiepilogoFattura,
  RiepilogoAnnuale,
  SituazioneCashFlow,
} from "../types/fattura";

/**
 * Calcola il totale fatturato (somma di tutti gli importi lordi)
 */
export function calcolaTotaleFatture(fatture: Fattura[]): number {
  return fatture.reduce((sum, f) => sum + f.importoLordo, 0);
}

/**
 * Calcola il reddito imponibile lordo
 * Formula: Fatturato Totale × Coefficiente Redditività (78%)
 */
export function calcolaRedditoImponibileLordo(fatture: Fattura[]): number {
  const fatturatoTotale = calcolaTotaleFatture(fatture);
  return fatturatoTotale * COEFFICIENTE_REDDITIVITA;
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
 * Calcola il netto derivante dalle fatture (prima di prelievi e uscite)
 * Formula: Fatturato Totale - Totale Tasse
 */
export function calcolaNettoFatture(fatture: Fattura[]): number {
  const fatturatoTotale = calcolaTotaleFatture(fatture);
  const tasseTotali = calcolaTasseTotali(fatture);
  return fatturatoTotale - tasseTotali;
}

/**
 * Calcola il riepilogo per ogni fattura
 * Mostra tasse e netto per singola fattura
 */
export function calcolaRiepilogoPerFattura(fatture: Fattura[]): RiepilogoFattura[] {
  return fatture.map((f) => {
    const redditoImponibile = f.importoLordo * COEFFICIENTE_REDDITIVITA;
    const inps = redditoImponibile * ALIQUOTA_CONTRIBUTI_GS;
    const imponibileNetto = redditoImponibile - inps;
    const imposta = imponibileNetto * ALIQUOTA_IMPOSTA_SOSTITUTIVA;
    const tasseContributi = inps + imposta;
    const netto = f.importoLordo - tasseContributi;

    return {
      id: f.id,
      importoLordo: f.importoLordo,
      tasseContributi,
      netto,
    };
  });
}

/**
 * Calcola il riepilogo annuale completo
 */
export function calcolaRiepilogoAnnuale(fatture: Fattura[]): RiepilogoAnnuale {
  return {
    totaleFatture: calcolaTotaleFatture(fatture),
    redditoImponibileLordo: calcolaRedditoImponibileLordo(fatture),
    contributiINPS: calcolaContributi(fatture),
    impostaSostitutiva: calcolaImposta(fatture),
    tasseTotali: calcolaTasseTotali(fatture),
    nettoFatture: calcolaNettoFatture(fatture),
  };
}

/**
 * Calcola la situazione del cash flow
 * Mostra quanto è disponibile da ritirare
 */
export function calcolaSituazioneCashFlow(
  fatture: Fattura[],
  prelievi: Prelievo[],
  uscite: Uscita[]
): SituazioneCashFlow {
  const nettoFatture = calcolaNettoFatture(fatture);
  const totalePrelievi = prelievi.reduce((sum, p) => sum + p.importo, 0);
  const totaleUscite = uscite.reduce((sum, u) => sum + u.importo, 0);
  const nettoDisponibile = nettoFatture - totalePrelievi - totaleUscite;

  return {
    nettoFatture,
    totalePrelievi,
    totaleUscite,
    nettoDisponibile,
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
  const fatturaSimulata: Fattura = {
    id: "simulata",
    data: new Date().toISOString().split("T")[0],
    descrizione: "Fattura simulata",
    cliente: "",
    importoLordo: importoNuovaFattura,
  };

  return calcolaRiepilogoAnnuale([...fatture, fatturaSimulata]);
}

/**
 * Calcola la percentuale di tasse sul fatturato totale
 */
export function calcolaPercentualeTasse(fatture: Fattura[]): number {
  const fatturatoTotale = calcolaTotaleFatture(fatture);
  if (fatturatoTotale === 0) return 0;
  const tasseTotali = calcolaTasseTotali(fatture);
  return (tasseTotali / fatturatoTotale) * 100;
}
