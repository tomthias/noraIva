import type { Fattura, Prelievo, Uscita, Entrata } from "../types/fattura";
import {
  calcolaSituazioneCashFlow,
  calcolaTasseTotali,
} from "../utils/calcoliFisco";
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
  TrendingDown,
  TrendingUp,
  PiggyBank,
  Landmark,
  Info,
  User,
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
}

export function NettoDisponibile({
  fatture,
  prelievi,
  uscite,
  entrate = [],
  annoSelezionato,
}: Props) {
  // --- CALCOLI LOGICA ---
  const fattureFiltrate = fatture.filter((f) => {
    const anno = parseInt(f.data.substring(0, 4));
    return anno <= annoSelezionato;
  });

  const prelieviFiltrati = prelievi.filter((p) => {
    const anno = parseInt(p.data.substring(0, 4));
    return anno <= annoSelezionato;
  });

  const usciteFiltrate = uscite.filter((u) => {
    const anno = parseInt(u.data.substring(0, 4));
    return anno <= annoSelezionato;
  });

  const entrateFiltrate = entrate.filter((e) => {
    const anno = parseInt(e.data.substring(0, 4));
    return anno <= annoSelezionato;
  });

  const cashFlow = calcolaSituazioneCashFlow(
    fattureFiltrate,
    prelieviFiltrati,
    usciteFiltrate,
    entrateFiltrate
  );

  const isTassaCategoria = (categoria: string | undefined): boolean => {
    if (!categoria) return false;
    const cat = categoria.toLowerCase();
    return cat.startsWith("tasse");
  };

  const tassePagate = usciteFiltrate
    .filter((u) => isTassaCategoria(u.categoria))
    .reduce((sum, u) => sum + u.importo, 0);

  // --- ANNO CORRENTE (annoSelezionato) ---
  const fattureAnnoCorrente = fatture.filter((f) =>
    f.data.startsWith(String(annoSelezionato))
  );
  const tasseTeoricheAnnoCorrente = calcolaTasseTotali(fattureAnnoCorrente);

  // --- ANNO PRECEDENTE (per calcolo acconti da pagare nell'anno selezionato) ---
  const annoPrecedente = annoSelezionato - 1;
  const fattureAnnoPrecedente = fatture.filter((f) =>
    f.data.startsWith(String(annoPrecedente))
  );
  const tasseTeoricheAnnoPrecedente = calcolaTasseTotali(fattureAnnoPrecedente);

  // Acconti versati nell'anno selezionato (per tasse anno precedente)
  // Conta TUTTE le tasse pagate nell'anno (saldo, acconto, INPS, imposta sostitutiva)
  const accontiVersatiNellAnno = uscite
    .filter((u) => {
      const isAnnoCorrente = u.data.startsWith(String(annoSelezionato));
      const cat = u.categoria?.toLowerCase() || "";
      const isTassa = cat.startsWith("tasse");
      return isAnnoCorrente && isTassa;
    })
    .reduce((sum, u) => sum + u.importo, 0);

  // Saldo anno precedente (quanto manca da pagare a giugno dell'anno corrente)
  // = tasse anno precedente - tasse già pagate nell'anno precedente
  const tasseVersateAnnoPrecedente = uscite
    .filter((u) => {
      const isAnnoPrecedente = u.data.startsWith(String(annoPrecedente));
      const cat = u.categoria?.toLowerCase() || "";
      const isTassa = cat.startsWith("tasse");
      return isAnnoPrecedente && isTassa;
    })
    .reduce((sum, u) => sum + u.importo, 0);

  const saldoAnnoPrecedente = Math.max(
    0,
    tasseTeoricheAnnoPrecedente - tasseVersateAnnoPrecedente
  );

  // 1° Acconto anno corrente (40% delle tasse anno precedente) - scadenza Giugno
  const primoAccontoAnnoCorrente = tasseTeoricheAnnoPrecedente * 0.4;

  // 2° Acconto anno corrente (60% delle tasse anno precedente) - scadenza Novembre
  const secondoAccontoAnnoCorrente = tasseTeoricheAnnoPrecedente * 0.6;

  // Totale acconti anno corrente già versati
  const accontiAnnoCorrenteGiaVersati = accontiVersatiNellAnno;

  // --- PROIEZIONE ANNO SUCCESSIVO ---
  // 1° Acconto anno prossimo (40% delle tasse anno corrente) - scadenza Giugno anno prossimo
  const primoAccontoAnnoProssimo = tasseTeoricheAnnoCorrente * 0.4;

  // Saldo anno corrente (quanto mancherà a giugno dell'anno prossimo)
  // = tasse anno corrente - acconti che verranno versati nell'anno corrente
  // Gli acconti anno corrente = 100% delle tasse anno precedente
  const saldoAnnoCorrente = Math.max(
    0,
    tasseTeoricheAnnoCorrente - (primoAccontoAnnoCorrente + secondoAccontoAnnoCorrente)
  );

  // TOTALE DA ACCANTONARE:
  // Logica semplice: tasse anno visualizzato + 40% per 1° acconto anno prossimo
  // Le tasse degli anni precedenti NON sono incluse perché erano già nel calcolo dell'anno precedente
  // Questo garantisce che il netto sia consistente tra 31/12 e 1/1
  const tasseTotaliAnnoCorrente = tasseTeoricheAnnoCorrente;
  const tasseGiaPagateAnnoCorrente = uscite
    .filter((u) => {
      const cat = u.categoria?.toLowerCase() || "";
      return u.data.startsWith(String(annoSelezionato)) && cat.startsWith("tasse");
    })
    .reduce((sum, u) => sum + u.importo, 0);

  const tasseAnnoCorrenteNonPagate = Math.max(0, tasseTotaliAnnoCorrente - tasseGiaPagateAnnoCorrente);
  const totaleDaAccantonare = tasseAnnoCorrenteNonPagate + primoAccontoAnnoProssimo;

  const nettoSicuro = cashFlow.nettoDisponibile - totaleDaAccantonare;

  // Calcolo per la progress bar "Acconti anno corrente versati vs dovuti"
  // Gli acconti dell'anno corrente sono basati sulle tasse dell'anno precedente
  const totaleDovutoAccontiAnnoCorrente = primoAccontoAnnoCorrente + secondoAccontoAnnoCorrente;
  const percentualeAccontiVersati =
    totaleDovutoAccontiAnnoCorrente > 0
      ? Math.min(
        100,
        Math.round(
          (accontiAnnoCorrenteGiaVersati / totaleDovutoAccontiAnnoCorrente) * 100
        )
      )
      : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* 1. HERO CARD: Netto Prelevabile */}
      <Card
        className={`relative overflow-hidden border-2 shadow-sm ${nettoSicuro >= 0
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
                className={`text-4xl font-bold tracking-tight ${nettoSicuro >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
              >
                {formatCurrency(nettoSicuro)}
              </h2>
            </div>
            {nettoSicuro >= 0 ? (
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
              className={`text-sm font-medium px-2 py-0.5 rounded ${nettoSicuro >= 0
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                }`}
            >
              {nettoSicuro >= 0 ? "Saldo Positivo" : "Attenzione"}
            </span>
            <p className="text-sm text-muted-foreground">
              {nettoSicuro >= 0
                ? "Tutte le tasse stimate sono coperte."
                : "Importo insufficiente per coprire le tasse future."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 2. CASH FLOW GRID - KPI VELOCI */}
      <div className="grid grid-cols-2 gap-4">
        <KpiCard
          title="Saldo Attuale Conto"
          value={cashFlow.nettoDisponibile}
          icon={Landmark}
          colorClass="text-foreground"
        />
        <KpiCard
          title="Prelievi Personali"
          value={cashFlow.totalePrelievi}
          icon={User}
          colorClass="text-blue-600"
        />
        <KpiCard
          title="Spese & Tasse Totali"
          value={cashFlow.totaleUscite}
          subtext={`Di cui tasse: ${formatCurrency(tassePagate)}`}
          icon={TrendingDown}
          colorClass="text-rose-600"
        />
        <KpiCard
          title="Entrate Extra"
          value={cashFlow.totaleEntrate}
          icon={TrendingUp}
          colorClass="text-emerald-600"
          hidden={cashFlow.totaleEntrate <= 0}
        />
      </div>

      {/* 3. DETTAGLIO FISCALE - PROGRESS & ACCANTONAMENTO */}
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
                <span>Versati: {formatCurrency(accontiAnnoCorrenteGiaVersati)}</span>
                <span>Dovuti (su tasse {annoPrecedente}): {formatCurrency(totaleDovutoAccontiAnnoCorrente)}</span>
              </div>
            </div>
          )}

          <div className="border-t border-dashed my-2" />

          {/* Dettagli Calcolo - Scadenze Anno Corrente */}
          <div className="space-y-3 bg-muted/40 p-4 rounded-lg">

            {/* Sezione: Scadenze anno corrente (basate su anno precedente) */}
            {tasseTeoricheAnnoPrecedente > 0 && (
              <>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Scadenze {annoSelezionato} (su tasse {annoPrecedente})
                </div>

                {saldoAnnoPrecedente > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <span>Saldo Tasse {annoPrecedente}</span>
                      <InfoTooltip text={`Residuo tasse ${annoPrecedente} da saldare a Giugno ${annoSelezionato}.`} />
                    </div>
                    <span className="font-mono font-medium">{formatCurrency(saldoAnnoPrecedente)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span>1° Acconto {annoSelezionato} (40%)</span>
                    <InfoTooltip text={`40% delle tasse ${annoPrecedente} (${formatCurrency(tasseTeoricheAnnoPrecedente)}). Scadenza: Giugno ${annoSelezionato}.`} />
                  </div>
                  <span className="font-mono font-medium">{formatCurrency(primoAccontoAnnoCorrente)}</span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span>2° Acconto {annoSelezionato} (60%)</span>
                    <InfoTooltip text={`60% delle tasse ${annoPrecedente} (${formatCurrency(tasseTeoricheAnnoPrecedente)}). Scadenza: Novembre ${annoSelezionato}.`} />
                  </div>
                  <span className="font-mono font-medium">{formatCurrency(secondoAccontoAnnoCorrente)}</span>
                </div>

                {accontiAnnoCorrenteGiaVersati > 0 && (
                  <div className="flex justify-between items-center text-sm text-green-600">
                    <span>Già versati nel {annoSelezionato}</span>
                    <span className="font-mono font-medium">-{formatCurrency(accontiAnnoCorrenteGiaVersati)}</span>
                  </div>
                )}

                <div className="border-t border-muted-foreground/10 my-2" />
              </>
            )}

            {/* Sezione: Proiezioni anno prossimo */}
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Proiezione {annoSelezionato + 1} (su tasse {annoSelezionato})
            </div>

            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span>Saldo Tasse {annoSelezionato}</span>
                <InfoTooltip text={`Tasse ${annoSelezionato} meno acconti versati. Da pagare a Giugno ${annoSelezionato + 1}.`} />
              </div>
              <span className="font-mono font-medium">{formatCurrency(saldoAnnoCorrente)}</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span>1° Acconto {annoSelezionato + 1} (40%)</span>
                <InfoTooltip text={`40% delle tasse ${annoSelezionato} (${formatCurrency(tasseTeoricheAnnoCorrente)}). Scadenza: Giugno ${annoSelezionato + 1}.`} />
              </div>
              <span className="font-mono font-medium">{formatCurrency(primoAccontoAnnoProssimo)}</span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-muted-foreground/20">
              <span className="font-semibold text-amber-600">Totale da tenere da parte</span>
              <span className="font-bold text-lg text-amber-600">
                {formatCurrency(totaleDaAccantonare)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function KpiCard({
  title,
  value,
  icon: Icon,
  colorClass,
  subtext,
  hidden = false,
}: {
  title: string;
  value: number;
  icon: any;
  colorClass: string;
  subtext?: string;
  hidden?: boolean;
}) {
  if (hidden) return null;
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 flex flex-col justify-between h-full">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase">{title}</span>
          <Icon className={`h-4 w-4 ${colorClass} opacity-80`} />
        </div>
        <div>
          <span className={`text-xl font-bold ${colorClass}`}>
            {formatCurrency(value)}
          </span>
          {subtext && (
            <p className="text-xs text-muted-foreground mt-1 leading-tight">
              {subtext}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
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
