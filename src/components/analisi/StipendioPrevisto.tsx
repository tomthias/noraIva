/**
 * Card che mostra quanto puoi prelevarti come "stipendio" il mese prossimo
 * basato sul netto disponibile e le tasse da accantonare
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Banknote, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { formatCurrency } from "../../utils/format";
import { Progress } from "../ui/progress";

interface Props {
  nettoDisponibile: number;
  tasseDaAccantonare: number;
  mediaStipendioMensile: number;
  mese: string;
}

export function StipendioPrevisto({
  nettoDisponibile,
  tasseDaAccantonare,
  mediaStipendioMensile,
  mese,
}: Props) {
  const nettoSicuro = nettoDisponibile - tasseDaAccantonare;

  // Suggerimento stipendio: non più della media storica e max 60% del netto sicuro
  const stipendioConsigliato = Math.max(0, Math.min(
    mediaStipendioMensile,
    nettoSicuro * 0.6
  ));

  const isPositivo = nettoSicuro > 0;
  const percentualeUtilizzata = nettoSicuro > 0
    ? (stipendioConsigliato / nettoSicuro) * 100
    : 0;

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
                <p className="text-xs text-muted-foreground">Media storica</p>
                <p className="text-sm font-medium">{formatCurrency(mediaStipendioMensile)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Utilizzo netto sicuro</span>
                <span className="font-medium">{percentualeUtilizzata.toFixed(0)}%</span>
              </div>
              <Progress
                value={percentualeUtilizzata}
                className="h-2"
                indicatorClassName={percentualeUtilizzata > 60 ? "bg-amber-500" : "bg-purple-500"}
              />
            </div>

            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">Netto disponibile:</span>
                <span className="font-medium">{formatCurrency(nettoDisponibile)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingDown className="h-4 w-4 text-amber-500" />
                <span className="text-muted-foreground">Da accantonare:</span>
                <span className="font-medium">{formatCurrency(tasseDaAccantonare)}</span>
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
