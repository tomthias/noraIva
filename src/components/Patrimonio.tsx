/**
 * Patrimonio: pensione privata, investimenti, Moneyfarm. Monitorato, MAI
 * prelevabile: non entra nel netto né nel fondo investimenti.
 *
 * Per ogni strumento: quanto hai versato (dai movimenti collegati), l'ultimo
 * valore che hai scritto e la differenza. I versamenti non ancora collegati a
 * uno strumento si assegnano qui.
 */

import { useState } from "react";
import type { Movimento, StrumentoPatrimonio, TipoStrumento } from "../types/fattura";
import type { PosizionePatrimonio } from "../utils/fisco";
import { eInvestimento } from "../constants/fiscali";
import { formatCurrency, formatDate } from "../utils/format";
import { calcolaEspressione } from "../utils/calcolaEspressione";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImportoInput } from "@/components/ui/importo-input";
import { Landmark, Plus } from "lucide-react";

interface Props {
  posizioni: PosizionePatrimonio[];
  strumenti: StrumentoPatrimonio[];
  movimenti: Movimento[];
  fondoInvestimenti: number;
  oggi: string;
  onAggiornaValore: (strumentoId: string, data: string, valore: number) => void;
  onAssegna: (movimentoId: string, strumentoId: string | undefined) => void;
  onAggiungiStrumento: (nome: string, tipo: TipoStrumento) => void;
}

export function Patrimonio({
  posizioni,
  strumenti,
  movimenti,
  fondoInvestimenti,
  oggi,
  onAggiornaValore,
  onAssegna,
  onAggiungiStrumento,
}: Props) {
  const versato = posizioni.reduce((s, p) => s + p.versato, 0);
  const valore = posizioni.reduce((s, p) => s + (p.valore ?? p.versato), 0);
  const daAssegnare = movimenti
    .filter((m) => !m.strumentoId && eInvestimento(m.categoria))
    .sort((a, b) => b.data.localeCompare(a.data));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Patrimonio</h2>
        <p className="text-muted-foreground">
          Quello che hai messo da parte fuori dal conto. Non è prelevabile e non entra nel netto.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Totale etichetta="Versato" valore={versato} />
        <Totale etichetta="Valore (ultimo aggiornamento)" valore={valore} />
        <Totale etichetta="Da investire oggi" valore={fondoInvestimenti} nota="dalla Dashboard, dopo tasse, cuscinetto e riserva di vita" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {posizioni.map((p) => (
          <Strumento key={p.strumento.id} posizione={p} oggi={oggi} onAggiornaValore={onAggiornaValore} />
        ))}
        <NuovoStrumento onAggiungi={onAggiungiStrumento} />
      </div>

      {daAssegnare.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Versamenti da assegnare</CardTitle>
            <CardDescription>
              Bonifici con categoria "Investimenti" non ancora collegati a uno strumento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {daAssegnare.map((m) => (
                <li key={m.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {formatDate(m.data)} · {m.descrizione}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="tabular-nums">{formatCurrency(-m.importo)}</span>
                    <select
                      className="h-8 rounded-md border bg-background px-2 text-sm"
                      value=""
                      onChange={(e) => e.target.value && onAssegna(m.id, e.target.value)}
                      aria-label="Assegna a uno strumento"
                    >
                      <option value="">Assegna a…</option>
                      {strumenti.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nome}
                        </option>
                      ))}
                    </select>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Totale({ etichetta, valore, nota }: { etichetta: string; valore: number; nota?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{etichetta}</p>
        <p className="text-2xl font-semibold tabular-nums">{formatCurrency(valore)}</p>
        {nota && <p className="text-xs text-muted-foreground mt-1">{nota}</p>}
      </CardContent>
    </Card>
  );
}

function Strumento({
  posizione: p,
  oggi,
  onAggiornaValore,
}: {
  posizione: PosizionePatrimonio;
  oggi: string;
  onAggiornaValore: Props["onAggiornaValore"];
}) {
  const [aperto, setAperto] = useState(false);
  const [bozza, setBozza] = useState("");
  const [data, setData] = useState(oggi);

  const salva = () => {
    const { valore } = calcolaEspressione(bozza);
    if (valore === null || valore < 0) return;
    onAggiornaValore(p.strumento.id, data, valore);
    setAperto(false);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Landmark className="h-4 w-4 text-muted-foreground" /> {p.strumento.nome}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Riga etichetta="Versato" valore={formatCurrency(p.versato)} />
        <Riga
          etichetta={p.valoreAl ? `Valore al ${formatDate(p.valoreAl)}` : "Valore"}
          valore={p.valore === undefined ? "non inserito" : formatCurrency(p.valore)}
        />
        {p.rendimento !== undefined && (
          <Riga
            etichetta="Rendimento"
            valore={
              <span className={p.rendimento >= 0 ? "text-emerald-600" : "text-red-600"}>
                {formatCurrency(p.rendimento)}
                {p.versato > 0 && ` (${((p.rendimento / p.versato) * 100).toFixed(1)}%)`}
              </span>
            }
          />
        )}
        {aperto ? (
          <div className="space-y-2 pt-2 border-t">
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="h-8" />
            <ImportoInput value={bozza} onChange={setBozza} placeholder="Controvalore attuale" autoFocus />
            <div className="flex gap-2">
              <Button size="sm" onClick={salva}>
                Salva
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAperto(false)}>
                Annulla
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setAperto(true)}>
            Aggiorna valore
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function Riga({ etichetta, valore }: { etichetta: string; valore: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{etichetta}</span>
      <span className="tabular-nums font-medium">{valore}</span>
    </div>
  );
}

function NuovoStrumento({ onAggiungi }: { onAggiungi: Props["onAggiungiStrumento"] }) {
  const [aperto, setAperto] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoStrumento>("investimento");

  if (!aperto)
    return (
      <button
        type="button"
        onClick={() => setAperto(true)}
        className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" /> Aggiungi strumento
      </button>
    );

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome" autoFocus />
        <select
          className="h-9 w-full rounded-md border bg-background px-2 text-sm"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoStrumento)}
          aria-label="Tipo di strumento"
        >
          <option value="investimento">Investimento</option>
          <option value="pensione">Pensione privata</option>
          <option value="moneyfarm">Moneyfarm</option>
        </select>
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={!nome.trim()}
            onClick={() => {
              onAggiungi(nome.trim(), tipo);
              setNome("");
              setAperto(false);
            }}
          >
            Aggiungi
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setAperto(false)}>
            Annulla
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
