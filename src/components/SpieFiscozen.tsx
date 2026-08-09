/**
 * Le spie di coerenza con Fiscozen.
 *
 * Non sono un secondo calcolo: sono un controllo sui dati. Una spia ambra
 * significa quasi sempre che manca una fattura o che una categoria di tasse è
 * sbagliata — per questo ognuna dice dove guardare invece di limitarsi a
 * mostrare due numeri diversi.
 */

import { AlertTriangle, Check, HelpCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "../utils/format";
import { calcolaSpieFiscozen, type StimaFiscozen } from "../utils/spieFiscozen";
import type { Accantonamento } from "../utils/calcoliFisco";

interface Props {
  accantonamento: Accantonamento;
  stime: StimaFiscozen[];
}

export function SpieFiscozen({ accantonamento, stime }: Props) {
  const spie = calcolaSpieFiscozen(accantonamento, stime);
  const daConfrontare = spie.filter((s) => s.stato !== "assente");

  // Senza stime inserite non c'è niente da confrontare: meglio non occupare
  // spazio in dashboard con tre righe vuote.
  if (daConfrontare.length === 0) return null;

  const fuori = daConfrontare.filter((s) => s.stato === "attenzione").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Coerenza con Fiscozen</CardTitle>
        <CardDescription>
          {fuori === 0
            ? "I conti dell'app coincidono con le stime del commercialista."
            : `${fuori} valore${fuori > 1 ? "i" : ""} fuori dall'intervallo: quasi sempre è un dato mancante, non un calcolo sbagliato.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {daConfrontare.map((spia) => (
          <div key={spia.id} className="flex items-start gap-3 text-sm">
            {spia.stato === "ok" ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            )}
            <div className="flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-medium">{spia.titolo}</span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(spia.valoreApp)}
                  {spia.atteso && (
                    <span className="ml-2 text-muted-foreground">
                      vs{" "}
                      {spia.atteso.min === spia.atteso.max
                        ? formatCurrency(spia.atteso.min)
                        : `${formatCurrency(spia.atteso.min)}–${formatCurrency(spia.atteso.max)}`}
                    </span>
                  )}
                </span>
              </div>
              {spia.stato === "attenzione" && (
                <p className="mt-1 text-xs text-amber-600">
                  {spia.scostamento > 0 ? "Sopra" : "Sotto"} di{" "}
                  {formatCurrency(Math.abs(spia.scostamento))}. {spia.spiegazione}
                </p>
              )}
            </div>
          </div>
        ))}

        <p className="flex items-start gap-2 pt-1 text-xs text-muted-foreground">
          <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Le stime Fiscozen sono intervalli annuali: dicono se i dati tornano, non
          quanto tenere da parte oggi. Quello resta il compito della card qui sopra.
        </p>
      </CardContent>
    </Card>
  );
}
