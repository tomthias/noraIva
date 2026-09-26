/**
 * Lo scadenzario F24: le righe raggruppate per scadenza, come nell'F24 vero.
 *
 * - Le righe "stima" le calcola l'app dagli incassi; quando Fiscozen emette
 *   l'F24 si scrive l'importo reale e la stima sparisce.
 * - "Segna pagato" crea il movimento "Tasse" sul conto: cassa e tasse da
 *   tenere scendono insieme, il netto non cambia.
 */

import { useState } from "react";
import type { ScadenzaFiscale } from "../../types/fattura";
import { formatCurrency, formatDate } from "../../utils/format";
import { calcolaEspressione } from "../../utils/calcolaEspressione";
import { getAliquotaSostitutiva } from "../../constants/fiscali";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImportoInput } from "@/components/ui/importo-input";
import { AlertTriangle, CalendarClock, Pencil, RotateCcw, Undo2 } from "lucide-react";

interface Props {
  scadenze: ScadenzaFiscale[];
  oggi: string;
  onPaga: (righe: ScadenzaFiscale[], data: string) => void;
  onAnnulla: (movimentoId: string) => void;
  onSalvaImporto: (riga: ScadenzaFiscale) => void;
  onRipristinaStima: (id: string) => void;
}

const TRIBUTO: Record<ScadenzaFiscale["tributo"], string> = {
  inps: "INPS Gestione Separata",
  imposta: "Imposta sostitutiva",
  bollo: "Bollo fatture",
  altro: "Altro",
};

const tipo = (r: ScadenzaFiscale) =>
  ({
    saldo: `saldo ${r.annoImposta}`,
    acconto1: `1° acconto ${r.annoImposta}`,
    acconto2: `2° acconto ${r.annoImposta}`,
    bollo: `${r.annoImposta}${r.note ? ` · ${r.note}` : ""}`,
  })[r.tipo];

const totale = (righe: ScadenzaFiscale[]) => righe.reduce((s, r) => s + r.importo, 0);

function raggruppa(righe: ScadenzaFiscale[]) {
  const gruppi = new Map<string, ScadenzaFiscale[]>();
  for (const r of righe) {
    const chiave = r.pagataIl ? `p:${r.movimentoId ?? r.pagataIl}` : `a:${r.dataScadenza}`;
    gruppi.set(chiave, [...(gruppi.get(chiave) ?? []), r]);
  }
  return [...gruppi.values()];
}

export function Scadenzario({ scadenze, oggi, onPaga, onAnnulla, onSalvaImporto, onRipristinaStima }: Props) {
  const aperte = raggruppa(scadenze.filter((s) => !s.pagataIl));
  const unAnnoFa = `${Number(oggi.slice(0, 4)) - 1}${oggi.slice(4)}`;
  const pagate = raggruppa(scadenze.filter((s) => s.pagataIl && s.pagataIl >= unAnnoFa)).reverse();

  const annoProssimo = Number(oggi.slice(0, 4)) + 1;
  const salto = getAliquotaSostitutiva(annoProssimo) > getAliquotaSostitutiva(annoProssimo - 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarClock className="h-5 w-5 text-amber-500" /> Scadenze F24
        </CardTitle>
        <CardDescription>
          Tutto quello che devi ancora pagare sui soldi già incassati. Quando Fiscozen emette
          l'F24, scrivi l'importo vero al posto della stima.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {aperte.map((gruppo) => (
          <GruppoAperto
            key={gruppo[0].dataScadenza}
            righe={gruppo}
            oggi={oggi}
            onPaga={onPaga}
            onSalvaImporto={onSalvaImporto}
            onRipristinaStima={onRipristinaStima}
          />
        ))}
        {aperte.length === 0 && (
          <p className="text-sm text-muted-foreground">Nessuna scadenza aperta.</p>
        )}

        {salto && (
          <div className="flex gap-2 items-start text-sm rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-muted-foreground">
              Dal {annoProssimo} l'imposta sostitutiva passa al{" "}
              {(getAliquotaSostitutiva(annoProssimo) * 100).toFixed(0)}%. Gli acconti {annoProssimo}{" "}
              si calcolano però sull'imposta {annoProssimo - 1} al 5%: il saldo {annoProssimo},
              da pagare a giugno {annoProssimo + 1}, sarà molto più alto del solito.
            </p>
          </div>
        )}

        {pagate.length > 0 && (
          <details className="group">
            <summary className="text-xs text-muted-foreground cursor-pointer list-none">
              <span className="group-open:rotate-90 transition-transform inline-block mr-1">›</span>
              Pagati negli ultimi 12 mesi
            </summary>
            <ul className="mt-2 divide-y text-sm">
              {pagate.map((g) => (
                <li key={g[0].id} className="py-2 flex items-center justify-between gap-2">
                  <span>
                    {formatDate(g[0].pagataIl!)} · {g.map(tipo).filter((v, i, a) => a.indexOf(v) === i).join(", ")}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="tabular-nums">{formatCurrency(totale(g))}</span>
                    {g[0].movimentoId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Annulla il pagamento"
                        onClick={() => onAnnulla(g[0].movimentoId!)}
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

function GruppoAperto({
  righe,
  oggi,
  onPaga,
  onSalvaImporto,
  onRipristinaStima,
}: {
  righe: ScadenzaFiscale[];
  oggi: string;
  onPaga: Props["onPaga"];
  onSalvaImporto: Props["onSalvaImporto"];
  onRipristinaStima: Props["onRipristinaStima"];
}) {
  const [pagando, setPagando] = useState(false);
  const [dataPagamento, setDataPagamento] = useState(oggi);
  const scadenza = righe[0].dataScadenza;
  const scaduta = scadenza < oggi;
  const stimata = righe.some((r) => r.calcolata);

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${scaduta ? "border-red-500/40" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-medium">
            {formatDate(scadenza)}
            {scaduta && <span className="ml-2 text-xs text-red-600">scaduta</span>}
          </p>
          {stimata && <p className="text-xs text-muted-foreground">contiene stime</p>}
        </div>
        <p className="text-lg font-semibold tabular-nums">{formatCurrency(totale(righe))}</p>
      </div>

      <ul className="text-sm divide-y">
        {righe.map((r) => (
          <Riga
            key={`${r.tributo}-${r.tipo}-${r.annoImposta}-${r.id ?? "stima"}`}
            riga={r}
            onSalvaImporto={onSalvaImporto}
            onRipristinaStima={onRipristinaStima}
          />
        ))}
      </ul>

      {pagando ? (
        <div className="flex flex-wrap gap-2 items-center pt-1">
          <Input
            type="date"
            value={dataPagamento}
            onChange={(e) => setDataPagamento(e.target.value)}
            className="h-8 w-40"
          />
          <Button
            size="sm"
            onClick={() => {
              onPaga(righe, dataPagamento);
              setPagando(false);
            }}
          >
            Pagato {formatCurrency(totale(righe))}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setPagando(false)}>
            Annulla
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setPagando(true)}>
          Segna pagato
        </Button>
      )}
    </div>
  );
}

function Riga({
  riga,
  onSalvaImporto,
  onRipristinaStima,
}: {
  riga: ScadenzaFiscale;
  onSalvaImporto: Props["onSalvaImporto"];
  onRipristinaStima: Props["onRipristinaStima"];
}) {
  const [modifica, setModifica] = useState(false);
  const [bozza, setBozza] = useState("");

  const salva = () => {
    const { valore } = calcolaEspressione(bozza);
    if (valore === null) return;
    onSalvaImporto({ ...riga, importo: valore, calcolata: false });
    setModifica(false);
  };

  return (
    <li className="py-1.5 flex items-center justify-between gap-2">
      <span>
        {TRIBUTO[riga.tributo]} <span className="text-muted-foreground">· {tipo(riga)}</span>
        {riga.calcolata && (
          <span className="ml-2 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            stima
          </span>
        )}
        {riga.importo < 0 && <span className="ml-2 text-xs text-emerald-600">credito</span>}
      </span>
      {modifica ? (
        <span className="flex gap-1 items-center">
          <ImportoInput value={bozza} onChange={setBozza} compatto autoFocus className="h-7 w-28" />
          <Button size="sm" className="h-7" onClick={salva}>
            Salva
          </Button>
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <span className="tabular-nums">{formatCurrency(riga.importo)}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="Scrivi l'importo dell'F24"
            onClick={() => {
              setBozza(riga.importo.toFixed(2).replace(".", ","));
              setModifica(true);
            }}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          {!riga.calcolata && riga.id && riga.tributo !== "bollo" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              title="Torna alla stima dell'app"
              onClick={() => onRipristinaStima(riga.id!)}
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}
        </span>
      )}
    </li>
  );
}
