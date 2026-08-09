/**
 * Traduzione fra la tabella unificata `movimenti` e le tre viste storiche
 * (prelievi / uscite / entrate) che il resto dell'app consuma.
 *
 * Nella tabella unica il tipo di un movimento non è più una tabella, è una
 * proprietà dei dati:
 *
 *     importo < 0 e categoria "Stipendio"  → prelievo (stipendio)
 *     importo < 0                          → uscita
 *     importo >= 0                         → entrata
 *
 * Cambiare tipo a un movimento è quindi un UPDATE, non più un insert in
 * un'altra tabella seguito da un delete.
 *
 * Le tre viste tengono l'importo POSITIVO, come hanno sempre fatto: tutta la
 * logica fiscale e i componenti si aspettano quello. Il segno vive solo nella
 * tabella.
 */

import type { Entrata, Movimento, Prelievo, Uscita } from "../types/fattura";

/** Categoria che marca un prelievo (ex tabella `prelievi`) nella tabella unica. */
export const CATEGORIA_STIPENDIO = "Stipendio";

export type TipoMovimento = "prelievo" | "uscita" | "entrata";

/**
 * Riconosce la categoria stipendio. Case-insensitive e tollerante al plurale
 * perché `normalizzaCategoria()` mappa "Stipendio" → "Stipendi": un movimento
 * salvato passando da lì non deve smettere di essere uno stipendio.
 */
export function isStipendio(categoria: string | undefined | null): boolean {
  if (!categoria) return false;
  return /^stipendi[oi]?$/i.test(categoria.trim());
}

/**
 * Il tipo di un movimento, dedotto da segno e categoria.
 *
 * Un movimento di importo 0 non ha segno: conta come entrata. È un caso che
 * nei dati non esiste (né la banca né i form producono movimenti a zero) e
 * qualunque convenzione andrebbe bene, purché sia una sola e documentata.
 */
export function tipoDiMovimento(movimento: Movimento): TipoMovimento {
  if (movimento.importo >= 0) return "entrata";
  return isStipendio(movimento.categoria) ? "prelievo" : "uscita";
}

export function movimentoAPrelievo(m: Movimento): Prelievo {
  return {
    id: m.id,
    data: m.data,
    descrizione: m.descrizione,
    importo: Math.abs(m.importo),
    note: m.note,
  };
}

export function movimentoAUscita(m: Movimento): Uscita {
  return {
    id: m.id,
    data: m.data,
    descrizione: m.descrizione,
    categoria: m.categoria,
    importo: Math.abs(m.importo),
    note: m.note,
    escludiDaGrafico: m.escludiDaGrafico ?? false,
  };
}

export function movimentoAEntrata(m: Movimento): Entrata {
  return {
    id: m.id,
    data: m.data,
    descrizione: m.descrizione,
    categoria: m.categoria,
    importo: Math.abs(m.importo),
    note: m.note,
    escludiDaGrafico: m.escludiDaGrafico ?? false,
  };
}

export function prelieviDa(movimenti: Movimento[]): Prelievo[] {
  return movimenti.filter((m) => tipoDiMovimento(m) === "prelievo").map(movimentoAPrelievo);
}

export function usciteDa(movimenti: Movimento[]): Uscita[] {
  return movimenti.filter((m) => tipoDiMovimento(m) === "uscita").map(movimentoAUscita);
}

export function entrateDa(movimenti: Movimento[]): Entrata[] {
  return movimenti.filter((m) => tipoDiMovimento(m) === "entrata").map(movimentoAEntrata);
}

/** L'importo con il segno giusto per il tipo richiesto. */
export function importoConSegno(importo: number, tipo: TipoMovimento): number {
  const assoluto = Math.abs(importo);
  return tipo === "entrata" ? assoluto : -assoluto;
}

/**
 * La categoria da salvare per un movimento di quel tipo: un prelievo è per
 * definizione uno stipendio, gli altri tengono la loro.
 */
export function categoriaPerTipo(
  tipo: TipoMovimento,
  categoria: string | undefined
): string | null {
  if (tipo === "prelievo") return CATEGORIA_STIPENDIO;
  return categoria || null;
}
