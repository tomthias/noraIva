/**
 * Container principale sezione Analisi
 */

import { useMemo, useState } from "react";
import type { Fattura, Uscita, Entrata, Prelievo } from "../../types/fattura";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { YearFilter } from "../YearFilter";
import { KPICards } from "./KPICards";
import { StatsCards } from "./StatsCards";
import { TimelineMovimenti } from "./TimelineMovimenti";
import { PieChartCanvas } from "./PieChartCanvas";
import { BarChartCanvas } from "./BarChartCanvas";
import { LineChartCanvas } from "./LineChartCanvas";
import {
  calcolaKPI,
  aggregaPerCategoria,
  aggregaPerMese,
  classificaClienti,
  calcolaSaldoCumulativo,
  getUltimiMovimenti,
} from "../../utils/analisiCalcoli";
import { ANNO } from "../../constants/fiscali";

interface Props {
  fatture: Fattura[];
  uscite: Uscita[];
  entrate: Entrata[];
  prelievi: Prelievo[];
}

export function Analisi({ fatture, uscite, entrate, prelievi }: Props) {
  const [annoSelezionato, setAnnoSelezionato] = useState<number>(ANNO);

  // Estrai anni disponibili
  const anniDisponibili = useMemo(() => {
    const anni = new Set([
      ...fatture.map((f) => parseInt(f.data.substring(0, 4))),
      ...uscite.map((u) => parseInt(u.data.substring(0, 4))),
      ...entrate.map((e) => parseInt(e.data.substring(0, 4))),
      ...prelievi.map((p) => parseInt(p.data.substring(0, 4))),
    ]);
    return Array.from(anni).sort((a, b) => b - a);
  }, [fatture, uscite, entrate, prelievi]);

  // Calcola KPI
  const kpi = useMemo(
    () => calcolaKPI(fatture, uscite, entrate, prelievi, annoSelezionato),
    [fatture, uscite, entrate, prelievi, annoSelezionato]
  );

  // Filtra dati per anno
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
        ...entrateAnno // Già filtrate da aggregaPerCategoria internamente
      ]).map((a) => ({
        label: a.categoria,
        value: a.totale,
      })),
    [fattureAnno, entrateAnno]
  );

  const uscitePerCategoria = useMemo(
    () =>
      aggregaPerCategoria([
        ...usciteAnno, // Già filtrate da aggregaPerCategoria internamente
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

  const saldoCumulativo = useMemo(() => {
    const saldi = calcolaSaldoCumulativo(
      fattureAnno,
      usciteAnno,
      entrateAnno,
      prelieviAnno,
      annoSelezionato
    );

    // Raggruppa per mese per semplificare il grafico
    const perMese: Record<string, number> = {};
    saldi.forEach((s) => {
      const mese = s.data.substring(0, 7); // "2025-01"
      perMese[mese] = s.saldo; // Prendi l'ultimo saldo del mese
    });

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

    return Object.entries(perMese)
      .map(([mese, saldo]) => {
        const meseNum = parseInt(mese.split("-")[1]);
        return {
          label: mesiNomi[meseNum - 1],
          value: saldo,
        };
      })
      .sort((a, b) => mesiNomi.indexOf(a.label) - mesiNomi.indexOf(b.label));
  }, [fattureAnno, usciteAnno, entrateAnno, prelieviAnno, annoSelezionato]);

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
          <p className="text-muted-foreground">Statistiche e KPI completi</p>
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

      {/* Pie Charts - 2 colonne */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Entrate per Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChartCanvas data={entratePerCategoria} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Uscite per Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChartCanvas
              data={uscitePerCategoria}
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
          <CardTitle>Ultimi Movimenti</CardTitle>
        </CardHeader>
        <CardContent>
          <TimelineMovimenti movimenti={ultimiMovimenti} />
        </CardContent>
      </Card>

      {/* Bar Charts - 2 colonne */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Fatturato Mensile</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartCanvas
              data={fatturatoMensile}
              orientation="vertical"
              color="#22c55e"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 5 Clienti</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartCanvas
              data={topClienti}
              orientation="horizontal"
              color="#3b82f6"
            />
          </CardContent>
        </Card>
      </div>

      {/* Line Chart - Full width */}
      <Card>
        <CardHeader>
          <CardTitle>Saldo Cumulativo</CardTitle>
        </CardHeader>
        <CardContent>
          <LineChartCanvas data={saldoCumulativo} color="#8b5cf6" />
        </CardContent>
      </Card>
    </div>
  );
}
