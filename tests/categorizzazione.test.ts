/**
 * La categoria proposta all'import non è un dettaglio estetico: tasse,
 * stipendi, investimenti e lavoro escono dal costo di vita, e un incasso va
 * collegato alla fattura giusta. Questi test fissano l'ordine di precedenza
 * delle regole e l'abbinamento bonifico ↔ fattura.
 */

import { describe, it, expect } from "vitest";
import {
  CATEGORIA_ENTRATE,
  CATEGORIA_SPESE,
  abbinaFatture,
  numeriFatturaInCausale,
  patternSuggerito,
  proponiCategoria,
} from "../src/utils/categorizzazione";
import {
  CATEGORIA_INCASSO_FATTURA,
  CATEGORIA_INTERESSI,
  CATEGORIA_INVESTIMENTI,
  CATEGORIA_LAVORO,
  CATEGORIA_STIPENDIO,
  CATEGORIA_TASSE,
} from "../src/constants/fiscali";
import type { Fattura } from "../src/types/fattura";
import type { RigaEstratto } from "../src/utils/importBBVA";

const riga = (p: Partial<RigaEstratto>): RigaEstratto => ({
  dataValuta: "2026-08-08",
  descrizione: "",
  importo: -100,
  riga: 6,
  ...p,
});

describe("regole predefinite", () => {
  it("riconosce l'accredito degli interessi BBVA", () => {
    const p = proponiCategoria(riga({
      parolaChiave: "Liquidazione interessi",
      descrizione: "Interessi trimestre",
      importo: 28.87,
    }));
    expect(p.categoria).toBe(CATEGORIA_INTERESSI);
    expect(p.daConfermare).toBe(false);
  });

  it("riconosce il bonifico per l'F24, senza saldo o acconto nel nome", () => {
    const p = proponiCategoria(riga({
      parolaChiave: "Bonifico eseguito",
      osservazioni: "Tasse luglio",
      importo: -6961.24,
      dataValuta: "2026-07-14",
    }));
    // Saldo o acconto lo dice lo scadenzario, non la categoria.
    expect(p.categoria).toBe(CATEGORIA_TASSE);
  });

  it("il bollo sul conto non è un F24", () => {
    const p = proponiCategoria(riga({
      parolaChiave: "Pagamento imposte",
      osservazioni: "Imposta di bollo conto 01-07/30-09",
      importo: -8.55,
    }));
    expect(p.categoria).not.toBe(CATEGORIA_TASSE);
  });

  it("riconosce investimenti e costi di lavoro", () => {
    expect(proponiCategoria(riga({ osservazioni: "Verso.agg. mand.n .11322964", importo: -8000 })).categoria)
      .toBe(CATEGORIA_INVESTIMENTI);
    expect(proponiCategoria(riga({ osservazioni: "Moneyfarm", importo: -400 })).categoria)
      .toBe(CATEGORIA_INVESTIMENTI);
    expect(proponiCategoria(riga({ parolaChiave: "Fiscozen* fiscozen", importo: -499 })).categoria)
      .toBe(CATEGORIA_LAVORO);
  });

  it("un bonifico con causale solo 'Mattia marinangeli' è uno stipendio", () => {
    expect(proponiCategoria(riga({
      parolaChiave: "Bonifico eseguito",
      osservazioni: "Mattia marinangeli",
      importo: -1000,
    })).categoria).toBe(CATEGORIA_STIPENDIO);
  });

  it("riconosce lo stipendio solo in uscita", () => {
    expect(proponiCategoria(riga({
      parolaChiave: "Bonifico eseguito",
      descrizione: "Stipendio agosto",
      importo: -1500,
    })).categoria).toBe(CATEGORIA_STIPENDIO);

    // Un bonifico IN ENTRATA che nomina lo stipendio non è un tuo prelievo.
    expect(proponiCategoria(riga({
      parolaChiave: "Bonifico ricevuto",
      descrizione: "Rimborso stipendio",
      importo: 300,
    })).categoria).not.toBe(CATEGORIA_STIPENDIO);
  });

  it("riconosce l'incasso di una fattura e chiede conferma", () => {
    const p = proponiCategoria(riga({
      parolaChiave: "Bonifico ricevuto",
      descrizione: "ACME SRL",
      osservazioni: "Saldo fattura 12/2026",
      importo: 2440,
    }));
    expect(p.categoria).toBe(CATEGORIA_INCASSO_FATTURA);
    expect(p.daConfermare).toBe(true);
  });

  it("ripiega sul segno quando non aggancia niente", () => {
    expect(proponiCategoria(riga({ descrizione: "Pagamento con carta", importo: -12 })).categoria)
      .toBe(CATEGORIA_SPESE);
    expect(proponiCategoria(riga({ descrizione: "Accredito vario", importo: 12 })).categoria)
      .toBe(CATEGORIA_ENTRATE);
  });
});

describe("regole dell'utente", () => {
  const regole = [{ pattern: "enel", categoria: "Bollette" }];

  it("vincono sulle regole predefinite", () => {
    const p = proponiCategoria(
      riga({ parolaChiave: "Pagamento imposte", descrizione: "Enel energia", importo: -80 }),
      regole
    );
    expect(p.categoria).toBe("Bollette");
    expect(p.motivo).toContain("regola tua");
  });

  it("a parità di match vince la più specifica, non la prima scritta", () => {
    const p = proponiCategoria(
      riga({ descrizione: "Bonifico stipendio agosto", importo: -1500 }),
      [
        { pattern: "bonifico", categoria: "Generico" },
        { pattern: "bonifico stipendio", categoria: "Stipendi" },
      ]
    );
    expect(p.categoria).toBe("Stipendi");
  });

  it("un pattern vuoto non aggancia tutto", () => {
    const p = proponiCategoria(riga({ descrizione: "Spesa", importo: -20 }), [
      { pattern: "  ", categoria: "Sbagliata" },
    ]);
    expect(p.categoria).toBe(CATEGORIA_SPESE);
  });
});

describe("numeriFatturaInCausale", () => {
  it.each([
    ["Saldo fat n 23/2025 del 24/11/25", ["23/2025"]],
    ["Ft.l20/2025", ["20/2025"]],
    ["Pagamento fattura del 13/2025 del 29/08/2025", ["13/2025"]],
    ["Pagamento fattura n. 14-2025 del 01 /09/2025", ["14/2025"]],
    ["Saldo fatture n 19 del 20/10/25 n 21 del 29/10/25", ["19/2025", "21/2025"]],
    ["Sdo ft 4 2025 d 190425", ["4/2025"]],
    ["Ft 0020 del 24.07.26,", ["20/2026"]],
    ["Saldo fattura n. 18 del 30/06/2026", ["18/2026"]],
    ["Saldo fatture 21 2026 e 17 2026 per progetto la7", ["21/2026", "17/2026"]],
    ["Parcella 14/2026", ["14/2026"]],
  ])("%s → %j", (causale, attesi) => {
    expect(numeriFatturaInCausale(causale, "2026-03-01")).toEqual(attesi);
  });

  it("senza riferimenti a una fattura non trova niente", () => {
    expect(numeriFatturaInCausale("Rimborso acquisto north face 12/2025", "2025-12-11")).toEqual([]);
  });
});

describe("abbinaFatture", () => {
  const f = (numero: string, importoLordo: number, dataEmissione: string): Fattura => ({
    id: numero,
    numero,
    dataEmissione,
    data: null,
    descrizione: "",
    cliente: "",
    importoLordo,
  });
  const aperte = [
    f("19/2025", 4485, "2025-10-20"),
    f("21/2025", 400, "2025-10-29"),
    f("20/2025", 676, "2025-10-29"),
    f("27/2025", 540.8, "2025-12-17"),
  ];

  it("abbina per numero quando l'importo torna", () => {
    const r = abbinaFatture({ testo: "Ft.l20/2025", importo: 676, dataValuta: "2025-11-13" }, aperte);
    expect(r.map((x) => x.numero)).toEqual(["20/2025"]);
  });

  it("un bonifico può saldare più fatture", () => {
    const r = abbinaFatture(
      { testo: "Saldo fatture n 19 del 20/10/25 n 21 del 29/10/25", importo: 4885, dataValuta: "2025-12-01" },
      aperte
    );
    expect(r.map((x) => x.numero)).toEqual(["19/2025", "21/2025"]);
  });

  it("se il numero citato è sbagliato decide l'importo", () => {
    // Il cliente ha scritto di nuovo "20/2025" ma sta pagando la 27/2025.
    const r = abbinaFatture({ testo: "Ft.l20/2025", importo: 540.8, dataValuta: "2025-12-24" }, aperte);
    expect(r.map((x) => x.numero)).toEqual(["27/2025"]);
  });

  it("fra più fatture con lo stesso importo salda la più vecchia", () => {
    const lezioni = [f("A", 50, "2025-10-16"), f("B", 50, "2025-10-02"), f("C", 50, "2025-11-13")];
    const r = abbinaFatture({ testo: "Mentoring design", importo: 50, dataValuta: "2025-10-22" }, lezioni);
    expect(r.map((x) => x.numero)).toEqual(["B"]);
  });

  it("non abbina se l'importo non torna con nessuna fattura", () => {
    expect(abbinaFatture({ testo: "Ft 19/2025", importo: 4000, dataValuta: "2025-12-01" }, aperte)).toEqual([]);
  });
});

describe("patternSuggerito", () => {
  it("preferisce la parola chiave della banca, che è stabile", () => {
    expect(patternSuggerito(riga({ parolaChiave: "Bonifico ricevuto", descrizione: "ACME SRL" })))
      .toBe("bonifico ricevuto");
  });

  it("ripulisce numeri e IBAN dalla descrizione", () => {
    expect(patternSuggerito(riga({ descrizione: "PAGAMENTO POS 4520 MILANO" })))
      .toBe("pagamento pos milano");
  });

  it("non produce pattern chilometrici", () => {
    const p = patternSuggerito(riga({ descrizione: "uno due tre quattro cinque sei" }));
    expect(p.split(" ")).toHaveLength(4);
  });
});
