/**
 * La tabella unica `movimenti` deve produrre esattamente le tre viste che il
 * resto dell'app consumava dalle tre tabelle separate. Se questa traduzione
 * sbaglia un segno, sbagliano cash disponibile e accantonamento: è il punto
 * più delicato della Fase 1.
 */

import { describe, it, expect } from "vitest";
import type { Movimento } from "../src/types/fattura";
import {
  aEntrata,
  aPrelievo,
  aUscita,
  entrateDa,
  eUscita,
  importoConSegno,
  prelieviDa,
  tipoDiMovimento,
  usciteDa,
} from "../src/utils/movimenti";
import {
  CATEGORIA_STIPENDIO,
  eIncassoFattura,
  eInteressi,
  eSaldoIniziale,
  eStipendio,
} from "../src/constants/fiscali";

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

  it("classifica come prelievo un importo negativo con categoria Stipendi", () => {
    expect(tipoDiMovimento(movimento({ importo: -1500, categoria: CATEGORIA_STIPENDIO })))
      .toBe("prelievo");
  });

  it("riconosce anche gli Stipendio al singolare, come li ha scritti la migrazione", () => {
    expect(tipoDiMovimento(movimento({ importo: -1500, categoria: "Stipendio" }))).toBe("prelievo");
  });

  it("un'entrata con categoria Stipendi resta un'entrata: conta il segno", () => {
    expect(tipoDiMovimento(movimento({ importo: 1500, categoria: CATEGORIA_STIPENDIO })))
      .toBe("entrata");
  });

  it("l'importo zero conta come entrata (convenzione unica documentata)", () => {
    expect(tipoDiMovimento(movimento({ importo: 0 }))).toBe("entrata");
    expect(eUscita(movimento({ importo: 0 }))).toBe(false);
  });
});

describe("riconoscimento delle categorie strutturali", () => {
  it("eStipendio accetta le varianti di scrittura", () => {
    for (const cat of ["Stipendio", "stipendio", "STIPENDI", "Stipendi", " Stipendio "]) {
      expect(eStipendio(cat)).toBe(true);
    }
    for (const cat of [undefined, null, "", "Affitto", "Tasse"]) {
      expect(eStipendio(cat)).toBe(false);
    }
  });

  it("eSaldoIniziale accetta anche la variante col trattino basso del DB", () => {
    expect(eSaldoIniziale("Saldo Iniziale")).toBe(true);
    expect(eSaldoIniziale("saldo iniziale")).toBe(true);
    expect(eSaldoIniziale("saldo_iniziale")).toBe(true);
    expect(eSaldoIniziale("Saldo")).toBe(false);
  });

  it("eIncassoFattura copre la vecchia categoria Fatture", () => {
    expect(eIncassoFattura("Incasso Fattura")).toBe(true);
    expect(eIncassoFattura("Fatture")).toBe(true);
    expect(eIncassoFattura("fatture")).toBe(true);
    // Il singolare non serve: `normalizzaCategoria` mappa "Fattura" → "Fatture"
    // prima che il valore arrivi al database.
    expect(eIncassoFattura("Incassi vari")).toBe(false);
  });

  it("eInteressi copre sia lo storico sia quelli dell'import", () => {
    expect(eInteressi("Interessi")).toBe(true);
    expect(eInteressi("Interessi BBVA")).toBe(true);
    expect(eInteressi("Interesse")).toBe(false);
  });
});

describe("le tre viste derivate", () => {
  const movimenti: Movimento[] = [
    movimento({ id: "e1", importo: 2000, categoria: "Rimborsi" }),
    movimento({ id: "e2", importo: 28429.35, categoria: "Saldo Iniziale" }),
    movimento({ id: "u1", importo: -450, categoria: "Affitto", escludiDaGrafico: true }),
    movimento({ id: "u2", importo: -6961.24, categoria: "Tasse - Acconto" }),
    movimento({ id: "p1", importo: -1500, categoria: CATEGORIA_STIPENDIO }),
  ];

  it("separa i movimenti senza perderne né duplicarne", () => {
    expect(prelieviDa(movimenti).map((p) => p.id)).toEqual(["p1"]);
    expect(usciteDa(movimenti).map((u) => u.id)).toEqual(["u1", "u2"]);
    expect(entrateDa(movimenti).map((e) => e.id)).toEqual(["e1", "e2"]);

    const totale =
      prelieviDa(movimenti).length + usciteDa(movimenti).length + entrateDa(movimenti).length;
    expect(totale).toBe(movimenti.length);
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

  it("riproduce l'aritmetica del cash: entrate − uscite − prelievi", () => {
    const somma = (n: number[]) => n.reduce((a, b) => a + b, 0);
    const cashDalleViste =
      somma(entrateDa(movimenti).map((e) => e.importo)) -
      somma(usciteDa(movimenti).map((u) => u.importo)) -
      somma(prelieviDa(movimenti).map((p) => p.importo));
    const cashDaiMovimenti = somma(movimenti.map((m) => m.importo));

    expect(cashDalleViste).toBeCloseTo(cashDaiMovimenti, 2);
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

  it("un movimento scritto e riletto torna identico (round-trip)", () => {
    const scritto = movimento({
      importo: importoConSegno(1500, "prelievo"),
      categoria: CATEGORIA_STIPENDIO,
    });
    expect(tipoDiMovimento(scritto)).toBe("prelievo");
    expect(aPrelievo(scritto).importo).toBe(1500);
  });

  it("le conversioni singole non perdono campi", () => {
    const m = movimento({ importo: -80, categoria: "Spesa", note: "nota", escludiDaGrafico: true });
    expect(aUscita(m)).toMatchObject({ importo: 80, categoria: "Spesa", note: "nota", escludiDaGrafico: true });
    expect(aEntrata(movimento({ importo: 80, categoria: "Bonus" })))
      .toMatchObject({ importo: 80, categoria: "Bonus" });
  });
});
