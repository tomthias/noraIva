import { describe, it, expect } from "vitest";
import {
  calcolaTotaleFatture,
  calcolaRedditoImponibileLordo,
  calcolaContributi,
  calcolaRedditoImponibileNetto,
  calcolaImposta,
  calcolaTasseTotali,
  calcolaNettoFatture,
  calcolaRiepilogoPerFattura,
  calcolaRiepilogoAnnuale,
  simulaNuovaFattura,
  calcolaPercentualeTasse,
  calcolaSituazioneCashFlow,
} from "../src/utils/calcoliFisco";
import type { Fattura, Prelievo, Uscita } from "../src/types/fattura";

/**
 * Test delle funzioni di calcolo fiscale per il regime forfettario
 *
 * Costanti utilizzate:
 * - Coefficiente redditività: 78%
 * - Aliquota INPS Gestione Separata: 26,07%
 * - Aliquota imposta sostitutiva: 5%
 */

const fattureSample: Fattura[] = [
  {
    id: "1",
    data: "2025-01-15",
    descrizione: "Fattura 1",
    cliente: "Cliente A",
    importoLordo: 1000,
  },
  {
    id: "2",
    data: "2025-02-20",
    descrizione: "Fattura 2",
    cliente: "Cliente B",
    importoLordo: 2000,
  },
  {
    id: "3",
    data: "2025-03-10",
    descrizione: "Fattura 3",
    cliente: "Cliente C",
    importoLordo: 500,
  },
];

describe("calcolaTotaleFatture", () => {
  it("calcola correttamente il totale fatture emesse", () => {
    expect(calcolaTotaleFatture(fattureSample)).toBe(3500);
  });

  it("restituisce 0 per array vuoto", () => {
    expect(calcolaTotaleFatture([])).toBe(0);
  });
});

describe("calcolaRedditoImponibileLordo", () => {
  it("applica correttamente il coefficiente di redditività (78%)", () => {
    // 3500 * 0.78 = 2730
    expect(calcolaRedditoImponibileLordo(fattureSample)).toBeCloseTo(2730, 2);
  });

  it("restituisce 0 per array vuoto", () => {
    expect(calcolaRedditoImponibileLordo([])).toBe(0);
  });
});

describe("calcolaContributi", () => {
  it("calcola correttamente i contributi INPS GS (26,07%)", () => {
    // Reddito imponibile lordo = 3500 * 0.78 = 2730
    // Contributi = 2730 * 0.2607 = 711.711
    expect(calcolaContributi(fattureSample)).toBeCloseTo(711.711, 2);
  });
});

describe("calcolaRedditoImponibileNetto", () => {
  it("sottrae correttamente i contributi dal reddito lordo", () => {
    // Reddito lordo = 2730
    // Contributi = 711.711
    // Reddito netto = 2730 - 711.711 = 2018.289
    expect(calcolaRedditoImponibileNetto(fattureSample)).toBeCloseTo(2018.289, 2);
  });
});

describe("calcolaImposta", () => {
  it("calcola correttamente l'imposta sostitutiva (5%)", () => {
    // Reddito netto = 2018.289
    // Imposta = 2018.289 * 0.05 = 100.91445
    expect(calcolaImposta(fattureSample)).toBeCloseTo(100.91445, 2);
  });
});

describe("calcolaTasseTotali", () => {
  it("somma correttamente contributi e imposta", () => {
    // Contributi = 711.711
    // Imposta = 100.91445
    // Totale = 812.62545
    expect(calcolaTasseTotali(fattureSample)).toBeCloseTo(812.62545, 2);
  });
});

describe("calcolaNettoFatture", () => {
  it("calcola correttamente il netto delle fatture", () => {
    // Fatturato totale = 3500
    // Tasse totali = 812.62545
    // Netto = 3500 - 812.62545 = 2687.37455
    expect(calcolaNettoFatture(fattureSample)).toBeCloseTo(2687.37455, 2);
  });
});

describe("calcolaRiepilogoPerFattura", () => {
  it("calcola correttamente tasse e netto per ogni singola fattura", () => {
    const riepiloghi = calcolaRiepilogoPerFattura(fattureSample);

    expect(riepiloghi).toHaveLength(3);

    // Fattura 1: 1000€
    // Reddito imponibile = 1000 * 0.78 = 780
    // INPS = 780 * 0.2607 = 203.346
    // Imponibile netto = 780 - 203.346 = 576.654
    // Imposta = 576.654 * 0.05 = 28.8327
    // Tasse = 203.346 + 28.8327 = 232.1787
    // Netto = 1000 - 232.1787 = 767.8213
    expect(riepiloghi[0].tasseContributi).toBeCloseTo(232.1787, 2);
    expect(riepiloghi[0].netto).toBeCloseTo(767.8213, 2);

    // Fattura 2: 2000€
    expect(riepiloghi[1].netto).toBeCloseTo(1535.6426, 2);

    // Fattura 3: 500€
    expect(riepiloghi[2].netto).toBeCloseTo(383.9106, 2);
  });
});

describe("calcolaRiepilogoAnnuale", () => {
  it("restituisce tutti i valori corretti", () => {
    const riepilogo = calcolaRiepilogoAnnuale(fattureSample);

    expect(riepilogo.totaleFatture).toBe(3500);
    expect(riepilogo.redditoImponibileLordo).toBeCloseTo(2730, 2);
    expect(riepilogo.contributiINPS).toBeCloseTo(711.711, 2);
    expect(riepilogo.impostaSostitutiva).toBeCloseTo(100.91445, 2);
    expect(riepilogo.tasseTotali).toBeCloseTo(812.62545, 2);
    expect(riepilogo.nettoFatture).toBeCloseTo(2687.37455, 2);
  });
});

describe("calcolaSituazioneCashFlow", () => {
  it("calcola correttamente il cash flow con prelievi e uscite", () => {
    const prelievi: Prelievo[] = [
      {
        id: "p1",
        data: "2025-01-31",
        descrizione: "Stipendio Gennaio",
        importo: 1000,
      },
    ];

    const uscite: Uscita[] = [
      {
        id: "u1",
        data: "2025-01-05",
        descrizione: "Affitto",
        importo: 500,
      },
    ];

    const cashFlow = calcolaSituazioneCashFlow(fattureSample, prelievi, uscite);

    expect(cashFlow.nettoFatture).toBeCloseTo(2687.37455, 2);
    expect(cashFlow.totalePrelievi).toBe(1000);
    expect(cashFlow.totaleUscite).toBe(500);
    // Netto disponibile = 2687.37455 - 1000 - 500 = 1187.37455
    expect(cashFlow.nettoDisponibile).toBeCloseTo(1187.37455, 2);
  });

  it("gestisce correttamente il caso senza prelievi e uscite", () => {
    const cashFlow = calcolaSituazioneCashFlow(fattureSample, [], []);

    expect(cashFlow.nettoDisponibile).toBeCloseTo(cashFlow.nettoFatture, 2);
  });
});

describe("simulaNuovaFattura", () => {
  it("simula correttamente l'aggiunta di una nuova fattura", () => {
    const riepilogoSimulato = simulaNuovaFattura(fattureSample, 1000);

    // Nuovo totale = 3500 + 1000 = 4500
    expect(riepilogoSimulato.totaleFatture).toBe(4500);

    // Nuovo reddito lordo = 4500 * 0.78 = 3510
    expect(riepilogoSimulato.redditoImponibileLordo).toBeCloseTo(3510, 2);
  });
});

describe("calcolaPercentualeTasse", () => {
  it("calcola correttamente la percentuale di tasse sul fatturato", () => {
    // Tasse = 812.62545, Fatturato = 3500
    // Percentuale = (812.62545 / 3500) * 100 = 23.218%
    expect(calcolaPercentualeTasse(fattureSample)).toBeCloseTo(23.218, 2);
  });

  it("restituisce 0 per fatturato zero", () => {
    expect(calcolaPercentualeTasse([])).toBe(0);
  });
});

describe("Verifica formule regime forfettario", () => {
  it("la somma dei netti pro-fattura corrisponde al netto totale", () => {
    const riepiloghi = calcolaRiepilogoPerFattura(fattureSample);
    const sommaNetti = riepiloghi.reduce((sum, r) => sum + r.netto, 0);
    const nettoFatture = calcolaNettoFatture(fattureSample);

    expect(sommaNetti).toBeCloseTo(nettoFatture, 2);
  });
});
