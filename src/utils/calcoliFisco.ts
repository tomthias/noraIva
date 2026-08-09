/**
 * Funzioni di calcolo fiscale per il Regime Forfettario 2025
 *
 * REGOLE DI CALCOLO:
 * 1. Reddito Imponibile Lordo = Fatturato Totale × Coefficiente Redditività (78%)
 * 2. Contributi INPS = Reddito Imponibile Lordo × Aliquota Gestione Separata (26,07%)
 * 3. Reddito Imponibile Netto = Reddito Imponibile Lordo - Contributi INPS
 * 4. Imposta Sostitutiva = Reddito Imponibile Netto × Aliquota Imposta (5%)
 * 5. Totale Tasse = Contributi INPS + Imposta Sostitutiva
 * 6. Netto Fatture = Fatturato Totale - Totale Tasse
 * 7. Netto Disponibile = Netto Fatture - Prelievi - Uscite
 *
 * Per singola fattura:
 * - tasseContributi = (importoLordo × 78% × 26.07%) + (importoLordo × 78% × (1 - 26.07%) × 5%)
 * - netto = importoLordo - tasseContributi
 */

import {
  ANNO_CORRENTE,
  COEFFICIENTE_REDDITIVITA,
  getAliquotaInps,
  getAliquotaSostitutiva,
  ACCONTO_INPS_1,
  ACCONTO_INPS_2,
  ACCONTO_IMPOSTA_1,
  ACCONTO_IMPOSTA_2,
  SOGLIA_ACCONTO_MINIMA,
  SOGLIA_ACCONTO_RATA_UNICA,
  eIncassoFattura,
  eSaldoIniziale,
} from "../constants/fiscali";
import type {
  Fattura,
  Movimento,
  Prelievo,
  Uscita,
  Entrata,
  RiepilogoFattura,
  RiepilogoAnnuale,
  SituazioneCashFlow,
} from "../types/fattura";

/**
 * Calcola il totale fatturato (somma di tutti gli importi lordi)
 */
export function calcolaTotaleFatture(fatture: Fattura[]): number {
  return fatture.reduce((sum, f) => sum + f.importoLordo, 0);
}

/**
 * Calcola il reddito imponibile lordo
 * Formula: Fatturato Totale × Coefficiente Redditività (78%)
 */
export function calcolaRedditoImponibileLordo(fatture: Fattura[]): number {
  const fatturatoTotale = calcolaTotaleFatture(fatture);
  return fatturatoTotale * COEFFICIENTE_REDDITIVITA;
}

/**
 * Calcola i contributi INPS Gestione Separata
 * Formula: Reddito Imponibile Lordo × Aliquota GS dell'anno
 *
 * `anno` determina l'aliquota applicata: le aliquote INPS cambiano ogni anno.
 * Passare sempre l'anno delle fatture; il default all'anno corrente serve solo
 * ai chiamanti che lavorano su un singolo anno implicito.
 */
export function calcolaContributi(
  fatture: Fattura[],
  anno: number = ANNO_CORRENTE
): number {
  return calcolaContributiDaImporto(calcolaTotaleFatture(fatture), anno);
}

/**
 * Come `calcolaContributi` ma partendo da un importo incassato già noto,
 * senza passare dalle singole fatture. Serve quando l'imponibile arriva da un
 * override manuale invece che dalla somma delle fatture registrate.
 */
export function calcolaContributiDaImporto(
  incassato: number,
  anno: number = ANNO_CORRENTE
): number {
  return incassato * COEFFICIENTE_REDDITIVITA * getAliquotaInps(anno);
}

/** Imposta sostitutiva a partire da un importo incassato già noto. */
export function calcolaImpostaDaImporto(
  incassato: number,
  anno: number = ANNO_CORRENTE
): number {
  const redditoLordo = incassato * COEFFICIENTE_REDDITIVITA;
  const redditoNetto = redditoLordo - redditoLordo * getAliquotaInps(anno);
  return redditoNetto * getAliquotaSostitutiva(anno);
}

/**
 * Calcola il reddito imponibile netto (base per l'imposta sostitutiva)
 * Formula: Reddito Imponibile Lordo - Contributi INPS
 */
export function calcolaRedditoImponibileNetto(
  fatture: Fattura[],
  anno: number = ANNO_CORRENTE
): number {
  const redditoImponibileLordo = calcolaRedditoImponibileLordo(fatture);
  const contributi = calcolaContributi(fatture, anno);
  return redditoImponibileLordo - contributi;
}

/**
 * Calcola l'imposta sostitutiva
 * Formula: Reddito Imponibile Netto × Aliquota Imposta dell'anno
 *
 * ATTENZIONE: l'aliquota NON è fissa al 5%. Il 5% vale solo per i primi 5
 * periodi d'imposta (2022-2026 per questa P.IVA); dal 2027 diventa 15%.
 */
export function calcolaImposta(
  fatture: Fattura[],
  anno: number = ANNO_CORRENTE
): number {
  const redditoImponibileNetto = calcolaRedditoImponibileNetto(fatture, anno);
  return redditoImponibileNetto * getAliquotaSostitutiva(anno);
}

/**
 * Calcola il totale tasse e contributi
 * Formula: Contributi INPS + Imposta Sostitutiva
 */
export function calcolaTasseTotali(
  fatture: Fattura[],
  anno: number = ANNO_CORRENTE
): number {
  return calcolaContributi(fatture, anno) + calcolaImposta(fatture, anno);
}

/**
 * Calcola il netto disponibile da una singola fattura dopo aver accantonato le tasse
 *
 * Formula:
 * 1. Reddito Imponibile = importoLordo × 78%
 * 2. Contributi INPS = reddito × 26.07%
 * 3. Imponibile Netto = reddito - INPS
 * 4. Imposta Sostitutiva = imponibileNetto × 5%
 * 5. NETTO DISPONIBILE = importoLordo - INPS - Imposta
 *
 * Esempio 10.000€:
 * - Reddito: 10.000 × 78% = 7.800€
 * - INPS: 7.800 × 26.07% = 2.033,46€
 * - Imponibile netto: 7.800 - 2.033,46 = 5.766,54€
 * - Imposta: 5.766,54 × 5% = 288,33€
 * - NETTO: 10.000 - 2.033,46 - 288,33 = 7.678,21€
 */
export function calcolaNettoDisponibileDaFattura(
  importoLordo: number,
  anno: number = ANNO_CORRENTE
): number {
  const reddito = importoLordo * COEFFICIENTE_REDDITIVITA; // 78%
  const inps = reddito * getAliquotaInps(anno);
  const redditoNetto = reddito - inps;
  const impostaSostitutiva = redditoNetto * getAliquotaSostitutiva(anno);

  return importoLordo - inps - impostaSostitutiva;
}

/**
 * Calcola il netto derivante dalle fatture (prima di prelievi e uscite)
 * Formula: Fatturato Totale - Totale Tasse
 */
export function calcolaNettoFatture(
  fatture: Fattura[],
  anno: number = ANNO_CORRENTE
): number {
  return calcolaTotaleFatture(fatture) - calcolaTasseTotali(fatture, anno);
}

/**
 * Calcola il riepilogo per ogni fattura
 * Mostra tasse e netto per singola fattura
 */
export function calcolaRiepilogoPerFattura(fatture: Fattura[]): RiepilogoFattura[] {
  return fatture.map((f) => {
    // Ogni fattura usa le aliquote del proprio anno di emissione.
    const annoFattura = parseInt(f.data.substring(0, 4)) || ANNO_CORRENTE;
    const redditoImponibile = f.importoLordo * COEFFICIENTE_REDDITIVITA;
    const inps = redditoImponibile * getAliquotaInps(annoFattura);
    const imponibileNetto = redditoImponibile - inps;
    const imposta = imponibileNetto * getAliquotaSostitutiva(annoFattura);
    const tasseContributi = inps + imposta;
    const netto = f.importoLordo - tasseContributi;

    return {
      id: f.id,
      importoLordo: f.importoLordo,
      tasseContributi,
      netto,
    };
  });
}

/**
 * Calcola il riepilogo annuale completo
 */
export function calcolaRiepilogoAnnuale(
  fatture: Fattura[],
  anno: number = ANNO_CORRENTE
): RiepilogoAnnuale {
  return {
    totaleFatture: calcolaTotaleFatture(fatture),
    redditoImponibileLordo: calcolaRedditoImponibileLordo(fatture),
    contributiINPS: calcolaContributi(fatture, anno),
    impostaSostitutiva: calcolaImposta(fatture, anno),
    tasseTotali: calcolaTasseTotali(fatture, anno),
    nettoFatture: calcolaNettoFatture(fatture, anno),
  };
}

/**
 * Calcola la situazione del cash flow
 * Mostra quanto è disponibile da ritirare
 *
 * NOTA: Usa il fatturato lordo meno prelievi e uscite (che includono tasse già pagate)
 * Le tasse sono già incluse nelle uscite con categoria "Tasse"
 * Le entrate extra (rimborsi, bonus) vengono sommate al disponibile
 * ESCLUDI: Saldo Iniziale (sommato a parte dal chiamante) e Fatture (già contate)
 *
 * `escludiDaGrafico` NON viene applicato qui: è un flag di sola presentazione
 * (vedi types/fattura.ts). Prima veniva applicato alle entrate ma non alle
 * uscite, così un'entrata marcata spariva dal cash reale e dal Netto
 * Prelevabile Sicuro pur essendo soldi effettivamente sul conto.
 */
export function calcolaSituazioneCashFlow(
  fatture: Fattura[],
  prelievi: Prelievo[],
  uscite: Uscita[],
  entrate: Entrata[] = []
): SituazioneCashFlow {
  // Fatturato LORDO (soldi effettivamente incassati)
  const totaleFatturato = calcolaTotaleFatture(fatture);

  // Prelievi effettuati (stipendi)
  const totalePrelievi = prelievi.reduce((sum, p) => sum + p.importo, 0);

  // Uscite totali (include tasse già pagate)
  const totaleUscite = uscite.reduce((sum, u) => sum + u.importo, 0);

  // Entrate extra (rimborsi, bonus, interessi)
  // ESCLUDI: Saldo Iniziale e Fatture (già conteggiate sopra)
  // L'import BBVA scrive gli incassi come categoria "Incasso Fattura": senza
  // il riconoscimento tollerante venivano contati due volte, una dalla tabella
  // `fatture` e una come movimento.
  const totaleEntrate = entrate
    .filter(e => !eSaldoIniziale(e.categoria) && !eIncassoFattura(e.categoria))
    .reduce((sum, e) => sum + e.importo, 0);

  // Netto disponibile = Fatturato LORDO + Entrate Extra - Prelievi - Uscite
  const nettoDisponibile = totaleFatturato + totaleEntrate - totalePrelievi - totaleUscite;

  return {
    totaleFatturato,
    totalePrelievi,
    totaleUscite,
    totaleEntrate,
    nettoDisponibile,
  };
}

// ============================================================================
// ANCORA DEL SALDO — la banca dice quanto c'è
// ============================================================================

/**
 * Il saldo dichiarato dalla banca a una certa data, più i movimenti aggiunti
 * a mano dopo quella data.
 *
 * Ricostruire il cash dal basso (saldo iniziale + tutti i movimenti) è fragile:
 * basta dimenticare una spesa e il numero è sbagliato per sempre, senza che
 * niente lo segnali. L'export BBVA porta la colonna "Disponibile", cioè il
 * saldo dopo ogni movimento: la banca sa già quanto c'è sul conto.
 */
export interface AncoraSaldo {
  /** Data valuta del movimento più recente importato (ISO YYYY-MM-DD). */
  data: string;
  /** Saldo del conto a quella data, dall'export. */
  saldo: number;
  /**
   * Tutti i movimenti conosciuti: servono quelli NON importati e successivi
   * all'ancora, che la banca ancora non ha visto.
   */
  movimenti: Movimento[];
}

/**
 * Cash disponibile secondo la banca.
 *
 *     saldo dell'ultimo import + movimenti manuali successivi
 *
 * I movimenti importati dopo l'ancora non esistono per definizione (l'ancora è
 * il più recente del file), e quelli importati prima sono già dentro il saldo:
 * sommarli lo raddoppierebbe. Contano solo quelli inseriti a mano, cioè le
 * cose che sai tu e la banca non ha ancora registrato.
 */
export function calcolaCashDaBanca(ancora: AncoraSaldo): number {
  const dopo = ancora.movimenti.filter(
    (m) => m.fonte !== "import_bbva" && m.data > ancora.data
  );
  return ancora.saldo + dopo.reduce((sum, m) => sum + m.importo, 0);
}

// ============================================================================
// ACCANTONAMENTO — quanto tenere da parte per il fisco
// ============================================================================
// Unica fonte di verità per Dashboard (NettoDisponibile) e Analisi.
// Prima questa logica era copia-incollata nei due componenti e divergeva a ogni
// modifica: ogni fix andava applicato due volte e i due schermi mostravano
// numeri diversi.

/** Rate di acconto dovute per un singolo tributo. */
export interface RateAcconto {
  primo: number; // scadenza giugno
  secondo: number; // scadenza novembre
  totale: number;
}

/**
 * Acconti INPS Gestione Separata: 80% del contributo dell'anno precedente,
 * in due rate uguali del 40% (30 giugno e 30 novembre).
 */
export function calcolaAccontiInps(contributiAnnoPrecedente: number): RateAcconto {
  const primo = contributiAnnoPrecedente * ACCONTO_INPS_1;
  const secondo = contributiAnnoPrecedente * ACCONTO_INPS_2;
  return { primo, secondo, totale: primo + secondo };
}

/**
 * Acconti imposta sostitutiva: 100% dell'imposta dell'anno precedente,
 * 40% a giugno e 60% a novembre — ma con due soglie:
 * - sotto 51,65 € non è dovuto alcun acconto;
 * - fra 51,65 € e 257,52 € si versa tutto in un'unica rata a novembre.
 */
export function calcolaAccontiImposta(impostaAnnoPrecedente: number): RateAcconto {
  if (impostaAnnoPrecedente < SOGLIA_ACCONTO_MINIMA) {
    return { primo: 0, secondo: 0, totale: 0 };
  }
  if (impostaAnnoPrecedente < SOGLIA_ACCONTO_RATA_UNICA) {
    return {
      primo: 0,
      secondo: impostaAnnoPrecedente,
      totale: impostaAnnoPrecedente,
    };
  }
  const primo = impostaAnnoPrecedente * ACCONTO_IMPOSTA_1;
  const secondo = impostaAnnoPrecedente * ACCONTO_IMPOSTA_2;
  return { primo, secondo, totale: primo + secondo };
}

const contieneParola = (categoria: string | undefined, parola: string): boolean =>
  (categoria?.toLowerCase() ?? "").includes(parola);

const eTassa = (categoria: string | undefined): boolean =>
  (categoria?.toLowerCase() ?? "").startsWith("tasse");

/**
 * Somma i pagamenti di tasse fatti in un dato anno.
 *
 * `soloAcconti`: esclude i movimenti categorizzati come SALDO. Serve per
 * calcolare quanto è stato versato *in acconto* per l'anno N-1: i pagamenti di
 * giugno N-1 comprendono anche il saldo dell'anno N-2, che non va scomputato
 * dal debito N-1.
 *
 * I movimenti storici categorizzati genericamente "Tasse" (né saldo né acconto)
 * vengono contati come acconti: è il comportamento precedente, mantenuto per non
 * far saltare i numeri di chi non ha ancora usato le categorie specifiche.
 */
function sommaTassePagate(
  uscite: Uscita[],
  anno: number,
  soloAcconti = false
): number {
  return uscite
    .filter((u) => {
      if (!u.data.startsWith(String(anno))) return false;
      if (!eTassa(u.categoria)) return false;
      if (soloAcconti && contieneParola(u.categoria, "saldo")) return false;
      return true;
    })
    .reduce((sum, u) => sum + u.importo, 0);
}

/**
 * Rettifiche degli incassi, per anno.
 *
 * Il forfettario tassa per cassa, ma le fatture registrate nell'app possono
 * avere date di emissione invece che di incasso (o mancare del tutto, come per
 * gli anni prima del reset dei dati). La rettifica è l'incassato che quelle
 * fatture non rappresentano:
 *
 *     incassi anno = somma fatture dell'anno + rettifica
 *
 * Si SOMMA, non sostituisce: ogni nuova fattura continua a incrementare il
 * totale, senza bisogno di aggiornare la rettifica a ogni inserimento.
 *
 * Corregge l'imponibile SOLO ai fini fiscali (tasse, acconti, limite 85k).
 * Il cash disponibile continua a derivare dai movimenti realmente registrati.
 */
export type RettifichePerAnno = Record<number, number>;

export interface Accantonamento {
  anno: number;
  annoPrecedente: number;

  /** Imponibile usato per le tasse dell'anno: fatture + rettifica. */
  incassiAnnoCorrente: number;
  /** Imponibile usato per le tasse dell'anno precedente: fatture + rettifica. */
  incassiAnnoPrecedente: number;
  /** Quota dell'imponibile che viene dalle fatture registrate. */
  incassiDaFattureAnnoCorrente: number;
  incassiDaFattureAnnoPrecedente: number;
  /** Rettifica applicata (0 se assente). */
  rettificaAnnoCorrente: number;
  rettificaAnnoPrecedente: number;

  /** Cash realmente disponibile: saldo di banca, o ricostruito se non c'è import. */
  saldoIniziale: number;
  cashDisponibileReale: number;

  /**
   * Riconciliazione fra i due modi di sapere quanti soldi ci sono.
   *
   * `cashRicostruito` è la vecchia somma dal basso (saldo iniziale + movimenti).
   * `scostamentoBanca` è quanto se ne discosta il saldo dichiarato dalla banca:
   * diverso da zero significa che manca un movimento o che uno è doppio, non
   * che il netto prelevabile è sbagliato. Zero quando non c'è ancora nessun
   * import: non c'è niente da riconciliare.
   */
  cashRicostruito: number;
  scostamentoBanca: number;
  /** L'ancora usata, se c'era: serve alla dashboard per dire "saldo al …". */
  ancoraSaldo?: AncoraSaldo;

  /**
   * Scomposizione del cash, riga per riga. Serve a confrontare il numero
   * dell'app con quello del commercialista e capire QUALE voce diverge.
   */
  dettaglioCash: {
    saldoIniziale: number;
    fatturato: number;
    entrateExtra: number;
    prelievi: number;
    uscite: number;
    /** Quanti movimenti "Saldo Iniziale" sono stati sommati: se >1, sospetto. */
    numeroSaldiIniziali: number;
    /**
     * Entrate dell'anno marcate `escludiDaGrafico` e comunque incluse nel cash.
     * Se questo valore non è zero e il totale sembra gonfiato, è qui la causa.
     */
    entrateMarcateEscluse: number;
  };

  contributiAnnoCorrente: number;
  impostaAnnoCorrente: number;
  tasseAnnoCorrente: number;

  contributiAnnoPrecedente: number;
  impostaAnnoPrecedente: number;
  tasseAnnoPrecedente: number;

  /** Scadenze dell'anno selezionato, calcolate sulle tasse dell'anno prima. */
  saldoAnnoPrecedente: number;
  accontiInpsAnnoCorrente: RateAcconto;
  accontiImpostaAnnoCorrente: RateAcconto;
  primoAccontoAnnoCorrente: number;
  secondoAccontoAnnoCorrente: number;
  accontiVersatiNellAnno: number;
  scadenzeAnnoCorrente: number;

  /** Proiezione per l'anno prossimo, calcolata sulle tasse dell'anno selezionato. */
  saldoAnnoCorrente: number;
  accontiInpsAnnoProssimo: RateAcconto;
  accontiImpostaAnnoProssimo: RateAcconto;
  primoAccontoAnnoProssimo: number;
  secondoAccontoAnnoProssimo: number;
  proiezioneAnnoProssimo: number;

  totaleDaAccantonare: number;
  nettoSicuro: number;
}

/**
 * Calcola tutto ciò che serve per rispondere a "quanto posso prelevare".
 *
 * Il totale da accantonare somma due blocchi:
 * 1. le scadenze dell'anno selezionato (saldo N-1 + acconti N, su tasse N-1),
 *    al netto di quanto già versato nell'anno;
 * 2. la proiezione per l'anno prossimo (saldo N + 1° acconto N+1, su tasse N).
 *    Il 2° acconto N+1 è escluso perché scade a novembre dell'anno prossimo.
 */
export function calcolaAccantonamento(
  fatture: Fattura[],
  prelievi: Prelievo[],
  uscite: Uscita[],
  entrate: Entrata[],
  anno: number,
  /** Incassi non rappresentati dalle fatture, sommati all'imponibile. */
  rettifiche: RettifichePerAnno = {},
  /** Ancora del saldo di banca: quando c'è, il cash smette di essere ricostruito. */
  ancora?: AncoraSaldo
): Accantonamento {
  const annoPrecedente = anno - 1;
  const dellAnno = <T extends { data: string }>(items: T[]) =>
    items.filter((i) => i.data.startsWith(String(anno)));

  // --- CASH REALE ---
  // Solo i movimenti dell'anno: quelli precedenti sono già nel saldo iniziale.
  const cashFlow = calcolaSituazioneCashFlow(
    dellAnno(fatture),
    dellAnno(prelievi),
    dellAnno(uscite),
    dellAnno(entrate)
  );

  // Il saldo iniziale si cerca in TUTTE le entrate: può essere datato in un
  // anno precedente ma rappresentare comunque il punto di partenza del conto.
  // ATTENZIONE: se esiste più di un movimento "Saldo Iniziale" vengono sommati
  // tutti, e il cash risulta gonfiato. `numeroSaldiIniziali` lo rende visibile.
  const movimentiSaldoIniziale = entrate.filter((e) => {
    const cat = e.categoria?.toLowerCase() ?? "";
    return cat === "saldo iniziale" || cat === "saldo_iniziale";
  });
  const saldoIniziale = movimentiSaldoIniziale.reduce(
    (sum, e) => sum + e.importo,
    0
  );

  // Il cash ricostruito dal basso: saldo iniziale più i movimenti dell'anno.
  // Resta calcolato anche quando c'è l'ancora, perché è il termine di
  // paragone della riconciliazione.
  const cashRicostruito = saldoIniziale + cashFlow.nettoDisponibile;

  // Con l'ancora il cash NON si ricostruisce più: lo dice la banca. Un
  // movimento dimenticato sposta la riconciliazione, non il netto prelevabile.
  const cashDaBanca = ancora ? calcolaCashDaBanca(ancora) : undefined;
  const cashDisponibileReale = cashDaBanca ?? cashRicostruito;
  const scostamentoBanca = cashDaBanca === undefined ? 0 : cashRicostruito - cashDaBanca;

  const entrateMarcateEscluse = dellAnno(entrate)
    .filter((e) => {
      const cat = e.categoria?.toLowerCase() ?? "";
      const speciale =
        cat === "saldo iniziale" || cat === "saldo_iniziale" || cat === "fatture";
      return e.escludiDaGrafico && !speciale;
    })
    .reduce((sum, e) => sum + e.importo, 0);

  // --- TASSE TEORICHE, ognuna con le aliquote del proprio anno ---
  // L'imponibile è l'incassato dell'anno: le fatture registrate PIÙ la
  // rettifica, cioè l'incassato che quelle fatture non rappresentano.
  // Sommando (invece di sostituire) ogni nuova fattura continua a contare.
  const fattureAnnoCorrente = dellAnno(fatture);
  const fattureAnnoPrecedente = fatture.filter((f) =>
    f.data.startsWith(String(annoPrecedente))
  );

  const incassiDaFattureAnnoCorrente = calcolaTotaleFatture(fattureAnnoCorrente);
  const incassiDaFattureAnnoPrecedente = calcolaTotaleFatture(
    fattureAnnoPrecedente
  );

  const rettificaAnnoCorrente = rettifiche[anno] ?? 0;
  const rettificaAnnoPrecedente = rettifiche[annoPrecedente] ?? 0;

  const incassiAnnoCorrente =
    incassiDaFattureAnnoCorrente + rettificaAnnoCorrente;
  const incassiAnnoPrecedente =
    incassiDaFattureAnnoPrecedente + rettificaAnnoPrecedente;

  const contributiAnnoCorrente = calcolaContributiDaImporto(
    incassiAnnoCorrente,
    anno
  );
  const impostaAnnoCorrente = calcolaImpostaDaImporto(incassiAnnoCorrente, anno);
  const tasseAnnoCorrente = contributiAnnoCorrente + impostaAnnoCorrente;

  const contributiAnnoPrecedente = calcolaContributiDaImporto(
    incassiAnnoPrecedente,
    annoPrecedente
  );
  const impostaAnnoPrecedente = calcolaImpostaDaImporto(
    incassiAnnoPrecedente,
    annoPrecedente
  );
  const tasseAnnoPrecedente = contributiAnnoPrecedente + impostaAnnoPrecedente;

  // --- SCADENZE DELL'ANNO SELEZIONATO (su tasse N-1) ---
  // Saldo N-1 = tasse N-1 meno gli acconti versati DURANTE N-1 (non il saldo N-2).
  const accontiVersatiAnnoPrecedente = sommaTassePagate(
    uscite,
    annoPrecedente,
    true
  );
  const saldoAnnoPrecedente = Math.max(
    0,
    tasseAnnoPrecedente - accontiVersatiAnnoPrecedente
  );

  const accontiInpsAnnoCorrente = calcolaAccontiInps(contributiAnnoPrecedente);
  const accontiImpostaAnnoCorrente = calcolaAccontiImposta(impostaAnnoPrecedente);
  const primoAccontoAnnoCorrente =
    accontiInpsAnnoCorrente.primo + accontiImpostaAnnoCorrente.primo;
  const secondoAccontoAnnoCorrente =
    accontiInpsAnnoCorrente.secondo + accontiImpostaAnnoCorrente.secondo;

  // Qui servono TUTTI i pagamenti dell'anno (saldo N-1 incluso), perché
  // scadenzeAnnoCorrente comprende anche saldoAnnoPrecedente.
  const accontiVersatiNellAnno = sommaTassePagate(uscite, anno);

  const scadenzeAnnoCorrente = Math.max(
    0,
    saldoAnnoPrecedente +
      primoAccontoAnnoCorrente +
      secondoAccontoAnnoCorrente -
      accontiVersatiNellAnno
  );

  // --- PROIEZIONE ANNO PROSSIMO (su tasse N) ---
  // Saldo N = tasse N meno gli acconti che verranno versati durante N.
  const saldoAnnoCorrente = Math.max(
    0,
    tasseAnnoCorrente -
      (accontiInpsAnnoCorrente.totale + accontiImpostaAnnoCorrente.totale)
  );

  const accontiInpsAnnoProssimo = calcolaAccontiInps(contributiAnnoCorrente);
  const accontiImpostaAnnoProssimo = calcolaAccontiImposta(impostaAnnoCorrente);
  const primoAccontoAnnoProssimo =
    accontiInpsAnnoProssimo.primo + accontiImpostaAnnoProssimo.primo;
  const secondoAccontoAnnoProssimo =
    accontiInpsAnnoProssimo.secondo + accontiImpostaAnnoProssimo.secondo;

  const proiezioneAnnoProssimo = saldoAnnoCorrente + primoAccontoAnnoProssimo;

  const totaleDaAccantonare = scadenzeAnnoCorrente + proiezioneAnnoProssimo;

  return {
    anno,
    annoPrecedente,
    incassiAnnoCorrente,
    incassiAnnoPrecedente,
    incassiDaFattureAnnoCorrente,
    incassiDaFattureAnnoPrecedente,
    rettificaAnnoCorrente,
    rettificaAnnoPrecedente,
    saldoIniziale,
    cashDisponibileReale,
    cashRicostruito,
    scostamentoBanca,
    ancoraSaldo: ancora,
    dettaglioCash: {
      saldoIniziale,
      fatturato: cashFlow.totaleFatturato,
      entrateExtra: cashFlow.totaleEntrate,
      prelievi: cashFlow.totalePrelievi,
      uscite: cashFlow.totaleUscite,
      numeroSaldiIniziali: movimentiSaldoIniziale.length,
      entrateMarcateEscluse,
    },
    contributiAnnoCorrente,
    impostaAnnoCorrente,
    tasseAnnoCorrente,
    contributiAnnoPrecedente,
    impostaAnnoPrecedente,
    tasseAnnoPrecedente,
    saldoAnnoPrecedente,
    accontiInpsAnnoCorrente,
    accontiImpostaAnnoCorrente,
    primoAccontoAnnoCorrente,
    secondoAccontoAnnoCorrente,
    accontiVersatiNellAnno,
    scadenzeAnnoCorrente,
    saldoAnnoCorrente,
    accontiInpsAnnoProssimo,
    accontiImpostaAnnoProssimo,
    primoAccontoAnnoProssimo,
    secondoAccontoAnnoProssimo,
    proiezioneAnnoProssimo,
    totaleDaAccantonare,
    nettoSicuro: cashDisponibileReale - totaleDaAccantonare,
  };
}

/**
 * Simula l'impatto di una nuova fattura ipotetica
 * Restituisce il riepilogo annuale con la fattura aggiuntiva
 */
export function simulaNuovaFattura(
  fatture: Fattura[],
  importoNuovaFattura: number
): RiepilogoAnnuale {
  const fatturaSimulata: Fattura = {
    id: "simulata",
    data: new Date().toISOString().split("T")[0],
    descrizione: "Fattura simulata",
    cliente: "",
    importoLordo: importoNuovaFattura,
  };

  return calcolaRiepilogoAnnuale([...fatture, fatturaSimulata]);
}

/**
 * Calcola la percentuale di tasse sul fatturato totale
 */
export function calcolaPercentualeTasse(fatture: Fattura[]): number {
  const fatturatoTotale = calcolaTotaleFatture(fatture);
  if (fatturatoTotale === 0) return 0;
  const tasseTotali = calcolaTasseTotali(fatture);
  return (tasseTotali / fatturatoTotale) * 100;
}
