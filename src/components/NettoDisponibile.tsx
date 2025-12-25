import type { Fattura, Prelievo, Uscita } from "../types/fattura";
import { calcolaSituazioneCashFlow } from "../utils/calcoliFisco";
import { formatCurrency } from "../utils/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  fatture: Fattura[];
  prelievi: Prelievo[];
  uscite: Uscita[];
}

export function NettoDisponibile({ fatture, prelievi, uscite }: Props) {
  const cashFlow = calcolaSituazioneCashFlow(fatture, prelievi, uscite);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quanto posso ritirare adesso</CardTitle>
        <CardDescription>
          Netto delle fatture meno i prelievi già effettuati e le uscite sostenute.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Netto fatture</span>
            <span className="font-medium text-green-600">
              {formatCurrency(cashFlow.nettoFatture)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Prelievi effettuati</span>
            <span className="font-medium text-destructive">
              - {formatCurrency(cashFlow.totalePrelievi)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Uscite sostenute</span>
            <span className="font-medium text-destructive">
              - {formatCurrency(cashFlow.totaleUscite)}
            </span>
          </div>
          <div className="flex justify-between items-center pt-4 border-t">
            <span className="font-semibold">Netto disponibile</span>
            <span className="font-bold text-lg text-green-600">
              {formatCurrency(cashFlow.nettoDisponibile)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
