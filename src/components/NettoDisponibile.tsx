import { useState } from "react";
import { toast } from "sonner";
import type { Fattura, Prelievo, Uscita, Entrata } from "../types/fattura";
import { calcolaAccantonamento, type RettifichePerAnno } from "../utils/calcoliFisco";
import { calcolaEspressione } from "../utils/calcolaEspressione";
import { Button } from "@/components/ui/button";
import { ImportoInput } from "@/components/ui/importo-input";
import { aliquoteStimate, getAliquotaSostitutiva } from "../constants/fiscali";
import { formatCurrency } from "../utils/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CheckCircle,
  AlertCircle,
  Wallet,
  PiggyBank,
  Info,
  AlertTriangle,
} from "lucide-react";
import { Progress } from "./ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface Props {
  fatture: Fattura[];
  prelievi: Prelievo[];
  uscite: Uscita[];
  entrate?: Entrata[];
  annoSelezionato: number;
  /** Incassato non rappresentato dalle fatture, per anno. Si somma. */
  rettifiche?: RettifichePerAnno;
  /**
   * Permette di dichiarare l'incassato dell'anno PRECEDENTE senza cambiare
   * filtro: quell'anno può non essere selezionabile, ma serve per gli acconti.
   */
  onSalvaRettificaAnnoPrecedente?: (importo: number) => void;
}

export function NettoDisponibile({
  fatture,
  prelievi,
  uscite,
  entrate = [],
  annoSelezionato,
  rettifiche = {},
  onSalvaRettificaAnnoPrecedente,
}: Props) {
  const [bozzaAnnoPrecedente, setBozzaAnnoPrecedente] = useState("");
  // Tutta la logica fiscale vive in calcoliFisco.ts: qui si consuma soltanto.
  // Analisi.tsx usa la stessa funzione, così i due schermi non possono divergere.
  const a = calcolaAccantonamento(
    fatture,
    prelievi,
    uscite,
    entrate,
    annoSelezionato,
    rettifiche
  );

  const d = a.dettaglioCash;
  const annoPrecedente = a.annoPrecedente;
  const annoProssimo = annoSelezionato + 1;

  // Progress bar: acconti dell'anno versati vs dovuti
  const totaleDovutoAccontiAnnoCorrente =
    a.primoAccontoAnnoCorrente + a.secondoAccontoAnnoCorrente;
  const percentualeAccontiVersati =
    totaleDovutoAccontiAnnoCorrente > 0
      ? Math.min(
        100,
        Math.round(
          (a.accontiVersatiNellAnno / totaleDovutoAccontiAnnoCorrente) * 100
        )
      )
      : 0;

  const aliquotaCorrente = getAliquotaSostitutiva(annoSelezionato);
  const aliquotaProssima = getAliquotaSostitutiva(annoProssimo);
  const cambioAliquota = aliquotaProssima > aliquotaCorrente;

  return (
    <div className="flex flex-col gap-6">
      {/* 1. HERO CARD: Netto Prelevabile */}
      <Card
        className={`relative overflow-hidden border-2 shadow-sm ${a.nettoSicuro >= 0
          ? "border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/10"
          : "border-red-500/20 bg-red-50/50 dark:bg-red-950/10"
          }`}
      >
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Netto Prelevabile Sicuro
              </p>
              <h2
                className={`text-4xl font-bold tracking-tight ${a.nettoSicuro >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
              >
                {formatCurrency(a.nettoSicuro)}
              </h2>
            </div>
            {a.nettoSicuro >= 0 ? (
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
            ) : (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span
              className={`text-sm font-medium px-2 py-0.5 rounded ${a.nettoSicuro >= 0
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                }`}
            >
              {a.nettoSicuro >= 0 ? "Saldo Positivo" : "Attenzione"}
            </span>
            <p className="text-sm text-muted-foreground">
              {a.nettoSicuro >= 0
                ? "Tutte le tasse stimate sono coperte."
                : "Importo insufficiente per coprire le tasse future."}
            </p>
          </div>

          {/* Scomposizione del cash: serve a confrontare voce per voce con il
              commercialista quando il totale non torna. */}
          <details className="mt-4 group">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors list-none flex items-center gap-1">
              <span className="group-open:rotate-90 transition-transform inline-block">›</span>
              Com'è composta la disponibilità di {formatCurrency(a.cashDisponibileReale)}
            </summary>
            <div className="mt-3 space-y-1.5 text-sm border-t pt-3">
              <RigaCash etichetta="Saldo iniziale" importo={d.saldoIniziale} />
              <RigaCash etichetta={`Fatturato ${annoSelezionato}`} importo={d.fatturato} />
              <RigaCash etichetta="Entrate extra" importo={d.entrateExtra} />
              <RigaCash etichetta="Stipendi prelevati" importo={-d.prelievi} />
              <RigaCash etichetta="Uscite (tasse incluse)" importo={-d.uscite} />
              <div className="flex justify-between items-center pt-2 border-t font-semibold">
                <span>Disponibilità</span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(a.cashDisponibileReale)}
                </span>
              </div>

              {d.numeroSaldiIniziali > 1 && (
                <p className="text-xs text-amber-600 pt-2 flex gap-1.5 items-start">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>
                    Ci sono <strong>{d.numeroSaldiIniziali}</strong> movimenti con categoria
                    “Saldo Iniziale” e vengono sommati tutti. Se ne serve uno solo, gli
                    altri gonfiano la disponibilità.
                  </span>
                </p>
              )}

              {d.entrateMarcateEscluse !== 0 && (
                <p className="text-xs text-amber-600 pt-2 flex gap-1.5 items-start">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>
                    Nelle entrate extra sono inclusi{" "}
                    <strong>{formatCurrency(d.entrateMarcateEscluse)}</strong> di movimenti
                    marcati “escludi dal grafico”. Il flag nasconde dai grafici ma non
                    toglie i soldi dal conto.
                  </span>
                </p>
              )}
            </div>
          </details>
        </CardContent>
      </Card>

      {/* 2. DETTAGLIO FISCALE - PROGRESS & ACCANTONAMENTO */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-amber-500" />
              Stato Accantonamento Tasse
            </CardTitle>
            <span className="text-xs font-medium px-2 py-1 bg-muted rounded-full text-muted-foreground">
              Anno {annoSelezionato}
            </span>
          </div>
          <CardDescription>
            Simulazione basata sul fatturato attuale dell'anno
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">

          {/* Avviso passaggio dal 5% al 15% dopo i 5 anni di regime startup */}
          {cambioAliquota && (
            <div className="flex gap-2 items-start text-sm rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-muted-foreground">
                Dal <span className="font-medium text-foreground">{annoProssimo}</span> finisce
                il regime start-up: l'imposta sostitutiva passa dal{" "}
                {(aliquotaCorrente * 100).toFixed(0)}% al{" "}
                <span className="font-medium text-foreground">
                  {(aliquotaProssima * 100).toFixed(0)}%
                </span>.
              </p>
            </div>
          )}

          {aliquoteStimate(annoSelezionato) && (
            <p className="text-xs text-muted-foreground">
              Aliquote INPS {annoSelezionato} stimate sull'ultimo anno noto.
            </p>
          )}

          {/* Senza dati dell'anno precedente gli acconti risultano zero e il
              "totale da tenere da parte" è pericolosamente ottimista.
              L'anno precedente può non essere selezionabile nel filtro, quindi
              l'incassato si inserisce direttamente da qui. */}
          {a.tasseAnnoPrecedente === 0 && a.tasseAnnoCorrente > 0 && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 space-y-2">
              <div className="flex gap-2 items-start text-sm">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-muted-foreground">
                  Non risultano incassi nel <strong>{annoPrecedente}</strong>, quindi
                  l'app calcola <strong>zero acconti</strong> per il {annoSelezionato}
                  {" "}e il totale qui sotto è più basso del reale. Chiedi al
                  commercialista l'<strong>incassato {annoPrecedente}</strong> (non il
                  fatturato: sono diversi) e scrivilo qui.
                </p>
              </div>
              {onSalvaRettificaAnnoPrecedente && (
                <div className="flex gap-2 items-start pl-6">
                  <div className="flex-1 max-w-[220px]">
                    <ImportoInput
                      value={bozzaAnnoPrecedente}
                      onChange={setBozzaAnnoPrecedente}
                      placeholder={`Incassato ${annoPrecedente}`}
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      const { valore, errore } = calcolaEspressione(bozzaAnnoPrecedente);
                      if (valore === null || valore < 0) {
                        toast.error(errore ?? "Inserisci un importo valido");
                        return;
                      }
                      // Si salva la differenza rispetto alle fatture già presenti,
                      // così eventuali fatture aggiunte dopo continuano a contare.
                      onSalvaRettificaAnnoPrecedente(
                        valore - a.incassiDaFattureAnnoPrecedente
                      );
                      setBozzaAnnoPrecedente("");
                      toast.success(
                        `Incassi ${annoPrecedente} allineati a ${formatCurrency(valore)}`
                      );
                    }}
                  >
                    Salva
                  </Button>
                </div>
              )}
            </div>
          )}

          {(a.rettificaAnnoCorrente !== 0 || a.rettificaAnnoPrecedente !== 0) && (
            <p className="text-xs text-blue-500/90">
              Tasse calcolate su incassi rettificati:
              {a.rettificaAnnoCorrente !== 0 &&
                ` ${annoSelezionato} ${formatCurrency(a.incassiAnnoCorrente)}`}
              {a.rettificaAnnoCorrente !== 0 && a.rettificaAnnoPrecedente !== 0 && ","}
              {a.rettificaAnnoPrecedente !== 0 &&
                ` ${annoPrecedente} ${formatCurrency(a.incassiAnnoPrecedente)}`}
              .
            </p>
          )}

          {/* Progress Bar Acconti Anno Corrente */}
          {totaleDovutoAccontiAnnoCorrente > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Acconti {annoSelezionato} versati</span>
                <span className="font-medium text-foreground">
                  {percentualeAccontiVersati}%
                </span>
              </div>
              <Progress value={percentualeAccontiVersati} className="h-2" indicatorClassName={percentualeAccontiVersati >= 100 ? "bg-green-500" : "bg-amber-500"} />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Versati: {formatCurrency(a.accontiVersatiNellAnno)}</span>
                <span>Dovuti (su tasse {annoPrecedente}): {formatCurrency(totaleDovutoAccontiAnnoCorrente)}</span>
              </div>
            </div>
          )}

          <div className="border-t border-dashed my-2" />

          <div className="space-y-3 bg-muted/40 p-4 rounded-lg">

            {/* Sezione: Scadenze anno corrente (basate su anno precedente) */}
            {a.tasseAnnoPrecedente > 0 && (
              <>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Scadenze {annoSelezionato} (su tasse {annoPrecedente})
                </div>

                {a.saldoAnnoPrecedente > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <span>Saldo Tasse {annoPrecedente}</span>
                      <InfoTooltip text={`Tasse ${annoPrecedente} (${formatCurrency(a.tasseAnnoPrecedente)}) meno gli acconti versati durante il ${annoPrecedente}. Da saldare a Giugno ${annoSelezionato}.`} />
                    </div>
                    <span className="font-mono font-medium">{formatCurrency(a.saldoAnnoPrecedente)}</span>
                  </div>
                )}

                {/* Le voci sono raggruppate per SCADENZA, non per percentuale:
                    INPS e imposta sostitutiva hanno acconti diversi (80% vs 100%)
                    ma si versano con lo stesso F24. */}
                <RigaScadenza
                  etichetta={`Acconti Giugno ${annoSelezionato}`}
                  importo={a.primoAccontoAnnoCorrente}
                  tooltip={`INPS ${formatCurrency(a.accontiInpsAnnoCorrente.primo)} (40% di ${formatCurrency(a.contributiAnnoPrecedente)}) + Imposta ${formatCurrency(a.accontiImpostaAnnoCorrente.primo)}.`}
                />
                <RigaScadenza
                  etichetta={`Acconti Novembre ${annoSelezionato}`}
                  importo={a.secondoAccontoAnnoCorrente}
                  tooltip={`INPS ${formatCurrency(a.accontiInpsAnnoCorrente.secondo)} (40% di ${formatCurrency(a.contributiAnnoPrecedente)}) + Imposta ${formatCurrency(a.accontiImpostaAnnoCorrente.secondo)}.`}
                />

                {a.accontiVersatiNellAnno > 0 && (
                  <div className="flex justify-between items-center text-sm text-green-600">
                    <span>Già versati nel {annoSelezionato}</span>
                    <span className="font-mono font-medium">-{formatCurrency(a.accontiVersatiNellAnno)}</span>
                  </div>
                )}

                <div className="border-t border-muted-foreground/10 my-2" />
              </>
            )}

            {/* Sezione: Proiezioni anno prossimo */}
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Proiezione {annoProssimo} (su tasse {annoSelezionato})
            </div>

            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span>Saldo Tasse {annoSelezionato}</span>
                <InfoTooltip text={`Tasse ${annoSelezionato} (${formatCurrency(a.tasseAnnoCorrente)}) meno gli acconti che verserai nel ${annoSelezionato}. Da pagare a Giugno ${annoProssimo}.`} />
              </div>
              <span className="font-mono font-medium">{formatCurrency(a.saldoAnnoCorrente)}</span>
            </div>

            <RigaScadenza
              etichetta={`Acconti Giugno ${annoProssimo}`}
              importo={a.primoAccontoAnnoProssimo}
              tooltip={`INPS ${formatCurrency(a.accontiInpsAnnoProssimo.primo)} (40% di ${formatCurrency(a.contributiAnnoCorrente)}) + Imposta ${formatCurrency(a.accontiImpostaAnnoProssimo.primo)}.`}
            />
            <RigaScadenza
              etichetta={`Acconti Novembre ${annoProssimo}`}
              importo={a.secondoAccontoAnnoProssimo}
              tooltip={`INPS ${formatCurrency(a.accontiInpsAnnoProssimo.secondo)} + Imposta ${formatCurrency(a.accontiImpostaAnnoProssimo.secondo)}. Non incluso nel totale: scade fra oltre un anno.`}
              attenuato
            />

            <div className="flex justify-between items-center pt-2 border-t border-muted-foreground/20">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-amber-600">Totale da tenere da parte</span>
                <InfoTooltip text={`Scadenze ${annoSelezionato} ancora da pagare (${formatCurrency(a.scadenzeAnnoCorrente)}) + saldo ${annoSelezionato} e 1° acconto ${annoProssimo} (${formatCurrency(a.proiezioneAnnoProssimo)}). Il 2° acconto ${annoProssimo} è escluso: scade a Novembre ${annoProssimo}.`} />
              </div>
              <span className="font-bold text-lg text-amber-600">
                {formatCurrency(a.totaleDaAccantonare)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RigaCash({ etichetta, importo }: { etichetta: string; importo: number }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{etichetta}</span>
      <span
        className={`font-mono tabular-nums ${importo < 0 ? "text-red-500" : ""}`}
      >
        {importo < 0 ? "−" : "+"}
        {formatCurrency(Math.abs(importo))}
      </span>
    </div>
  );
}

function RigaScadenza({
  etichetta,
  importo,
  tooltip,
  attenuato = false,
}: {
  etichetta: string;
  importo: number;
  tooltip: string;
  attenuato?: boolean;
}) {
  return (
    <div className={`flex justify-between items-center text-sm ${attenuato ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span>{etichetta}</span>
        <InfoTooltip text={tooltip} />
      </div>
      <span className="font-mono font-medium">{formatCurrency(importo)}</span>
    </div>
  );
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Info className="h-3.5 w-3.5 text-muted-foreground/70 hover:text-foreground transition-colors cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="max-w-[300px] text-xs">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
