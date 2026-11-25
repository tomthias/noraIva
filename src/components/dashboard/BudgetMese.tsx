/**
 * Budget del mese: quanto hai speso per vivere contro il tetto che ti sei dato.
 *
 * Conta affitto, ricariche Revolut (stipendi), carta BBVA, contanti e costi
 * fissi; non conta tasse, investimenti, lavoro e le spese accantonate (viaggi,
 * fisioterapia rimborsata). I conti li fa `budgetMese()` in `fisco.ts`.
 */

import { useState } from "react";
import type { BudgetMese as Budget } from "../../utils/fisco";
import { formatCurrency } from "../../utils/format";
import { calcolaEspressione } from "../../utils/calcolaEspressione";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImportoInput } from "@/components/ui/importo-input";
import { Progress } from "../ui/progress";
import { Pencil, Wallet } from "lucide-react";

const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const nomeMese = (m: string) => `${MESI[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;

interface Props {
  corrente: Budget;
  /** Mesi precedenti, dal più recente: il confronto aiuta più del mese in corso. */
  precedenti: Budget[];
  giorniRimasti: number;
  onSalvaBudget: (valore: number) => void;
}

export function BudgetMese({ corrente, precedenti, giorniRimasti, onSalvaBudget }: Props) {
  const [modifica, setModifica] = useState(false);
  const [bozza, setBozza] = useState("");
  const sforato = corrente.residuo < 0;
  const percentuale = corrente.budget > 0 ? (corrente.speso / corrente.budget) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2 text-lg">
          <span className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-sky-500" /> Budget di {nomeMese(corrente.mese)}
          </span>
          {modifica ? (
            <span className="flex gap-1 items-center">
              <ImportoInput value={bozza} onChange={setBozza} compatto autoFocus className="h-8 w-28" />
              <Button
                size="sm"
                onClick={() => {
                  const { valore } = calcolaEspressione(bozza);
                  if (valore === null || valore <= 0) return;
                  onSalvaBudget(valore);
                  setModifica(false);
                }}
              >
                Salva
              </Button>
            </span>
          ) : (
            <button
              type="button"
              className="flex items-center gap-1 text-sm font-normal text-muted-foreground hover:text-foreground"
              onClick={() => {
                setBozza(String(corrente.budget));
                setModifica(true);
              }}
            >
              tetto {formatCurrency(corrente.budget)} <Pencil className="h-3 w-3" />
            </button>
          )}
        </CardTitle>
        <CardDescription>
          Affitto, Revolut, carta BBVA, contanti e costi fissi. Fuori: tasse, investimenti,
          lavoro, viaggi e fisioterapia.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-semibold tabular-nums">{formatCurrency(corrente.speso)}</span>
            <span className={`text-sm tabular-nums ${sforato ? "text-red-600" : "text-emerald-600"}`}>
              {sforato
                ? `${formatCurrency(-corrente.residuo)} oltre il tetto`
                : `restano ${formatCurrency(corrente.residuo)} per ${giorniRimasti} giorni`}
            </span>
          </div>
          <Progress
            value={Math.min(100, percentuale)}
            className="h-2"
            indicatorClassName={sforato ? "bg-red-500" : percentuale > 85 ? "bg-amber-500" : "bg-emerald-500"}
          />
        </div>

        {corrente.voci.length > 0 && (
          <ul className="text-sm divide-y">
            {corrente.voci.slice(0, 6).map((v) => (
              <li key={v.categoria} className="py-1 flex justify-between gap-2">
                <span>{v.categoria}</span>
                <span className="tabular-nums">{formatCurrency(v.importo)}</span>
              </li>
            ))}
          </ul>
        )}

        {precedenti.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs">
            {precedenti.map((b) => (
              <span
                key={b.mese}
                className={`rounded px-2 py-1 tabular-nums ${
                  b.residuo < 0 ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-600"
                }`}
                title={`speso ${formatCurrency(b.speso)} su ${formatCurrency(b.budget)}`}
              >
                {nomeMese(b.mese).slice(0, 3)} {formatCurrency(b.speso)}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
