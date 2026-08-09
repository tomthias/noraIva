/**
 * L'ancora del saldo (piano §3.6): il cash smette di essere ricostruito dal
 * basso e viene dalla banca.
 *
 * È il cambiamento più delicato della Fase 2, perché tocca il numero che
 * l'app esiste per dare. I test fissano le due proprietà che contano: i
 * movimenti già visti dalla banca non si contano due volte, e un movimento
 * dimenticato sposta la riconciliazione ma NON il netto prelevabile.
 */

import { describe, it, expect } from "vitest";
import { calcolaAccantonamento, calcolaCashDaBanca } from "../src/utils/calcoliFisco";
import type { Fattura, Movimento, Uscita } from "../src/types/fattura";

const movimento = (p: Partial<Movimento>): Movimento => ({
  id: Math.random().toString(36).slice(2),
  data: "2026-08-01",
  descrizione: "Movimento",
  importo: -100,
  fonte: "manuale",
  ...p,
});

const ancoraBase = { data: "2026-08-08", saldo: 25855.97 };

describe("calcolaCashDaBanca", () => {
  it("senza movimenti successivi il cash è il saldo della banca", () => {
    expect(calcolaCashDaBanca({ ...ancoraBase, movimenti: [] })).toBeCloseTo(25855.97, 2);
  });

  it("non riconta i movimenti importati: sono già dentro il saldo", () => {
    const movimenti = [
      movimento({ data: "2026-08-08", importo: 2440, fonte: "import_bbva" }),
      movimento({ data: "2026-07-31", importo: 28.87, fonte: "import_bbva" }),
    ];
    expect(calcolaCashDaBanca({ ...ancoraBase, movimenti })).toBeCloseTo(25855.97, 2);
  });

  it("somma i movimenti manuali successivi, che la banca non ha ancora visto", () => {
    const movimenti = [
      movimento({ data: "2026-08-10", importo: -500, descrizione: "Contanti" }),
      movimento({ data: "2026-08-12", importo: 200, descrizione: "Rimborso" }),
    ];
    expect(calcolaCashDaBanca({ ...ancoraBase, movimenti })).toBeCloseTo(25555.97, 2);
  });

  it("ignora i movimenti manuali PRECEDENTI all'ancora: già nel saldo", () => {
    const movimenti = [movimento({ data: "2026-08-01", importo: -1000 })];
    expect(calcolaCashDaBanca({ ...ancoraBase, movimenti })).toBeCloseTo(25855.97, 2);
  });

  it("un movimento manuale nello stesso giorno dell'ancora non si somma", () => {
    // La riga dell'ancora è l'ultima del file di quel giorno: quello che c'è
    // in quella data la banca l'ha già contato.
    const movimenti = [movimento({ data: "2026-08-08", importo: -50 })];
    expect(calcolaCashDaBanca({ ...ancoraBase, movimenti })).toBeCloseTo(25855.97, 2);
  });

  it("un movimento importato dopo l'ancora (import più vecchio) non si somma", () => {
    const movimenti = [movimento({ data: "2026-08-20", importo: -300, fonte: "import_bbva" })];
    expect(calcolaCashDaBanca({ ...ancoraBase, movimenti })).toBeCloseTo(25855.97, 2);
  });
});

describe("calcolaAccantonamento con l'ancora", () => {
  const fatture: Fattura[] = [
    { id: "f1", data: "2026-03-10", descrizione: "Sito", cliente: "ACME", importoLordo: 10000 },
  ];
  const uscite: Uscita[] = [
    { id: "u1", data: "2026-04-01", descrizione: "Affitto", categoria: "Affitto", importo: 500 },
  ];

  it("senza ancora il cash resta quello ricostruito dal basso, come prima", () => {
    const a = calcolaAccantonamento(fatture, [], uscite, [], 2026);
    expect(a.cashDisponibileReale).toBeCloseTo(9500, 2);
    expect(a.cashRicostruito).toBeCloseTo(9500, 2);
    // Niente import, niente da riconciliare.
    expect(a.scostamentoBanca).toBe(0);
    expect(a.ancoraSaldo).toBeUndefined();
  });

  it("con l'ancora il cash è quello della banca, non la somma dei movimenti", () => {
    const a = calcolaAccantonamento(fatture, [], uscite, [], 2026, {}, {
      data: "2026-08-08",
      saldo: 12000,
      movimenti: [],
    });
    expect(a.cashDisponibileReale).toBeCloseTo(12000, 2);
    expect(a.cashRicostruito).toBeCloseTo(9500, 2);
    expect(a.scostamentoBanca).toBeCloseTo(-2500, 2);
  });

  it("un movimento dimenticato sposta la riconciliazione, non il netto prelevabile", () => {
    const conAncora = (usciteDate: Uscita[]) =>
      calcolaAccantonamento(fatture, [], usciteDate, [], 2026, {}, {
        data: "2026-08-08",
        saldo: 12000,
        movimenti: [],
      });

    const completo = conAncora(uscite);
    const dimenticato = conAncora([
      ...uscite,
      { id: "u2", data: "2026-05-01", descrizione: "Spesa scordata", categoria: "Spese", importo: 300 },
    ]);

    // Il netto prelevabile non si muove: viene dalla banca.
    expect(dimenticato.nettoSicuro).toBeCloseTo(completo.nettoSicuro, 2);
    // Lo scostamento sì: è lì che si vede che qualcosa non torna.
    expect(dimenticato.scostamentoBanca).toBeCloseTo(completo.scostamentoBanca - 300, 2);
  });

  it("il netto prelevabile resta cash meno accantonamento, con o senza ancora", () => {
    const a = calcolaAccantonamento(fatture, [], uscite, [], 2026, {}, {
      data: "2026-08-08",
      saldo: 12000,
      movimenti: [],
    });
    expect(a.nettoSicuro).toBeCloseTo(a.cashDisponibileReale - a.totaleDaAccantonare, 2);
  });
});

describe("incassi fattura importati", () => {
  it("non vengono contati due volte nel cash ricostruito", () => {
    const fatture: Fattura[] = [
      { id: "f1", data: "2026-03-10", descrizione: "Sito", cliente: "ACME", importoLordo: 2440 },
    ];
    // Lo stesso incasso, arrivato anche dall'estratto come movimento.
    const entrate = [
      {
        id: "e1",
        data: "2026-03-10",
        descrizione: "Bonifico ACME",
        categoria: "Incasso Fattura",
        importo: 2440,
      },
    ];

    const a = calcolaAccantonamento(fatture, [], [], entrate, 2026);
    expect(a.cashRicostruito).toBeCloseTo(2440, 2);
  });
});
