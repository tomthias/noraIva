import { useState } from "react";
import { formatCurrency } from "../utils/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COEFFICIENTE_REDDITIVITA, ALIQUOTA_CONTRIBUTI_GS, ALIQUOTA_IMPOSTA_SOSTITUTIVA } from "../constants/fiscali";

export function ScenarioSimulator() {
  const [importo, setImporto] = useState("");

  const importoNum = parseFloat(importo) || 0;

  // Calcoli per la singola fattura
  const redditoImponibile = importoNum * COEFFICIENTE_REDDITIVITA;
  const contributiINPS = redditoImponibile * ALIQUOTA_CONTRIBUTI_GS;
  const imponibileNetto = redditoImponibile - contributiINPS;
  const impostaSostitutiva = imponibileNetto * ALIQUOTA_IMPOSTA_SOSTITUTIVA;
  const tasseTotali = contributiINPS + impostaSostitutiva;
  const nettoFattura = importoNum - tasseTotali;
  const percentualeTasse = importoNum > 0 ? (tasseTotali / importoNum) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Simulazione Fattura</CardTitle>
        <CardDescription>
          Inserisci l'importo di una fattura per vedere quanto ti rimane al netto di tasse e contributi.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nuova-fattura">Importo fattura</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              €
            </span>
            <Input
              type="number"
              id="nuova-fattura"
              value={importo}
              onChange={(e) => setImporto(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="pl-8"
            />
          </div>
        </div>

        {importoNum > 0 && (
          <div className="grid gap-3 pt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Importo lordo</span>
              <span className="font-medium">
                {formatCurrency(importoNum)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Reddito imponibile (78%)</span>
              <span className="font-medium">
                {formatCurrency(redditoImponibile)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Contributi INPS (26,07%)</span>
              <span className="font-medium text-amber-500">
                - {formatCurrency(contributiINPS)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Imposta sostitutiva (5%)</span>
              <span className="font-medium text-amber-500">
                - {formatCurrency(impostaSostitutiva)}
              </span>
            </div>
            <div className="flex justify-between items-center bg-muted/50 -mx-6 px-6 py-2">
              <span className="text-sm font-medium">Totale tasse</span>
              <span className="font-semibold text-amber-500">
                - {formatCurrency(tasseTotali)}
                <span className="text-xs text-muted-foreground ml-2">({percentualeTasse.toFixed(1)}%)</span>
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="font-semibold">Netto in tasca</span>
              <span className="font-bold text-lg text-green-500">{formatCurrency(nettoFattura)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
