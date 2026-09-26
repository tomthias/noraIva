/**
 * Le quattro cifre che contano, tutte da `situazione()`:
 * cassa − tasse da tenere − cuscinetto = netto prelevabile, e quanto di quel
 * netto avanza per il fondo investimenti dopo la riserva di vita.
 *
 * Solo presentazione: nessun conto qui.
 */

import { useState } from "react";
import type { Situazione } from "../../utils/fisco";
import type { verificaBanca } from "../../utils/fisco";
import { formatCurrency, formatDate } from "../../utils/format";
import { calcolaEspressione } from "../../utils/calcolaEspressione";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImportoInput } from "@/components/ui/importo-input";
import { AlertTriangle, CheckCircle2, Pencil } from "lucide-react";

interface Props {
  s: Situazione;
  banca: ReturnType<typeof verificaBanca>;
  mesiRiserva: number;
  onSalvaCuscinetto: (valore: number) => void;
  onSalvaMesiRiserva: (mesi: number) => void;
}

export function Prelevabile({ s, banca, mesiRiserva, onSalvaCuscinetto, onSalvaMesiRiserva }: Props) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="p-6 border-b bg-emerald-500/5">
          <p className="text-sm font-medium text-muted-foreground">Netto prelevabile</p>
          <p
            className={`text-4xl font-bold tracking-tight tabular-nums ${
              s.netto >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {formatCurrency(s.netto)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {s.netto >= 0
              ? "Per vivere e pagare l'affitto, con le tasse maturate e il cuscinetto già messi da parte."
              : "Sul conto non c'è abbastanza per coprire le tasse maturate e il cuscinetto."}
          </p>
        </div>

        <dl className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0">
          <Voce etichetta="Sul conto" valore={s.cassa}>
            {banca && Math.abs(banca.scostamento) < 0.01 ? (
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="h-3 w-3" /> torna con BBVA al {formatDate(banca.data)}
              </span>
            ) : banca ? (
              <span className="flex items-start gap-1 text-amber-600">
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                <span>
                  BBVA al {formatDate(banca.data)}: {formatCurrency(banca.saldoBanca)}. Scostamento{" "}
                  {formatCurrency(banca.scostamento)}: manca o è doppio un movimento.
                </span>
              </span>
            ) : (
              "saldo di apertura + movimenti"
            )}
          </Voce>
          <Voce etichetta="Tasse da tenere" valore={-s.daTenere}>
            {s.aperte.length} righe F24 non pagate
          </Voce>
          <Voce etichetta="Cuscinetto" valore={-s.cuscinetto}>
            <Modificabile
              valore={s.cuscinetto}
              onSalva={onSalvaCuscinetto}
              testo="riserva per le emergenze"
            />
          </Voce>
          <Voce etichetta="Fondo investimenti" valore={s.fondoInvestimenti} evidenza>
            <span>
              dopo{" "}
              <MesiModificabili mesi={mesiRiserva} onSalva={onSalvaMesiRiserva} /> di vita (
              {formatCurrency(s.costoVita)}/mese, media 12 mesi)
            </span>
          </Voce>
        </dl>
      </CardContent>
    </Card>
  );
}

function Voce({
  etichetta,
  valore,
  evidenza,
  children,
}: {
  etichetta: string;
  valore: number;
  evidenza?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="p-4 space-y-1">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{etichetta}</dt>
      <dd className={`text-xl font-semibold tabular-nums ${evidenza ? "text-sky-600" : ""}`}>
        {formatCurrency(valore)}
      </dd>
      <dd className="text-xs text-muted-foreground">{children}</dd>
    </div>
  );
}

function Modificabile({
  valore,
  onSalva,
  testo,
}: {
  valore: number;
  onSalva: (v: number) => void;
  testo: string;
}) {
  const [aperto, setAperto] = useState(false);
  const [bozza, setBozza] = useState("");

  if (!aperto)
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() => {
          setBozza(String(valore));
          setAperto(true);
        }}
      >
        {testo} <Pencil className="h-3 w-3" />
      </button>
    );

  const salva = () => {
    const { valore: v } = calcolaEspressione(bozza);
    if (v === null || v < 0) return;
    onSalva(v);
    setAperto(false);
  };

  return (
    <span className="flex gap-1 items-start">
      <ImportoInput value={bozza} onChange={setBozza} compatto autoFocus className="h-7" />
      <Button size="sm" className="h-7" onClick={salva}>
        Salva
      </Button>
    </span>
  );
}

function MesiModificabili({ mesi, onSalva }: { mesi: number; onSalva: (m: number) => void }) {
  const [aperto, setAperto] = useState(false);
  const [bozza, setBozza] = useState(String(mesi));

  if (!aperto)
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1 underline decoration-dotted hover:text-foreground"
        onClick={() => setAperto(true)}
      >
        {mesi} mesi
      </button>
    );

  return (
    <span className="inline-flex gap-1 items-center">
      <Input
        type="number"
        min={0}
        max={24}
        value={bozza}
        onChange={(e) => setBozza(e.target.value)}
        className="h-7 w-16"
        autoFocus
      />
      <Button
        size="sm"
        className="h-7"
        onClick={() => {
          onSalva(Number(bozza) || 0);
          setAperto(false);
        }}
      >
        Salva
      </Button>
    </span>
  );
}
