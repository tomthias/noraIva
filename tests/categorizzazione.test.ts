/**
 * La categoria proposta all'import non è un dettaglio estetico: "Tasse -
 * Saldo" e "Tasse - Acconto" finiscono in `sommaTassePagate()` e spostano
 * l'accantonamento. Questi test fissano l'ordine di precedenza delle regole e
 * i casi in cui la proposta va confermata a mano.
 */

import { describe, it, expect } from "vitest";
import {
  CATEGORIA_ENTRATE,
  CATEGORIA_SPESE,
  categoriaTassePerMese,
  patternSuggerito,
  proponiCategoria,
} from "../src/utils/categorizzazione";
import {
  CATEGORIA_INCASSO_FATTURA,
  CATEGORIA_INTERESSI,
  CATEGORIA_STIPENDIO,
  CATEGORIE_TASSE,
} from "../src/constants/fiscali";
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

  it("riconosce il pagamento delle imposte e chiede conferma", () => {
    const p = proponiCategoria(riga({
      parolaChiave: "Pagamento imposte",
      descrizione: "F24",
      importo: -6961.24,
      dataValuta: "2026-07-20",
    }));
    expect(p.categoria).toBe(CATEGORIE_TASSE.SALDO);
    // Saldo o acconto cambia i conti: non si decide da soli.
    expect(p.daConfermare).toBe(true);
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

describe("categoriaTassePerMese", () => {
  it("propone il saldo a giugno e luglio, l'acconto a novembre", () => {
    expect(categoriaTassePerMese("2026-06-30")).toBe(CATEGORIE_TASSE.SALDO);
    expect(categoriaTassePerMese("2026-07-20")).toBe(CATEGORIE_TASSE.SALDO);
    expect(categoriaTassePerMese("2026-11-30")).toBe(CATEGORIE_TASSE.ACCONTO);
  });

  it("negli altri mesi propone l'acconto", () => {
    expect(categoriaTassePerMese("2026-02-10")).toBe(CATEGORIE_TASSE.ACCONTO);
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
