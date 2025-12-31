/**
 * Utility per calcoli analitici e aggregazioni
 */

import type { Fattura, Uscita, Entrata, Prelievo } from "../types/fattura";

/**
 * Filtra entrate valide escludendo categorie speciali
 * - Esclude Saldo Iniziale (non è denaro fresco)
 * - Esclude items con escludiDaGrafico = true
 */
export function filtraEntrateValide(entrate: Entrata[]): Entrata[] {
  return entrate.filter(e =>
    e.categoria !== 'Saldo Iniziale' &&
    !e.escludiDaGrafico
  );
}

/**
 * Filtra uscite valide escludendo movimenti speciali
 * - Esclude items con escludiDaGrafico = true
 */
export function filtraUsciteValide(uscite: Uscita[]): Uscita[] {
  return uscite.filter(u => !u.escludiDaGrafico);
}

/**
 * Dati aggregati per categoria
 */
export interface AggregatoCategoria {
  categoria: string;
  totale: number;
  percentuale?: number;
}

/**
 * Dati aggregati per mese
 */
export interface AggregatoMese {
  mese: string;
  totale: number;
  anno: number;
}

/**
 * Statistiche cliente
 */
export interface StatisticaCliente {
  cliente: string;
  totale: number;
  count: number;
  percentuale?: number;
}

/**
 * Dati per saldo cumulativo
 */
export interface SaldoCumulativo {
  data: string;
  saldo: number;
}

/**
 * KPI principali
 */
export interface KPI {
  totaleEntrate: number;
  totaleUscite: number;
  saldoNetto: number;
  mediaFatturatoMensile: number;
  migliorCliente: { nome: string; importo: number };
  numeroFatture: number;
  numeroClienti: number;
}

/**
 * Normalizza una categoria: Title Case, trim, e mappature speciali
 */
export function normalizzaCategoria(categoria: string | undefined): string {
  if (!categoria) return 'Altro';
  const trimmed = categoria.trim();

  // Se già in formato Title Case, restituisci così com'è
  if (trimmed.charAt(0) === trimmed.charAt(0).toUpperCase() &&
      trimmed.slice(1) === trimmed.slice(1).toLowerCase()) {
    return trimmed;
  }

  // Converti in Title Case
  const titleCase = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();

  // Mappature speciali per uniformità
  if (titleCase === 'Fattura') return 'Fatture';
  if (titleCase === 'Rimborso') return 'Rimborsi';
  if (titleCase === 'Stipendio') return 'Stipendi';
  if (titleCase === 'Interesse') return 'Interessi';

  return titleCase;
}

/**
 * Aggrega dati per categoria
 * ✅ CORRETTO: filtra Saldo Iniziale e items con escludiDaGrafico
 * ✅ NORMALIZZA categorie per evitare duplicati (Tasse vs tasse)
 */
export function aggregaPerCategoria(
  items: (Uscita | Entrata)[]
): AggregatoCategoria[] {
  // ✅ Filtra items validi prima di aggregare
  const itemsValidi = items.filter(item => {
    // Escludi Saldo Iniziale
    if (item.categoria === 'Saldo Iniziale') return false;
    // Escludi se marcato escludiDaGrafico
    if (item.escludiDaGrafico) return false;
    return true;
  });

  const grouped = itemsValidi.reduce((acc, item) => {
    const cat = normalizzaCategoria(item.categoria);
    if (!acc[cat]) {
      acc[cat] = 0;
    }
    acc[cat] += item.importo;
    return acc;
  }, {} as Record<string, number>);

  const totaleComplessivo = Object.values(grouped).reduce((sum, val) => sum + val, 0);

  return Object.entries(grouped)
    .map(([categoria, totale]) => ({
      categoria,
      totale,
      percentuale: totaleComplessivo > 0 ? (totale / totaleComplessivo) * 100 : 0,
    }))
    .sort((a, b) => b.totale - a.totale);
}

/**
 * Aggrega fatture per mese
 */
export function aggregaPerMese(
  fatture: Fattura[],
  anno?: number
): AggregatoMese[] {
  const fattureAnno = anno
    ? fatture.filter((f) => f.data.startsWith(String(anno)))
    : fatture;

  const grouped = fattureAnno.reduce((acc, fattura) => {
    const mese = fattura.data.substring(5, 7); // "2025-01-20" -> "01"
    const annoFattura = parseInt(fattura.data.substring(0, 4));

    const key = `${annoFattura}-${mese}`;
    if (!acc[key]) {
      acc[key] = { totale: 0, anno: annoFattura };
    }
    acc[key].totale += fattura.importoLordo;
    return acc;
  }, {} as Record<string, { totale: number; anno: number }>);

  const mesiNomi = [
    "Gen",
    "Feb",
    "Mar",
    "Apr",
    "Mag",
    "Giu",
    "Lug",
    "Ago",
    "Set",
    "Ott",
    "Nov",
    "Dic",
  ];

  return Object.entries(grouped)
    .map(([key, { totale, anno }]) => {
      const mese = key.split("-")[1];
      return {
        mese: mesiNomi[parseInt(mese) - 1],
        totale,
        anno,
      };
    })
    .sort((a, b) => {
      if (a.anno !== b.anno) return a.anno - b.anno;
      return mesiNomi.indexOf(a.mese) - mesiNomi.indexOf(b.mese);
    });
}

/**
 * Classifica clienti per fatturato
 */
export function classificaClienti(
  fatture: Fattura[],
  top: number = 5
): StatisticaCliente[] {
  const grouped = fatture.reduce((acc, fattura) => {
    const cliente = fattura.cliente;
    if (!acc[cliente]) {
      acc[cliente] = { totale: 0, count: 0 };
    }
    acc[cliente].totale += fattura.importoLordo;
    acc[cliente].count += 1;
    return acc;
  }, {} as Record<string, { totale: number; count: number }>);

  const totaleComplessivo = Object.values(grouped).reduce(
    (sum, { totale }) => sum + totale,
    0
  );

  return Object.entries(grouped)
    .map(([cliente, { totale, count }]) => ({
      cliente,
      totale,
      count,
      percentuale:
        totaleComplessivo > 0 ? (totale / totaleComplessivo) * 100 : 0,
    }))
    .sort((a, b) => b.totale - a.totale)
    .slice(0, top);
}

/**
 * Calcola saldo cumulativo nel tempo
 * ✅ CORRETTO: filtra Saldo Iniziale e escludiDaGrafico
 */
export function calcolaSaldoCumulativo(
  fatture: Fattura[],
  uscite: Uscita[],
  entrate: Entrata[],
  prelievi: Prelievo[],
  anno?: number
): SaldoCumulativo[] {
  // ✅ Filtra entrate e uscite valide
  const entrateValide = filtraEntrateValide(entrate);
  const usciteValide = filtraUsciteValide(uscite);

  // Crea array di tutti i movimenti con segno
  const movimenti: { data: string; importo: number }[] = [
    ...fatture.map((f) => ({ data: f.data, importo: f.importoLordo })),
    ...entrateValide.map((e) => ({ data: e.data, importo: e.importo })),
    ...usciteValide.map((u) => ({ data: u.data, importo: -u.importo })),
    ...prelievi.map((p) => ({ data: p.data, importo: -p.importo })),
  ];

  // Filtra per anno se specificato
  const movimentiFiltrati = anno
    ? movimenti.filter((m) => m.data.startsWith(String(anno)))
    : movimenti;

  // Ordina per data
  movimentiFiltrati.sort((a, b) => a.data.localeCompare(b.data));

  // Calcola saldo progressivo
  let saldoCorrente = 0;
  const saldi: SaldoCumulativo[] = [];

  movimentiFiltrati.forEach((mov) => {
    saldoCorrente += mov.importo;
    saldi.push({
      data: mov.data,
      saldo: saldoCorrente,
    });
  });

  return saldi;
}

/**
 * Calcola tutti i KPI principali
 */
export function calcolaKPI(
  fatture: Fattura[],
  uscite: Uscita[],
  entrate: Entrata[],
  prelievi: Prelievo[],
  anno?: number
): KPI {
  // Filtra per anno se specificato
  const fattureAnno = anno
    ? fatture.filter((f) => f.data.startsWith(String(anno)))
    : fatture;
  const usciteAnno = anno
    ? uscite.filter((u) => u.data.startsWith(String(anno)))
    : uscite;
  const entrateAnno = anno
    ? entrate.filter((e) => e.data.startsWith(String(anno)))
    : entrate;
  const prelieviAnno = anno
    ? prelievi.filter((p) => p.data.startsWith(String(anno)))
    : prelievi;

  // ✅ CORREZIONE: filtrare Saldo Iniziale e escludiDaGrafico
  const entrateValide = filtraEntrateValide(entrateAnno);
  const usciteValide = filtraUsciteValide(usciteAnno);

  // Totale entrate (fatture + altre entrate VALIDE)
  const totaleFatture = fattureAnno.reduce(
    (sum, f) => sum + f.importoLordo,
    0
  );
  const totaleAltreEntrate = entrateValide.reduce((sum, e) => sum + e.importo, 0);
  const totaleEntrate = totaleFatture + totaleAltreEntrate;

  // Totale uscite (uscite VALIDE + prelievi)
  const totaleUsciteBase = usciteValide.reduce((sum, u) => sum + u.importo, 0);
  const totalePrelievi = prelieviAnno.reduce((sum, p) => sum + p.importo, 0);
  const totaleUscite = totaleUsciteBase + totalePrelievi;

  // Saldo netto
  const saldoNetto = totaleEntrate - totaleUscite;

  // Media fatturato mensile (solo fatture)
  const mesiUnici = new Set(
    fattureAnno.map((f) => f.data.substring(0, 7))
  ).size;
  const mediaFatturatoMensile = mesiUnici > 0 ? totaleFatture / mesiUnici : 0;

  // Miglior cliente
  const clienti = classificaClienti(fattureAnno, 1);
  const migliorCliente =
    clienti.length > 0
      ? { nome: clienti[0].cliente, importo: clienti[0].totale }
      : { nome: "N/A", importo: 0 };

  // Numero fatture e clienti
  const numeroFatture = fattureAnno.length;
  const numeroClienti = new Set(fattureAnno.map((f) => f.cliente)).size;

  return {
    totaleEntrate,
    totaleUscite,
    saldoNetto,
    mediaFatturatoMensile,
    migliorCliente,
    numeroFatture,
    numeroClienti,
  };
}

/**
 * Ottieni ultimi N movimenti (tutti i tipi combinati)
 */
export function getUltimiMovimenti(
  fatture: Fattura[],
  uscite: Uscita[],
  entrate: Entrata[],
  prelievi: Prelievo[],
  limit: number = 7
): Array<{
  id: string;
  data: string;
  descrizione: string;
  importo: number;
  tipo: "fattura" | "entrata" | "uscita" | "prelievo";
}> {
  // ✅ Filtra entrate e uscite valide
  const entrateValide = filtraEntrateValide(entrate);
  const usciteValide = filtraUsciteValide(uscite);

  const movimenti = [
    ...fatture.map((f) => ({
      id: f.id,
      data: f.data,
      descrizione: `${f.cliente} - ${f.descrizione}`,
      importo: f.importoLordo,
      tipo: "fattura" as const,
    })),
    ...entrateValide.map((e) => ({
      id: e.id,
      data: e.data,
      descrizione: e.descrizione,
      importo: e.importo,
      tipo: "entrata" as const,
    })),
    ...usciteValide.map((u) => ({
      id: u.id,
      data: u.data,
      descrizione: u.descrizione,
      importo: -u.importo,
      tipo: "uscita" as const,
    })),
    ...prelievi.map((p) => ({
      id: p.id,
      data: p.data,
      descrizione: p.descrizione,
      importo: -p.importo,
      tipo: "prelievo" as const,
    })),
  ];

  return movimenti.sort((a, b) => b.data.localeCompare(a.data)).slice(0, limit);
}
