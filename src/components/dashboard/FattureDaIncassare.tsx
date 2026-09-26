/**
 * Fatture emesse e non ancora pagate. Segnarle incassate le fa entrare nelle
 * tasse (e crea il movimento di incasso sul conto, se non è già importato).
 */

import { useState } from "react";
import type { Fattura } from "../../types/fattura";
import { formatCurrency, formatDate } from "../../utils/format";
import { quotaTasseMarginale } from "../../utils/fisco";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Hourglass } from "lucide-react";

interface Props {
  fatture: Fattura[];
  oggi: string;
  onIncassa: (id: string, data: string) => void;
}

export function FattureDaIncassare({ fatture, oggi, onIncassa }: Props) {
  const aperte = fatture.filter((f) => f.data === null);
  if (aperte.length === 0) return null;

  const totale = aperte.reduce((s, f) => s + f.importoLordo, 0);
  const tasse = totale * quotaTasseMarginale(Number(oggi.slice(0, 4)));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Hourglass className="h-5 w-5 text-sky-500" /> Da incassare
        </CardTitle>
        <CardDescription>
          {formatCurrency(totale)} in arrivo: quando arrivano, circa {formatCurrency(tasse)} vanno
          alle tasse dell'anno (più gli acconti dell'anno dopo).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y text-sm">
          {aperte.map((f) => (
            <RigaFattura key={f.id} fattura={f} oggi={oggi} onIncassa={onIncassa} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function RigaFattura({ fattura, oggi, onIncassa }: { fattura: Fattura; oggi: string; onIncassa: Props["onIncassa"] }) {
  const [data, setData] = useState(oggi);
  return (
    <li className="py-2 flex flex-wrap items-center justify-between gap-2">
      <span>
        <span className="font-medium">{fattura.numero ?? "—"}</span> {fattura.cliente}
        <span className="text-muted-foreground">
          {fattura.dataEmissione && ` · emessa il ${formatDate(fattura.dataEmissione)}`}
        </span>
      </span>
      <span className="flex items-center gap-2">
        <span className="tabular-nums font-medium">{formatCurrency(fattura.importoLordo)}</span>
        <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="h-8 w-40" />
        <Button size="sm" variant="outline" onClick={() => onIncassa(fattura.id, data)}>
          Incassata
        </Button>
      </span>
    </li>
  );
}
