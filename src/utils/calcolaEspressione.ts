/**
 * Valutatore di espressioni aritmetiche per i campi importo.
 *
 * Caso d'uso: registrare un movimento unico che somma più voci reali, es.
 * "acquisto auto + assicurazione" scritto come `1000+500` → 1.500,00 €.
 *
 * Implementato come parser a discesa ricorsiva, NON con `eval`/`new Function`:
 * il valore arriva da un campo di testo e non deve poter eseguire codice.
 *
 * Grammatica:
 *   espressione := termine (("+" | "-") termine)*
 *   termine     := fattore (("*" | "/") fattore)*
 *   fattore     := ("-" | "+")? (numero | "(" espressione ")")
 *
 * Formato numeri: accetta sia la virgola decimale italiana (`1500,50`) sia il
 * punto (`1500.50`), e i separatori di migliaia (`1.234,56` / `1 234,56`).
 */

export interface RisultatoEspressione {
  /** Valore calcolato, oppure null se l'espressione non è valutabile. */
  valore: number | null;
  /** Messaggio d'errore leggibile, presente solo quando `valore` è null. */
  errore?: string;
  /** true se il testo contiene un operatore, cioè è un calcolo e non un numero secco. */
  eCalcolo: boolean;
}

const OPERATORI = /[+\-*/]/;

/**
 * Normalizza i separatori italiani in un formato parsabile.
 *
 * `1.234,56` → `1234.56`   (punto = migliaia, virgola = decimali)
 * `1234,56`  → `1234.56`
 * `1.234`    → `1234`      (punto come migliaia: 3 cifre dopo)
 * `1.5`      → `1.5`       (punto come decimale: meno di 3 cifre dopo)
 */
function normalizzaNumero(testo: string): string {
  let t = testo.replace(/\s/g, "");

  if (t.includes(",")) {
    // Con la virgola presente, il punto può essere solo separatore di migliaia.
    t = t.replace(/\./g, "").replace(",", ".");
    return t;
  }

  // Solo punti: sono migliaia se ogni gruppo dopo il primo ha esattamente 3 cifre.
  const parti = t.split(".");
  if (parti.length > 2 && parti.slice(1).every((p) => p.length === 3)) {
    return parti.join("");
  }
  if (parti.length === 2 && parti[1].length === 3 && parti[0].length <= 3) {
    // Ambiguo (`1.234`): nel contesto importi è quasi sempre "milleduecentotrentaquattro".
    return parti.join("");
  }
  return t;
}

interface Parser {
  testo: string;
  pos: number;
}

function saltaSpazi(p: Parser): void {
  while (p.pos < p.testo.length && /\s/.test(p.testo[p.pos])) p.pos++;
}

function parseFattore(p: Parser): number {
  saltaSpazi(p);

  if (p.pos >= p.testo.length) {
    throw new Error("Espressione incompleta");
  }

  const c = p.testo[p.pos];

  if (c === "+" || c === "-") {
    p.pos++;
    const valore = parseFattore(p);
    return c === "-" ? -valore : valore;
  }

  if (c === "(") {
    p.pos++;
    const valore = parseEspressione(p);
    saltaSpazi(p);
    if (p.testo[p.pos] !== ")") {
      throw new Error("Manca una parentesi chiusa");
    }
    p.pos++;
    return valore;
  }

  // Numero: cifre, punti e virgole consecutivi
  const inizio = p.pos;
  while (p.pos < p.testo.length && /[\d.,]/.test(p.testo[p.pos])) p.pos++;

  if (p.pos === inizio) {
    throw new Error(`Carattere non valido: "${c}"`);
  }

  const numero = Number(normalizzaNumero(p.testo.slice(inizio, p.pos)));
  if (!Number.isFinite(numero)) {
    throw new Error(`Numero non valido: "${p.testo.slice(inizio, p.pos)}"`);
  }
  return numero;
}

function parseTermine(p: Parser): number {
  let valore = parseFattore(p);

  for (;;) {
    saltaSpazi(p);
    const c = p.testo[p.pos];
    if (c !== "*" && c !== "/") return valore;
    p.pos++;
    const destra = parseFattore(p);
    if (c === "/") {
      if (destra === 0) throw new Error("Divisione per zero");
      valore /= destra;
    } else {
      valore *= destra;
    }
  }
}

function parseEspressione(p: Parser): number {
  let valore = parseTermine(p);

  for (;;) {
    saltaSpazi(p);
    const c = p.testo[p.pos];
    if (c !== "+" && c !== "-") return valore;
    p.pos++;
    const destra = parseTermine(p);
    valore = c === "+" ? valore + destra : valore - destra;
  }
}

/**
 * Valuta un'espressione aritmetica scritta dall'utente in un campo importo.
 *
 * Una stringa vuota restituisce `{ valore: null }` senza errore: è lo stato
 * iniziale del campo, non un input sbagliato.
 */
export function calcolaEspressione(testo: string): RisultatoEspressione {
  const pulito = testo.trim();
  // Un "-" o "+" iniziale è un segno, non un operatore fra due termini.
  const eCalcolo = OPERATORI.test(pulito.slice(1));

  if (pulito === "") {
    return { valore: null, eCalcolo: false };
  }

  const p: Parser = { testo: pulito, pos: 0 };

  try {
    const valore = parseEspressione(p);
    saltaSpazi(p);

    if (p.pos < p.testo.length) {
      return {
        valore: null,
        errore: `Non capisco "${p.testo.slice(p.pos)}"`,
        eCalcolo,
      };
    }
    if (!Number.isFinite(valore)) {
      return { valore: null, errore: "Risultato non valido", eCalcolo };
    }

    // Gli importi sono in euro: due decimali, niente code binarie da 0.1 + 0.2.
    return { valore: Math.round(valore * 100) / 100, eCalcolo };
  } catch (err) {
    return {
      valore: null,
      errore: err instanceof Error ? err.message : "Espressione non valida",
      eCalcolo,
    };
  }
}
