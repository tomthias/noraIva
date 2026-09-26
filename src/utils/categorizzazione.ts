/**
 * Categoria proposta per un movimento appena letto dall'estratto.
 *
 * L'ordine è quello del piano (§3.3) e non è negoziabile:
 *
 *   1. le regole imparate dall'utente (`regole_categorie`) vincono sempre;
 *   2. le regole predefinite qui sotto;
 *   3. il ripiego per segno: uscita → Spese, entrata → Entrate.
 *
 * Nessuna proposta è definitiva: l'anteprima dell'import le mostra tutte e
 * l'utente le corregge prima di scrivere. Quelle marcate `daConfermare`
 * pilotano i calcoli (un incasso da collegare a una fattura) e l'anteprima le
 * evidenzia.
 *
 * Le tasse hanno UNA categoria: saldo o acconto lo dice lo scadenzario F24,
 * non il mese del bonifico.
 */

import {
  CATEGORIA_INCASSO_FATTURA,
  CATEGORIA_INTERESSI,
  CATEGORIA_INVESTIMENTI,
  CATEGORIA_LAVORO,
  CATEGORIA_STIPENDIO,
  CATEGORIA_TASSE,
} from "../constants/fiscali";
import type { Fattura } from "../types/fattura";
import type { RigaEstratto } from "./importBBVA";

export interface RegolaCategoria {
  /** Testo cercato, case-insensitive, su parola chiave + descrizione + osservazioni. */
  pattern: string;
  categoria: string;
}

export interface Proposta {
  categoria: string;
  /** Perché è stata proposta: mostrato nell'anteprima. */
  motivo: string;
  /** true quando la categoria decide un numero fiscale e va guardata. */
  daConfermare: boolean;
}

/** Categorie generiche di ripiego, quando nessuna regola aggancia. */
export const CATEGORIA_SPESE = "Spese";
export const CATEGORIA_ENTRATE = "Entrate";

/** Tutto il testo di una riga, in minuscolo, per i match. */
export const testoRiga = (riga: RigaEstratto): string =>
  [riga.parolaChiave, riga.descrizione, riga.osservazioni]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const contiene = (testo: string, ...aghi: string[]) => aghi.some((a) => testo.includes(a));

/** Le regole predefinite, nell'ordine in cui vanno provate. */
function regolaPredefinita(riga: RigaEstratto): Proposta | undefined {
  const testo = testoRiga(riga);
  const uscita = riga.importo < 0;
  const regola = (categoria: string, motivo: string, daConfermare = false): Proposta => ({
    categoria,
    motivo,
    daConfermare,
  });

  if (contiene(testo, "liquidazione interessi", "interessi creditori")) {
    return regola(CATEGORIA_INTERESSI, "accredito interessi BBVA");
  }

  // Il bollo sul conto BBVA è un costo della banca, non un F24.
  if (contiene(testo, "imposta di bollo conto")) {
    return regola("Banca", "bollo sul conto corrente");
  }

  // Gli F24 si pagano da Intesa: su BBVA c'è il bonifico con causale "Tasse".
  if (uscita && (/(^|\s)(tasse|f24)\b/.test(testo) || contiene(testo, "pagamento delle tasse"))) {
    return regola(CATEGORIA_TASSE, "bonifico per pagare un F24");
  }

  if (uscita && contiene(testo, "invest", "moneyfarm", "verso.agg. mand", "mm288318")) {
    return regola(CATEGORIA_INVESTIMENTI, "versamento su un investimento");
  }

  // "Stipendio agosto", oppure un bonifico con causale solo "Mattia marinangeli"
  const soloNome = (riga.osservazioni ?? "").trim().toLowerCase() === "mattia marinangeli";
  if (uscita && (contiene(testo, "stipendio", "stipendi") || soloNome)) {
    return regola(CATEGORIA_STIPENDIO, "bonifico verso il tuo conto personale");
  }

  if (uscita && contiene(testo, "fiscozen", "claude.ai", "vercel", "openai", "figma", "adobe", "notion")) {
    return regola(CATEGORIA_LAVORO, "costo dell'attività");
  }

  if (uscita && contiene(testo, "dovevivo", "joivy", "dvi*")) {
    return regola("Affitto", "affitto");
  }

  if (uscita && contiene(testo, "impact hub")) {
    return regola("Coworking", "coworking");
  }

  if (!uscita && numeriFatturaInCausale(testo, riga.dataValuta).length > 0) {
    return regola(CATEGORIA_INCASSO_FATTURA, "bonifico con un numero di fattura", true);
  }

  if (!uscita && contiene(testo, "fattura", "ft ", "ft-", "ft.", "fatt.", "parcella")) {
    return regola(CATEGORIA_INCASSO_FATTURA, "bonifico che sembra saldare una fattura", true);
  }

  return undefined;
}

// ============================================================================
// ABBINAMENTO BONIFICO ↔ FATTURA
// ============================================================================

/**
 * I numeri di fattura citati nella causale, nella forma "N/AAAA".
 *
 * I clienti scrivono il riferimento in mille modi: "Saldo fat n 23/2025",
 * "Ft.4/2026", "Parcella 14/2026", "Ft 0020 del 24.07.26", "Sdo ft 4 2025",
 * "Pagamento fattura n. 14-2025", "Saldo fatture 21 2026 e 17 2026". Quando
 * manca l'anno (solo "Ft 0020 del 24.07.26") si prende quello della data
 * citata, o in mancanza quello del bonifico.
 */
export function numeriFatturaInCausale(testo: string, dataValuta: string): string[] {
  const t = testo.toLowerCase();
  if (!/(fat|ft|parcella|fattur)/.test(t)) return [];

  const trovati = new Set<string>();
  const annoBonifico = Number(dataValuta.slice(0, 4));

  // "23/2025", "14-2025", "21 2026", "l20/2025" (refuso del cliente). Non
  // deve agganciare il mese di una data: in "del 29/08/2025" l'08 è preceduto
  // da una barra.
  for (const m of t.matchAll(/(?:^|[^\d/.])l?(\d{1,3})\s?[/\- ]\s?(20\d{2})(?!\d)/g)) {
    trovati.add(`${Number(m[1])}/${m[2]}`);
  }

  // "Ft 0020 del 24.07.26", "fatture n 19 del 20/10/25 n 21 del 29/10/25":
  // numero senza anno, anno preso dalla data che lo segue.
  if (trovati.size === 0) {
    for (const m of t.matchAll(
      /(?:^|[^\d/.])0*(\d{1,3})\s+(?:del|dl|d)\s+\d{1,2}[./-]\d{1,2}[./-](\d{2,4})\b/g
    )) {
      const anno = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]);
      trovati.add(`${Number(m[1])}/${anno}`);
    }
  }

  // "Ft 16" e basta: l'anno è quello del bonifico.
  if (trovati.size === 0) {
    const m = t.match(/(?:ft|fat|fattura|parcella)[\s.n°]*0*(\d{1,3})\b/);
    if (m) trovati.add(`${Number(m[1])}/${annoBonifico}`);
  }

  return [...trovati];
}

const stessoImporto = (a: number, b: number) => Math.abs(a - b) < 0.01;

/**
 * Le fatture che un bonifico ricevuto salda.
 *
 * 1. numeri citati in causale, se l'importo torna (uno o la somma di più);
 * 2. altrimenti la fattura aperta con lo stesso importo emessa per PRIMA:
 *    chi paga importi ricorrenti (4.000 € al mese, 50 € a lezione) salda di
 *    norma la più vecchia ancora aperta.
 *
 * L'importo deve SEMPRE tornare: un cliente che cita il numero sbagliato
 * (capita) non deve far incassare la fattura di qualcun altro.
 */
export function abbinaFatture(
  riga: Pick<RigaEstratto, "importo" | "dataValuta"> & { testo: string },
  aperte: Fattura[]
): Fattura[] {
  if (riga.importo <= 0) return [];
  const perNumero = new Map(aperte.filter((f) => f.numero).map((f) => [f.numero!, f]));

  const citate = numeriFatturaInCausale(riga.testo, riga.dataValuta)
    .map((n) => perNumero.get(n))
    .filter((f): f is Fattura => Boolean(f));

  const singola = citate.find((f) => stessoImporto(f.importoLordo, riga.importo));
  if (singola) return [singola];
  if (citate.length > 1 && stessoImporto(citate.reduce((s, f) => s + f.importoLordo, 0), riga.importo)) {
    return citate;
  }

  const perImporto = aperte
    .filter(
      (f) =>
        stessoImporto(f.importoLordo, riga.importo) &&
        (f.dataEmissione ?? "0000") <= riga.dataValuta
    )
    .sort((a, b) => (a.dataEmissione ?? "").localeCompare(b.dataEmissione ?? ""));
  return perImporto.slice(0, 1);
}

/**
 * La categoria proposta per una riga. `regole` sono quelle dell'utente e
 * vincono su tutto: se ha già detto una volta che "Enel" è "Bollette", non
 * glielo si chiede più.
 */
export function proponiCategoria(riga: RigaEstratto, regole: RegolaCategoria[] = []): Proposta {
  const testo = testoRiga(riga);

  // La regola più lunga vince: "bonifico stipendio" è più specifica di
  // "bonifico" e deve avere la precedenza a prescindere dall'ordine.
  const utente = regole
    .filter((r) => r.pattern.trim() !== "" && testo.includes(r.pattern.trim().toLowerCase()))
    .sort((a, b) => b.pattern.length - a.pattern.length)[0];

  if (utente) {
    return {
      categoria: utente.categoria,
      motivo: `regola tua: "${utente.pattern}"`,
      daConfermare: false,
    };
  }

  return (
    regolaPredefinita(riga) ?? {
      categoria: riga.importo < 0 ? CATEGORIA_SPESE : CATEGORIA_ENTRATE,
      motivo: "nessuna regola: categoria generica",
      daConfermare: false,
    }
  );
}

/**
 * Il pattern da salvare quando l'utente corregge una categoria e chiede di
 * applicarla "sempre ai movimenti simili".
 *
 * Si usa la parola chiave BBVA se c'è (è il tipo di operazione, stabile), in
 * mancanza la descrizione ripulita dai numeri: un IBAN o un importo dentro il
 * pattern non aggancerebbero mai nulla.
 */
export function patternSuggerito(riga: RigaEstratto): string {
  const base = riga.parolaChiave?.trim() || riga.descrizione;
  return base
    .toLowerCase()
    .replace(/[0-9]{2,}/g, " ")
    .replace(/[^\p{L}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 4)
    .join(" ");
}
