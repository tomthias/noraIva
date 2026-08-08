import { describe, it, expect } from "vitest";
import { calcolaEspressione } from "../src/utils/calcolaEspressione";

/**
 * Il campo importo accetta espressioni aritmetiche, non solo numeri:
 * serve a registrare come movimento unico la somma di più voci reali
 * (es. "acquisto auto + assicurazione" scritto come 1000+500).
 */

describe("calcolaEspressione - numeri semplici", () => {
  it("legge un intero", () => {
    expect(calcolaEspressione("1500").valore).toBe(1500);
  });

  it("legge un decimale col punto", () => {
    expect(calcolaEspressione("1500.50").valore).toBe(1500.5);
  });

  it("legge un decimale con la virgola italiana", () => {
    expect(calcolaEspressione("1500,50").valore).toBe(1500.5);
  });

  it("legge migliaia col punto e decimali con la virgola", () => {
    expect(calcolaEspressione("1.234,56").valore).toBe(1234.56);
  });

  it("ignora gli spazi", () => {
    expect(calcolaEspressione("  1500  ").valore).toBe(1500);
  });

  it("non segnala un numero secco come calcolo", () => {
    expect(calcolaEspressione("1500").eCalcolo).toBe(false);
  });
});

describe("calcolaEspressione - operazioni", () => {
  it("somma: il caso d'uso auto + assicurazione", () => {
    const r = calcolaEspressione("1000+500");
    expect(r.valore).toBe(1500);
    expect(r.eCalcolo).toBe(true);
  });

  it("sottrae", () => {
    expect(calcolaEspressione("1000-250").valore).toBe(750);
  });

  it("moltiplica", () => {
    expect(calcolaEspressione("3*250").valore).toBe(750);
  });

  it("divide", () => {
    expect(calcolaEspressione("1000/4").valore).toBe(250);
  });

  it("concatena più operazioni", () => {
    expect(calcolaEspressione("1000 + 500 - 200").valore).toBe(1300);
  });

  it("rispetta la precedenza: moltiplicazione prima della somma", () => {
    expect(calcolaEspressione("100+2*50").valore).toBe(200);
  });

  it("rispetta le parentesi", () => {
    expect(calcolaEspressione("(100+2)*50").valore).toBe(5100);
  });

  it("gestisce gli operandi con la virgola decimale", () => {
    expect(calcolaEspressione("1000,50+499,50").valore).toBe(1500);
  });

  it("accetta il segno meno iniziale senza considerarlo un calcolo", () => {
    const r = calcolaEspressione("-500");
    expect(r.valore).toBe(-500);
    expect(r.eCalcolo).toBe(false);
  });

  it("arrotonda ai centesimi, senza code binarie", () => {
    // 0.1 + 0.2 === 0.30000000000000004 in floating point
    expect(calcolaEspressione("0,1+0,2").valore).toBe(0.3);
  });
});

describe("calcolaEspressione - input non validi", () => {
  it("stringa vuota: nessun valore ma nemmeno errore (stato iniziale del campo)", () => {
    const r = calcolaEspressione("");
    expect(r.valore).toBeNull();
    expect(r.errore).toBeUndefined();
  });

  it("solo spazi: come stringa vuota", () => {
    expect(calcolaEspressione("   ").valore).toBeNull();
  });

  it("espressione troncata", () => {
    const r = calcolaEspressione("2+");
    expect(r.valore).toBeNull();
    expect(r.errore).toBeTruthy();
  });

  it("testo non numerico", () => {
    const r = calcolaEspressione("abc");
    expect(r.valore).toBeNull();
    expect(r.errore).toBeTruthy();
  });

  it("parentesi non chiusa", () => {
    const r = calcolaEspressione("(100+2");
    expect(r.valore).toBeNull();
    expect(r.errore).toBeTruthy();
  });

  it("divisione per zero", () => {
    const r = calcolaEspressione("100/0");
    expect(r.valore).toBeNull();
    expect(r.errore).toBe("Divisione per zero");
  });

  it("caratteri sospesi in coda", () => {
    const r = calcolaEspressione("100 200");
    expect(r.valore).toBeNull();
    expect(r.errore).toBeTruthy();
  });

  it("non esegue codice: un input malevolo è solo un errore", () => {
    const r = calcolaEspressione("alert(1)");
    expect(r.valore).toBeNull();
    expect(r.errore).toBeTruthy();
  });
});
