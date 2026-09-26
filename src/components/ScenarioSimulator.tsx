/**
 * "Se oggi incasso X, cosa cambia?" — stessa funzione della Dashboard
 * (`simulaIncasso` → `situazione`), con un incasso in più. Nessuna formula
 * ripetuta qui.
 */

import { useMemo, useState } from "react";
import { formatCurrency } from "../utils/format";
import { calcolaEspressione } from "../utils/calcolaEspressione";
import { simulaIncasso, type InputSituazione } from "../utils/fisco";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportoInput } from "@/components/ui/importo-input";
import { Label } from "@/components/ui/label";

export function ScenarioSimulator({ input }: { input: InputSituazione }) {
  const [importo, setImporto] = useState("");
  const valore = calcolaEspressione(importo).valore ?? 0;
  const r = useMemo(() => simulaIncasso(input, valore), [input, valore]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Se oggi incasso…</CardTitle>
        <CardDescription>
          Quanto va messo da parte per le tasse (dell'anno e acconti dell'anno dopo) e quanto
          resta davvero prelevabile, con i tuoi dati reali.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2 max-w-sm">
          <Label htmlFor="importo-simulato">Importo lordo</Label>
          <ImportoInput value={importo} onChange={setImporto} placeholder="es. 3000 o 3*1000" />
        </div>

        {valore > 0 && (
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Voce etichetta="Da tenere per le tasse" valore={r.daTenere} nota={`${((r.daTenere / valore) * 100).toFixed(1)}% dell'incasso`} />
            <Voce etichetta="Netto prelevabile in più" valore={r.netto} evidenza />
            <Voce
              etichetta="Netto prelevabile dopo"
              valore={r.dopo.netto}
              nota={`oggi ${formatCurrency(r.prima.netto)}`}
            />
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

function Voce({ etichetta, valore, nota, evidenza }: { etichetta: string; valore: number; nota?: string; evidenza?: boolean }) {
  return (
    <div className="rounded-lg border p-4">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{etichetta}</dt>
      <dd className={`text-2xl font-semibold tabular-nums ${evidenza ? "text-emerald-600" : ""}`}>
        {formatCurrency(valore)}
      </dd>
      {nota && <dd className="text-xs text-muted-foreground">{nota}</dd>}
    </div>
  );
}
