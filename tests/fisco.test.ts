import { describe, it, expect } from "vitest";
import {
  tasse,
  righeAcconto,
  scadenzario,
  inpsVersatoNellAnno,
  tasseDaRighe,
  cassa,
  costoVitaMensile,
  situazione,
  simulaIncasso,
  quotaTasseMarginale,
  patrimonio,
  type InputSituazione,
} from "../src/utils/fisco";
import type { Fattura, Movimento, ScadenzaFiscale } from "../src/types/fattura";

// F24 reali (Fiscozen), una riga per tributo/tipo. Importi con segno:
// il saldo imposta 2024 è un credito compensato.
const F24: ScadenzaFiscale[] = (
  [
    [2023, "inps", "saldo", "2024-07-31", 6946.0],
    [2023, "imposta", "saldo", "2024-07-31", 743.0],
    [2024, "inps", "acconto1", "2024-07-31", 4202.8],
    [2024, "imposta", "acconto1", "2024-07-31", 803.5],
    [2024, "inps", "acconto2", "2024-12-02", 4202.8],
    [2024, "imposta", "acconto2", "2025-01-16", 803.5],
    [2024, "inps", "saldo", "2025-07-21", 1988.0],
    [2024, "imposta", "saldo", "2025-07-21", -381.0],
    [2025, "inps", "acconto1", "2025-07-21", 4157.54],
    [2025, "imposta", "acconto1", "2025-07-21", 613.0],
    [2025, "inps", "acconto2", "2025-12-01", 4157.54],
    [2025, "imposta", "acconto2", "2025-12-01", 613.0],
    [2025, "bollo", "bollo", "2025-12-01", 24.0],
    [2025, "bollo", "bollo", "2026-03-02", 14.0],
    [2025, "inps", "saldo", "2026-07-20", 1921.0],
    [2025, "imposta", "saldo", "2026-07-20", 222.0],
    [2026, "inps", "acconto1", "2026-07-20", 4094.24],
    [2026, "imposta", "acconto1", "2026-07-20", 724.0],
    [2026, "inps", "acconto2", "2026-11-30", 4094.24],
    [2026, "imposta", "acconto2", "2026-11-30", 724.0],
  ] as const
).map(([annoImposta, tributo, tipo, dataScadenza, importo]) => ({
  annoImposta,
  tributo,
  tipo,
  dataScadenza,
  importo,
  calcolata: false,
  // Tutto pagato tranne novembre 2026
  pagataIl: dataScadenza < "2026-09-28" ? dataScadenza : undefined,
}));

const OGGI = "2026-09-28";

const fattura = (data: string | null, importoLordo: number, extra: Partial<Fattura> = {}): Fattura => ({
  id: `${data}-${importoLordo}-${Math.random()}`,
  data,
  descrizione: "",
  cliente: "",
  importoLordo,
  ...extra,
});

const movimento = (data: string, importo: number, categoria?: string, extra: Partial<Movimento> = {}): Movimento => ({
  id: `${data}-${importo}-${Math.random()}`,
  data,
  descrizione: "",
  categoria,
  importo,
  fonte: "manuale",
  ...extra,
});

describe("tasse: il modello ricalcola gli F24 reali", () => {
  it("esempio del CLAUDE.md: 10.000 € senza INPS versato", () => {
    const t = tasse(10_000, 0, 2026);
    expect(t.inps).toBeCloseTo(2033.46, 2);
    expect(t.imposta).toBeCloseTo(390, 2); // 5% × 7.800: nessun INPS versato da dedurre
  });

  it("2024: INPS e imposta dagli F24 (tolleranza 1 €)", () => {
    // Incassi impliciti nell'INPS dovuto 2024 (10.393,60 €)
    const dovute = tasseDaRighe(F24, 2024);
    expect(dovute.inps).toBeCloseTo(10_393.6, 2);
    expect(dovute.imposta).toBeCloseTo(1226, 2);

    const incassi = dovute.inps / 0.2607 / 0.78;
    const t = tasse(incassi, inpsVersatoNellAnno(F24, 2024), 2024);
    expect(inpsVersatoNellAnno(F24, 2024)).toBeCloseTo(15_351.6, 2);
    expect(Math.abs(t.imposta - 1226)).toBeLessThan(1);
  });

  it("2025: imposta 1.448 € con la deduzione dell'INPS versato nell'anno", () => {
    const dovute = tasseDaRighe(F24, 2025);
    expect(dovute.inps).toBeCloseTo(10_236.08, 2);
    expect(dovute.imposta).toBeCloseTo(1448, 2);

    const incassi = dovute.inps / 0.2607 / 0.78;
    const t = tasse(incassi, inpsVersatoNellAnno(F24, 2025), 2025);
    expect(Math.abs(t.imposta - 1448)).toBeLessThan(1);
  });

  it("acconti calcolati coincidono con gli F24: 50/50 imposta, 40/40 INPS", () => {
    for (const [base, annoAcconto] of [
      [2024, 2025],
      [2025, 2026],
    ] as const) {
      const calcolati = righeAcconto(tasseDaRighe(F24, base), annoAcconto);
      for (const reale of F24.filter((r) => r.annoImposta === annoAcconto && r.tipo !== "saldo" && r.tributo !== "bollo")) {
        const c = calcolati.find((x) => x.tributo === reale.tributo && x.tipo === reale.tipo)!;
        expect(Math.abs(c.importo - reale.importo)).toBeLessThan(1);
      }
    }
  });

  it("dal 2027 l'imposta è al 15%", () => {
    expect(tasse(10_000, 0, 2027).imposta).toBeCloseTo(1170, 2);
    expect(quotaTasseMarginale(2026)).toBeCloseTo(0.78 * 0.3107, 6);
    expect(quotaTasseMarginale(2027)).toBeCloseTo(0.78 * 0.4107, 6);
  });
});

describe("righeAcconto: soglie dell'imposta", () => {
  it("sotto 51,65 € nessun acconto imposta", () => {
    const r = righeAcconto({ inps: 1000, imposta: 50 }, 2026);
    expect(r.filter((x) => x.tributo === "imposta")).toHaveLength(0);
  });
  it("fra 51,65 e 257,52 € rata unica a novembre", () => {
    const r = righeAcconto({ inps: 0, imposta: 200 }, 2026).filter((x) => x.tributo === "imposta");
    expect(r).toHaveLength(1);
    expect(r[0].tipo).toBe("acconto2");
    expect(r[0].importo).toBe(200);
  });
  it("sopra 257,52 € due rate da 50%", () => {
    const r = righeAcconto({ inps: 0, imposta: 1000 }, 2026).filter((x) => x.tributo === "imposta");
    expect(r.map((x) => x.importo)).toEqual([500, 500]);
  });
});

// Incassi 2026 reali: 56.893,55 € (uguale a Fiscozen)
const FATTURE_2026 = [fattura("2026-06-15", 56_893.55, { dataEmissione: "2026-06-15" })];

describe("scadenzario al 28/09/2026 sui dati reali", () => {
  const righe = scadenzario(FATTURE_2026, F24, OGGI);
  const calcolata = (a: number, tributo: string, tipo: string) =>
    righe.find((r) => r.annoImposta === a && r.tributo === tributo && r.tipo === tipo && r.calcolata)!;

  it("non duplica le righe già salvate", () => {
    const acc2 = righe.filter((r) => r.annoImposta === 2026 && r.tipo === "acconto2" && r.tributo !== "bollo");
    expect(acc2).toHaveLength(2);
    expect(acc2.every((r) => !r.calcolata)).toBe(true);
  });

  it("saldo 2026: INPS 3.380,60 e imposta 265,37", () => {
    expect(calcolata(2026, "inps", "saldo").importo).toBeCloseTo(3380.6, 1);
    expect(calcolata(2026, "imposta", "saldo").importo).toBeCloseTo(265.37, 1);
    expect(calcolata(2026, "inps", "saldo").dataScadenza).toBe("2027-06-30");
  });

  it("acconti 2027: INPS 4.627,63 × 2 e imposta 856,69 × 2", () => {
    expect(calcolata(2027, "inps", "acconto1").importo).toBeCloseTo(4627.63, 1);
    expect(calcolata(2027, "inps", "acconto2").importo).toBeCloseTo(4627.63, 1);
    expect(calcolata(2027, "imposta", "acconto1").importo).toBeCloseTo(856.69, 1);
    expect(calcolata(2027, "imposta", "acconto2").importo).toBeCloseTo(856.69, 1);
  });

  it("totale 2027 dentro l'intervallo Fiscozen 14.200–15.800 €", () => {
    const pagamenti2027 = righe
      .filter((r) => r.dataScadenza.startsWith("2027"))
      .reduce((s, r) => s + r.importo, 0);
    expect(pagamenti2027).toBeGreaterThan(14_200);
    expect(pagamenti2027).toBeLessThan(15_800);
  });

  it("una riga salvata prevale sul calcolo", () => {
    const conSaldo = scadenzario(
      FATTURE_2026,
      [...F24, { annoImposta: 2026, tributo: "inps", tipo: "saldo", dataScadenza: "2027-06-30", importo: 3000, calcolata: false }],
      OGGI
    );
    const saldi = conSaldo.filter((r) => r.annoImposta === 2026 && r.tributo === "inps" && r.tipo === "saldo");
    expect(saldi).toHaveLength(1);
    expect(saldi[0].importo).toBe(3000);
  });

  it("il saldo negativo resta credito", () => {
    const pochiIncassi = scadenzario([fattura("2026-03-01", 10_000)], F24, OGGI);
    const saldo = pochiIncassi.find((r) => r.annoImposta === 2026 && r.tributo === "inps" && r.tipo === "saldo")!;
    expect(saldo.importo).toBeLessThan(0);
  });

  it("bollo: 2 € per fattura sopra 77,47 € emessa nei primi tre trimestri", () => {
    const fatture = [
      ...FATTURE_2026,
      fattura("2026-02-01", 50, { dataEmissione: "2026-01-20" }), // sotto soglia
      fattura("2026-11-05", 500, { dataEmissione: "2026-10-10" }), // IV trimestre
    ];
    const bolli = scadenzario(fatture, F24, OGGI).filter((r) => r.tributo === "bollo" && r.annoImposta === 2026);
    expect(bolli.map((b) => [b.dataScadenza, b.importo])).toEqual([
      ["2026-11-30", 2],
      ["2027-02-28", 2],
    ]);
  });
});

describe("cassa e situazione", () => {
  const apertura = { data: "2024-12-01", saldo: 22_393.75 };

  const base: InputSituazione = {
    fatture: FATTURE_2026,
    movimenti: [movimento("2026-09-26", 25_248.05 - 22_393.75, "Rettifica test")],
    scadenzeSalvate: F24,
    apertura,
    cuscinetto: 3000,
    mesiRiserva: 3,
    oggi: OGGI,
  };

  it("cassa = apertura + movimenti successivi", () => {
    expect(cassa(apertura, [movimento("2024-12-01", 999), movimento("2024-12-02", -100)])).toBeCloseTo(22_293.75, 2);
  });

  it("numeri di oggi: da tenere ≈ 19.433 € + bollo, netto dopo cuscinetto ≈ 2.813 €", () => {
    const s = situazione(base);
    // 4.818,24 (nov 2026) + 3.645,97 (saldo 2026) + 2 × 5.484,32 (acconti 2027)
    // + 2 € di bollo per l'unica fattura del test
    expect(s.cassa).toBeCloseTo(25_248.05, 2);
    expect(s.daTenere).toBeCloseTo(19_432.85 + 2, 0);
    expect(s.liberoDaTasse).toBeCloseTo(25_248.05 - 19_434.85, 0);
    expect(s.netto).toBeCloseTo(s.liberoDaTasse - 3000, 6);
  });

  it("segnare pagata una scadenza non cambia il netto", () => {
    const prima = situazione(base);
    const pagata = F24.map((r) =>
      r.dataScadenza === "2026-11-30" ? { ...r, pagataIl: OGGI, movimentoId: "f24" } : r
    );
    const dopo = situazione({
      ...base,
      scadenzeSalvate: pagata,
      movimenti: [...base.movimenti, movimento(OGGI, -4818.24, "Tasse", { id: "f24" })],
    });
    expect(dopo.netto).toBeCloseTo(prima.netto, 2);
    expect(dopo.cassa).toBeCloseTo(prima.cassa - 4818.24, 2);
  });

  it("un incasso di 1.000 € nel 2026 aggiunge circa 444 € da tenere", () => {
    const d = simulaIncasso(base, 1000);
    // INPS dovuto + 80% di acconti, imposta + 100% di acconti, più 2 € di bollo
    expect(d.daTenere).toBeCloseTo(1000 * (0.78 * 0.2607 * 1.8 + 0.78 * 0.05 * 2) + 2, 0);
    expect(d.daTenere).toBeGreaterThan(440);
    expect(d.daTenere).toBeLessThan(450);
  });

  it("costo di vita: esclude tasse, investimenti, lavoro e incassi", () => {
    const movimenti = [
      movimento("2026-01-10", -1000, "Stipendi"),
      movimento("2026-01-12", -600, "Affitto"),
      movimento("2026-01-15", 100, "Rimborso"),
      movimento("2026-02-01", -5000, "Tasse"),
      movimento("2026-02-02", -8000, "Investimenti"),
      movimento("2026-02-03", -500, "Lavoro"),
      movimento("2026-02-04", 4000, "Incasso Fattura"),
    ];
    const costo = costoVitaMensile(movimenti, "2026-12-31", { data: "2025-12-31", saldo: 0 });
    expect(costo).toBeCloseTo(1500 / 12, 0);
  });

  it("il fondo investimenti non è mai negativo", () => {
    const s = situazione({ ...base, movimenti: [...base.movimenti, movimento("2026-05-01", -30_000, "Affitto")] });
    expect(s.netto).toBeLessThan(0);
    expect(s.fondoInvestimenti).toBe(0);
  });

  it("fondo = netto − mesi × costo di vita, quando c'è margine", () => {
    const ricco = { ...base, movimenti: [...base.movimenti, movimento("2026-09-27", 50_000, "Regalo")] };
    const s = situazione(ricco);
    expect(s.fondoInvestimenti).toBeCloseTo(s.netto - 3 * s.costoVita, 2);
  });

  it("una fattura non ancora incassata non genera tasse", () => {
    const conAperta = situazione({ ...base, fatture: [...FATTURE_2026, fattura(null, 2340)] });
    expect(conAperta.daTenere).toBeCloseTo(situazione(base).daTenere, 6);
  });
});

describe("patrimonio", () => {
  it("versato dai movimenti, rendimento dall'ultimo valore", () => {
    const strumenti = [{ id: "mf", nome: "Moneyfarm", tipo: "moneyfarm" as const }];
    const valori = [
      { id: "1", strumentoId: "mf", data: "2026-01-01", valore: 1000 },
      { id: "2", strumentoId: "mf", data: "2026-09-01", valore: 13_500 },
    ];
    const movimenti = [
      movimento("2026-04-08", -8000, "Investimenti", { strumentoId: "mf" }),
      movimento("2026-06-15", -4000, "Investimenti", { strumentoId: "mf" }),
      movimento("2026-07-01", -400, "Investimenti"),
    ];
    const { posizioni, nonAssegnato } = patrimonio(strumenti, valori, movimenti);
    expect(posizioni[0].versato).toBe(12_000);
    expect(posizioni[0].valore).toBe(13_500);
    expect(posizioni[0].rendimento).toBe(1500);
    expect(nonAssegnato).toBe(400);
  });

  it("somma il versato fuori dal conto a quello dei movimenti", () => {
    const strumenti = [{ id: "mf", nome: "Moneyfarm", tipo: "moneyfarm" as const }];
    const movimenti = [movimento("2025-01-15", -400, "Investimenti", { strumentoId: "mf" })];
    const { posizioni } = patrimonio(strumenti, [], movimenti, { mf: 8720 });
    expect(posizioni[0].versato).toBe(9120);
    expect(posizioni[0].versatoEsterno).toBe(8720);
  });
});
