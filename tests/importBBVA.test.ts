/**
 * Il parser dell'estratto BBVA legge un file che non controlliamo noi: la
 * banca può spostare una riga, cambiare il formato di una data, lasciare una
 * cella vuota. Questi test fissano il comportamento su un foglio costruito
 * come quello reale (intestazione alla riga 5, colonna A vuota, righe dalla
 * più recente alla più vecchia).
 */

import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import {
  calcolaImportHash,
  leggiData,
  leggiEstrattoBBVA,
  leggiNumero,
  saldoPiuRecente,
  type RigaEstratto,
} from "../src/utils/importBBVA";

const INTESTAZIONE = [
  null,
  "Data valuta",
  "Data",
  "Parola chiave",
  "Movimento",
  "Importo",
  "Valuta",
  "Disponibile",
  "Valuta",
  "Osservazioni",
];

/** Un foglio con la stessa forma dell'export reale. */
function estratto(righe: unknown[][], { titolo = true } = {}): ArrayBuffer {
  const celle: unknown[][] = [];
  if (titolo) {
    celle.push(["Informe BBVA 73 10"], [], ["Periodo: 01/07/2026 - 08/08/2026"], []);
  }
  celle.push(INTESTAZIONE, ...righe);

  const foglio = XLSX.utils.aoa_to_sheet(celle);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, foglio, "Informe BBVA 73 10");
  return XLSX.write(libro, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

const riga = (
  dataValuta: string,
  parolaChiave: string,
  movimento: string,
  importo: number,
  disponibile: number,
  osservazioni = ""
) => [null, dataValuta, dataValuta, parolaChiave, movimento, importo, "EUR", disponibile, "EUR", osservazioni];

describe("leggiData", () => {
  it("legge il formato italiano dell'export", () => {
    expect(leggiData("08/08/2026")).toBe("2026-08-08");
    expect(leggiData("1/2/2026")).toBe("2026-02-01");
  });

  it("legge i seriali Excel senza sbagliare giorno", () => {
    // 1 = 31/12/1899 e 44927 = 01/01/2023: i due riferimenti che smascherano
    // un'epoca sbagliata di un giorno.
    expect(leggiData(1)).toBe("1899-12-31");
    expect(leggiData(44927)).toBe("2023-01-01");
    expect(leggiData(45000)).toBe("2023-03-15");
  });

  it("legge le celle già date, senza scivolare di un giorno per il fuso", () => {
    expect(leggiData(new Date(Date.UTC(2026, 7, 8)))).toBe("2026-08-08");
  });

  it("restituisce undefined su una cella vuota o incomprensibile", () => {
    expect(leggiData("")).toBeUndefined();
    expect(leggiData(null)).toBeUndefined();
    expect(leggiData("saldo finale")).toBeUndefined();
  });
});

describe("leggiNumero", () => {
  it("legge il formato italiano", () => {
    expect(leggiNumero("1.234,56")).toBe(1234.56);
    expect(leggiNumero("-6.961,24")).toBe(-6961.24);
    expect(leggiNumero("28,87")).toBe(28.87);
  });

  it("non scambia le migliaia per decimali", () => {
    expect(leggiNumero("1.500")).toBe(1500);
    expect(leggiNumero("25.855,97")).toBe(25855.97);
  });

  it("tollera euro, spazi e parentesi dei negativi", () => {
    expect(leggiNumero(" € 1.000,00 ")).toBe(1000);
    expect(leggiNumero("(250,00)")).toBe(-250);
  });

  it("lascia stare i numeri veri", () => {
    expect(leggiNumero(-1000)).toBe(-1000);
    expect(leggiNumero(0)).toBe(0);
    expect(leggiNumero("")).toBeUndefined();
  });
});

describe("leggiEstrattoBBVA", () => {
  const file = estratto([
    riga("08/08/2026", "Bonifico ricevuto", "ACME SRL", 2440, 25855.97, "Saldo fattura 12/2026"),
    riga("31/07/2026", "Liquidazione interessi", "", 28.87, 23415.97, "Interessi trimestre"),
    riga("20/07/2026", "Pagamento imposte", "F24", -6961.24, 23387.1, "Tasse luglio"),
  ]);

  it("trova l'intestazione senza sapere a che riga sta", () => {
    const { righe } = leggiEstrattoBBVA(file);
    expect(righe).toHaveLength(3);
    expect(righe[0].descrizione).toBe("ACME SRL");
  });

  it("la trova anche se la banca toglie le righe di titolo", () => {
    const senzaTitolo = estratto(
      [riga("08/08/2026", "Bonifico ricevuto", "ACME SRL", 2440, 25855.97)],
      { titolo: false }
    );
    expect(leggiEstrattoBBVA(senzaTitolo).righe).toHaveLength(1);
  });

  it("usa la data VALUTA e tiene gli importi col segno", () => {
    const { righe } = leggiEstrattoBBVA(file);
    expect(righe.map((r) => r.dataValuta)).toEqual(["2026-08-08", "2026-07-31", "2026-07-20"]);
    expect(righe.map((r) => r.importo)).toEqual([2440, 28.87, -6961.24]);
  });

  it("ripiega sulle osservazioni quando la descrizione è vuota", () => {
    const { righe } = leggiEstrattoBBVA(file);
    expect(righe[1].descrizione).toBe("Interessi trimestre");
  });

  it("porta a casa la colonna Disponibile e il saldo più recente", () => {
    const { righe, saldoFinale } = leggiEstrattoBBVA(file);
    expect(righe[0].disponibile).toBe(25855.97);
    expect(saldoFinale).toEqual({ data: "2026-08-08", saldo: 25855.97 });
  });

  it("scarta le righe senza data dicendo perché, invece di farle sparire", () => {
    const conSporcizia = estratto([
      riga("08/08/2026", "Bonifico ricevuto", "ACME SRL", 2440, 25855.97),
      [null, "", "", "", "TOTALE", -100, "EUR", null, "EUR", ""],
    ]);
    const { righe, scartate } = leggiEstrattoBBVA(conSporcizia);
    expect(righe).toHaveLength(1);
    expect(scartate).toEqual([{ riga: 7, motivo: "data valuta mancante o illeggibile" }]);
  });

  it("rifiuta un file che non è un estratto BBVA", () => {
    const foglio = XLSX.utils.aoa_to_sheet([["Nome", "Cognome"], ["Mario", "Rossi"]]);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, foglio, "Rubrica");
    const altro = XLSX.write(libro, { type: "array", bookType: "xlsx" }) as ArrayBuffer;

    expect(() => leggiEstrattoBBVA(altro)).toThrow(/Data valuta/);
  });
});

describe("saldoPiuRecente", () => {
  const r = (dataValuta: string, disponibile?: number): RigaEstratto => ({
    dataValuta,
    descrizione: "x",
    importo: 1,
    disponibile,
    riga: 1,
  });

  it("prende la data più alta, non la prima riga del file", () => {
    expect(saldoPiuRecente([r("2026-07-01", 100), r("2026-08-08", 250)]))
      .toEqual({ data: "2026-08-08", saldo: 250 });
  });

  it("ignora le righe senza Disponibile", () => {
    expect(saldoPiuRecente([r("2026-08-08"), r("2026-07-01", 100)]))
      .toEqual({ data: "2026-07-01", saldo: 100 });
  });

  it("non inventa un saldo se la colonna manca del tutto", () => {
    expect(saldoPiuRecente([r("2026-08-08")])).toBeUndefined();
  });
});

describe("calcolaImportHash", () => {
  const base: RigaEstratto = {
    dataValuta: "2026-08-08",
    descrizione: "Caffè",
    importo: -1.5,
    disponibile: 100,
    riga: 6,
  };

  it("è stabile: lo stesso movimento dà sempre la stessa impronta", async () => {
    expect(await calcolaImportHash(base)).toBe(await calcolaImportHash({ ...base, riga: 99 }));
  });

  it("distingue due movimenti identici nello stesso giorno grazie al saldo", async () => {
    // Due caffè uguali: cambia solo il saldo progressivo. Senza `disponibile`
    // nell'impronta il secondo verrebbe scartato come duplicato del primo.
    const primo = await calcolaImportHash(base);
    const secondo = await calcolaImportHash({ ...base, disponibile: 98.5 });
    expect(primo).not.toBe(secondo);
  });

  it("cambia se cambia l'importo o la data", async () => {
    const originale = await calcolaImportHash(base);
    expect(await calcolaImportHash({ ...base, importo: -2 })).not.toBe(originale);
    expect(await calcolaImportHash({ ...base, dataValuta: "2026-08-09" })).not.toBe(originale);
  });
});
