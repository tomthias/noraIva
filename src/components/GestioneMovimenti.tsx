/**
 * Componente per gestire Prelievi e Uscite insieme
 */

import { useState, useMemo } from "react";
import type { Prelievo, Uscita } from "../types/fattura";
import { formatCurrency, formatDate } from "../utils/format";
import { YearFilter } from "./YearFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, TrendingDown, Receipt } from "lucide-react";
import { ANNO } from "../constants/fiscali";

interface Props {
  prelievi: Prelievo[];
  uscite: Uscita[];
  onAggiungiPrelievo: (dati: Omit<Prelievo, "id">) => void;
  onEliminaPrelievo: (id: string) => void;
  onAggiungiUscita: (dati: Omit<Uscita, "id">) => void;
  onEliminaUscita: (id: string) => void;
}

export function GestioneMovimenti({
  prelievi,
  uscite,
  onAggiungiPrelievo,
  onEliminaPrelievo,
  onAggiungiUscita,
  onEliminaUscita,
}: Props) {
  const [showFormPrelievo, setShowFormPrelievo] = useState(false);
  const [showFormUscita, setShowFormUscita] = useState(false);
  const [annoSelezionato, setAnnoSelezionato] = useState<number | null>(ANNO);

  // Form Prelievo
  const [dataPrelievo, setDataPrelievo] = useState(new Date().toISOString().split("T")[0]);
  const [descrizionePrelievo, setDescrizionePrelievo] = useState("");
  const [importoPrelievo, setImportoPrelievo] = useState("");

  // Form Uscita
  const [dataUscita, setDataUscita] = useState(new Date().toISOString().split("T")[0]);
  const [descrizioneUscita, setDescrizioneUscita] = useState("");
  const [categoriaUscita, setCategoriaUscita] = useState("");
  const [importoUscita, setImportoUscita] = useState("");

  // Estrai anni disponibili da prelievi e uscite
  const anniDisponibili = useMemo(() => {
    const anniPrelievi = prelievi.map((p) => parseInt(p.data.substring(0, 4)));
    const anniUscite = uscite.map((u) => parseInt(u.data.substring(0, 4)));
    const anni = new Set([...anniPrelievi, ...anniUscite]);
    return Array.from(anni).sort((a, b) => b - a);
  }, [prelievi, uscite]);

  // Filtra per anno selezionato
  const prelieviFiltrati = useMemo(() => {
    if (annoSelezionato === null) return prelievi;
    return prelievi.filter((p) => p.data.startsWith(String(annoSelezionato)));
  }, [prelievi, annoSelezionato]);

  const usciteFiltrate = useMemo(() => {
    if (annoSelezionato === null) return uscite;
    return uscite.filter((u) => u.data.startsWith(String(annoSelezionato)));
  }, [uscite, annoSelezionato]);

  // Calcoli totali (sui dati filtrati)
  const totali = useMemo(() => {
    const totalePrelievi = prelieviFiltrati.reduce((sum, p) => sum + p.importo, 0);
    const totaleUscite = usciteFiltrate.reduce((sum, u) => sum + u.importo, 0);
    const tassePagate = usciteFiltrate
      .filter((u) => u.categoria === "Tasse")
      .reduce((sum, u) => sum + u.importo, 0);
    const altreSpese = totaleUscite - tassePagate;

    return { totalePrelievi, totaleUscite, tassePagate, altreSpese };
  }, [prelieviFiltrati, usciteFiltrate]);

  const handleSubmitPrelievo = (e: React.FormEvent) => {
    e.preventDefault();
    onAggiungiPrelievo({
      data: dataPrelievo,
      descrizione: descrizionePrelievo,
      importo: parseFloat(importoPrelievo) || 0,
    });
    setDescrizionePrelievo("");
    setImportoPrelievo("");
    setShowFormPrelievo(false);
  };

  const handleSubmitUscita = (e: React.FormEvent) => {
    e.preventDefault();
    onAggiungiUscita({
      data: dataUscita,
      descrizione: descrizioneUscita,
      categoria: categoriaUscita || undefined,
      importo: parseFloat(importoUscita) || 0,
    });
    setDescrizioneUscita("");
    setCategoriaUscita("");
    setImportoUscita("");
    setShowFormUscita(false);
  };

  return (
    <div className="space-y-6">
      {/* Filtro Anno */}
      <YearFilter
        anni={anniDisponibili}
        annoSelezionato={annoSelezionato}
        onChange={setAnnoSelezionato}
      />

      {/* Card Riepilogo Totali */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingDown className="h-4 w-4" />
                Prelievi
              </div>
              <div className="text-xl font-bold text-destructive">
                {formatCurrency(totali.totalePrelievi)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Receipt className="h-4 w-4" />
                Uscite totali
              </div>
              <div className="text-xl font-bold text-destructive">
                {formatCurrency(totali.totaleUscite)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">di cui Tasse</div>
              <div className="text-lg font-semibold text-amber-500">
                {formatCurrency(totali.tassePagate)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">di cui Altre spese</div>
              <div className="text-lg font-semibold">
                {formatCurrency(totali.altreSpese)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Sezione Prelievi */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Prelievi</CardTitle>
              <CardDescription>Stipendi e prelievi personali</CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowFormPrelievo(!showFormPrelievo)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showFormPrelievo && (
            <form onSubmit={handleSubmitPrelievo} className="space-y-3 p-4 border rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="data-prelievo">Data</Label>
                <Input
                  type="date"
                  id="data-prelievo"
                  value={dataPrelievo}
                  onChange={(e) => setDataPrelievo(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc-prelievo">Descrizione</Label>
                <Input
                  id="desc-prelievo"
                  value={descrizionePrelievo}
                  onChange={(e) => setDescrizionePrelievo(e.target.value)}
                  placeholder="es. Stipendio Gennaio"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="importo-prelievo">Importo (€)</Label>
                <Input
                  type="number"
                  id="importo-prelievo"
                  value={importoPrelievo}
                  onChange={(e) => setImportoPrelievo(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm">
                  Aggiungi
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowFormPrelievo(false)}
                >
                  Annulla
                </Button>
              </div>
            </form>
          )}

          {prelieviFiltrati.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nessun prelievo registrato
            </p>
          ) : (
            <div className="space-y-2">
              {prelieviFiltrati.map((prelievo) => (
                <div
                  key={prelievo.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50"
                >
                  <div className="flex-1">
                    <div className="font-medium">{prelievo.descrizione}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(prelievo.data)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-destructive">
                      {formatCurrency(prelievo.importo)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Eliminare questo prelievo?")) {
                          onEliminaPrelievo(prelievo.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sezione Uscite */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Uscite</CardTitle>
              <CardDescription>Affitto, spese e altre uscite</CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowFormUscita(!showFormUscita)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showFormUscita && (
            <form onSubmit={handleSubmitUscita} className="space-y-3 p-4 border rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="data-uscita">Data</Label>
                <Input
                  type="date"
                  id="data-uscita"
                  value={dataUscita}
                  onChange={(e) => setDataUscita(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc-uscita">Descrizione</Label>
                <Input
                  id="desc-uscita"
                  value={descrizioneUscita}
                  onChange={(e) => setDescrizioneUscita(e.target.value)}
                  placeholder="es. Affitto Gennaio"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-uscita">Categoria (opzionale)</Label>
                <Input
                  id="cat-uscita"
                  value={categoriaUscita}
                  onChange={(e) => setCategoriaUscita(e.target.value)}
                  placeholder="es. Affitto, Commercialista"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="importo-uscita">Importo (€)</Label>
                <Input
                  type="number"
                  id="importo-uscita"
                  value={importoUscita}
                  onChange={(e) => setImportoUscita(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm">
                  Aggiungi
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowFormUscita(false)}
                >
                  Annulla
                </Button>
              </div>
            </form>
          )}

          {usciteFiltrate.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nessuna uscita registrata</p>
          ) : (
            <div className="space-y-2">
              {usciteFiltrate.map((uscita) => (
                <div
                  key={uscita.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50"
                >
                  <div className="flex-1">
                    <div className="font-medium">{uscita.descrizione}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(uscita.data)}
                      {uscita.categoria && ` • ${uscita.categoria}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-destructive">
                      {formatCurrency(uscita.importo)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Eliminare questa uscita?")) {
                          onEliminaUscita(uscita.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
