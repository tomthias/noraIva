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
import { Trash2, Plus, TrendingDown, Receipt, ChevronDown, ChevronUp, Pencil, Check, X } from "lucide-react";
import { ANNO } from "../constants/fiscali";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface Props {
  prelievi: Prelievo[];
  uscite: Uscita[];
  onAggiungiPrelievo: (dati: Omit<Prelievo, "id">) => void;
  onModificaPrelievo: (id: string, dati: Partial<Prelievo>) => void;
  onEliminaPrelievo: (id: string) => void;
  onAggiungiUscita: (dati: Omit<Uscita, "id">) => void;
  onModificaUscita: (id: string, dati: Partial<Uscita>) => void;
  onEliminaUscita: (id: string) => void;
}

const COLORS = [
  "hsl(142.1 76.2% 36.3%)", // green
  "hsl(47.9 95.8% 53.1%)",  // amber
  "hsl(221.2 83.2% 53.3%)", // blue
  "hsl(262.1 83.3% 57.8%)", // purple
  "hsl(346.8 77.2% 49.8%)", // red
  "hsl(24.6 95% 53.1%)",    // orange
  "hsl(173.4 80.4% 40%)",   // teal
  "hsl(291.1 63.9% 47%)",   // pink
];

export function GestioneMovimenti({
  prelievi,
  uscite,
  onAggiungiPrelievo,
  onModificaPrelievo,
  onEliminaPrelievo,
  onAggiungiUscita,
  onModificaUscita,
  onEliminaUscita,
}: Props) {
  const [showFormPrelievo, setShowFormPrelievo] = useState(false);
  const [showFormUscita, setShowFormUscita] = useState(false);
  const [annoSelezionato, setAnnoSelezionato] = useState<number | null>(ANNO);
  const [prelieviExpanded, setPrelieviExpanded] = useState(false);
  const [usciteExpanded, setUsciteExpanded] = useState(false);

  // Editing state
  const [editingPrelievoId, setEditingPrelievoId] = useState<string | null>(null);
  const [editingUscitaId, setEditingUscitaId] = useState<string | null>(null);
  const [editDescrizionePrelievo, setEditDescrizionePrelievo] = useState("");
  const [editDescrizioneUscita, setEditDescrizioneUscita] = useState("");
  const [editCategoriaUscita, setEditCategoriaUscita] = useState("");

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

  // Dati per il grafico a torta delle uscite per categoria
  const uscitePerCategoria = useMemo(() => {
    const categorieMap = new Map<string, number>();
    usciteFiltrate.forEach((u) => {
      const cat = u.categoria || "Altro";
      categorieMap.set(cat, (categorieMap.get(cat) || 0) + u.importo);
    });
    return Array.from(categorieMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [usciteFiltrate]);

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

  const startEditPrelievo = (prelievo: Prelievo) => {
    setEditingPrelievoId(prelievo.id);
    setEditDescrizionePrelievo(prelievo.descrizione);
  };

  const saveEditPrelievo = (id: string) => {
    onModificaPrelievo(id, { descrizione: editDescrizionePrelievo });
    setEditingPrelievoId(null);
  };

  const startEditUscita = (uscita: Uscita) => {
    setEditingUscitaId(uscita.id);
    setEditDescrizioneUscita(uscita.descrizione);
    setEditCategoriaUscita(uscita.categoria || "");
  };

  const saveEditUscita = (id: string) => {
    onModificaUscita(id, {
      descrizione: editDescrizioneUscita,
      categoria: editCategoriaUscita || undefined,
    });
    setEditingUscitaId(null);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-popover border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-destructive font-semibold">{formatCurrency(data.value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Filtro Anno */}
      <YearFilter
        anni={anniDisponibili}
        annoSelezionato={annoSelezionato}
        onChange={setAnnoSelezionato}
      />

      {/* Grafico Uscite per Categoria */}
      {usciteFiltrate.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Uscite per Categoria</CardTitle>
            <CardDescription>Distribuzione delle spese {annoSelezionato}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={uscitePerCategoria}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {uscitePerCategoria.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    formatter={(value) => <span className="text-sm">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sezione Prelievi */}
        <Card>
          <CardHeader
            className="cursor-pointer select-none"
            onClick={() => setPrelieviExpanded(!prelieviExpanded)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingDown className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">Prelievi</CardTitle>
                  <CardDescription>
                    {prelieviFiltrati.length} {prelieviFiltrati.length === 1 ? "prelievo" : "prelievi"}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-destructive">
                  {formatCurrency(totali.totalePrelievi)}
                </span>
                {prelieviExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>

          {prelieviExpanded && (
            <CardContent className="space-y-4 pt-0">
              <div className="flex justify-end">
                <Button size="sm" onClick={(e) => { e.stopPropagation(); setShowFormPrelievo(!showFormPrelievo); }}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

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
                      {editingPrelievoId === prelievo.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            value={editDescrizionePrelievo}
                            onChange={(e) => setEditDescrizionePrelievo(e.target.value)}
                            className="flex-1"
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => saveEditPrelievo(prelievo.id)}
                          >
                            <Check className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingPrelievoId(null)}
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ) : (
                        <>
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
                              onClick={() => startEditPrelievo(prelievo)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
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
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Sezione Uscite */}
        <Card>
          <CardHeader
            className="cursor-pointer select-none"
            onClick={() => setUsciteExpanded(!usciteExpanded)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Receipt className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">Uscite</CardTitle>
                  <CardDescription>
                    {usciteFiltrate.length} {usciteFiltrate.length === 1 ? "uscita" : "uscite"}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-destructive">
                  {formatCurrency(totali.totaleUscite)}
                </span>
                {usciteExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>

          {usciteExpanded && (
            <CardContent className="space-y-4 pt-0">
              <div className="flex justify-end">
                <Button size="sm" onClick={(e) => { e.stopPropagation(); setShowFormUscita(!showFormUscita); }}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

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
                      {editingUscitaId === uscita.id ? (
                        <div className="flex-1 space-y-2">
                          <Input
                            value={editDescrizioneUscita}
                            onChange={(e) => setEditDescrizioneUscita(e.target.value)}
                            placeholder="Descrizione"
                            autoFocus
                          />
                          <Input
                            value={editCategoriaUscita}
                            onChange={(e) => setEditCategoriaUscita(e.target.value)}
                            placeholder="Categoria"
                          />
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => saveEditUscita(uscita.id)}
                            >
                              <Check className="h-4 w-4 mr-1" /> Salva
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingUscitaId(null)}
                            >
                              <X className="h-4 w-4 mr-1" /> Annulla
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
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
                              onClick={() => startEditUscita(uscita)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
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
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
