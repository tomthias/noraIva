/**
 * Quanto guadagni contro quanto spendi, mese per mese.
 *
 * Il netto è di COMPETENZA: incassato meno la pressione fiscale effettiva
 * dell'anno (INPS + imposta / incassi). Gli acconti non sono un costo in più,
 * sono anticipi delle tasse dell'anno dopo.
 */

import type { MeseMargine } from "../../utils/fisco";
import { formatCurrency } from "../../utils/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Scale } from "lucide-react";

const MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const nomeMese = (m: string) => `${MESI[Number(m.slice(5, 7)) - 1]} ${m.slice(2, 4)}`;

export function GuadagnoSpesa({ mesi }: { mesi: MeseMargine[] }) {
  const media = (campo: keyof Omit<MeseMargine, "mese">) =>
    mesi.reduce((s, m) => s + m[campo], 0) / Math.max(1, mesi.length);
  const massimo = Math.max(1, ...mesi.map((m) => Math.max(m.incassato, m.vita)));
  const margineMedio = media("margine");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Scale className="h-5 w-5 text-violet-500" /> Guadagno e spesa
        </CardTitle>
        <CardDescription>
          Ultimi 12 mesi: in media incassi {formatCurrency(media("incassato"))}, ne resta{" "}
          {formatCurrency(media("incassato") - media("tasse"))} dopo le tasse e ne spendi{" "}
          {formatCurrency(media("vita"))} per vivere. Margine medio{" "}
          <span className={margineMedio >= 0 ? "text-emerald-600" : "text-red-600"}>
            {formatCurrency(margineMedio)}
          </span>{" "}
          al mese.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="text-left font-normal py-1">Mese</th>
              <th className="text-left font-normal py-1 w-1/3"></th>
              <th className="text-right font-normal py-1">Incassato</th>
              <th className="text-right font-normal py-1">Tasse</th>
              <th className="text-right font-normal py-1">Lavoro</th>
              <th className="text-right font-normal py-1">Vita</th>
              <th className="text-right font-normal py-1">Margine</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mesi.map((m) => (
              <tr key={m.mese}>
                <td className="py-1.5 whitespace-nowrap">{nomeMese(m.mese)}</td>
                <td className="py-1.5 pr-3">
                  <div className="space-y-0.5">
                    <div className="h-1.5 rounded bg-emerald-500/70" style={{ width: `${(m.incassato / massimo) * 100}%` }} />
                    <div className="h-1.5 rounded bg-rose-400/70" style={{ width: `${(Math.max(0, m.vita) / massimo) * 100}%` }} />
                  </div>
                </td>
                <td className="py-1.5 text-right">{formatCurrency(m.incassato)}</td>
                <td className="py-1.5 text-right text-muted-foreground">{formatCurrency(-m.tasse)}</td>
                <td className="py-1.5 text-right text-muted-foreground">{formatCurrency(-m.lavoro)}</td>
                <td className="py-1.5 text-right text-muted-foreground">{formatCurrency(-m.vita)}</td>
                <td className={`py-1.5 text-right font-medium ${m.margine >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatCurrency(m.margine)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted-foreground">
          Barra verde: incassato. Barra rossa: spese di vita (stipendi verso il conto personale
          compresi). Esclusi tasse pagate, investimenti e costi di lavoro, che hanno una colonna
          a parte.
        </p>
      </CardContent>
    </Card>
  );
}
