/**
 * La tabella unica `movimenti` deve produrre esattamente le tre viste che il
 * resto dell'app consumava dalle tre tabelle separate. Se questa traduzione
 * sbaglia, sbagliano cash disponibile e accantonamento: è il punto più
 * delicato della Fase 1.
 */

import { describe, it, expect } from "vitest";
import type { Movimento } from "../src/types/fattura";
import {
  CATEGORIA_STIPENDIO,
  categoriaPerTipo,
  entrateDa,
  importoConSegno,
  isStipendio,
  prelieviDa,
  tipoDiMovimento,
  usciteDa,
} from "../src/utils/movimenti";

const movimento = (parziale: Partial<Movimento>): Movimento => ({
  id: "m1",
  data: "2026-01-15",
  descrizione: "Movimento",
  importo: -100,
  fonte: "manuale",
  ...parziale,
});

describe("tipoDiMovimento", () => {
  it("classifica come entrata un importo positivo", () => {
    expect(tipoDiMovimento(movimento({ importo: 1000 }))).toBe("entrata");
  });

  it("classifica come uscita un importo negativo senza categoria stipendio", () => {
    expect(tipoDiMovimento(movimento({ importo: -50, categoria: "Affitto" }))).toBe("uscita");
  });

  it("classifica come prelievo un importo negativo con categoria Stipendio", () => {
    expect(tipoDiMovimento(movimento({ importo: -1500, categoria: "Stipendio" }))).toBe("prelievo");
  });

  it("una entrata con categoria Stipendio resta un'entrata (conta il segno)", () => {
    expect(tipoDiMovimento(movimento({ importo: 1500, categoria: "Stipendio" }))).toBe("entrata");
  });

  it("l'importo zero conta come entrata (convenzione unica documentata)", () => {
    expect(tipoDiMovimento(movimento({ importo: 0 }))).toBe("entrata");
  });
});

describe("isStipendio", () => {
  it("riconosce le varianti di scrittura", () => {
    // normalizzaCategoria() mappa "Stipendio" → "Stipendi": entrambe valgono.
    for (const cat of ["Stipendio", "stipendio", "STIPENDIO", "Stipendi", " Stipendio "]) {
      expect(isStipendio(cat)).toBe(true);
    }
  });

  it("non confonde categorie diverse", () => {
    for (const cat of [undefined, "", "Affitto", "Stipendio parziale", "Tasse"]) {
      expect(isStipendio(cat)).toBe(false);
    }
  });
});

describe("le tre viste derivate", () => {
  const movimenti: Movimento[] = [
    movimento({ id: "e1", importo: 2000, categoria: "Rimborsi" }),
    movimento({ id: "e2", importo: 28429.35, categoria: "Saldo iniziale" }),
    movimento({ id: "u1", importo: -450, categoria: "Affitto", escludiDaGrafico: true }),
    movimento({ id: "u2", importo: -6961.24, categoria: "Tasse - Acconto" }),
    movimento({ id: "p1", importo: -1500, categoria: "Stipendio" }),
  ];

  it("separa i movimenti senza perderne né duplicarne", () => {
    const prelievi = prelieviDa(movimenti);
    const uscite = usciteDa(movimenti);
    const entrate = entrateDa(movimenti);

    expect(prelievi.map((p) => p.id)).toEqual(["p1"]);
    expect(uscite.map((u) => u.id)).toEqual(["u1", "u2"]);
    expect(entrate.map((e) => e.id)).toEqual(["e1", "e2"]);
    expect(prelievi.length + uscite.length + entrate.length).toBe(movimenti.length);
  });

  it("restituisce importi POSITIVI: il segno vive solo nella tabella", () => {
    expect(prelieviDa(movimenti)[0].importo).toBe(1500);
    expect(usciteDa(movimenti).map((u) => u.importo)).toEqual([450, 6961.24]);
    expect(entrateDa(movimenti).map((e) => e.importo)).toEqual([2000, 28429.35]);
  });

  it("conserva categoria ed escludiDaGrafico delle uscite", () => {
    const [affitto] = usciteDa(movimenti);
    expect(affitto.categoria).toBe("Affitto");
    expect(affitto.escludiDaGrafico).toBe(true);
  });
});

describe("scrittura verso la tabella", () => {
  it("dà il segno giusto a ogni tipo", () => {
    expect(importoConSegno(100, "entrata")).toBe(100);
    expect(importoConSegno(100, "uscita")).toBe(-100);
    expect(importoConSegno(100, "prelievo")).toBe(-100);
    // Un importo già negativo non deve invertire il tipo.
    expect(importoConSegno(-100, "entrata")).toBe(100);
    expect(importoConSegno(-100, "uscita")).toBe(-100);
  });

  it("marca i prelievi come Stipendio a prescindere dalla categoria digitata", () => {
    expect(categoriaPerTipo("prelievo", undefined)).toBe(CATEGORIA_STIPENDIO);
    expect(categoriaPerTipo("prelievo", "Affitto")).toBe(CATEGORIA_STIPENDIO);
  });

  it("lascia la categoria agli altri tipi, null se assente", () => {
    expect(categoriaPerTipo("uscita", "Affitto")).toBe("Affitto");
    expect(categoriaPerTipo("entrata", undefined)).toBeNull();
    expect(categoriaPerTipo("uscita", "")).toBeNull();
  });

  it("un movimento scritto e riletto torna identico (round-trip)", () => {
    const scritto = movimento({
      id: "x",
      importo: importoConSegno(1500, "prelievo"),
      categoria: categoriaPerTipo("prelievo", "qualsiasi") ?? undefined,
    });
    const [riletto] = prelieviDa([scritto]);
    expect(riletto.importo).toBe(1500);
    expect(tipoDiMovimento(scritto)).toBe("prelievo");
  });
});
