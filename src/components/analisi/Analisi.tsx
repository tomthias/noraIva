/**
 * Sezione Analisi: dove vanno i soldi. Solo grafici e statistiche descrittive;
 * i numeri che guidano le decisioni (netto, tasse, fondo) stanno in Dashboard
 * e vengono tutti da `utils/fisco.ts`.
 */

import { useMemo, useState } from "react";
import type {
  AperturaConto,
  Fattura,
  Movimento,
  Uscita,
  Entrata,
  Prelievo,
} from "../../types/fattura";
import { eIncassata } from "../../types/fattura";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { YearFilter } from "../YearFilter";
import { KPICards } from "./KPICards";
import { StatsCards } from "./StatsCards";
import { TimelineMovimenti } from "./TimelineMovimenti";
import { RechartsBarChart } from "./RechartsBarChart";
import { RechartsPieChart } from "./RechartsPieChart";
import { RechartsLineChart } from "./RechartsLineChart";
import {
  calcolaKPI,
  aggregaPerCategoria,
  aggregaPerMese,
  classificaClienti,
  getUltimiMovimenti,
} from "../../utils/analisiCalcoli";
import { cassa } from "../../utils/fisco";
import { ANNO, eInteressi } from "../../constants/fiscali";
import { formatCurrency } from "../../utils/format";

interface Props {
  fatture: Fattura[];
  movimenti: Movimento[];
  uscite: Uscita[];
  entrate: Entrata[];
  prelievi: Prelievo[];
  apertura: AperturaConto;
}

export function Analisi({
  fatture: tutteLeFatture,
  movimenti,
  uscite,
  entrate,
  prelievi,
  apertura,
}: Props) {
  const [annoSelezionato, setAnnoSelezionato] = useState<number>(ANNO);
  // Le analisi lavorano sugli incassi: una fattura da pagare non ha ancora una data.
  const fatture = useMemo(() => tutteLeFatture.filter(eIncassata), [tutteLeFatture]);

  const anniDisponibili = useMemo(() => {
    const anni = new Set([
      ...fatture.map((f) => parseInt(f.data.substring(0, 4))),
      ...uscite.map((u) => parseInt(u.data.substring(0, 4))),
      ...entrate.map((e) => parseInt(e.data.substring(0, 4))),
      ...prelievi.map((p) => parseInt(p.data.substring(0, 4))),
    ]);
    // Aggiungi sempre anno corrente
    anni.add(ANNO);
    return Array.from(anni).sort((a, b) => b - a);
  }, [fatture, uscite, entrate, prelievi]);

  // Interessi accreditati nell'anno: solo quelli realmente arrivati.
  const interessiAnno = useMemo(
    () =>
      entrate
        .filter((e) => e.data.startsWith(String(annoSelezionato)) && eInteressi(e.categoria))
        .reduce((somma, e) => somma + e.importo, 0),
    [entrate, annoSelezionato]
  );

  // Calcola KPI
  const kpi = useMemo(
    () => calcolaKPI(fatture, uscite, entrate, prelievi, annoSelezionato),
    [fatture, uscite, entrate, prelievi, annoSelezionato]
  );

  // Filtra dati per anno (per grafici)
  const fattureAnno = useMemo(
    () => fatture.filter((f) => f.data.startsWith(String(annoSelezionato))),
    [fatture, annoSelezionato]
  );

  const usciteAnno = useMemo(
    () => uscite.filter((u) => u.data.startsWith(String(annoSelezionato))),
    [uscite, annoSelezionato]
  );

  const entrateAnno = useMemo(
    () => entrate.filter((e) => e.data.startsWith(String(annoSelezionato))),
    [entrate, annoSelezionato]
  );

  const prelieviAnno = useMemo(
    () => prelievi.filter((p) => p.data.startsWith(String(annoSelezionato))),
    [prelievi, annoSelezionato]
  );

  // Aggregazioni per grafici
  const entratePerCategoria = useMemo(
    () =>
      aggregaPerCategoria([
        ...fattureAnno.map(f => ({
          ...f,
          categoria: 'Fatture',
          importo: f.importoLordo,
          escludiDaGrafico: false
        })),
        ...entrateAnno
      ]).map((a) => ({
        label: a.categoria,
        value: a.totale,
      })),
    [fattureAnno, entrateAnno]
  );

  const uscitePerCategoria = useMemo(
    () =>
      aggregaPerCategoria([
        ...usciteAnno,
        ...prelieviAnno.map(p => ({
          ...p,
          categoria: 'Stipendi',
          escludiDaGrafico: false
        }))
      ]).map((a) => ({
        label: a.categoria,
        value: a.totale,
      })),
    [usciteAnno, prelieviAnno]
  );

  const fatturatoMensile = useMemo(
    () =>
      aggregaPerMese(fattureAnno, annoSelezionato).map((a) => ({
        label: a.mese,
        value: a.totale,
      })),
    [fattureAnno, annoSelezionato]
  );

  const topClienti = useMemo(
    () =>
      classificaClienti(fattureAnno, 5).map((c) => ({
        label: c.cliente,
        value: c.totale,
      })),
    [fattureAnno]
  );

  // Saldo del conto a fine mese: stessa funzione `cassa` della Dashboard, così
  // l'ultimo punto della curva coincide con il saldo mostrato là.
  const saldoCumulativo = useMemo(() => {
    const mesiNomi = [
      "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
      "Lug", "Ago", "Set", "Ott", "Nov", "Dic",
    ];
    const oggi = new Date().toISOString().slice(0, 10);
    return mesiNomi
      .map((label, i) => {
        const fineMese = new Date(Date.UTC(annoSelezionato, i + 1, 0)).toISOString().slice(0, 10);
        return { label, fineMese };
      })
      .filter(({ fineMese }) => fineMese.slice(0, 7) <= oggi.slice(0, 7) && fineMese > apertura.data)
      .map(({ label, fineMese }) => ({
        label,
        value: cassa(apertura, movimenti.filter((m) => m.data <= fineMese)),
      }));
  }, [movimenti, apertura, annoSelezionato]);

  const ultimiMovimenti = useMemo(
    () => getUltimiMovimenti(fatture, uscite, entrate, prelievi, 7),
    [fatture, uscite, entrate, prelievi]
  );

  return (
    <div className="space-y-6">
      {/* Header con filtro anno */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analisi</h2>
          <p className="text-muted-foreground">Dove vanno i soldi, anno per anno</p>
        </div>
        <YearFilter
          anni={anniDisponibili}
          annoSelezionato={annoSelezionato}
          onChange={(anno) => setAnnoSelezionato(anno ?? ANNO)}
        />
      </div>

      {/* KPI Cards - 3 colonne */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICards
          totaleEntrate={kpi.totaleEntrate}
          totaleUscite={kpi.totaleUscite}
          saldoNetto={kpi.saldoNetto}
        />
      </div>

      {/* Interessi maturati: nessuna previsione, solo la somma di quello che
          la banca ha accreditato davvero. */}
      {interessiAnno > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Interessi maturati nel {annoSelezionato}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-500">
              {formatCurrency(interessiAnno)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Somma degli accrediti già arrivati sul conto (≈ 2,1% lordo sulla
              liquidità BBVA). Non è una previsione: gli interessi futuri
              compaiono qui quando la banca li versa.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pie Charts - 2 colonne */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entrate per Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <RechartsPieChart data={entratePerCategoria} etichetta="Entrate" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Uscite per Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <RechartsPieChart
              data={uscitePerCategoria}
              etichetta="Uscite"
              colors={[
                "#ef4444",
                "#f97316",
                "#f59e0b",
                "#eab308",
                "#84cc16",
                "#22c55e",
                "#10b981",
                "#14b8a6",
              ]}
            />
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards - 4 colonne */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCards
          mediaFatturatoMensile={kpi.mediaFatturatoMensile}
          migliorCliente={kpi.migliorCliente}
          numeroFatture={kpi.numeroFatture}
          numeroClienti={kpi.numeroClienti}
        />
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ultimi Movimenti</CardTitle>
        </CardHeader>
        <CardContent>
          <TimelineMovimenti movimenti={ultimiMovimenti} />
        </CardContent>
      </Card>

      {/* Bar Charts - 2 colonne */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fatturato Mensile</CardTitle>
          </CardHeader>
          <CardContent>
            <RechartsBarChart
              data={fatturatoMensile}
              color="#22c55e"
              gradientId="barGradientFatturato"
              etichetta="Fatturato del mese"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 5 Clienti</CardTitle>
          </CardHeader>
          <CardContent>
            <RechartsBarChart
              data={topClienti}
              color="#3b82f6"
              gradientId="barGradientClienti"
              etichetta="Fatturato cliente"
              mostraPercentuale
            />
          </CardContent>
        </Card>
      </div>

      {/* Line Chart - Full width */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saldo del conto a fine mese</CardTitle>
        </CardHeader>
        <CardContent>
          <RechartsLineChart
            data={saldoCumulativo}
            color="#8b5cf6"
            gradientId="lineGradientSaldo"
            etichetta="Saldo a fine mese"
          />
        </CardContent>
      </Card>
    </div>
  );
}
