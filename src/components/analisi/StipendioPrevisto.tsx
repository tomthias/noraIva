/**
 * Card che mostra quanto puoi prelevarti come "stipendio" il mese prossimo
 * Calcolo: Netto Sicuro / Mesi fino alla prossima scadenza fiscale
 * Scadenze: Giugno (saldo + 1° acconto) e Novembre (2° acconto)
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Banknote, TrendingUp, TrendingDown, AlertTriangle, Calendar } from "lucide-react";
import { formatCurrency } from "../../utils/format";

interface Props {
  nettoDisponibile: number;
  tasseDaAccantonare: number;
  mese: string;
}

// Calcola mesi fino alla prossima scadenza fiscale
function getMesiAllaScadenza(): { mesi: number; scadenza: string } {
  const oggi = new Date();
  const meseCorrente = oggi.getMonth(); // 0-11

  // Scadenze: Giugno (5) e Novembre (10)
  if (meseCorrente < 5) {
    // Gen-Mag: conta fino a Giugno
    return { mesi: 5 - meseCorrente, scadenza: "Giugno" };
  } else if (meseCorrente < 10) {
    // Giu-Ott: conta fino a Novembre
    return { mesi: 10 - meseCorrente, scadenza: "Novembre" };
  } else {
    // Nov-Dic: conta fino a Giugno prossimo anno
    return { mesi: 12 - meseCorrente + 5, scadenza: "Giugno" };
  }
}

export function StipendioPrevisto({
  nettoDisponibile,
  tasseDaAccantonare,
  mese,
}: Props) {
  const nettoSicuro = nettoDisponibile - tasseDaAccantonare;
  const { mesi: mesiAllaScadenza, scadenza } = getMesiAllaScadenza();

  // Stipendio = Netto Sicuro / Mesi alla prossima scadenza
  const stipendioConsigliato = nettoSicuro > 0
    ? Math.max(0, nettoSicuro / mesiAllaScadenza)
    : 0;

  const isPositivo = nettoSicuro > 0;

  return (
    <Card className={`relative overflow-hidden ${
      isPositivo
        ? "border-l-4 border-l-purple-500"
        : "border-l-4 border-l-red-500"
    }`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Banknote className="h-5 w-5 text-purple-500" />
          Stipendio Consigliato - {mese}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPositivo ? (
          <>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Puoi prelevarti</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(stipendioConsigliato)}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{mesiAllaScadenza} mesi a {scadenza}</span>
                </div>
                <p className="text-sm font-medium text-purple-500">
                  {formatCurrency(nettoSicuro)} ÷ {mesiAllaScadenza}
                </p>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">Netto disponibile:</span>
                <span className="font-medium">{formatCurrency(nettoDisponibile)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingDown className="h-4 w-4 text-amber-500" />
                <span className="text-muted-foreground">Tasse da accantonare:</span>
                <span className="font-medium">{formatCurrency(tasseDaAccantonare)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm pt-1 border-t border-muted">
                <span className="text-muted-foreground">= Netto sicuro:</span>
                <span className="font-semibold text-purple-500">{formatCurrency(nettoSicuro)}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-8 w-8" />
            <div>
              <p className="font-semibold">Nessuno stipendio consigliato</p>
              <p className="text-sm text-muted-foreground">
                Le tasse da accantonare superano il netto disponibile di{" "}
                {formatCurrency(Math.abs(nettoSicuro))}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
