/**
 * Spie di coerenza fra i conti dell'app e le stime di Fiscozen.
 *
 * Fiscozen NON diventa una seconda strada di calcolo: le sue stime sono
 * intervalli annuali, senza ripartizione per scadenza né scomputo dei
 * versamenti, quindi non rispondono alla domanda "quanto tengo da parte oggi".
 * Servono a un'altra cosa: dire se i DATI dell'app sono giusti.
 *
 * Quando una spia è rossa il numero sbagliato è quasi sempre un dato — una
 * fattura non registrata, una categoria di tasse messa male — non il motore.
 * Per questo ogni spia porta con sé dove andare a guardare.
 */

import type { Accantonamento } from "./calcoliFisco";

export interface StimaFiscozen {
  /** Anno in cui si PAGA ("nel 2026 pagherai fra X e Y"), non l'anno d'imposta. */
  annoPagamento: number;
  tasseMin?: number;
  tasseMax?: number;
  /** "I tuoi incassi" secondo Fiscozen per l'anno d'imposta corrispondente. */
  incassatoDichiarato?: number;
  aggiornatoIl?: string;
}

export type StatoSpia = "ok" | "attenzione" | "assente";

export interface Spia {
  id: "tasse-anno-corrente" | "tasse-anno-prossimo" | "incassi";
  titolo: string;
  stato: StatoSpia;
  /** Il valore calcolato dall'app. */
  valoreApp: number;
  /** L'intervallo (o il valore) dichiarato da Fiscozen. */
  atteso?: { min: number; max: number };
  /** Di quanto si esce dall'intervallo. 0 se dentro. */
  scostamento: number;
  /** Cosa significa e dove guardare se non torna. */
  spiegazione: string;
}

/** Tolleranza: sotto i 50 € la differenza è arrotondamento, non un errore. */
const TOLLERANZA = 50;

function confronta(valore: number, min: number, max: number): { stato: StatoSpia; scostamento: number } {
  if (valore < min - TOLLERANZA) return { stato: "attenzione", scostamento: valore - min };
  if (valore > max + TOLLERANZA) return { stato: "attenzione", scostamento: valore - max };
  return { stato: "ok", scostamento: 0 };
}

/**
 * Le tre spie del piano (§4.1).
 *
 * ATTENZIONE alla B: l'intervallo Fiscozen dell'anno prossimo comprende ANCHE
 * il secondo acconto di novembre, che il "totale da tenere da parte" dell'app
 * esclude di proposito (scade fra più di un anno). Il confronto va fatto su
 * grandezze omogenee, quindi qui il secondo acconto si somma di nuovo: usare
 * `totaleDaAccantonare` darebbe una spia rossa perenne.
 */
export function calcolaSpieFiscozen(
  a: Accantonamento,
  stime: StimaFiscozen[]
): Spia[] {
  const anno = a.anno;
  const perAnno = (n: number) => stime.find((s) => s.annoPagamento === n);

  const spie: Spia[] = [];

  // --- A: quanto si paga QUEST'ANNO ---
  const stimaCorrente = perAnno(anno);
  const dovutoNellAnno = a.scadenzeAnnoCorrente + a.accontiVersatiNellAnno;
  spie.push({
    id: "tasse-anno-corrente",
    titolo: `Tasse da pagare nel ${anno}`,
    valoreApp: dovutoNellAnno,
    ...(stimaCorrente?.tasseMin !== undefined && stimaCorrente?.tasseMax !== undefined
      ? {
          atteso: { min: stimaCorrente.tasseMin, max: stimaCorrente.tasseMax },
          ...confronta(dovutoNellAnno, stimaCorrente.tasseMin, stimaCorrente.tasseMax),
        }
      : { stato: "assente" as const, scostamento: 0 }),
    spiegazione:
      "Saldo dell'anno scorso più gli acconti di quest'anno, versamenti già " +
      "fatti compresi. Se non torna, controlla le categorie dei pagamenti di " +
      "tasse: saldo e acconto contano in modo diverso.",
  });

  // --- B: quanto si pagherà l'ANNO PROSSIMO ---
  const stimaProssima = perAnno(anno + 1);
  const dovutoAnnoProssimo =
    a.saldoAnnoCorrente + a.primoAccontoAnnoProssimo + a.secondoAccontoAnnoProssimo;
  spie.push({
    id: "tasse-anno-prossimo",
    titolo: `Tasse da pagare nel ${anno + 1}`,
    valoreApp: dovutoAnnoProssimo,
    ...(stimaProssima?.tasseMin !== undefined && stimaProssima?.tasseMax !== undefined
      ? {
          atteso: { min: stimaProssima.tasseMin, max: stimaProssima.tasseMax },
          ...confronta(dovutoAnnoProssimo, stimaProssima.tasseMin, stimaProssima.tasseMax),
        }
      : { stato: "assente" as const, scostamento: 0 }),
    spiegazione:
      `Saldo ${anno} più i due acconti ${anno + 1}, secondo acconto di novembre ` +
      "incluso: è così che lo conta Fiscozen. Il “totale da tenere da parte” " +
      "della dashboard lo esclude di proposito, quindi i due numeri non " +
      "coincidono e non devono.",
  });

  // --- C: gli incassi (il confronto più utile) ---
  const dichiarato = stimaCorrente?.incassatoDichiarato;
  spie.push({
    id: "incassi",
    titolo: `Incassi ${anno}`,
    valoreApp: a.incassiAnnoCorrente,
    ...(dichiarato !== undefined
      ? {
          atteso: { min: dichiarato, max: dichiarato },
          ...confronta(a.incassiAnnoCorrente, dichiarato, dichiarato),
        }
      : { stato: "assente" as const, scostamento: 0 }),
    spiegazione:
      "Fatture registrate più la rettifica. Se diverge, manca un incasso " +
      "oppure una fattura ha la data di emissione invece di quella di incasso: " +
      "il forfettario conta per cassa.",
  });

  return spie;
}
