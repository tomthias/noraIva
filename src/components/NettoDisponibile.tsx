import type { Fattura } from "../types/fattura";
import { calcolaRiepilogoAnnuale } from "../utils/calcoliFisco";
import { formatCurrency } from "../utils/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  fatture: Fattura[];
}

export function NettoDisponibile({ fatture }: Props) {
  // Considera solo le fatture incassate (anche parzialmente)
  const fattureIncassate = fatture.filter((f) => f.incassato > 0);
  const riepilogo = calcolaRiepilogoAnnuale(fattureIncassate);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quanto posso ritirare adesso</CardTitle>
        <CardDescription>
          Questo importo tiene conto delle tasse e contributi da accantonare sugli incassi
          effettivi.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Incassi cumulati</span>
            <span className="font-medium">{formatCurrency(riepilogo.totaleIncassato)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Tasse & contributi maturati</span>
            <span className="font-medium text-destructive">
              - {formatCurrency(riepilogo.tasseTotali)}
            </span>
          </div>
          <div className="flex justify-between items-center pt-4 border-t">
            <span className="font-semibold">Netto disponibile</span>
            <span className="font-bold text-lg text-green-600">
              {formatCurrency(riepilogo.nettoAnnuo)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
