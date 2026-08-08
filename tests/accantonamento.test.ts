import { describe, it, expect } from "vitest";
import {
  calcolaAccantonamento,
  calcolaAccontiInps,
  calcolaAccontiImposta,
  calcolaTasseTotali,
  calcolaContributi,
  calcolaImposta,
} from "../src/utils/calcoliFisco";
import {
  getAliquotaSostitutiva,
  getAliquotaInps,
  ANNO_INIZIO_ATTIVITA,
} from "../src/constants/fiscali";
import type { Fattura, Prelievo, Uscita, Entrata } from "../src/types/fattura";

/**
 * Test della logica di accantonamento: la parte più complessa dell'app e
 * l'unica che aveva prodotto bug ricorrenti (5 commit consecutivi di fix).
 *
 * Copre i "Mandatory Test Scenarios" di CLAUDE.md più le correzioni:
 * - acconto INPS all'80% (non 100%)
 * - saldo N-1 che non deve scomputare il saldo N-2
 * - aliquota sostitutiva 5% → 15% dal 6° periodo d'imposta
 */

const fattura = (data: string, importoLordo: number, id = data): Fattura => ({
  id,
  data,
  descrizione: "Fattura",
  cliente: "Cliente",
  importoLordo,
});

const uscita = (
  data: string,
  importo: number,
  categoria?: string,
  id = `${data}-${importo}`
): Uscita => ({ id, data, descrizione: "Uscita", importo, categoria });

const entrata = (
  data: string,
  importo: number,
  categoria?: string
): Entrata => ({
  id: `${data}-${importo}`,
  data,
  descrizione: "Entrata",
  importo,
  categoria,
});

const nessunPrelievo: Prelievo[] = [];

// ============================================================================

describe("aliquote per anno fiscale", () => {
  it("il regime start-up al 5% copre i primi 5 periodi d'imposta", () => {
    expect(ANNO_INIZIO_ATTIVITA).toBe(2022);
    for (const anno of [2022, 2023, 2024, 2025, 2026]) {
      expect(getAliquotaSostitutiva(anno)).toBe(0.05);
    }
  });

  it("dal 6° periodo d'imposta (2027) si passa al 15%", () => {
    expect(getAliquotaSostitutiva(2027)).toBe(0.15);
    expect(getAliquotaSostitutiva(2030)).toBe(0.15);
  });

  it("l'aliquota INPS Gestione Separata 2026 è 26,07% come nel 2025", () => {
    expect(getAliquotaInps(2025)).toBeCloseTo(0.2607, 4);
    expect(getAliquotaInps(2026)).toBeCloseTo(0.2607, 4);
  });

  it("per gli anni futuri stima usando l'ultima aliquota INPS nota", () => {
    expect(getAliquotaInps(2030)).toBeCloseTo(0.2607, 4);
  });

  it("lo stesso fatturato costa di più nel 2027 che nel 2026", () => {
    const f2026 = [fattura("2026-05-01", 50000)];
    const f2027 = [fattura("2027-05-01", 50000)];

    const tasse2026 = calcolaTasseTotali(f2026, 2026);
    const tasse2027 = calcolaTasseTotali(f2027, 2027);

    // Reddito 39.000; INPS 10.167,30; imponibile netto 28.832,70
    // 5%  → 1.441,64  → totale 11.608,94
    // 15% → 4.324,91  → totale 14.492,21
    expect(tasse2026).toBeCloseTo(11608.94, 1);
    expect(tasse2027).toBeCloseTo(14492.21, 1);
    expect(tasse2027 - tasse2026).toBeCloseTo(2883.27, 1);
  });
});

// ============================================================================

describe("calcolaAccontiInps", () => {
  it("acconto totale 80% del contributo dell'anno precedente", () => {
    const r = calcolaAccontiInps(10000);
    expect(r.totale).toBeCloseTo(8000, 2);
  });

  it("due rate uguali del 40%, non 40/60", () => {
    const r = calcolaAccontiInps(10000);
    expect(r.primo).toBeCloseTo(4000, 2);
    expect(r.secondo).toBeCloseTo(4000, 2);
    expect(r.primo).toBeCloseTo(r.secondo, 2);
  });

  it("con contributo zero non c'è acconto", () => {
    expect(calcolaAccontiInps(0).totale).toBe(0);
  });
});

describe("calcolaAccontiImposta", () => {
  it("acconto totale 100%, 40% a giugno e 60% a novembre", () => {
    const r = calcolaAccontiImposta(1000);
    expect(r.primo).toBeCloseTo(400, 2);
    expect(r.secondo).toBeCloseTo(600, 2);
    expect(r.totale).toBeCloseTo(1000, 2);
  });

  it("sotto 51,65 € non è dovuto alcun acconto", () => {
    const r = calcolaAccontiImposta(50);
    expect(r.totale).toBe(0);
    expect(r.primo).toBe(0);
    expect(r.secondo).toBe(0);
  });

  it("fra 51,65 € e 257,52 € si versa in unica rata a novembre", () => {
    const r = calcolaAccontiImposta(200);
    expect(r.primo).toBe(0);
    expect(r.secondo).toBeCloseTo(200, 2);
    expect(r.totale).toBeCloseTo(200, 2);
  });

  it("sopra 257,52 € torna la divisione in due rate", () => {
    const r = calcolaAccontiImposta(300);
    expect(r.primo).toBeCloseTo(120, 2);
    expect(r.secondo).toBeCloseTo(180, 2);
  });
});

describe("gli acconti dei due tributi NON si calcolano sul totale tasse", () => {
  it("l'acconto complessivo è inferiore al 100% delle tasse (INPS all'80%)", () => {
    const fatture = [fattura("2026-03-01", 50000)];
    const inps = calcolaContributi(fatture, 2026);
    const imposta = calcolaImposta(fatture, 2026);

    const accontoTotale =
      calcolaAccontiInps(inps).totale + calcolaAccontiImposta(imposta).totale;
    const atteso = inps * 0.8 + imposta * 1.0;

    expect(accontoTotale).toBeCloseTo(atteso, 2);
    // Il vecchio calcolo (40%+60% sul totale) sovrastimava di 20% dell'INPS
    expect(inps + imposta - accontoTotale).toBeCloseTo(inps * 0.2, 2);
  });
});

// ============================================================================

describe("calcolaAccantonamento - scenari obbligatori", () => {
  it("scenario 1: anno con fatture e tutte le tasse già pagate", () => {
    const fatture = [fattura("2025-06-01", 30000), fattura("2026-06-01", 30000)];
    const inps2025 = calcolaContributi([fatture[0]], 2025);
    const imposta2025 = calcolaImposta([fatture[0]], 2025);
    const dovutoNel2026 =
      calcolaAccontiInps(inps2025).totale +
      calcolaAccontiImposta(imposta2025).totale +
      Math.max(0, inps2025 + imposta2025); // saldo 2025 (nessun acconto versato nel 2025)

    const uscite = [uscita("2026-06-30", dovutoNel2026, "Tasse - Acconto")];

    const a = calcolaAccantonamento(fatture, nessunPrelievo, uscite, [], 2026);

    // Pagato tutto il dovuto dell'anno → restano solo le scadenze future
    expect(a.scadenzeAnnoCorrente).toBeCloseTo(0, 2);
    expect(a.totaleDaAccantonare).toBeCloseTo(a.proiezioneAnnoProssimo, 2);
  });

  it("scenario 2: anno con fatture e nessuna tassa pagata", () => {
    const fatture = [fattura("2025-06-01", 30000), fattura("2026-06-01", 30000)];
    const a = calcolaAccantonamento(fatture, nessunPrelievo, [], [], 2026);

    expect(a.accontiVersatiNellAnno).toBe(0);
    expect(a.scadenzeAnnoCorrente).toBeCloseTo(
      a.saldoAnnoPrecedente +
        a.primoAccontoAnnoCorrente +
        a.secondoAccontoAnnoCorrente,
      2
    );
    expect(a.scadenzeAnnoCorrente).toBeGreaterThan(0);
  });

  it("scenario 3: anno SENZA fatture ma con anno precedente fatturato", () => {
    const fatture = [fattura("2025-06-01", 30000)];
    const a = calcolaAccantonamento(fatture, nessunPrelievo, [], [], 2026);

    // Nessuna tassa 2026, ma le scadenze 2026 (su tasse 2025) restano dovute
    expect(a.tasseAnnoCorrente).toBe(0);
    expect(a.tasseAnnoPrecedente).toBeGreaterThan(0);
    expect(a.scadenzeAnnoCorrente).toBeGreaterThan(0);
    expect(a.totaleDaAccantonare).toBeGreaterThan(0);
    // Niente proiezione: senza fatturato non c'è saldo né acconto futuro
    expect(a.proiezioneAnnoProssimo).toBe(0);
  });

  it("scenario 4: la prima fattura su un anno vuoto non causa salti", () => {
    const base = [fattura("2025-06-01", 30000)];
    const senza = calcolaAccantonamento(base, nessunPrelievo, [], [], 2026);
    const con = calcolaAccantonamento(
      [...base, fattura("2026-01-15", 1000)],
      nessunPrelievo,
      [],
      [],
      2026
    );

    // Le scadenze 2026 dipendono solo dal 2025: non devono muoversi
    expect(con.scadenzeAnnoCorrente).toBeCloseTo(senza.scadenzeAnnoCorrente, 2);

    // Il totale può solo crescere, e di poco: una fattura da 1.000 € non può
    // spostare l'accantonamento di più di 1.000 €.
    const delta = con.totaleDaAccantonare - senza.totaleDaAccantonare;
    expect(delta).toBeGreaterThanOrEqual(0);
    expect(delta).toBeLessThan(1000);
  });

  it("scenario 5: cambiando anno i valori restano continui", () => {
    const fatture = [
      fattura("2025-06-01", 30000),
      fattura("2026-06-01", 30000),
      fattura("2027-06-01", 30000),
    ];

    for (const anno of [2026, 2027]) {
      const a = calcolaAccantonamento(fatture, nessunPrelievo, [], [], anno);
      expect(Number.isFinite(a.totaleDaAccantonare)).toBe(true);
      expect(a.totaleDaAccantonare).toBeGreaterThanOrEqual(0);
      expect(a.nettoSicuro).toBeCloseTo(
        a.cashDisponibileReale - a.totaleDaAccantonare,
        2
      );
    }
  });
});

// ============================================================================

describe("calcolaAccantonamento - saldo anno precedente", () => {
  it("il saldo N-2 pagato nel N-1 NON riduce il debito dell'anno N-1", () => {
    const fatture = [fattura("2025-06-01", 30000)];
    const tasse2025 = calcolaTasseTotali(fatture, 2025);

    // Nel 2025 sono stati pagati: 2.000 di acconti 2025 + 500 di saldo 2024
    const uscite = [
      uscita("2025-06-30", 2000, "Tasse - Acconto", "acc"),
      uscita("2025-06-30", 500, "Tasse - Saldo", "sal"),
    ];

    const a = calcolaAccantonamento(fatture, nessunPrelievo, uscite, [], 2026);

    // Solo i 2.000 di acconto scomputano il debito 2025; i 500 erano per il 2024
    expect(a.saldoAnnoPrecedente).toBeCloseTo(tasse2025 - 2000, 2);
    expect(a.saldoAnnoPrecedente).not.toBeCloseTo(tasse2025 - 2500, 2);
  });

  it("i movimenti storici categorizzati solo 'Tasse' contano come acconti", () => {
    const fatture = [fattura("2025-06-01", 30000)];
    const tasse2025 = calcolaTasseTotali(fatture, 2025);
    const uscite = [uscita("2025-06-30", 2000, "Tasse")];

    const a = calcolaAccantonamento(fatture, nessunPrelievo, uscite, [], 2026);
    expect(a.saldoAnnoPrecedente).toBeCloseTo(tasse2025 - 2000, 2);
  });

  it("il saldo non va mai sotto zero", () => {
    const fatture = [fattura("2025-06-01", 1000)];
    const uscite = [uscita("2025-06-30", 999999, "Tasse - Acconto")];

    const a = calcolaAccantonamento(fatture, nessunPrelievo, uscite, [], 2026);
    expect(a.saldoAnnoPrecedente).toBe(0);
  });
});

// ============================================================================

describe("calcolaAccantonamento - cash disponibile", () => {
  it("il saldo iniziale è incluso nel cash reale anche se datato altrove", () => {
    const entrate = [entrata("2025-12-31", 10000, "Saldo Iniziale")];
    const a = calcolaAccantonamento([], nessunPrelievo, [], entrate, 2026);

    expect(a.saldoIniziale).toBe(10000);
    expect(a.cashDisponibileReale).toBe(10000);
  });

  it("un'entrata marcata escludiDaGrafico resta nel cash reale", () => {
    // È un flag di sola presentazione: prima spariva dai totali di cassa,
    // sottostimando il Netto Prelevabile Sicuro.
    const entrate: Entrata[] = [
      { ...entrata("2026-03-01", 500, "Rimborsi"), escludiDaGrafico: true },
    ];
    const a = calcolaAccantonamento([], nessunPrelievo, [], entrate, 2026);

    expect(a.cashDisponibileReale).toBe(500);
  });

  it("prelievi e uscite riducono il cash reale", () => {
    const fatture = [fattura("2026-01-10", 10000)];
    const prelievi: Prelievo[] = [
      { id: "p", data: "2026-02-01", descrizione: "Stipendio", importo: 2000 },
    ];
    const uscite = [uscita("2026-02-05", 500, "Affitto")];

    const a = calcolaAccantonamento(fatture, prelievi, uscite, [], 2026);
    expect(a.cashDisponibileReale).toBe(7500);
  });

  it("i movimenti di altri anni non entrano nel cash dell'anno selezionato", () => {
    const fatture = [fattura("2025-01-10", 99999), fattura("2026-01-10", 1000)];
    const a = calcolaAccantonamento(fatture, nessunPrelievo, [], [], 2026);

    expect(a.cashDisponibileReale).toBe(1000);
  });
});

// ============================================================================

describe("calcolaAccantonamento - rettifiche degli incassi", () => {
  const fatture = [fattura("2026-06-01", 44464)];
  // Caso reale: 44.464 € di fatture registrate, 52.924 € realmente incassati
  // (il forfettario tassa per cassa) → rettifica di 8.460 €.
  const RETTIFICA_2026 = { 2026: 8460 };

  it("senza rettifica l'imponibile è la somma delle fatture", () => {
    const a = calcolaAccantonamento(fatture, nessunPrelievo, [], [], 2026);
    expect(a.incassiAnnoCorrente).toBe(44464);
    expect(a.rettificaAnnoCorrente).toBe(0);
  });

  it("la rettifica si somma alle fatture", () => {
    const a = calcolaAccantonamento(fatture, nessunPrelievo, [], [], 2026, RETTIFICA_2026);
    expect(a.incassiAnnoCorrente).toBe(52924);
    expect(a.incassiDaFattureAnnoCorrente).toBe(44464);
    expect(a.rettificaAnnoCorrente).toBe(8460);
  });

  it("una fattura nuova continua a incrementare il totale", () => {
    // È il motivo per cui la rettifica si SOMMA invece di sostituire: con un
    // valore fisso il totale restava congelato e le fatture nuove sparivano.
    const conNuova = calcolaAccantonamento(
      [...fatture, fattura("2026-09-01", 1000, "nuova")],
      nessunPrelievo,
      [],
      [],
      2026,
      RETTIFICA_2026
    );
    expect(conNuova.incassiAnnoCorrente).toBe(53924);
  });

  it("più fatture successive si accumulano tutte", () => {
    const a = calcolaAccantonamento(
      [
        ...fatture,
        fattura("2026-09-01", 1000, "n1"),
        fattura("2026-10-01", 2500, "n2"),
      ],
      nessunPrelievo,
      [],
      [],
      2026,
      RETTIFICA_2026
    );
    expect(a.incassiAnnoCorrente).toBe(56424);
  });

  it("con l'incassato reale le tasse salgono di ~1.960 €", () => {
    const senza = calcolaAccantonamento(fatture, nessunPrelievo, [], [], 2026);
    const con = calcolaAccantonamento(fatture, nessunPrelievo, [], [], 2026, RETTIFICA_2026);

    expect(senza.tasseAnnoCorrente).toBeCloseTo(10323.59, 1);
    expect(con.tasseAnnoCorrente).toBeCloseTo(12287.82, 1);
    expect(con.tasseAnnoCorrente - senza.tasseAnnoCorrente).toBeCloseTo(1964.23, 1);
  });

  it("la rettifica dell'anno precedente alimenta gli acconti dell'anno", () => {
    // Serve quando le fatture dell'anno prima non sono in database:
    // senza, l'app non calcolerebbe alcun acconto.
    const senza = calcolaAccantonamento([], nessunPrelievo, [], [], 2026);
    expect(senza.tasseAnnoPrecedente).toBe(0);
    expect(senza.primoAccontoAnnoCorrente).toBe(0);

    const con = calcolaAccantonamento([], nessunPrelievo, [], [], 2026, {
      2025: 50000,
    });
    expect(con.incassiAnnoPrecedente).toBe(50000);
    expect(con.tasseAnnoPrecedente).toBeGreaterThan(0);
    expect(con.primoAccontoAnnoCorrente).toBeGreaterThan(0);
    expect(con.scadenzeAnnoCorrente).toBeGreaterThan(0);
  });

  it("la rettifica NON tocca il cash disponibile", () => {
    // Il cash deriva dai movimenti realmente registrati: rettificare
    // l'imponibile non fa comparire soldi sul conto.
    const a = calcolaAccantonamento(fatture, nessunPrelievo, [], [], 2026, RETTIFICA_2026);
    expect(a.cashDisponibileReale).toBe(44464);
    expect(a.dettaglioCash.fatturato).toBe(44464);
  });

  it("una rettifica negativa riduce l'imponibile", () => {
    // Caso opposto: fatture emesse ma non ancora incassate.
    const a = calcolaAccantonamento(fatture, nessunPrelievo, [], [], 2026, {
      2026: -4464,
    });
    expect(a.incassiAnnoCorrente).toBe(40000);
  });

  it("una rettifica su un altro anno non interferisce", () => {
    const a = calcolaAccantonamento(fatture, nessunPrelievo, [], [], 2026, {
      2030: 99999,
    });
    expect(a.incassiAnnoCorrente).toBe(44464);
    expect(a.rettificaAnnoCorrente).toBe(0);
  });
});

describe("calcolaAccantonamento - coerenza interna", () => {
  const fatture = [fattura("2025-06-01", 40000), fattura("2026-06-01", 55000)];
  const uscite = [uscita("2026-06-30", 3000, "Tasse - Acconto")];
  const entrate = [entrata("2026-01-01", 5000, "Saldo Iniziale")];

  it("il totale è la somma dei due blocchi", () => {
    const a = calcolaAccantonamento(fatture, nessunPrelievo, uscite, entrate, 2026);
    expect(a.totaleDaAccantonare).toBeCloseTo(
      a.scadenzeAnnoCorrente + a.proiezioneAnnoProssimo,
      2
    );
  });

  it("la proiezione esclude il 2° acconto dell'anno prossimo", () => {
    const a = calcolaAccantonamento(fatture, nessunPrelievo, uscite, entrate, 2026);
    expect(a.proiezioneAnnoProssimo).toBeCloseTo(
      a.saldoAnnoCorrente + a.primoAccontoAnnoProssimo,
      2
    );
    expect(a.secondoAccontoAnnoProssimo).toBeGreaterThan(0);
  });

  it("le rate di acconto sommano ai totali per tributo", () => {
    const a = calcolaAccantonamento(fatture, nessunPrelievo, uscite, entrate, 2026);
    expect(a.primoAccontoAnnoCorrente).toBeCloseTo(
      a.accontiInpsAnnoCorrente.primo + a.accontiImpostaAnnoCorrente.primo,
      2
    );
    expect(a.secondoAccontoAnnoCorrente).toBeCloseTo(
      a.accontiInpsAnnoCorrente.secondo + a.accontiImpostaAnnoCorrente.secondo,
      2
    );
  });

  it("le tasse dell'anno sono la somma di INPS e imposta", () => {
    const a = calcolaAccantonamento(fatture, nessunPrelievo, uscite, entrate, 2026);
    expect(a.tasseAnnoCorrente).toBeCloseTo(
      a.contributiAnnoCorrente + a.impostaAnnoCorrente,
      2
    );
    expect(a.tasseAnnoPrecedente).toBeCloseTo(
      a.contributiAnnoPrecedente + a.impostaAnnoPrecedente,
      2
    );
  });

  it("senza alcun dato tutti i valori sono zero, non NaN", () => {
    const a = calcolaAccantonamento([], [], [], [], 2026);
    expect(a.totaleDaAccantonare).toBe(0);
    expect(a.nettoSicuro).toBe(0);
    expect(a.cashDisponibileReale).toBe(0);
    expect(Number.isNaN(a.totaleDaAccantonare)).toBe(false);
  });
});
