import type { Fattura } from "../types/fattura";
import { calcolaRiepilogoAnnuale, calcolaPercentualeTasse } from "../utils/calcoliFisco";
import { formatCurrency, formatPercentage } from "../utils/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  fatture: Fattura[];
  anno: number;
}

export function RiepilogoCard({ fatture, anno }: Props) {
  const riepilogo = calcolaRiepilogoAnnuale(fatture);
  const percentualeTasse = calcolaPercentualeTasse(fatture);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Riepilogo Annuale {anno}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Totale fatture emesse</span>
            <span className="font-medium">{formatCurrency(riepilogo.totaleFatture)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Reddito imponibile lordo (78%)</span>
            <span className="font-medium">{formatCurrency(riepilogo.redditoImponibileLordo)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Contributi INPS (26,07%)</span>
            <span className="font-medium text-destructive">
              {formatCurrency(riepilogo.contributiINPS)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Imposta sostitutiva (5%)</span>
            <span className="font-medium text-destructive">
              {formatCurrency(riepilogo.impostaSostitutiva)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Totale tasse & contributi</span>
            <span className="font-medium text-destructive">
              {formatCurrency(riepilogo.tasseTotali)} ({formatPercentage(percentualeTasse)})
            </span>
          </div>
          <div className="flex justify-between items-center pt-4 border-t">
            <span className="font-semibold">Netto totale fatture</span>
            <span className="font-bold text-lg text-green-600">
              {formatCurrency(riepilogo.nettoFatture)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
