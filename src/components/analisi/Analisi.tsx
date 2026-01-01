/**
 * Container principale sezione Analisi
 * Hub finanziario con statistiche, grafici e consigli personalizzati
 */

import { useMemo, useState } from "react";
import type { Fattura, Uscita, Entrata, Prelievo } from "../../types/fattura";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { YearFilter } from "../YearFilter";
import { KPICards } from "./KPICards";
import { StatsCards } from "./StatsCards";
import { TimelineMovimenti } from "./TimelineMovimenti";
import { RechartsBarChart } from "./RechartsBarChart";
import { RechartsPieChart } from "./RechartsPieChart";
import { RechartsLineChart } from "./RechartsLineChart";
import { StipendioPrevisto } from "./StipendioPrevisto";
import { BudgetRule } from "./BudgetRule";
import { ConsigliFinanziari } from "./ConsigliFinanziari";
import {
  calcolaKPI,
  aggregaPerCategoria,
  aggregaPerMese,
  classificaClienti,
  calcolaSaldoCumulativo,
  getUltimiMovimenti,
} from "../../utils/analisiCalcoli";
import { calcolaTasseTotali, calcolaSituazioneCashFlow } from "../../utils/calcoliFisco";
import { ANNO } from "../../constants/fiscali";

interface Props {
  fatture: Fattura[];
  uscite: Uscita[];
  entrate: Entrata[];
  prelievi: Prelievo[];
}

export function Analisi({ fatture, uscite, entrate, prelievi }: Props) {
  const [annoSelezionato, setAnnoSelezionato] = useState<number>(ANNO);

  // Estrai anni disponibili, includendo sempre anno corrente e prossimo
  const anniDisponibili = useMemo(() => {
    const anni = new Set([
      ...fatture.map((f) => parseInt(f.data.substring(0, 4))),
      ...uscite.map((u) => parseInt(u.data.substring(0, 4))),
      ...entrate.map((e) => parseInt(e.data.substring(0, 4))),
      ...prelievi.map((p) => parseInt(p.data.substring(0, 4))),
    ]);
    // Aggiungi sempre anno corrente e prossimo anno
    anni.add(ANNO);
    anni.add(ANNO + 1);
    return Array.from(anni).sort((a, b) => b - a);
  }, [fatture, uscite, entrate, prelievi]);

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

  // Filtri CUMULATIVI per cash flow (come Dashboard)
  const fattureCumulative = useMemo(
    () => fatture.filter((f) => parseInt(f.data.substring(0, 4)) <= annoSelezionato),
    [fatture, annoSelezionato]
  );
  const usciteCumulative = useMemo(
    () => uscite.filter((u) => parseInt(u.data.substring(0, 4)) <= annoSelezionato),
    [uscite, annoSelezionato]
  );
  const entrateCumulative = useMemo(
    () => entrate.filter((e) => parseInt(e.data.substring(0, 4)) <= annoSelezionato),
    [entrate, annoSelezionato]
  );
  const prelieviCumulativi = useMemo(
    () => prelievi.filter((p) => parseInt(p.data.substring(0, 4)) <= annoSelezionato),
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

  const saldoCumulativo = useMemo(() => {
    const saldi = calcolaSaldoCumulativo(
      fattureAnno,
      usciteAnno,
      entrateAnno,
      prelieviAnno,
      annoSelezionato
    );

    const perMese: Record<string, number> = {};
    saldi.forEach((s) => {
      const mese = s.data.substring(0, 7);
      perMese[mese] = s.saldo;
    });

    const mesiNomi = [
      "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
      "Lug", "Ago", "Set", "Ott", "Nov", "Dic",
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

  // Calcoli per consigli finanziari - usa stessa logica della Dashboard (dati CUMULATIVI)
  const calcoliFinanziari = useMemo(() => {
    // Usa calcolaSituazioneCashFlow con dati CUMULATIVI come la Dashboard
    const cashFlow = calcolaSituazioneCashFlow(
      fattureCumulative,
      prelieviCumulativi,
      usciteCumulative,
      entrateCumulative
    );
    const nettoDisponibile = cashFlow.nettoDisponibile;

    // --- ANNO CORRENTE ---
    const tasseTeoricheAnno = calcolaTasseTotali(fattureAnno);

    // --- ANNO PRECEDENTE ---
    const annoPrecedente = annoSelezionato - 1;
    const fattureAnnoPrecedente = fatture.filter(f => f.data.startsWith(String(annoPrecedente)));
    const tasseTeoricheAnnoPrecedente = calcolaTasseTotali(fattureAnnoPrecedente);

    // Acconti versati nell'anno precedente
    const usciteAnnoPrecedente = uscite.filter(u => u.data.startsWith(String(annoPrecedente)));
    const accontiVersatiAnnoPrecedente = usciteAnnoPrecedente
      .filter(u => u.categoria?.toLowerCase().includes('acconto'))
      .reduce((sum, u) => sum + u.importo, 0);

    // Saldo anno precedente (residuo da pagare a giugno anno corrente)
    const saldoAnnoPrecedente = Math.max(0, tasseTeoricheAnnoPrecedente - accontiVersatiAnnoPrecedente);

    // Acconti anno corrente (basati su tasse anno precedente)
    const primoAccontoAnnoCorrente = tasseTeoricheAnnoPrecedente * 0.4;
    const secondoAccontoAnnoCorrente = tasseTeoricheAnnoPrecedente * 0.6;

    // Acconti già versati nell'anno corrente
    const accontiVersatiAnnoCorrente = usciteAnno
      .filter(u => u.categoria?.toLowerCase().includes('acconto'))
      .reduce((sum, u) => sum + u.importo, 0);

    // Quanto rimane da pagare degli acconti anno corrente
    const accontiAnnoCorrenteDaPagare = Math.max(
      0,
      primoAccontoAnnoCorrente + secondoAccontoAnnoCorrente - accontiVersatiAnnoCorrente
    );

    // --- PROIEZIONE ANNO SUCCESSIVO ---
    const primoAccontoAnnoProssimo = tasseTeoricheAnno * 0.4;

    // TOTALE DA ACCANTONARE
    // NON includiamo saldoAnnoCorrente perché verrà pagato solo a Giugno anno prossimo
    const tasseDaAccantonare =
      saldoAnnoPrecedente +
      accontiAnnoCorrenteDaPagare +
      primoAccontoAnnoProssimo;

    // Media stipendio mensile (dell'anno corrente)
    const totalePrelievi = prelieviAnno.reduce((sum, p) => sum + p.importo, 0);
    const mesiConPrelievi = new Set(prelieviAnno.map(p => p.data.substring(0, 7))).size || 1;
    const mediaStipendioMensile = totalePrelievi / mesiConPrelievi;

    // Media uscite mensili (escluse tasse, dell'anno corrente)
    const usciteNonTasse = usciteAnno
      .filter(u => !u.categoria?.toLowerCase().startsWith('tasse'))
      .reduce((sum, u) => sum + u.importo, 0);
    const mediaUsciteMensili = usciteNonTasse / 12;

    // Mese prossimo
    const mesiNomi = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
      "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
    const meseProssimo = mesiNomi[(new Date().getMonth() + 1) % 12];

    return {
      nettoDisponibile,
      tasseDaAccantonare,
      mediaStipendioMensile,
      mediaUsciteMensili,
      meseProssimo,
      mediaFatturatoMensile: kpi.mediaFatturatoMensile,
      numeroClienti: kpi.numeroClienti,
    };
  }, [fattureCumulative, usciteCumulative, entrateCumulative, prelieviCumulativi, fattureAnno, usciteAnno, prelieviAnno, kpi, fatture, uscite, annoSelezionato]);

  return (
    <div className="space-y-6">
      {/* Header con filtro anno */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analisi & Consigli</h2>
          <p className="text-muted-foreground">Il tuo hub finanziario personale</p>
        </div>
        <YearFilter
          anni={anniDisponibili}
          annoSelezionato={annoSelezionato}
          onChange={(anno) => setAnnoSelezionato(anno ?? ANNO)}
        />
      </div>

      {/* Sezione Consigli Finanziari */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StipendioPrevisto
          nettoDisponibile={calcoliFinanziari.nettoDisponibile}
          tasseDaAccantonare={calcoliFinanziari.tasseDaAccantonare}
          mese={calcoliFinanziari.meseProssimo}
        />
        <BudgetRule stipendioMensile={calcoliFinanziari.mediaStipendioMensile} />
      </div>

      {/* Consigli personalizzati */}
      <ConsigliFinanziari
        nettoDisponibile={calcoliFinanziari.nettoDisponibile}
        tasseDaAccantonare={calcoliFinanziari.tasseDaAccantonare}
        mediaFatturatoMensile={calcoliFinanziari.mediaFatturatoMensile}
        mediaUsciteMensili={calcoliFinanziari.mediaUsciteMensili}
        numeroClienti={calcoliFinanziari.numeroClienti}
      />

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
            <CardTitle className="text-base">Entrate per Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <RechartsPieChart data={entratePerCategoria} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Uscite per Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <RechartsPieChart
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
            />
          </CardContent>
        </Card>
      </div>

      {/* Line Chart - Full width */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saldo Cumulativo</CardTitle>
        </CardHeader>
        <CardContent>
          <RechartsLineChart
            data={saldoCumulativo}
            color="#8b5cf6"
            gradientId="lineGradientSaldo"
          />
        </CardContent>
      </Card>
    </div>
  );
}
