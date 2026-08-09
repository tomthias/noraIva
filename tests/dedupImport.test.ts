/**
 * Il primo import vero ha duplicato movimenti che c'erano già.
 *
 * Il dedup guardava solo l'`import_hash`, che ce l'hanno soltanto le righe
 * arrivate da un import precedente. I movimenti inseriti a mano — e i 225
 * arrivati dalla migrazione — non ne hanno nessuno, quindi l'estratto di
 * agosto, che copriva mesi già registrati, è entrato una seconda volta.
 *
 * Questi test descrivono quel caso preciso e le sue eccezioni.
 */

import { describe, it, expect } from "vitest";
import { marcaDuplicati, type MovimentoEsistente } from "../src/utils/dedupImport";

const riga = (dataValuta: string, importo: number, importHash = `h-${dataValuta}-${importo}`) => ({
  dataValuta,
  importo,
  importHash,
});

const esistente = (data: string, importo: number, importHash?: string): MovimentoEsistente => ({
  data,
  importo,
  importHash,
});

describe("duplicati per hash (stesso estratto importato due volte)", () => {
  it("riconosce una riga già importata", () => {
    const esiti = marcaDuplicati(
      [riga("2026-08-08", -1000, "abc")],
      [esistente("2026-08-08", -1000, "abc")]
    );
    expect(esiti[0].duplicato).toBe("hash");
  });

  it("reimportare lo stesso file non produce nessuna riga nuova", () => {
    const righe = [riga("2026-08-08", -1000, "a"), riga("2026-07-31", 28.87, "b")];
    const gia = righe.map((r) => esistente(r.dataValuta, r.importo, r.importHash));
    expect(marcaDuplicati(righe, gia).every((e) => e.duplicato === "hash")).toBe(true);
  });
});

describe("il caso che ha rotto l'import: movimenti già inseriti a mano", () => {
  // Righe vere dell'estratto di agosto 2026, con i movimenti che erano già in
  // archivio dalla migrazione (nessun import_hash).
  const gia = [
    esistente("2026-06-11", -1000), // Stipendio maggio
    esistente("2026-08-08", -1000), // Stipendio giugno
    esistente("2026-05-21", -16.46),
    esistente("2026-07-14", -279.48),
  ];

  it("li riconosce come sospetti invece di duplicarli", () => {
    const esiti = marcaDuplicati(
      [
        riga("2026-06-11", -1000),
        riga("2026-08-08", -1000),
        riga("2026-05-21", -16.46),
        riga("2026-07-14", -279.48),
      ],
      gia
    );
    expect(esiti.map((e) => e.duplicato)).toEqual([
      "sospetto",
      "sospetto",
      "sospetto",
      "sospetto",
    ]);
  });

  it("dice QUALE movimento in archivio ha fatto scattare il sospetto", () => {
    const [esito] = marcaDuplicati([riga("2026-06-11", -1000)], gia);
    expect(esito.corrispondenza).toEqual({ data: "2026-06-11", importo: -1000 });
  });

  it("tollera qualche giorno di scarto fra data banca e data inserita a mano", () => {
    const esiti = marcaDuplicati([riga("2026-06-13", -1000)], [esistente("2026-06-11", -1000)]);
    expect(esiti[0].duplicato).toBe("sospetto");
  });

  it("oltre la tolleranza sono due movimenti diversi", () => {
    // Stesso importo ma a un mese di distanza: è l'affitto del mese dopo.
    const esiti = marcaDuplicati([riga("2026-07-11", -1000)], [esistente("2026-06-11", -1000)]);
    expect(esiti[0].duplicato).toBeNull();
  });

  it("un importo diverso non è un duplicato", () => {
    const esiti = marcaDuplicati([riga("2026-06-11", -1000)], [esistente("2026-06-11", -900)]);
    expect(esiti[0].duplicato).toBeNull();
  });
});

describe("ogni movimento in archivio copre una riga sola", () => {
  it("due addebiti identici, uno solo in archivio: un sospetto e uno nuovo", () => {
    const esiti = marcaDuplicati(
      [riga("2026-08-08", -1.5, "x"), riga("2026-08-08", -1.5, "y")],
      [esistente("2026-08-08", -1.5)]
    );
    expect(esiti.map((e) => e.duplicato)).toEqual(["sospetto", null]);
  });

  it("un movimento già importato non genera anche un sospetto su un'altra riga", () => {
    // Se il confronto per importo pescasse anche le righe con hash, la seconda
    // occorrenza verrebbe soppressa due volte.
    const esiti = marcaDuplicati(
      [riga("2026-08-08", -1000, "nuovo")],
      [esistente("2026-08-08", -1000, "vecchio-hash")]
    );
    expect(esiti[0].duplicato).toBeNull();
  });
});

describe("archivio vuoto", () => {
  it("al primissimo import entra tutto", () => {
    const esiti = marcaDuplicati([riga("2026-08-08", -1000), riga("2026-07-31", 28.87)], []);
    expect(esiti.every((e) => e.duplicato === null)).toBe(true);
  });
});
