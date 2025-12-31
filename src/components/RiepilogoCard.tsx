import type { Fattura } from "../types/fattura";
import { calcolaRiepilogoAnnuale, calcolaPercentualeTasse } from "../utils/calcoliFisco";
import { formatCurrency, formatPercentage } from "../utils/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Building2, Landmark, ReceiptEuro } from "lucide-react";

interface Props {
  fatture: Fattura[];
  anno: number;
}

export function RiepilogoCard({ fatture, anno }: Props) {
  const riepilogo = calcolaRiepilogoAnnuale(fatture);
  const percentualeTasse = calcolaPercentualeTasse(fatture);

  return (
    <Card className="h-full border-l-4 border-l-primary/50 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <TrendingUp className="h-6 w-6 text-primary" />
          Riepilogo Annuale {anno}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Sezione Fatturato */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 text-blue-500 rounded-full">
                <ReceiptEuro className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Totale Fatturato</p>
                <p className="font-bold text-lg">{formatCurrency(riepilogo.totaleFatture)}</p>
              </div>
            </div>
          </div>

          <div className="px-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 opacity-70" />
                Reddito Imponibile (78%)
              </span>
              <span className="font-medium">{formatCurrency(riepilogo.redditoImponibileLordo)}</span>
            </div>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Sezione Tasse */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">Tasse & Contributi</h4>

          <div className="space-y-2 px-1">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Landmark className="h-4 w-4 opacity-70" />
                Contributi INPS (26,07%)
              </span>
              <span className="font-medium text-rose-500">
                {formatCurrency(riepilogo.contributiINPS)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Landmark className="h-4 w-4 opacity-70" />
                Imposta Sostitutiva (5%)
              </span>
              <span className="font-medium text-rose-500">
                {formatCurrency(riepilogo.impostaSostitutiva)}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center bg-rose-500/5 p-3 rounded-lg border border-rose-100 dark:border-rose-900/20">
            <span className="text-sm font-medium text-rose-700 dark:text-rose-400">Totale Tasse</span>
            <div className="text-right">
              <div className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(riepilogo.tasseTotali)}</div>
              <div className="text-xs text-rose-500/80">Incidenza: {formatPercentage(percentualeTasse)}</div>
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
