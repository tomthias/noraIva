/**
 * Riconoscimento dei duplicati all'import.
 *
 * Ci sono DUE modi di importare due volte lo stesso movimento, e il primo
 * tentativo ne copriva solo uno:
 *
 *   1. lo stesso estratto importato due volte, o due estratti mensili che si
 *      sovrappongono → si riconosce dall'`import_hash`, che è identico;
 *   2. un movimento che era già in archivio perché inserito a mano (o arrivato
 *      dalla migrazione delle vecchie tabelle) → NON ha nessun hash, quindi
 *      il confronto per hash non lo vede e il movimento entra una seconda
 *      volta.
 *
 * Il secondo caso è quello che conta di più al primo import: l'estratto copre
 * mesi che l'utente aveva già registrato a mano. Si riconosce per importo e
 * data ravvicinata — la banca e l'utente possono aver usato date diverse di
 * un paio di giorni per lo stesso pagamento.
 *
 * La regola è volutamente prudente: segnala, non decide. Un affitto da 569,52 €
 * pagato due mesi di fila è due movimenti veri, e l'utente deve poter dire
 * "no, questo importalo". Per questo un sospetto è disattivabile nell'anteprima,
 * mentre un duplicato per hash no: quello è certo.
 */

/** Quanto possono discostarsi le due date perché sia lo stesso movimento. */
export const GIORNI_TOLLERANZA = 3;

export type TipoDuplicato = "hash" | "sospetto" | null;

/** Un movimento già in archivio, ridotto a quello che serve al confronto. */
export interface MovimentoEsistente {
  data: string;
  importo: number;
  importHash?: string | null;
}

export interface RigaDaControllare {
  dataValuta: string;
  importo: number;
  importHash: string;
}

export interface EsitoDedup<T> {
  riga: T;
  duplicato: TipoDuplicato;
  /** Il movimento già in archivio che ha fatto scattare il sospetto. */
  corrispondenza?: MovimentoEsistente;
}

const giorniFra = (a: string, b: string): number =>
  Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000;

const importoUguale = (a: number, b: number) => Math.abs(a - b) < 0.005;

/**
 * Marca ogni riga dell'estratto come duplicata o no.
 *
 * Ogni movimento già in archivio può “coprire” UNA sola riga: due addebiti
 * identici lo stesso giorno, se in archivio ce n'è uno solo, danno un sospetto
 * e un movimento nuovo — non due sospetti. È la stessa ragione per cui il
 * `disponibile` sta dentro l'hash.
 */
export function marcaDuplicati<T extends RigaDaControllare>(
  righe: T[],
  esistenti: MovimentoEsistente[]
): EsitoDedup<T>[] {
  const hashPresenti = new Set(
    esistenti.map((m) => m.importHash).filter((h): h is string => !!h)
  );

  // Solo i movimenti senza hash: quelli con hash sono già coperti dal
  // confronto esatto e non devono generare anche un sospetto.
  const senzaHash = esistenti.filter((m) => !m.importHash);
  const usati = new Set<number>();

  return righe.map((riga) => {
    if (hashPresenti.has(riga.importHash)) {
      return { riga, duplicato: "hash" as const };
    }

    const i = senzaHash.findIndex(
      (m, indice) =>
        !usati.has(indice) &&
        importoUguale(m.importo, riga.importo) &&
        giorniFra(m.data, riga.dataValuta) <= GIORNI_TOLLERANZA
    );

    if (i === -1) return { riga, duplicato: null };

    usati.add(i);
    return { riga, duplicato: "sospetto" as const, corrispondenza: senzaHash[i] };
  });
}
