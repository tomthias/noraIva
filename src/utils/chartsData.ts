import type { Fattura, Prelievo, Uscita } from "../types/fattura";
import {
  ALIQUOTA_IMPOSTA_SOSTITUTIVA,
  ALIQUOTA_CONTRIBUTI_GS,
  COEFFICIENTE_REDDITIVITA,
} from "../constants/fiscali";

/**
 * Calcola il netto di una singola fattura
 */
function calcolaNetto(importoLordo: number): number {
  const redditoImponibile = importoLordo * COEFFICIENTE_REDDITIVITA;
  const inps = redditoImponibile * ALIQUOTA_CONTRIBUTI_GS;
  const imponibileNetto = redditoImponibile - inps;
  const imposta = imponibileNetto * ALIQUOTA_IMPOSTA_SOSTITUTIVA;
  const tasseContributi = inps + imposta;
  return importoLordo - tasseContributi;
}

export interface MonthlyData {
  mese: string;
  fatturato: number;
  prelievi: number;
  uscite: number;
  netto: number;
}

export interface CategoryData {
  categoria: string;
  importo: number;
  [key: string]: string | number;
}

/**
 * Raggruppa dati per mese e calcola totali
 * Le uscite escluse dalle statistiche NON compaiono nei grafici
 */
export function aggregaPerMese(
  fatture: Fattura[],
  prelievi: Prelievo[],
  uscite: Uscita[]
): MonthlyData[] {
  const monthlyMap = new Map<string, MonthlyData>();

  // Helper per ottenere chiave mese (YYYY-MM)
  const getMeseKey = (data: string) => data.substring(0, 7);

  // Helper per formattare mese (Gen 2025, Feb 2025, etc.)
  const formatMese = (meseKey: string) => {
    const [anno, mese] = meseKey.split("-");
    const mesiNomi = [
      "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
      "Lug", "Ago", "Set", "Ott", "Nov", "Dic"
    ];
    return `${mesiNomi[parseInt(mese) - 1]} ${anno}`;
  };

  // Processa fatture
  fatture.forEach((fattura) => {
    const meseKey = getMeseKey(fattura.data);
    const netto = calcolaNetto(fattura.importoLordo);

    if (!monthlyMap.has(meseKey)) {
      monthlyMap.set(meseKey, {
        mese: formatMese(meseKey),
        fatturato: 0,
        prelievi: 0,
        uscite: 0,
        netto: 0,
      });
    }

    const data = monthlyMap.get(meseKey)!;
    data.fatturato += fattura.importoLordo;
    data.netto += netto;
  });

  // Processa prelievi
  prelievi.forEach((prelievo) => {
    const meseKey = getMeseKey(prelievo.data);

    if (!monthlyMap.has(meseKey)) {
      monthlyMap.set(meseKey, {
        mese: formatMese(meseKey),
        fatturato: 0,
        prelievi: 0,
        uscite: 0,
        netto: 0,
      });
    }

    const data = monthlyMap.get(meseKey)!;
    data.prelievi += prelievo.importo;
  });

  // Processa uscite (esclude quelle con esclusa_da_statistiche = true)
  uscite.forEach((uscita) => {
    // Salta le uscite escluse dalle statistiche
    if (uscita.esclusa_da_statistiche) return;

    const meseKey = getMeseKey(uscita.data);

    if (!monthlyMap.has(meseKey)) {
      monthlyMap.set(meseKey, {
        mese: formatMese(meseKey),
        fatturato: 0,
        prelievi: 0,
        uscite: 0,
        netto: 0,
      });
    }

    const data = monthlyMap.get(meseKey)!;
    data.uscite += uscita.importo;
  });

  // Converti in array e ordina per data
  return Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, data]) => data);
}

/**
 * Raggruppa uscite per categoria
 * Esclude le uscite con esclusa_da_statistiche = true
 */
export function aggregaUscitePerCategoria(uscite: Uscita[]): CategoryData[] {
  const categoryMap = new Map<string, number>();

  uscite.forEach((uscita) => {
    // Salta le uscite escluse dalle statistiche
    if (uscita.esclusa_da_statistiche) return;

    const categoria = uscita.categoria || "Altro";
    const current = categoryMap.get(categoria) || 0;
    categoryMap.set(categoria, current + uscita.importo);
  });

  return Array.from(categoryMap.entries())
    .map(([categoria, importo]) => ({ categoria, importo }))
    .sort((a, b) => b.importo - a.importo);
}

/**
 * Calcola metriche per dashboard
 */
export function calcolaMetriche(
  fatture: Fattura[],
  prelievi: Prelievo[],
  uscite: Uscita[]
) {
  const oggi = new Date();
  const primoGiornoAnno = new Date(oggi.getFullYear(), 0, 1);
  const giorniPassati = Math.floor(
    (oggi.getTime() - primoGiornoAnno.getTime()) / (1000 * 60 * 60 * 24)
  );
  const giorniAnno = 365;

  const totaleFatturato = fatture.reduce((sum, f) => sum + f.importoLordo, 0);
  const totalePrelievi = prelievi.reduce((sum, p) => sum + p.importo, 0);
  const totaleUscite = uscite.reduce((sum, u) => sum + u.importo, 0);

  // Calcola netto dalle fatture
  const nettoFatture = fatture.reduce((sum, f) => {
    return sum + calcolaNetto(f.importoLordo);
  }, 0);

  const nettoDisponibile = nettoFatture - totalePrelievi - totaleUscite;

  // Proiezioni annuali basate sui giorni passati
  const proiezioneFatturato =
    giorniPassati > 0 ? (totaleFatturato / giorniPassati) * giorniAnno : 0;
  const proiezionePrelievi =
    giorniPassati > 0 ? (totalePrelievi / giorniPassati) * giorniAnno : 0;
  const proiezioneUscite =
    giorniPassati > 0 ? (totaleUscite / giorniPassati) * giorniAnno : 0;

  // Media mensile
  const mesiPassati = Math.max(1, Math.floor(giorniPassati / 30));
  const mediaFatturatoMensile = totaleFatturato / mesiPassati;
  const mediaPrelieviMensile = totalePrelievi / mesiPassati;
  const mediaUsciteMensile = totaleUscite / mesiPassati;

  return {
    totali: {
      fatturato: totaleFatturato,
      prelievi: totalePrelievi,
      uscite: totaleUscite,
      nettoFatture,
      nettoDisponibile,
    },
    proiezioni: {
      fatturato: proiezioneFatturato,
      prelievi: proiezionePrelievi,
      uscite: proiezioneUscite,
    },
    medie: {
      fatturato: mediaFatturatoMensile,
      prelievi: mediaPrelieviMensile,
      uscite: mediaUsciteMensile,
    },
  };
}
