/**
 * Motore fiscale e di cassa: UNICA fonte dei numeri dell'app.
 *
 * Tre ingressi, tutti visibili e correggibili dall'utente:
 *   - i movimenti del conto (coincidono con l'estratto BBVA)
 *   - le fatture, con la data di INCASSO
 *   - lo scadenzario F24, una riga per tributo/tipo/anno
 *
 * Nessuna deduzione nascosta: le tasse pagate sono le righe dello scadenzario
 * segnate come pagate, non movimenti riconosciuti dal nome della categoria.
 *
 * Il modello ricalcola gli F24 reali del 2024 e del 2025 a meno di pochi
 * centesimi (tests/fisco.test.ts).
 */

import {
  COEFFICIENTE_REDDITIVITA,
  getAliquotaInps,
  getAliquotaSostitutiva,
  ACCONTO_INPS_1,
  ACCONTO_INPS_2,
  ACCONTO_IMPOSTA_1,
  ACCONTO_IMPOSTA_2,
  SOGLIA_ACCONTO_MINIMA,
  SOGLIA_ACCONTO_RATA_UNICA,
  BOLLO_FATTURA,
  SOGLIA_BOLLO_FATTURA,
  eIncassoFattura,
  eInvestimento,
  eLavoro,
  eSaldoIniziale,
  eTassa,
} from "../constants/fiscali";
import type {
  AperturaConto,
  Fattura,
  Movimento,
  ScadenzaFiscale,
  StrumentoPatrimonio,
  Tributo,
  ValorePatrimonio,
} from "../types/fattura";

const somma = (valori: number[]) => valori.reduce((s, v) => s + v, 0);
const anno = (iso: string) => Number(iso.slice(0, 4));

// ============================================================================
// TASSE DI UN ANNO
// ============================================================================

export interface Tasse {
  inps: number;
  imposta: number;
}

/**
 * Tasse dovute per un anno d'imposta.
 *
 *     reddito  = incassi × 78%
 *     INPS     = reddito × aliquota INPS dell'anno
 *     imposta  = aliquota sostitutiva × max(0, reddito − INPS VERSATO nell'anno)
 *
 * L'imposta deduce i contributi *versati* nell'anno (principio di cassa: saldo
 * dell'anno prima + acconti dell'anno), non quelli calcolati sullo stesso
 * reddito. Con redditi stabili la differenza è piccola, ma i numeri degli F24
 * tornano solo così.
 */
export function tasse(incassi: number, inpsVersatoNellAnno: number, annoImposta: number): Tasse {
  const reddito = incassi * COEFFICIENTE_REDDITIVITA;
  return {
    inps: reddito * getAliquotaInps(annoImposta),
    imposta:
      getAliquotaSostitutiva(annoImposta) * Math.max(0, reddito - inpsVersatoNellAnno),
  };
}

/** Compensi incassati nell'anno: le fatture con data di incasso in quell'anno. */
export function incassiAnno(fatture: Fattura[], annoImposta: number): number {
  const prefisso = String(annoImposta);
  return somma(
    fatture.filter((f) => f.data?.startsWith(prefisso)).map((f) => f.importoLordo)
  );
}

/**
 * Quanto costa in tasse un euro incassato in quell'anno, al margine:
 * INPS sul 78% più l'imposta sul 78%. I contributi versati nell'anno non
 * dipendono dall'incasso di oggi, quindi non riducono questa quota.
 */
export function quotaTasseMarginale(annoImposta: number): number {
  return (
    COEFFICIENTE_REDDITIVITA *
    (getAliquotaInps(annoImposta) + getAliquotaSostitutiva(annoImposta))
  );
}

// ============================================================================
// SCADENZARIO
// ============================================================================

const dataGiugno = (a: number) => `${a}-06-30`;
const dataNovembre = (a: number) => `${a}-11-30`;

/**
 * Righe di acconto per `annoAcconto`, calcolate sulle tasse dell'anno prima
 * (metodo storico).
 *
 * - INPS: 40% + 40%.
 * - Imposta: 50% + 50%; sotto 51,65 € niente; sotto 257,52 € tutto a novembre.
 */
export function righeAcconto(tassePrecedenti: Tasse, annoAcconto: number): ScadenzaFiscale[] {
  const riga = (
    tributo: Tributo,
    tipo: "acconto1" | "acconto2",
    importo: number
  ): ScadenzaFiscale => ({
    annoImposta: annoAcconto,
    tributo,
    tipo,
    dataScadenza: tipo === "acconto1" ? dataGiugno(annoAcconto) : dataNovembre(annoAcconto),
    importo,
    calcolata: true,
  });

  const righe = [
    riga("inps", "acconto1", tassePrecedenti.inps * ACCONTO_INPS_1),
    riga("inps", "acconto2", tassePrecedenti.inps * ACCONTO_INPS_2),
  ];

  const imposta = tassePrecedenti.imposta;
  if (imposta >= SOGLIA_ACCONTO_RATA_UNICA) {
    righe.push(riga("imposta", "acconto1", imposta * ACCONTO_IMPOSTA_1));
    righe.push(riga("imposta", "acconto2", imposta * ACCONTO_IMPOSTA_2));
  } else if (imposta >= SOGLIA_ACCONTO_MINIMA) {
    righe.push(riga("imposta", "acconto2", imposta));
  }

  return righe.filter((r) => r.importo > 0);
}

/** Somma delle righe INPS con scadenza nell'anno: la base della deduzione. */
export function inpsVersatoNellAnno(righe: ScadenzaFiscale[], annoSolare: number): number {
  const prefisso = String(annoSolare);
  return somma(
    righe
      .filter((r) => r.tributo === "inps" && r.dataScadenza.startsWith(prefisso))
      .map((r) => r.importo)
  );
}

/** Tasse di un anno d'imposta lette dalle righe (reali o calcolate). */
export function tasseDaRighe(righe: ScadenzaFiscale[], annoImposta: number): Tasse {
  const di = (tributo: Tributo) =>
    somma(
      righe
        .filter((r) => r.annoImposta === annoImposta && r.tributo === tributo)
        .map((r) => r.importo)
    );
  return { inps: di("inps"), imposta: di("imposta") };
}

/**
 * Bollo sulle fatture emesse nell'anno: 2 € per fattura sopra 77,47 €.
 * Trimestri I–III entro il 30/11, IV entro il 28/02 dell'anno dopo.
 */
function righeBollo(fatture: Fattura[], annoImposta: number): ScadenzaFiscale[] {
  const emesse = fatture.filter((f) => {
    const emissione = f.dataEmissione ?? f.data;
    return emissione?.startsWith(String(annoImposta)) && f.importoLordo > SOGLIA_BOLLO_FATTURA;
  });
  const mese = (f: Fattura) => Number((f.dataEmissione ?? f.data)!.slice(5, 7));
  const primiTre = emesse.filter((f) => mese(f) <= 9).length;
  const quarto = emesse.length - primiTre;

  const righe: ScadenzaFiscale[] = [];
  if (primiTre > 0)
    righe.push({
      annoImposta,
      tributo: "bollo",
      tipo: "bollo",
      dataScadenza: dataNovembre(annoImposta),
      importo: primiTre * BOLLO_FATTURA,
      calcolata: true,
      note: `Trimestri I–III: ${primiTre} fatture`,
    });
  if (quarto > 0)
    righe.push({
      annoImposta,
      tributo: "bollo",
      tipo: "bollo",
      dataScadenza: `${annoImposta + 1}-02-28`,
      importo: quarto * BOLLO_FATTURA,
      calcolata: true,
      note: `Trimestre IV: ${quarto} fatture`,
    });
  return righe;
}

/**
 * Lo scadenzario completo: le righe salvate (F24 reali) più quelle che
 * mancano, calcolate dagli incassi.
 *
 * Per l'anno scorso e l'anno in corso aggiunge, se non già salvati:
 *   - gli acconti dell'anno (sulle tasse dell'anno prima)
 *   - il saldo dell'anno (tasse − acconti; negativo = credito)
 *   - gli acconti dell'anno dopo (sulle tasse dell'anno)
 *   - il bollo sulle fatture emesse
 *
 * Una riga salvata vince SEMPRE su quella calcolata: quando Fiscozen emette
 * l'F24, l'importo reale sostituisce la stima.
 */
export function scadenzario(
  fatture: Fattura[],
  salvate: ScadenzaFiscale[],
  oggi: string
): ScadenzaFiscale[] {
  const righe = [...salvate];
  const ha = (a: number, tributo: Tributo, tipo: ScadenzaFiscale["tipo"]) =>
    righe.some((r) => r.annoImposta === a && r.tributo === tributo && r.tipo === tipo);

  // Tasse di un anno: se il saldo c'è già (reale o calcolato), le righe dicono
  // tutto; altrimenti si calcolano dagli incassi.
  const dovute = (a: number): Tasse =>
    ha(a, "inps", "saldo") && ha(a, "imposta", "saldo")
      ? tasseDaRighe(righe, a)
      : tasse(incassiAnno(fatture, a), inpsVersatoNellAnno(righe, a), a);

  const annoOggi = anno(oggi);
  for (const a of [annoOggi - 1, annoOggi]) {
    for (const r of righeAcconto(dovute(a - 1), a)) {
      if (!ha(a, r.tributo, r.tipo)) righe.push(r);
    }

    const t = dovute(a);
    for (const tributo of ["inps", "imposta"] as const) {
      if (ha(a, tributo, "saldo")) continue;
      const acconti = somma(
        righe
          .filter((r) => r.annoImposta === a && r.tributo === tributo && r.tipo !== "saldo")
          .map((r) => r.importo)
      );
      righe.push({
        annoImposta: a,
        tributo,
        tipo: "saldo",
        dataScadenza: dataGiugno(a + 1),
        importo: t[tributo] - acconti,
        calcolata: true,
      });
    }

    for (const r of righeAcconto(t, a + 1)) {
      if (!ha(a + 1, r.tributo, r.tipo)) righe.push(r);
    }

    for (const r of righeBollo(fatture, a)) {
      const stessoGruppo = righe.some(
        (s) =>
          s.tributo === "bollo" &&
          s.annoImposta === a &&
          (s.dataScadenza < `${a + 1}-01-01`) === (r.dataScadenza < `${a + 1}-01-01`)
      );
      if (!stessoGruppo) righe.push(r);
    }
  }

  return righe.sort(
    (x, y) => x.dataScadenza.localeCompare(y.dataScadenza) || x.tributo.localeCompare(y.tributo)
  );
}

// ============================================================================
// CASSA E COSTO DI VITA
// ============================================================================

/** Saldo del conto: apertura più tutti i movimenti successivi. */
export function cassa(apertura: AperturaConto, movimenti: Movimento[]): number {
  return (
    apertura.saldo +
    somma(movimenti.filter((m) => m.data > apertura.data).map((m) => m.importo))
  );
}

/**
 * Controllo con la banca: il saldo dichiarato dall'estratto sull'ultimo
 * movimento importato, contro la cassa dell'app alla stessa data. Uno
 * scostamento vuol dire un movimento mancante, doppio o con l'importo sbagliato.
 */
export function verificaBanca(
  apertura: AperturaConto,
  movimenti: Movimento[]
): { data: string; saldoBanca: number; saldoApp: number; scostamento: number } | undefined {
  const conSaldo = movimenti.filter((m) => m.saldoDopo !== undefined && m.data > apertura.data);
  if (conSaldo.length === 0) return undefined;
  const data = conSaldo.map((m) => m.data).sort().at(-1)!;
  const saldoApp = cassa(apertura, movimenti.filter((m) => m.data <= data));
  // Più movimenti nello stesso giorno non hanno un ordine: il saldo di fine
  // giornata è uno dei loro, e se uno coincide con la cassa i conti tornano.
  const delGiorno = conSaldo.filter((m) => m.data === data).map((m) => m.saldoDopo!);
  const saldoBanca =
    delGiorno.find((s) => Math.abs(s - saldoApp) < 0.005) ??
    delGiorno.sort((a, b) => Math.abs(a - saldoApp) - Math.abs(b - saldoApp))[0];
  return { data, saldoBanca, saldoApp, scostamento: saldoApp - saldoBanca };
}

/** Movimenti che NON sono vita: incassi, tasse, investimenti, lavoro, saldi. */
export function eMovimentoStrutturale(m: Movimento): boolean {
  return (
    Boolean(m.fatturaId) ||
    Boolean(m.strumentoId) ||
    eIncassoFattura(m.categoria) ||
    eTassa(m.categoria) ||
    eInvestimento(m.categoria) ||
    eLavoro(m.categoria) ||
    eSaldoIniziale(m.categoria)
  );
}

function meseMenoDodici(oggi: string): string {
  const [a, m, g] = oggi.split("-").map(Number);
  return `${a - 1}-${String(m).padStart(2, "0")}-${String(g).padStart(2, "0")}`;
}

function mesiFra(dal: string, al: string): number {
  const giorni = (Date.parse(al) - Date.parse(dal)) / 86_400_000;
  return Math.max(1, giorni / 30.4375);
}

/**
 * Quanto costa vivere al mese: media degli ultimi 12 mesi (o da quando
 * esistono movimenti) di stipendi e spese, meno rimborsi e altre entrate.
 * Esclusi tasse, investimenti, costi di lavoro e incassi delle fatture.
 */
export function costoVitaMensile(
  movimenti: Movimento[],
  oggi: string,
  apertura?: AperturaConto
): number {
  const inizio = [meseMenoDodici(oggi), apertura?.data ?? ""].sort().at(-1)!;
  const vita = movimenti.filter(
    (m) => m.data > inizio && m.data <= oggi && !eMovimentoStrutturale(m)
  );
  return -somma(vita.map((m) => m.importo)) / mesiFra(inizio, oggi);
}

// ============================================================================
// SITUAZIONE: il numero che conta
// ============================================================================

export interface InputSituazione {
  fatture: Fattura[];
  movimenti: Movimento[];
  scadenzeSalvate: ScadenzaFiscale[];
  apertura: AperturaConto;
  /** Riserva di emergenza, tolta dal prelevabile. */
  cuscinetto: number;
  /** Mesi di vita da coprire prima di mettere soldi nel fondo investimenti. */
  mesiRiserva: number;
  oggi: string;
}

export interface Situazione {
  cassa: number;
  scadenze: ScadenzaFiscale[];
  /** Righe non ancora pagate, crediti compresi. */
  aperte: ScadenzaFiscale[];
  daTenere: number;
  /** Cassa meno tasse: quello che è tuo. */
  liberoDaTasse: number;
  cuscinetto: number;
  /** Libero da tasse meno cuscinetto: quanto puoi prelevare per vivere. */
  netto: number;
  costoVita: number;
  riservaVita: number;
  /** Quello che avanza dopo la riserva di vita. Mai negativo. */
  fondoInvestimenti: number;
  incassiAnno: number;
}

export function situazione(input: InputSituazione): Situazione {
  const scadenze = scadenzario(input.fatture, input.scadenzeSalvate, input.oggi);
  const aperte = scadenze.filter((s) => !s.pagataIl);
  const daTenere = somma(aperte.map((s) => s.importo));
  const c = cassa(input.apertura, input.movimenti);
  const liberoDaTasse = c - daTenere;
  const netto = liberoDaTasse - input.cuscinetto;
  const costoVita = costoVitaMensile(input.movimenti, input.oggi, input.apertura);
  const riservaVita = input.mesiRiserva * costoVita;

  return {
    cassa: c,
    scadenze,
    aperte,
    daTenere,
    liberoDaTasse,
    cuscinetto: input.cuscinetto,
    netto,
    costoVita,
    riservaVita,
    fondoInvestimenti: Math.max(0, netto - riservaVita),
    incassiAnno: incassiAnno(input.fatture, anno(input.oggi)),
  };
}

/** Cosa cambia se oggi incassi `importo`: stessa funzione, un incasso in più. */
export function simulaIncasso(input: InputSituazione, importo: number) {
  const prima = situazione(input);
  const dopo = situazione({
    ...input,
    fatture: [
      ...input.fatture,
      { id: "simulata", data: input.oggi, descrizione: "", cliente: "", importoLordo: importo },
    ],
    movimenti: [
      ...input.movimenti,
      {
        id: "simulato",
        data: input.oggi,
        descrizione: "",
        importo,
        fonte: "manuale",
        fatturaId: "simulata",
      },
    ],
  });
  return {
    prima,
    dopo,
    daTenere: dopo.daTenere - prima.daTenere,
    netto: dopo.netto - prima.netto,
  };
}

// ============================================================================
// GUADAGNO VS SPESA
// ============================================================================

export interface MeseMargine {
  mese: string; // YYYY-MM
  incassato: number;
  /** Tasse di competenza: incassato × pressione effettiva dell'anno. */
  tasse: number;
  lavoro: number;
  vita: number;
  margine: number;
}

/**
 * Pressione fiscale effettiva di un anno: tasse dell'anno / incassi.
 * Gli acconti NON sono un costo: sono anticipi delle tasse dell'anno dopo.
 * Senza incassi (o senza righe) si usa la quota marginale.
 */
export function pressioneFiscale(
  fatture: Fattura[],
  scadenze: ScadenzaFiscale[],
  annoImposta: number
): number {
  const incassi = incassiAnno(fatture, annoImposta);
  const t = tasseDaRighe(scadenze, annoImposta);
  if (incassi <= 0 || t.inps + t.imposta <= 0) return quotaTasseMarginale(annoImposta);
  return (t.inps + t.imposta) / incassi;
}

/** Ultimi 12 mesi, dal più vecchio al più recente. */
export function margineMensile(
  fatture: Fattura[],
  movimenti: Movimento[],
  scadenze: ScadenzaFiscale[],
  oggi: string
): MeseMargine[] {
  const mesi: string[] = [];
  const [a, m] = oggi.split("-").map(Number);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(a, m - 1 - i, 1));
    mesi.push(d.toISOString().slice(0, 7));
  }

  return mesi.map((mese) => {
    const incassato = somma(
      fatture.filter((f) => f.data?.startsWith(mese)).map((f) => f.importoLordo)
    );
    const delMese = movimenti.filter((mv) => mv.data.startsWith(mese));
    const tasseMese = incassato * pressioneFiscale(fatture, scadenze, anno(mese));
    const lavoro = -somma(delMese.filter((mv) => eLavoro(mv.categoria)).map((mv) => mv.importo));
    const vita = -somma(delMese.filter((mv) => !eMovimentoStrutturale(mv)).map((mv) => mv.importo));
    return {
      mese,
      incassato,
      tasse: tasseMese,
      lavoro,
      vita,
      margine: incassato - tasseMese - lavoro - vita,
    };
  });
}

// ============================================================================
// PATRIMONIO — monitorato, mai prelevabile
// ============================================================================

export interface PosizionePatrimonio {
  strumento: StrumentoPatrimonio;
  versato: number;
  valore?: number;
  valoreAl?: string;
  rendimento?: number;
}

export function patrimonio(
  strumenti: StrumentoPatrimonio[],
  valori: ValorePatrimonio[],
  movimenti: Movimento[]
): { posizioni: PosizionePatrimonio[]; nonAssegnato: number } {
  const posizioni = strumenti.map((strumento) => {
    const versato = -somma(
      movimenti.filter((m) => m.strumentoId === strumento.id).map((m) => m.importo)
    );
    const ultimo = valori
      .filter((v) => v.strumentoId === strumento.id)
      .sort((x, y) => y.data.localeCompare(x.data))[0];
    return {
      strumento,
      versato,
      valore: ultimo?.valore,
      valoreAl: ultimo?.data,
      rendimento: ultimo ? ultimo.valore - versato : undefined,
    };
  });
  const nonAssegnato = -somma(
    movimenti.filter((m) => !m.strumentoId && eInvestimento(m.categoria)).map((m) => m.importo)
  );
  return { posizioni, nonAssegnato };
}
