/**
 * Traduzione fra la tabella unificata `movimenti` e le tre viste storiche
 * (prelievi / uscite / entrate) che il resto dell'app consuma.
 *
 * Con la tabella unica il "tipo" di un movimento non è più la tabella in cui
 * sta, è una proprietà dei dati:
 *
 *     importo < 0 e categoria Stipendio → prelievo
 *     importo < 0                       → uscita
 *     importo >= 0                      → entrata
 *
 * Le tre viste tengono l'importo POSITIVO, come hanno sempre fatto: tutta la
 * logica fiscale e i componenti si aspettano quello. Il segno vive solo nella
 * tabella.
 *
 * Stava dentro l'hook, dove nessun test poteva raggiungerlo. È il punto in cui
 * un segno sbagliato si traduce in cash disponibile sbagliato: merita di stare
 * allo scoperto e di essere coperto da `tests/movimenti.test.ts`.
 */

import type { Entrata, Movimento, Prelievo, Uscita } from "../types/fattura";
import { eStipendio } from "../constants/fiscali";

export type TipoMovimento = "prelievo" | "uscita" | "entrata";

export const eUscita = (m: Movimento): boolean => m.importo < 0;

/**
 * Il tipo di un movimento, dedotto da segno e categoria.
 *
 * Un movimento di importo 0 non ha segno: conta come entrata. Non esiste nei
 * dati (né la banca né i form producono movimenti a zero) e qualunque
 * convenzione andrebbe bene, purché sia una sola e scritta.
 */
export function tipoDiMovimento(m: Movimento): TipoMovimento {
  if (!eUscita(m)) return "entrata";
  return eStipendio(m.categoria) ? "prelievo" : "uscita";
}

export const aPrelievo = (m: Movimento): Prelievo => ({
  id: m.id,
  data: m.data,
  descrizione: m.descrizione,
  importo: -m.importo,
  note: m.note,
});

export const aUscita = (m: Movimento): Uscita => ({
  id: m.id,
  data: m.data,
  descrizione: m.descrizione,
  categoria: m.categoria,
  importo: -m.importo,
  note: m.note,
  escludiDaGrafico: m.escludiDaGrafico,
});

export const aEntrata = (m: Movimento): Entrata => ({
  id: m.id,
  data: m.data,
  descrizione: m.descrizione,
  categoria: m.categoria,
  importo: m.importo,
  note: m.note,
  escludiDaGrafico: m.escludiDaGrafico,
});

export const prelieviDa = (movimenti: Movimento[]): Prelievo[] =>
  movimenti.filter((m) => tipoDiMovimento(m) === "prelievo").map(aPrelievo);

export const usciteDa = (movimenti: Movimento[]): Uscita[] =>
  movimenti.filter((m) => tipoDiMovimento(m) === "uscita").map(aUscita);

export const entrateDa = (movimenti: Movimento[]): Entrata[] =>
  movimenti.filter((m) => tipoDiMovimento(m) === "entrata").map(aEntrata);

/** L'importo con il segno giusto per il tipo richiesto. */
export const importoConSegno = (importo: number, tipo: TipoMovimento): number =>
  tipo === "entrata" ? Math.abs(importo) : -Math.abs(importo);
