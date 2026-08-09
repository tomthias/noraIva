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
 * pilotano numeri fiscali (quale acconto, quale saldo) e l'anteprima le
 * evidenzia: sbagliarle sposta l'accantonamento, non solo un grafico.
 */

import {
  CATEGORIA_INCASSO_FATTURA,
  CATEGORIA_INTERESSI,
  CATEGORIA_STIPENDIO,
  CATEGORIE_TASSE,
} from "../constants/fiscali";
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

/**
 * L'acconto o il saldo, dedotti dal mese del versamento.
 *
 * Giugno e luglio (con la proroga) portano il saldo dell'anno prima insieme al
 * primo acconto; novembre porta solo il secondo acconto. Quando in un mese
 * convivono due tributi la proposta è quella prevalente e resta `daConfermare`:
 * `sommaTassePagate()` distingue saldo e acconti, e sbagliare qui sposta
 * l'accantonamento.
 */
export function categoriaTassePerMese(dataISO: string): string {
  const mese = Number(dataISO.substring(5, 7));
  if (mese === 11 || mese === 12) return CATEGORIE_TASSE.ACCONTO;
  if (mese === 6 || mese === 7 || mese === 8) return CATEGORIE_TASSE.SALDO;
  return CATEGORIE_TASSE.ACCONTO;
}

/** Le regole predefinite, nell'ordine in cui vanno provate. */
function regolaPredefinita(riga: RigaEstratto): Proposta | undefined {
  const testo = testoRiga(riga);
  const parola = (riga.parolaChiave ?? "").toLowerCase();

  if (contiene(testo, "liquidazione interessi", "interessi creditori")) {
    return {
      categoria: CATEGORIA_INTERESSI,
      motivo: "accredito interessi BBVA",
      daConfermare: false,
    };
  }

  if (contiene(parola, "pagamento imposte") || contiene(testo, "f24", "imposte", "tasse", "erario")) {
    return {
      categoria: categoriaTassePerMese(riga.dataValuta),
      motivo: "pagamento di imposte: controlla se è saldo o acconto",
      daConfermare: true,
    };
  }

  if (riga.importo < 0 && contiene(testo, "stipendio", "stipendi")) {
    return { categoria: CATEGORIA_STIPENDIO, motivo: "bonifico di stipendio", daConfermare: false };
  }

  if (riga.importo > 0 && contiene(testo, "fattura", "ft ", "ft-", "fatt.", "saldo fattura")) {
    return {
      categoria: CATEGORIA_INCASSO_FATTURA,
      motivo: "bonifico ricevuto che sembra saldare una fattura",
      daConfermare: true,
    };
  }

  return undefined;
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
