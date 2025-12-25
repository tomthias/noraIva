import { describe, it, expect } from "vitest";
import {
  calcolaFatturatoIncassato,
  calcolaTotaleFatture,
  calcolaRedditoImponibileLordo,
  calcolaContributi,
  calcolaRedditoImponibileNetto,
  calcolaImposta,
  calcolaTasseTotali,
  calcolaNettoAnnuo,
  calcolaRiepilogoPerFattura,
  calcolaRiepilogoAnnuale,
  simulaNuovaFattura,
  calcolaPercentualeTasse,
} from "../src/utils/calcoliFisco";
import type { Fattura } from "../src/types/fattura";

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
    incassato: 1000,
    stato: "incassata",
  },
  {
    id: "2",
    data: "2025-02-20",
    descrizione: "Fattura 2",
    cliente: "Cliente B",
    importoLordo: 2000,
    incassato: 2000,
    stato: "incassata",
  },
  {
    id: "3",
    data: "2025-03-10",
    descrizione: "Fattura 3",
    cliente: "Cliente C",
    importoLordo: 500,
    incassato: 0,
    stato: "non_incassata",
  },
];

describe("calcolaFatturatoIncassato", () => {
  it("calcola correttamente il totale incassato", () => {
    expect(calcolaFatturatoIncassato(fattureSample)).toBe(3000);
  });

  it("restituisce 0 per array vuoto", () => {
    expect(calcolaFatturatoIncassato([])).toBe(0);
  });
});

describe("calcolaTotaleFatture", () => {
  it("calcola correttamente il totale fatture emesse", () => {
    expect(calcolaTotaleFatture(fattureSample)).toBe(3500);
  });
});

describe("calcolaRedditoImponibileLordo", () => {
  it("applica correttamente il coefficiente di redditività (78%)", () => {
    // 3000 * 0.78 = 2340
    expect(calcolaRedditoImponibileLordo(fattureSample)).toBeCloseTo(2340, 2);
  });

  it("restituisce 0 per array vuoto", () => {
    expect(calcolaRedditoImponibileLordo([])).toBe(0);
  });
});

describe("calcolaContributi", () => {
  it("calcola correttamente i contributi INPS GS (26,07%)", () => {
    // Reddito imponibile lordo = 3000 * 0.78 = 2340
    // Contributi = 2340 * 0.2607 = 610.038
    expect(calcolaContributi(fattureSample)).toBeCloseTo(610.038, 2);
  });
});

describe("calcolaRedditoImponibileNetto", () => {
  it("sottrae correttamente i contributi dal reddito lordo", () => {
    // Reddito lordo = 2340
    // Contributi = 610.038
    // Reddito netto = 2340 - 610.038 = 1729.962
    expect(calcolaRedditoImponibileNetto(fattureSample)).toBeCloseTo(1729.962, 2);
  });
});

describe("calcolaImposta", () => {
  it("calcola correttamente l'imposta sostitutiva (5%)", () => {
    // Reddito netto = 1729.962
    // Imposta = 1729.962 * 0.05 = 86.4981
    expect(calcolaImposta(fattureSample)).toBeCloseTo(86.4981, 2);
  });
});

describe("calcolaTasseTotali", () => {
  it("somma correttamente contributi e imposta", () => {
    // Contributi = 610.038
    // Imposta = 86.4981
    // Totale = 696.5361
    expect(calcolaTasseTotali(fattureSample)).toBeCloseTo(696.5361, 2);
  });
});

describe("calcolaNettoAnnuo", () => {
  it("calcola correttamente il netto annuo", () => {
    // Fatturato incassato = 3000
    // Tasse totali = 696.5361
    // Netto = 3000 - 696.5361 = 2303.4639
    expect(calcolaNettoAnnuo(fattureSample)).toBeCloseTo(2303.4639, 2);
  });
});

describe("calcolaRiepilogoPerFattura", () => {
  it("calcola correttamente il riepilogo pro-quota per ogni fattura", () => {
    const riepiloghi = calcolaRiepilogoPerFattura(fattureSample);

    expect(riepiloghi).toHaveLength(3);

    // Fattura 1: 1000€ incassata su 3000€ totali = 33.33%
    // Tasse pro-quota = 696.5361 * (1000/3000) = 232.1787
    // Netto = 1000 - 232.1787 = 767.8213
    expect(riepiloghi[0].tasseProQuota).toBeCloseTo(232.1787, 2);
    expect(riepiloghi[0].nettoStimato).toBeCloseTo(767.8213, 2);

    // Fattura 3: 0€ incassata = 0% delle tasse
    expect(riepiloghi[2].tasseProQuota).toBe(0);
    expect(riepiloghi[2].nettoStimato).toBe(0);
  });

  it("gestisce correttamente il caso di nessun incasso", () => {
    const fattureNonIncassate: Fattura[] = [
      {
        id: "1",
        data: "2025-01-15",
        descrizione: "Test",
        cliente: "Test",
        importoLordo: 1000,
        incassato: 0,
        stato: "non_incassata",
      },
    ];

    const riepiloghi = calcolaRiepilogoPerFattura(fattureNonIncassate);
    expect(riepiloghi[0].tasseProQuota).toBe(0);
    expect(riepiloghi[0].nettoStimato).toBe(0);
  });
});

describe("calcolaRiepilogoAnnuale", () => {
  it("restituisce tutti i valori corretti", () => {
    const riepilogo = calcolaRiepilogoAnnuale(fattureSample);

    expect(riepilogo.totaleFatture).toBe(3500);
    expect(riepilogo.totaleIncassato).toBe(3000);
    expect(riepilogo.redditoImponibileLordo).toBeCloseTo(2340, 2);
    expect(riepilogo.contributiINPS).toBeCloseTo(610.038, 2);
    expect(riepilogo.impostaSostitutiva).toBeCloseTo(86.4981, 2);
    expect(riepilogo.tasseTotali).toBeCloseTo(696.5361, 2);
    expect(riepilogo.nettoAnnuo).toBeCloseTo(2303.4639, 2);
  });
});

describe("simulaNuovaFattura", () => {
  it("simula correttamente l'aggiunta di una nuova fattura", () => {
    const riepilogoSimulato = simulaNuovaFattura(fattureSample, 1000);

    // Nuovo incassato = 3000 + 1000 = 4000
    expect(riepilogoSimulato.totaleIncassato).toBe(4000);

    // Nuovo reddito lordo = 4000 * 0.78 = 3120
    expect(riepilogoSimulato.redditoImponibileLordo).toBeCloseTo(3120, 2);
  });
});

describe("calcolaPercentualeTasse", () => {
  it("calcola correttamente la percentuale di tasse sul fatturato", () => {
    // Tasse = 696.5361, Fatturato = 3000
    // Percentuale = (696.5361 / 3000) * 100 = 23.2178%
    expect(calcolaPercentualeTasse(fattureSample)).toBeCloseTo(23.2178, 2);
  });

  it("restituisce 0 per fatturato zero", () => {
    expect(calcolaPercentualeTasse([])).toBe(0);
  });
});

describe("Verifica formule regime forfettario", () => {
  it("la somma dei netti pro-quota corrisponde al netto annuo", () => {
    const riepiloghi = calcolaRiepilogoPerFattura(fattureSample);
    const sommaNetti = riepiloghi.reduce((sum, r) => sum + r.nettoStimato, 0);
    const nettoAnnuo = calcolaNettoAnnuo(fattureSample);

    expect(sommaNetti).toBeCloseTo(nettoAnnuo, 2);
  });
});
