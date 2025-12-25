import { useState } from "react";
import type { Fattura } from "../types/fattura";
import { calcolaRiepilogoAnnuale, simulaNuovaFattura } from "../utils/calcoliFisco";
import { formatCurrency } from "../utils/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  fatture: Fattura[];
}

export function ScenarioSimulator({ fatture }: Props) {
  const [importo, setImporto] = useState("");

  const importoNum = parseFloat(importo) || 0;
  const riepilogoAttuale = calcolaRiepilogoAnnuale(fatture);
  const riepilogoSimulato = importoNum > 0 ? simulaNuovaFattura(fatture, importoNum) : null;

  const differenzaTasse = riepilogoSimulato
    ? riepilogoSimulato.tasseTotali - riepilogoAttuale.tasseTotali
    : 0;
  const differenzaNetto = riepilogoSimulato
    ? riepilogoSimulato.nettoAnnuo - riepilogoAttuale.nettoAnnuo
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Simulazione Scenario</CardTitle>
        <CardDescription>
          Inserisci l'importo di una nuova fattura ipotetica per vedere come cambierebbe la tua
          situazione fiscale.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nuova-fattura">Nuova fattura prevista</Label>
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

        {riepilogoSimulato && importoNum > 0 && (
          <div className="grid gap-3 pt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Nuovo totale incassato</span>
              <span className="font-medium">
                {formatCurrency(riepilogoSimulato.totaleIncassato)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Tasse aggiuntive</span>
              <span className="font-medium text-destructive">
                + {formatCurrency(differenzaTasse)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Nuovo totale tasse</span>
              <span className="font-medium">{formatCurrency(riepilogoSimulato.tasseTotali)}</span>
            </div>
            <div className="flex justify-between items-center bg-accent/50 -mx-6 px-6 py-2">
              <span className="text-sm font-medium">Netto aggiuntivo</span>
              <span className="font-semibold text-green-600">
                + {formatCurrency(differenzaNetto)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="font-semibold">Nuovo netto annuo</span>
              <span className="font-bold text-lg">{formatCurrency(riepilogoSimulato.nettoAnnuo)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
