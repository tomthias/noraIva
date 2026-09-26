/**
 * Incassi dell'anno contro i limiti del forfettario. Si misura sull'INCASSATO
 * (Telefisco 18/09/2025), cioè sulle fatture con data di incasso nell'anno.
 *
 * - oltre 85.000 € si esce dal forfettario dall'anno successivo;
 * - oltre 100.000 € si esce subito, con IVA dall'operazione che sfora.
 */

import { LIMITE_RICAVI_FORFETTARIO, LIMITE_USCITA_IMMEDIATA } from "../../constants/fiscali";
import { formatCurrency } from "../../utils/format";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "../ui/progress";
import { Gauge } from "lucide-react";

export function LimiteForfettario({ incassi, anno }: { incassi: number; anno: number }) {
  const percentuale = (incassi / LIMITE_RICAVI_FORFETTARIO) * 100;
  const residuo = LIMITE_RICAVI_FORFETTARIO - incassi;
  const [barra, testo, messaggio] =
    incassi > LIMITE_USCITA_IMMEDIATA
      ? ["bg-red-600", "text-red-600", `Superati i ${formatCurrency(LIMITE_USCITA_IMMEDIATA)}: esci dal forfettario già nel ${anno}.`]
      : incassi > LIMITE_RICAVI_FORFETTARIO
        ? ["bg-red-500", "text-red-600", `Limite superato: dal ${anno + 1} esci dal forfettario.`]
        : percentuale >= 90
          ? ["bg-orange-500", "text-orange-600", `Sei vicino al limite: puoi incassare ancora ${formatCurrency(residuo)}.`]
          : percentuale >= 70
            ? ["bg-amber-500", "text-amber-600", `Puoi incassare ancora ${formatCurrency(residuo)} nel ${anno}.`]
            : ["bg-emerald-500", "text-emerald-600", `Puoi incassare ancora ${formatCurrency(residuo)} nel ${anno}.`];

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Gauge className="h-4 w-4 text-muted-foreground" /> Incassi {anno}
          </span>
          <span className={`text-sm font-semibold tabular-nums ${testo}`}>
            {formatCurrency(incassi)}
            <span className="text-muted-foreground font-normal"> / {formatCurrency(LIMITE_RICAVI_FORFETTARIO)}</span>
          </span>
        </div>
        <Progress value={Math.min(100, percentuale)} className="h-2" indicatorClassName={barra} />
        <p className="text-xs text-muted-foreground">{messaggio}</p>
      </CardContent>
    </Card>
  );
}
