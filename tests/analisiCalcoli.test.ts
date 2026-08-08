import { describe, it, expect } from "vitest";
import {
  normalizzaCategoria,
  aggregaPerCategoria,
  calcolaKPI,
  calcolaSaldoCumulativo,
  filtraEntrateValide,
} from "../src/utils/analisiCalcoli";
import { CATEGORIE_TASSE_LISTA } from "../src/constants/fiscali";
import type { Fattura, Uscita, Entrata, Prelievo } from "../src/types/fattura";

const uscita = (
  id: string,
  data: string,
  importo: number,
  categoria?: string,
  escludiDaGrafico?: boolean
): Uscita => ({ id, data, descrizione: "u", importo, categoria, escludiDaGrafico });

const entrata = (
  id: string,
  data: string,
  importo: number,
  categoria?: string,
  escludiDaGrafico?: boolean
): Entrata => ({ id, data, descrizione: "e", importo, categoria, escludiDaGrafico });

// ============================================================================

describe("normalizzaCategoria", () => {
  it("mette in Title Case una parola sola", () => {
    expect(normalizzaCategoria("affitto")).toBe("Affitto");
    expect(normalizzaCategoria("AFFITTO")).toBe("Affitto");
  });

  it("mette in Title Case OGNI parola, non solo la prima", () => {
    // Il bug precedente produceva "Tasse - acconto": la costante non faceva
    // round-trip e il menu mostrava due varianti della stessa categoria.
    expect(normalizzaCategoria("Tasse - Acconto")).toBe("Tasse - Acconto");
    expect(normalizzaCategoria("tasse - acconto")).toBe("Tasse - Acconto");
    expect(normalizzaCategoria("Saldo Iniziale")).toBe("Saldo Iniziale");
  });

  it("mantiene le sigle in maiuscolo", () => {
    expect(normalizzaCategoria("tasse - inps")).toBe("Tasse - INPS");
    expect(normalizzaCategoria("Tasse - Inps")).toBe("Tasse - INPS");
  });

  it("tutte le CATEGORIE_TASSE fanno round-trip", () => {
    // Se una costante non è stabile sotto normalizzazione, il combobox dei
    // movimenti finisce per elencare la stessa categoria due volte.
    for (const categoria of CATEGORIE_TASSE_LISTA) {
      expect(normalizzaCategoria(categoria)).toBe(categoria);
    }
  });

  it("è idempotente", () => {
    const casi = ["tasse - acconto", "AFFITTO", "  spesa   varia  ", "inps"];
    for (const c of casi) {
      const una = normalizzaCategoria(c);
      expect(normalizzaCategoria(una)).toBe(una);
    }
  });

  it("normalizza i singolari al plurale", () => {
    expect(normalizzaCategoria("fattura")).toBe("Fatture");
    expect(normalizzaCategoria("rimborso")).toBe("Rimborsi");
    expect(normalizzaCategoria("stipendio")).toBe("Stipendi");
  });

  it("categoria assente o vuota diventa Altro", () => {
    expect(normalizzaCategoria(undefined)).toBe("Altro");
    expect(normalizzaCategoria("")).toBe("Altro");
    expect(normalizzaCategoria("   ")).toBe("Altro");
  });

  it("collassa gli spazi multipli", () => {
    expect(normalizzaCategoria("spesa    varia")).toBe("Spesa Varia");
  });
});

// ============================================================================

describe("aggregaPerCategoria", () => {
  it("somma gli importi della stessa categoria", () => {
    const r = aggregaPerCategoria([
      uscita("1", "2026-01-01", 100, "Affitto"),
      uscita("2", "2026-02-01", 200, "Affitto"),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].totale).toBe(300);
  });

  it("unisce le varianti di maiuscole della stessa categoria", () => {
    const r = aggregaPerCategoria([
      uscita("1", "2026-01-01", 100, "Tasse - Acconto"),
      uscita("2", "2026-02-01", 200, "tasse - acconto"),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].categoria).toBe("Tasse - Acconto");
    expect(r[0].totale).toBe(300);
  });

  it("esclude il Saldo Iniziale", () => {
    const r = aggregaPerCategoria([
      entrata("1", "2026-01-01", 5000, "Saldo Iniziale"),
      entrata("2", "2026-02-01", 100, "Rimborsi"),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].categoria).toBe("Rimborsi");
  });

  it("esclude i movimenti marcati escludiDaGrafico", () => {
    const r = aggregaPerCategoria([
      uscita("1", "2026-01-01", 100, "Affitto"),
      uscita("2", "2026-02-01", 999, "Affitto", true),
    ]);
    expect(r[0].totale).toBe(100);
  });

  it("ordina per totale decrescente e calcola le percentuali", () => {
    const r = aggregaPerCategoria([
      uscita("1", "2026-01-01", 100, "Piccola"),
      uscita("2", "2026-02-01", 300, "Grande"),
    ]);
    expect(r[0].categoria).toBe("Grande");
    expect(r[0].percentuale).toBeCloseTo(75, 2);
    expect(r[1].percentuale).toBeCloseTo(25, 2);
  });

  it("lista vuota non esplode", () => {
    expect(aggregaPerCategoria([])).toEqual([]);
  });
});

// ============================================================================

describe("filtraEntrateValide", () => {
  it("esclude Saldo Iniziale in entrambe le grafie", () => {
    const r = filtraEntrateValide([
      entrata("1", "2026-01-01", 1000, "Saldo Iniziale"),
      entrata("2", "2026-01-01", 1000, "saldo_iniziale"),
      entrata("3", "2026-01-01", 50, "Rimborsi"),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe("3");
  });
});

// ============================================================================

describe("calcolaKPI", () => {
  const fatture: Fattura[] = [
    { id: "f1", data: "2026-01-15", descrizione: "d", cliente: "Alfa", importoLordo: 1000 },
    { id: "f2", data: "2026-02-15", descrizione: "d", cliente: "Beta", importoLordo: 3000 },
    { id: "f3", data: "2025-02-15", descrizione: "d", cliente: "Gamma", importoLordo: 9999 },
  ];
  const prelievi: Prelievo[] = [
    { id: "p1", data: "2026-01-31", descrizione: "Stipendio", importo: 500 },
  ];

  it("filtra per anno", () => {
    const kpi = calcolaKPI(fatture, [], [], [], 2026);
    expect(kpi.numeroFatture).toBe(2);
    expect(kpi.totaleEntrate).toBe(4000);
  });

  it("il saldo netto sottrae uscite e prelievi", () => {
    const uscite = [uscita("u1", "2026-03-01", 200, "Affitto")];
    const kpi = calcolaKPI(fatture, uscite, [], prelievi, 2026);
    expect(kpi.totaleUscite).toBe(700);
    expect(kpi.saldoNetto).toBe(3300);
  });

  it("il Saldo Iniziale non gonfia le entrate", () => {
    const entrate = [entrata("e1", "2026-01-01", 50000, "Saldo Iniziale")];
    const kpi = calcolaKPI(fatture, [], entrate, [], 2026);
    expect(kpi.totaleEntrate).toBe(4000);
  });

  it("individua il miglior cliente", () => {
    const kpi = calcolaKPI(fatture, [], [], [], 2026);
    expect(kpi.migliorCliente.nome).toBe("Beta");
    expect(kpi.migliorCliente.importo).toBe(3000);
    expect(kpi.numeroClienti).toBe(2);
  });

  it("senza fatture restituisce zeri, non NaN", () => {
    const kpi = calcolaKPI([], [], [], [], 2026);
    expect(kpi.mediaFatturatoMensile).toBe(0);
    expect(kpi.migliorCliente.nome).toBe("N/A");
    expect(Number.isNaN(kpi.saldoNetto)).toBe(false);
  });
});

// ============================================================================

describe("calcolaSaldoCumulativo", () => {
  const fatture: Fattura[] = [
    { id: "f1", data: "2026-01-15", descrizione: "d", cliente: "Alfa", importoLordo: 1000 },
  ];

  it("parte da zero se non viene passato un saldo iniziale", () => {
    const saldi = calcolaSaldoCumulativo(fatture, [], [], [], 2026);
    expect(saldi[0].saldo).toBe(1000);
  });

  it("parte dal saldo iniziale quando fornito", () => {
    // Senza questo la curva del grafico non corrispondeva al cash reale
    // mostrato in Dashboard.
    const saldi = calcolaSaldoCumulativo(fatture, [], [], [], 2026, 5000);
    expect(saldi[0].saldo).toBe(6000);
  });

  it("accumula in ordine cronologico", () => {
    const uscite = [uscita("u1", "2026-02-01", 300, "Affitto")];
    const saldi = calcolaSaldoCumulativo(fatture, uscite, [], [], 2026, 1000);
    expect(saldi.map((s) => s.saldo)).toEqual([2000, 1700]);
  });

  it("nessun movimento produce una serie vuota", () => {
    expect(calcolaSaldoCumulativo([], [], [], [], 2026)).toEqual([]);
  });
});
