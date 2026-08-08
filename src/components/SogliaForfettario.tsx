/**
 * Avviso sull'avvicinarsi dei limiti di ricavi del regime forfettario.
 *
 * Due soglie con conseguenze molto diverse:
 * - oltre 85.000 € si esce dal forfettario dall'anno SUCCESSIVO;
 * - oltre 100.000 € si esce nell'anno STESSO, con IVA dovuta a partire
 *   dall'operazione che ha fatto superare il limite.
 */

import type { Fattura } from "../types/fattura";
import { calcolaTotaleFatture } from "../utils/calcoliFisco";
import {
  LIMITE_RICAVI_FORFETTARIO,
  LIMITE_USCITA_IMMEDIATA,
} from "../constants/fiscali";
import { formatCurrency } from "../utils/format";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "./ui/progress";
import { AlertTriangle, CheckCircle, Gauge } from "lucide-react";

interface Props {
  /** Fatture del solo anno selezionato. */
  fatture: Fattura[];
  anno: number;
}

export function SogliaForfettario({ fatture, anno }: Props) {
  const fatturato = calcolaTotaleFatture(fatture);
  const percentuale = (fatturato / LIMITE_RICAVI_FORFETTARIO) * 100;
  const residuo = LIMITE_RICAVI_FORFETTARIO - fatturato;

  const stato =
    fatturato > LIMITE_USCITA_IMMEDIATA
      ? "uscita-immediata"
      : fatturato > LIMITE_RICAVI_FORFETTARIO
        ? "superato"
        : percentuale >= 90
          ? "critico"
          : percentuale >= 70
            ? "attenzione"
            : "ok";

  const colore = {
    ok: { barra: "bg-emerald-500", testo: "text-emerald-600" },
    attenzione: { barra: "bg-amber-500", testo: "text-amber-600" },
    critico: { barra: "bg-orange-500", testo: "text-orange-600" },
    superato: { barra: "bg-red-500", testo: "text-red-600" },
    "uscita-immediata": { barra: "bg-red-600", testo: "text-red-600" },
  }[stato];

  const messaggio = {
    ok: `Ti restano ${formatCurrency(residuo)} prima del limite.`,
    attenzione: `Ti restano ${formatCurrency(residuo)} prima del limite di ${formatCurrency(LIMITE_RICAVI_FORFETTARIO)}.`,
    critico: `Sei vicino al limite: mancano solo ${formatCurrency(residuo)}.`,
    superato: `Limite di ${formatCurrency(LIMITE_RICAVI_FORFETTARIO)} superato: dal ${anno + 1} esci dal regime forfettario.`,
    "uscita-immediata": `Superati i ${formatCurrency(LIMITE_USCITA_IMMEDIATA)}: esci dal forfettario già nel ${anno}, con IVA dovuta dall'operazione che ha sforato.`,
  }[stato];

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Limite forfettario {anno}</span>
          </div>
          <span className={`text-sm font-semibold tabular-nums ${colore.testo}`}>
            {formatCurrency(fatturato)}
            <span className="text-muted-foreground font-normal">
              {" / "}
              {formatCurrency(LIMITE_RICAVI_FORFETTARIO)}
            </span>
          </span>
        </div>

        <Progress
          value={Math.min(100, percentuale)}
          className="h-2"
          indicatorClassName={colore.barra}
        />

        <div className="flex items-start gap-2">
          {stato === "ok" ? (
            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${colore.testo}`} />
          )}
          <p className="text-xs text-muted-foreground">
            {messaggio}{" "}
            <span className="tabular-nums">({percentuale.toFixed(0)}%)</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
