/**
 * Le spie confrontano i conti dell'app con le stime di Fiscozen.
 *
 * Il test che conta davvero è quello sulle "grandezze omogenee": l'intervallo
 * Fiscozen dell'anno prossimo include il secondo acconto di novembre, che il
 * totale da tenere da parte esclude di proposito. Confrontare i due numeri
 * sbagliati darebbe una spia rossa perenne, cioè una spia inutile.
 */

import { describe, it, expect } from "vitest";
import { calcolaAccantonamento } from "../src/utils/calcoliFisco";
import { calcolaSpieFiscozen, type StimaFiscozen } from "../src/utils/spieFiscozen";
import type { Fattura } from "../src/types/fattura";

const fatture: Fattura[] = [
  { id: "f1", data: "2026-03-10", descrizione: "Sito", cliente: "ACME", importoLordo: 52924 },
];

const accantonamento = (rettifiche = {}) =>
  calcolaAccantonamento(fatture, [], [], [], 2026, rettifiche);

const spia = (stime: StimaFiscozen[], id: string) =>
  calcolaSpieFiscozen(accantonamento(), stime).find((s) => s.id === id)!;

describe("spia degli incassi", () => {
  it("è verde quando l'app e Fiscozen dicono lo stesso incassato", () => {
    const s = spia([{ annoPagamento: 2026, incassatoDichiarato: 52924 }], "incassi");
    expect(s.stato).toBe("ok");
    expect(s.valoreApp).toBeCloseTo(52924, 2);
  });

  it("è ambra quando mancano incassi, e dice di quanto", () => {
    const s = spia([{ annoPagamento: 2026, incassatoDichiarato: 60000 }], "incassi");
    expect(s.stato).toBe("attenzione");
    expect(s.scostamento).toBeCloseTo(-7076, 2);
  });

  it("tiene conto della rettifica, come fa il motore", () => {
    const spie = calcolaSpieFiscozen(accantonamento({ 2026: 7076 }), [
      { annoPagamento: 2026, incassatoDichiarato: 60000 },
    ]);
    expect(spie.find((s) => s.id === "incassi")!.stato).toBe("ok");
  });

  it("non si accende per pochi euro di arrotondamento", () => {
    const s = spia([{ annoPagamento: 2026, incassatoDichiarato: 52950 }], "incassi");
    expect(s.stato).toBe("ok");
  });
});

describe("spia delle tasse dell'anno prossimo", () => {
  it("confronta grandezze omogenee: include il 2° acconto di novembre", () => {
    const a = accantonamento();
    const atteso =
      a.saldoAnnoCorrente + a.primoAccontoAnnoProssimo + a.secondoAccontoAnnoProssimo;

    const s = calcolaSpieFiscozen(a, [
      { annoPagamento: 2027, tasseMin: atteso - 10, tasseMax: atteso + 10 },
    ]).find((x) => x.id === "tasse-anno-prossimo")!;

    expect(s.valoreApp).toBeCloseTo(atteso, 2);
    expect(s.stato).toBe("ok");
    // Il totale da tenere da parte è un'altra cosa: esclude novembre.
    expect(a.totaleDaAccantonare).toBeLessThan(atteso);
  });
});

describe("stime mancanti", () => {
  it("le spie senza stima restano 'assente', non diventano rosse", () => {
    for (const s of calcolaSpieFiscozen(accantonamento(), [])) {
      expect(s.stato).toBe("assente");
      expect(s.scostamento).toBe(0);
    }
  });

  it("una stima con solo gli incassi non accende le spie delle tasse", () => {
    const spie = calcolaSpieFiscozen(accantonamento(), [
      { annoPagamento: 2026, incassatoDichiarato: 52924 },
    ]);
    expect(spie.find((s) => s.id === "tasse-anno-corrente")!.stato).toBe("assente");
    expect(spie.find((s) => s.id === "incassi")!.stato).toBe("ok");
  });
});

describe("cuscinetto di emergenza", () => {
  it("riduce il netto prelevabile senza toccare l'accantonamento fiscale", () => {
    const senza = calcolaAccantonamento(fatture, [], [], [], 2026, {}, undefined, 0);
    const con = calcolaAccantonamento(fatture, [], [], [], 2026, {}, undefined, 5000);

    expect(con.totaleDaAccantonare).toBeCloseTo(senza.totaleDaAccantonare, 2);
    expect(con.nettoSicuro).toBeCloseTo(senza.nettoSicuro - 5000, 2);
    expect(con.cuscinetto).toBe(5000);
  });

  it("senza cuscinetto il netto è quello di sempre", () => {
    const a = calcolaAccantonamento(fatture, [], [], [], 2026);
    expect(a.cuscinetto).toBe(0);
    expect(a.nettoSicuro).toBeCloseTo(a.cashDisponibileReale - a.totaleDaAccantonare, 2);
  });
});
