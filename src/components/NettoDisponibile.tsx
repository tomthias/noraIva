import type { Fattura, Prelievo, Uscita } from "../types/fattura";
import { calcolaSituazioneCashFlow, calcolaTasseTotali } from "../utils/calcoliFisco";
import { formatCurrency } from "../utils/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle, Calendar } from "lucide-react";

interface Props {
  fatture: Fattura[];
  prelievi: Prelievo[];
  uscite: Uscita[];
  annoSelezionato: number;
}

export function NettoDisponibile({ fatture, prelievi, uscite, annoSelezionato }: Props) {
  const cashFlow = calcolaSituazioneCashFlow(fatture, prelievi, uscite);

  // Calcola tasse già pagate totali (dalle uscite con categoria Tasse)
  const tassePagate = uscite
    .filter((u) => u.categoria === "Tasse")
    .reduce((sum, u) => sum + u.importo, 0);

  // Fatture per anno (basato sull'anno selezionato)
  const fattureAnnoCorrente = fatture.filter((f) => f.data.startsWith(String(annoSelezionato)));
  const fattureAnnoPrecedente = fatture.filter((f) => f.data.startsWith(String(annoSelezionato - 1)));

  // Tasse teoriche per anno
  const tasseTeoricheAnnoCorrente = calcolaTasseTotali(fattureAnnoCorrente);
  const tasseTeoricheAnnoPrecedente = calcolaTasseTotali(fattureAnnoPrecedente);

  // Stima degli acconti anno corrente già versati
  // Gli acconti 2025 = circa tasse 2024 (perché si basano sull'anno precedente)
  // Acconti versati nel 2025 ≈ tassePagateAnnoCorrente - saldoAnnoPrecedente
  // Saldo anno precedente ≈ tasseTeoricheAnnoPrecedente - accontiAnnoPrecedente

  // Semplificazione: gli acconti si basano sulle tasse dell'anno precedente
  // Acconti 2025 = tasse 2024 (perché non avevi storico precedente significativo)
  // Acconti 2026 = tasse 2025

  // Metodo storico Fiscozen:
  // - Acconti anno X = basati sulle tasse dell'anno X-1
  // - Gli acconti 2025 versati = tasse 2024
  // - Gli acconti 2026 = tasse 2025
  const accontiAnnoCorrenteVersati = tasseTeoricheAnnoPrecedente;

  // Saldo anno corrente = Tasse anno corrente - Acconti già versati
  // Se negativo (hai fatturato meno), il saldo è 0 e avrai un credito
  const saldoAnnoCorrente = Math.max(0, tasseTeoricheAnnoCorrente - accontiAnnoCorrenteVersati);

  // Primo acconto anno prossimo (40% a giugno) = 40% delle tasse anno corrente
  const primoAccontoAnnoProssimo = tasseTeoricheAnnoCorrente * 0.4;

  // Totale da accantonare per giugno = Saldo + Primo acconto (40%)
  const totaleDaAccantonare = saldoAnnoCorrente + primoAccontoAnnoProssimo;

  // Netto sicuro = Saldo conto - Totale da accantonare
  const nettoSicuro = cashFlow.nettoDisponibile - totaleDaAccantonare;

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
            <span className="font-medium">Saldo conto</span>
            <span className="font-semibold">
              {formatCurrency(cashFlow.nettoDisponibile)}
            </span>
          </div>
        </div>
      </CardContent>

      {/* Box previsione tasse giugno anno prossimo */}
      <div className="mx-4 mb-4 p-4 rounded-lg bg-muted/50 border">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Da accantonare per giugno {annoSelezionato + 1}</span>
        </div>
        <div className="grid gap-2 text-sm">
          {saldoAnnoCorrente > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Saldo tasse {annoSelezionato}</span>
              <span className="text-amber-500">- {formatCurrency(saldoAnnoCorrente)}</span>
            </div>
          )}
          <div className={`flex justify-between items-center ${saldoAnnoCorrente === 0 ? "pt-0" : ""}`}>
            <span className={saldoAnnoCorrente > 0 ? "text-muted-foreground" : "font-medium"}>
              {saldoAnnoCorrente > 0 ? `Primo acconto ${annoSelezionato + 1} (40%)` : "Primo acconto (40%)"}
            </span>
            <span className={saldoAnnoCorrente > 0 ? "text-amber-500" : "font-semibold text-amber-500"}>
              - {formatCurrency(primoAccontoAnnoProssimo)}
            </span>
          </div>
          {saldoAnnoCorrente > 0 && (
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="font-medium">Totale da accantonare</span>
              <span className="font-semibold text-amber-500">
                - {formatCurrency(totaleDaAccantonare)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Box evidenziato per il Netto Prelevabile */}
      <div className={`mx-4 mb-4 p-4 rounded-lg border-2 ${
        nettoSicuro >= 0
          ? "bg-green-950/50 border-green-700"
          : "bg-red-950/50 border-red-700"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {nettoSicuro >= 0 ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            <span className="font-semibold">Puoi prelevare</span>
          </div>
          <span className={`font-bold text-2xl ${
            nettoSicuro >= 0 ? "text-green-500" : "text-red-500"
          }`}>
            {formatCurrency(nettoSicuro)}
          </span>
        </div>
        <p className={`text-xs mt-1 ${
          nettoSicuro >= 0 ? "text-green-600" : "text-red-600"
        }`}>
          {nettoSicuro >= 0
            ? `Saldo ${annoSelezionato} e primo acconto ${annoSelezionato + 1} coperti`
            : `Devi ancora accantonare per saldo e primo acconto`
          }
        </p>
      </div>
    </Card>
  );
}
