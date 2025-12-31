/**
 * Componente per gestire tutti i movimenti in una lista unica
 */

import { useState, useMemo } from "react";
import type { Prelievo, Uscita, Entrata } from "../types/fattura";
import { formatCurrency, formatDate } from "../utils/format";
import { normalizzaCategoria } from "../utils/analisiCalcoli";
import { YearFilter } from "./YearFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Pencil, Check, X, Search, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ANNO } from "../constants/fiscali";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";

const COLORS = [
  "#ef4444", // red-500
  "#f97316", // orange-500
  "#eab308", // yellow-500
  "#84cc16", // lime-500
  "#10b981", // emerald-500
  "#06b6d4", // cyan-500
  "#6366f1", // indigo-500
  "#d946ef", // fuchsia-500
];

// Tipo unificato per i movimenti
type TipoMovimento = "stipendio" | "uscita" | "entrata";

interface MovimentoUnificato {
  id: string;
  data: string;
  descrizione: string;
  importo: number;
  tipo: TipoMovimento;
  categoria?: string;
  originale: Prelievo | Uscita | Entrata;
}

interface Props {
  prelievi: Prelievo[];
  uscite: Uscita[];
  entrate: Entrata[];
  onAggiungiPrelievo: (dati: Omit<Prelievo, "id">) => void;
  onModificaPrelievo: (id: string, dati: Partial<Prelievo>) => void;
  onEliminaPrelievo: (id: string) => void;
  onAggiungiUscita: (dati: Omit<Uscita, "id">) => void;
  onModificaUscita: (id: string, dati: Partial<Uscita>) => void;
  onEliminaUscita: (id: string) => void;
  onAggiungiEntrata: (dati: Omit<Entrata, "id">) => void;
  onModificaEntrata: (id: string, dati: Partial<Entrata>) => void;
  onEliminaEntrata: (id: string) => void;
  onConvertiTipoMovimento: (
    sourceType: 'prelievo' | 'uscita' | 'entrata',
    targetType: 'prelievo' | 'uscita' | 'entrata',
    id: string,
    movimento: Prelievo | Uscita | Entrata
  ) => void;
}

// Colori per i badge dei tipi
const TIPO_CONFIG: Record<TipoMovimento, { label: string; color: string; bgColor: string }> = {
  stipendio: { label: "Stipendio", color: "text-purple-400", bgColor: "bg-purple-500/20 border-purple-500/30" },
  uscita: { label: "Uscita", color: "text-red-400", bgColor: "bg-red-500/20 border-red-500/30" },
  entrata: { label: "Entrata", color: "text-green-400", bgColor: "bg-green-500/20 border-green-500/30" },
};

export function GestioneMovimenti({
  prelievi,
  uscite,
  entrate,
  onAggiungiPrelievo,
  onModificaPrelievo,
  onEliminaPrelievo,
  onAggiungiUscita,
  onModificaUscita,
  onEliminaUscita,
  onAggiungiEntrata,
  onModificaEntrata,
  onEliminaEntrata,
  onConvertiTipoMovimento,
}: Props) {
  const [annoSelezionato, setAnnoSelezionato] = useState<number | null>(ANNO);
  const [searchQuery, setSearchQuery] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<TipoMovimento | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formTipo, setFormTipo] = useState<TipoMovimento>("uscita");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescrizione, setEditDescrizione] = useState("");
  const [editCategoria, setEditCategoria] = useState("");
  const [editTipo, setEditTipo] = useState<TipoMovimento | null>(null);

  // Form state
  const [formData, setFormData] = useState(new Date().toISOString().split("T")[0]);
  const [formDescrizione, setFormDescrizione] = useState("");
  const [formCategoria, setFormCategoria] = useState("");
  const [formImporto, setFormImporto] = useState("");

  // Estrai anni disponibili
  const anniDisponibili = useMemo(() => {
    const anniPrelievi = prelievi.map((p) => parseInt(p.data.substring(0, 4)));
    const anniUscite = uscite.map((u) => parseInt(u.data.substring(0, 4)));
    const anniEntrate = entrate.map((e) => parseInt(e.data.substring(0, 4)));
    const anni = new Set([...anniPrelievi, ...anniUscite, ...anniEntrate]);
    return Array.from(anni).sort((a, b) => b - a);
  }, [prelievi, uscite, entrate]);

  // Estrai categorie disponibili per autocomplete
  const categorieDisponibili = useMemo(() => {
    const categorieUscite = uscite
      .map((u) => normalizzaCategoria(u.categoria))
      .filter((cat) => cat !== 'ALTRO');
    const categorieEntrate = entrate
      .map((e) => normalizzaCategoria(e.categoria))
      .filter((cat) => cat !== 'ALTRO');
    const categorie = new Set([...categorieUscite, ...categorieEntrate]);
    return Array.from(categorie).sort();
  }, [uscite, entrate]);

  // Unifica tutti i movimenti
  const movimentiUnificati = useMemo((): MovimentoUnificato[] => {
    const risultato: MovimentoUnificato[] = [];

    // Aggiungi prelievi come "stipendio"
    prelievi.forEach((p) => {
      risultato.push({
        id: `prelievo-${p.id}`,
        data: p.data,
        descrizione: p.descrizione,
        importo: p.importo,
        tipo: "stipendio",
        originale: p,
      });
    });

    // Aggiungi uscite
    uscite.forEach((u) => {
      risultato.push({
        id: `uscita-${u.id}`,
        data: u.data,
        descrizione: u.descrizione,
        importo: u.importo,
        tipo: "uscita",
        categoria: u.categoria,
        originale: u,
      });
    });

    // Aggiungi entrate
    entrate.forEach((e) => {
      risultato.push({
        id: `entrata-${e.id}`,
        data: e.data,
        descrizione: e.descrizione,
        importo: e.importo,
        tipo: "entrata",
        categoria: e.categoria,
        originale: e,
      });
    });

    return risultato;
  }, [prelievi, uscite, entrate]);

  // Filtra movimenti
  const movimentiFiltrati = useMemo(() => {
    let filtered = movimentiUnificati;

    // Filtro anno
    if (annoSelezionato !== null) {
      filtered = filtered.filter((m) => m.data.startsWith(String(annoSelezionato)));
    }

    // Filtro tipo
    if (tipoFiltro !== null) {
      filtered = filtered.filter((m) => m.tipo === tipoFiltro);
    }

    // Filtro search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.descrizione.toLowerCase().includes(query) ||
          (m.categoria || "").toLowerCase().includes(query)
      );
    }

    // Ordina per data decrescente
    return filtered.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [movimentiUnificati, annoSelezionato, tipoFiltro, searchQuery]);

  // Calcoli totali
  const totali = useMemo(() => {
    const totaleStipendi = movimentiFiltrati
      .filter((m) => m.tipo === "stipendio")
      .reduce((sum, m) => sum + m.importo, 0);
    const totaleUscite = movimentiFiltrati
      .filter((m) => m.tipo === "uscita")
      .reduce((sum, m) => sum + m.importo, 0);
    const totaleEntrate = movimentiFiltrati
      .filter((m) => m.tipo === "entrata")
      .reduce((sum, m) => sum + m.importo, 0);

    return { totaleStipendi, totaleUscite, totaleEntrate };
  }, [movimentiFiltrati]);

  // Dati per i grafici (basati sull'anno selezionato, indipendentemente dai filtri di ricerca)
  const { datiMensili, datiCategorie } = useMemo(() => {
    const movimentiAnno = movimentiUnificati.filter((m) => {
      if (m.tipo !== "uscita") return false;
      if (annoSelezionato !== null) {
        return m.data.startsWith(String(annoSelezionato));
      }
      return true;
    });

    // Raggruppa per mese
    const perMese = new Array(12).fill(0);
    movimentiAnno.forEach((m) => {
      const mese = new Date(m.data).getMonth();
      perMese[mese] += m.importo;
    });

    const datiMensili = perMese.map((importo, i) => ({
      mese: new Date(2024, i, 1).toLocaleString("it-IT", { month: "short" }),
      importo: importo,
    }));

    // Raggruppa per categoria
    const perCategoria: Record<string, number> = {};
    movimentiAnno.forEach((m) => {
      const cat = normalizzaCategoria(m.categoria);
      perCategoria[cat] = (perCategoria[cat] || 0) + m.importo;
    });

    const datiCategorie = Object.entries(perCategoria)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { datiMensili, datiCategorie };
  }, [movimentiUnificati, annoSelezionato]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const importo = parseFloat(formImporto) || 0;

    if (formTipo === "stipendio") {
      onAggiungiPrelievo({
        data: formData,
        descrizione: formDescrizione,
        importo,
      });
    } else if (formTipo === "uscita") {
      onAggiungiUscita({
        data: formData,
        descrizione: formDescrizione,
        categoria: formCategoria || undefined,
        importo,
      });
    } else {
      onAggiungiEntrata({
        data: formData,
        descrizione: formDescrizione,
        categoria: formCategoria || undefined,
        importo,
      });
    }

    setFormDescrizione("");
    setFormCategoria("");
    setFormImporto("");
    setShowForm(false);
  };

  const getOriginalId = (id: string) => id.split("-").slice(1).join("-");

  const handleDelete = (movimento: MovimentoUnificato) => {
    if (!confirm("Eliminare questo movimento?")) return;

    const originalId = getOriginalId(movimento.id);
    if (movimento.tipo === "stipendio") {
      onEliminaPrelievo(originalId);
    } else if (movimento.tipo === "uscita") {
      onEliminaUscita(originalId);
    } else {
      onEliminaEntrata(originalId);
    }
  };

  const startEdit = (movimento: MovimentoUnificato) => {
    setEditingId(movimento.id);
    setEditDescrizione(movimento.descrizione);
    setEditCategoria(movimento.categoria || "");
    setEditTipo(movimento.tipo);
  };

  const tipoMovimentoToDbType = (tipo: TipoMovimento): 'prelievo' | 'uscita' | 'entrata' => {
    if (tipo === "stipendio") return "prelievo";
    return tipo;
  };

  const saveEdit = (movimento: MovimentoUnificato) => {
    const originalId = getOriginalId(movimento.id);
    const tipoChanged = editTipo !== null && editTipo !== movimento.tipo;

    if (tipoChanged && editTipo) {
      // Conversione di tipo
      const sourceType = tipoMovimentoToDbType(movimento.tipo);
      const targetType = tipoMovimentoToDbType(editTipo);
      onConvertiTipoMovimento(sourceType, targetType, originalId, movimento.originale);
    } else {
      // Modifica normale (stesso tipo)
      if (movimento.tipo === "stipendio") {
        onModificaPrelievo(originalId, { descrizione: editDescrizione });
      } else if (movimento.tipo === "uscita") {
        onModificaUscita(originalId, {
          descrizione: editDescrizione,
          categoria: editCategoria || undefined,
        });
      } else {
        onModificaEntrata(originalId, {
          descrizione: editDescrizione,
          categoria: editCategoria || undefined,
        });
      }
    }
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header con filtri */}
      <div className="flex flex-col sm:flex-row gap-4">
        <YearFilter
          anni={anniDisponibili}
          annoSelezionato={annoSelezionato}
          onChange={setAnnoSelezionato}
        />
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca movimenti..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuovo
        </Button>
      </div>

      {/* Filtro per tipo */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant={tipoFiltro === null ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setTipoFiltro(null)}
        >
          Tutti
        </Badge>
        {(Object.keys(TIPO_CONFIG) as TipoMovimento[]).map((tipo) => (
          <Badge
            key={tipo}
            variant={tipoFiltro === tipo ? "default" : "outline"}
            className={`cursor-pointer ${tipoFiltro === tipo ? "" : TIPO_CONFIG[tipo].bgColor}`}
            onClick={() => setTipoFiltro(tipoFiltro === tipo ? null : tipo)}
          >
            {TIPO_CONFIG[tipo].label}
          </Badge>
        ))}
      </div>

      {/* Riepilogo totali */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Stipendi</div>
          <div className="text-xl font-bold text-purple-400">
            {formatCurrency(totali.totaleStipendi)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Uscite</div>
          <div className="text-xl font-bold text-red-400">
            {formatCurrency(totali.totaleUscite)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Entrate</div>
          <div className="text-xl font-bold text-green-400">
            {formatCurrency(totali.totaleEntrate)}
          </div>
        </Card>
      </div>

      {/* Grafici Uscite */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-4 text-muted-foreground">Andamento Uscite Mensili</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datiMensili}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f87171" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis
                  dataKey="mese"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#9ca3af" }}
                  dy={10}
                />
                <YAxis
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}€`}
                  tick={{ fill: "#9ca3af" }}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted)/0.2)" }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    color: "hsl(var(--popover-foreground))",
                  }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                  labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                  formatter={(value: any) => [`${formatCurrency(value)}`, "Uscite"]}
                />
                <Bar
                  dataKey="importo"
                  fill="url(#barGradient)"
                  radius={[4, 4, 0, 0]}
                  barSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-medium mb-4 text-muted-foreground">Ripartizione per Categoria</h3>
          <div className="h-[250px] w-full flex items-center justify-center">
            {datiCategorie.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={datiCategorie}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {datiCategorie.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      color: "hsl(var(--popover-foreground))",
                    }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                    labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                    formatter={(value: any) => [`${formatCurrency(value)}`, "Importo"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-muted-foreground">Nessun dato disponibile</div>
            )}
          </div>
          {datiCategorie.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mt-2 max-h-[100px] overflow-y-auto px-2">
              {datiCategorie.map((entry, index) => (
                <div key={index} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <div
                    className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.3)]"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span>{entry.name}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Form nuovo movimento */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nuovo Movimento</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                {(Object.keys(TIPO_CONFIG) as TipoMovimento[]).map((tipo) => (
                  <Badge
                    key={tipo}
                    variant={formTipo === tipo ? "default" : "outline"}
                    className={`cursor-pointer ${formTipo === tipo ? "" : TIPO_CONFIG[tipo].bgColor}`}
                    onClick={() => setFormTipo(tipo)}
                  >
                    {TIPO_CONFIG[tipo].label}
                  </Badge>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={formData}
                    onChange={(e) => setFormData(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Importo (€)</Label>
                  <Input
                    type="number"
                    value={formImporto}
                    onChange={(e) => setFormImporto(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrizione</Label>
                <Input
                  value={formDescrizione}
                  onChange={(e) => setFormDescrizione(e.target.value)}
                  placeholder="es. Stipendio Gennaio, Affitto, Interessi BBVA"
                  required
                />
              </div>
              {formTipo !== "stipendio" && (
                <div className="space-y-2">
                  <Label>Categoria (opzionale)</Label>
                  <Input
                    value={formCategoria}
                    onChange={(e) => setFormCategoria(e.target.value)}
                    placeholder="es. Tasse, Affitto, Interessi"
                    list="categorie-suggerite"
                    autoComplete="off"
                  />
                  <datalist id="categorie-suggerite">
                    {categorieDisponibili.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                  {categorieDisponibili.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {categorieDisponibili.slice(0, 6).map((cat) => (
                        <Badge
                          key={cat}
                          variant={formCategoria === cat ? "default" : "secondary"}
                          className="cursor-pointer text-xs"
                          onClick={() => setFormCategoria(cat)}
                        >
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <Button type="submit">Aggiungi</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Annulla
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista movimenti unificata */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4" />
                Movimenti
              </CardTitle>
              <CardDescription>
                {movimentiFiltrati.length} movimenti
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {movimentiFiltrati.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nessun movimento trovato
            </p>
          ) : (
            <div className="space-y-2">
              {movimentiFiltrati.map((movimento) => (
                <div
                  key={movimento.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50"
                >
                  {editingId === movimento.id ? (
                    <div className="flex-1 space-y-2">
                      <Select
                        value={editTipo || movimento.tipo}
                        onValueChange={(value) => setEditTipo(value as TipoMovimento)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="stipendio">Stipendio</SelectItem>
                          <SelectItem value="uscita">Uscita</SelectItem>
                          <SelectItem value="entrata">Entrata</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={editDescrizione}
                        onChange={(e) => setEditDescrizione(e.target.value)}
                        placeholder="Descrizione"
                        autoFocus
                      />
                      {editTipo !== "stipendio" && (
                        <>
                          <Input
                            value={editCategoria}
                            onChange={(e) => setEditCategoria(e.target.value)}
                            placeholder="Categoria"
                            list="categorie-edit-suggerite"
                            autoComplete="off"
                          />
                          <datalist id="categorie-edit-suggerite">
                            {categorieDisponibili.map((cat) => (
                              <option key={cat} value={cat} />
                            ))}
                          </datalist>
                          {categorieDisponibili.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {categorieDisponibili.slice(0, 4).map((cat) => (
                                <Badge
                                  key={cat}
                                  variant={editCategoria === cat ? "default" : "secondary"}
                                  className="cursor-pointer text-xs"
                                  onClick={() => setEditCategoria(cat)}
                                >
                                  {cat}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => saveEdit(movimento)}
                        >
                          <Check className="h-4 w-4 mr-1" /> Salva
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="h-4 w-4 mr-1" /> Annulla
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{movimento.descrizione}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatDate(movimento.data)}
                          {movimento.categoria && ` • ${movimento.categoria}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-xs ${TIPO_CONFIG[movimento.tipo].bgColor} ${TIPO_CONFIG[movimento.tipo].color}`}
                        >
                          {TIPO_CONFIG[movimento.tipo].label}
                        </Badge>
                        <span
                          className={`font-semibold ${movimento.tipo === "entrata"
                            ? "text-green-400"
                            : movimento.tipo === "stipendio"
                              ? "text-purple-400"
                              : "text-red-400"
                            }`}
                        >
                          {formatCurrency(movimento.importo)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(movimento)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(movimento)}
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
      </Card>
    </div>
  );
}
