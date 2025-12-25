import type { Fattura, Prelievo, Uscita } from "../types/fattura";
import { calcolaSituazioneCashFlow, calcolaTasseTotali } from "../utils/calcoliFisco";
import { formatCurrency } from "../utils/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ANNO } from "../constants/fiscali";

interface Props {
  fatture: Fattura[];
  prelievi: Prelievo[];
  uscite: Uscita[];
}

export function NettoDisponibile({ fatture, prelievi, uscite }: Props) {
  const cashFlow = calcolaSituazioneCashFlow(fatture, prelievi, uscite);

  // Calcola tasse già pagate (dalle uscite con categoria Tasse)
  const tassePagate = uscite
    .filter((u) => u.categoria === "Tasse")
    .reduce((sum, u) => sum + u.importo, 0);

  // Fatture dell'anno corrente per calcolare tasse future
  const fattureAnnoCorrente = fatture.filter((f) => f.data.startsWith(String(ANNO)));
  const tasseTeoricheAnnoCorrente = calcolaTasseTotali(fattureAnnoCorrente);

  // Tasse pagate quest'anno (per l'anno corrente)
  const tassePagateAnnoCorrente = uscite
    .filter((u) => u.categoria === "Tasse" && u.data.startsWith(String(ANNO)))
    .reduce((sum, u) => sum + u.importo, 0);

  // Stima tasse ancora da pagare per l'anno corrente
  const tasseDaAccantonare = Math.max(0, tasseTeoricheAnnoCorrente - tassePagateAnnoCorrente);

  // Netto sicuro = Netto disponibile - Tasse da accantonare
  const nettoSicuro = cashFlow.nettoDisponibile - tasseDaAccantonare;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Situazione Cash Flow</CardTitle>
        <CardDescription>
          Basato su fatturato reale, prelievi e uscite (tasse incluse)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Fatturato totale</span>
            <span className="font-medium text-green-600">
              {formatCurrency(cashFlow.nettoFatture)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Prelievi (stipendi)</span>
            <span className="font-medium text-destructive">
              - {formatCurrency(cashFlow.totalePrelievi)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Uscite (di cui tasse: {formatCurrency(tassePagate)})</span>
            <span className="font-medium text-destructive">
              - {formatCurrency(cashFlow.totaleUscite)}
            </span>
          </div>
          <div className="flex justify-between items-center pt-3 border-t">
            <span className="font-medium">Saldo teorico</span>
            <span className="font-semibold">
              {formatCurrency(cashFlow.nettoDisponibile)}
            </span>
          </div>
          {tasseDaAccantonare > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-amber-600">Tasse {ANNO} da accantonare</span>
              <span className="font-medium text-amber-600">
                - {formatCurrency(tasseDaAccantonare)}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center pt-3 border-t bg-muted/50 -mx-6 px-6 py-3 -mb-6 rounded-b-lg">
            <span className="font-bold">Netto prelevabile</span>
            <span className={`font-bold text-xl ${nettoSicuro >= 0 ? "text-green-600" : "text-destructive"}`}>
              {formatCurrency(nettoSicuro)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
