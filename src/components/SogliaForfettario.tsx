/**
 * Incassi dell'anno rispetto ai limiti di ricavi del regime forfettario.
 *
 * Due soglie con conseguenze molto diverse:
 * - oltre 85.000 € si esce dal forfettario dall'anno SUCCESSIVO;
 * - oltre 100.000 € si esce nell'anno STESSO, con IVA dovuta a partire
 *   dall'operazione che ha fatto superare il limite.
 *
 * Il limite si misura sui compensi INCASSATI nell'anno, non sulle fatture
 * emesse (Agenzia delle Entrate, Telefisco 18/09/2025). Il campo `data` di
 * Fattura è per convenzione la data di incasso; quando le fatture registrate
 * non rispecchiano l'incassato reale, l'importo si può dichiarare a mano.
 */

import { useState } from "react";
import { toast } from "sonner";
import {
  LIMITE_RICAVI_FORFETTARIO,
  LIMITE_USCITA_IMMEDIATA,
} from "../constants/fiscali";
import { formatCurrency } from "../utils/format";
import { calcolaEspressione } from "../utils/calcolaEspressione";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "./ui/progress";
import { Button } from "@/components/ui/button";
import { ImportoInput } from "@/components/ui/importo-input";
import { AlertTriangle, CheckCircle, Gauge, Pencil, PenLine } from "lucide-react";

interface Props {
  /** Somma delle fatture registrate nell'anno. */
  incassiDaFatture: number;
  /** Incassato che le fatture non rappresentano (0 se assente). */
  rettifica: number;
  anno: number;
  /** Riceve la rettifica, non il totale: il totale resta progressivo. */
  onSalvaRettifica: (rettifica: number) => void;
  onAzzeraRettifica: () => void;
}

export function SogliaForfettario({
  incassiDaFatture,
  rettifica,
  anno,
  onSalvaRettifica,
  onAzzeraRettifica,
}: Props) {
  const [inModifica, setInModifica] = useState(false);
  const [bozza, setBozza] = useState("");

  // La rettifica si SOMMA alle fatture: aggiungerne una nuova alza il totale
  // senza dover reinserire nulla.
  const incassi = incassiDaFatture + rettifica;
  const dichiarato = rettifica !== 0;

  const percentuale = (incassi / LIMITE_RICAVI_FORFETTARIO) * 100;
  const residuo = LIMITE_RICAVI_FORFETTARIO - incassi;

  const stato =
    incassi > LIMITE_USCITA_IMMEDIATA
      ? "uscita-immediata"
      : incassi > LIMITE_RICAVI_FORFETTARIO
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
    ok: `Puoi incassare ancora ${formatCurrency(residuo)} quest'anno.`,
    attenzione: `Puoi incassare ancora ${formatCurrency(residuo)} prima del limite di ${formatCurrency(LIMITE_RICAVI_FORFETTARIO)}.`,
    critico: `Sei vicino al limite: puoi incassare ancora solo ${formatCurrency(residuo)}.`,
    superato: `Limite di ${formatCurrency(LIMITE_RICAVI_FORFETTARIO)} superato: dal ${anno + 1} esci dal regime forfettario.`,
    "uscita-immediata": `Superati i ${formatCurrency(LIMITE_USCITA_IMMEDIATA)}: esci dal forfettario già nel ${anno}, con IVA dovuta dall'operazione che ha sforato.`,
  }[stato];

  const apriModifica = () => {
    setBozza(String(incassi || ""));
    setInModifica(true);
  };

  const salva = () => {
    const { valore, errore } = calcolaEspressione(bozza);
    if (valore === null) {
      toast.error(errore ?? "Inserisci un importo valido");
      return;
    }
    if (valore < 0) {
      toast.error("L'incassato non può essere negativo");
      return;
    }
    // Si digita il TOTALE incassato, ma si salva la differenza rispetto alle
    // fatture: così le fatture successive continuano a sommarsi.
    onSalvaRettifica(valore - incassiDaFatture);
    setInModifica(false);
    toast.success(`Incassi ${anno} allineati a ${formatCurrency(valore)}`);
  };

  const ripristina = () => {
    onAzzeraRettifica();
    setInModifica(false);
    toast.success(`Incassi ${anno} ricalcolati dalle sole fatture registrate`);
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Incassi {anno}</span>
            {dichiarato && (
              <span
                className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-500 flex items-center gap-1"
                title={`Include una rettifica di ${formatCurrency(rettifica)} oltre alle fatture registrate`}
              >
                <PenLine className="h-2.5 w-2.5" />
                rettificato
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-sm font-semibold tabular-nums ${colore.testo}`}>
              {formatCurrency(incassi)}
              <span className="text-muted-foreground font-normal">
                {" / "}
                {formatCurrency(LIMITE_RICAVI_FORFETTARIO)}
              </span>
            </span>
            {!inModifica && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={apriModifica}
                title="Dichiara l'incassato reale"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        <Progress
          value={Math.min(100, percentuale)}
          className="h-2"
          indicatorClassName={colore.barra}
        />

        {inModifica ? (
          <div className="space-y-2 border-t pt-3">
            <p className="text-xs text-muted-foreground">
              Scrivi l'<strong>incassato totale</strong> del {anno} secondo il
              commercialista. L'app ne ricava la differenza rispetto alle fatture
              registrate e la tiene come rettifica, così le fatture che aggiungerai
              dopo continueranno a sommarsi normalmente.
            </p>
            <ImportoInput
              value={bozza}
              onChange={setBozza}
              placeholder="52924"
              autoFocus
            />
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={salva}>
                Salva
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setInModifica(false)}>
                Annulla
              </Button>
              {dichiarato && (
                <Button size="sm" variant="ghost" onClick={ripristina}>
                  Azzera rettifica ({formatCurrency(incassiDaFatture)})
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
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

            <p className="text-xs text-muted-foreground/80 border-t pt-2">
              {dichiarato ? (
                <>
                  <span className="tabular-nums">{formatCurrency(incassiDaFatture)}</span>{" "}
                  dalle fatture registrate{" "}
                  <span className="tabular-nums">
                    {rettifica < 0 ? "−" : "+"} {formatCurrency(Math.abs(rettifica))}
                  </span>{" "}
                  di rettifica. Le fatture che aggiungi da qui in avanti si sommano
                  normalmente; riduci la rettifica man mano che ridati le vecchie
                  fatture per cassa.
                </>
              ) : (
                <>
                  Somma delle fatture <strong>incassate</strong> nel {anno} (il forfettario
                  tassa per cassa). Se non torna con il commercialista, usa la matita per
                  allinearlo.
                </>
              )}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
