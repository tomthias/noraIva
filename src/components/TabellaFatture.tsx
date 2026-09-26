import { useState, useMemo } from "react";
import { toast } from "sonner";
import type { Fattura } from "../types/fattura";
import { quotaTasseMarginale } from "../utils/fisco";
import { formatCurrency, formatDate } from "../utils/format";
import { FormFattura } from "./FormFattura";
import { YearFilter } from "./YearFilter";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ANNO } from "../constants/fiscali";

interface Props {
  fatture: Fattura[];
  onModifica: (id: string, dati: Partial<Fattura>) => void;
  onElimina: (id: string) => void;
  descrizioniSuggerite?: string[];
}

/** Anno di riferimento: incasso se c'è, altrimenti emissione. */
const annoDi = (f: Fattura) =>
  Number((f.data ?? f.dataEmissione ?? new Date().toISOString()).slice(0, 4));

export function TabellaFatture({ fatture, onModifica, onElimina, descrizioniSuggerite = [] }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [annoSelezionato, setAnnoSelezionato] = useState<number | null>(ANNO);
  const [searchQuery, setSearchQuery] = useState("");

  // Estrai anni disponibili dalle fatture, includendo sempre anno corrente e prossimo
  const anniDisponibili = useMemo(() => {
    const anni = new Set(fatture.map((f) => annoDi(f)));
    // Aggiungi sempre anno corrente e prossimo anno
    anni.add(ANNO);
    anni.add(ANNO + 1);
    return Array.from(anni).sort((a, b) => b - a);
  }, [fatture]);

  // Estrai clienti e descrizioni uniche per autocomplete
  const clientiSuggeriti = useMemo(() => {
    const clienti = new Set(fatture.map((f) => f.cliente).filter(Boolean));
    return Array.from(clienti).sort();
  }, [fatture]);


  // Filtra fatture per anno e search
  const fattureFiltrate = useMemo(() => {
    let filtered =
      annoSelezionato === null ? fatture : fatture.filter((f) => annoDi(f) === annoSelezionato);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((f) =>
        f.descrizione.toLowerCase().includes(query) ||
        (f.cliente || "").toLowerCase().includes(query) ||
        (f.numero || "").toLowerCase().includes(query) ||
        (f.note || "").toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [fatture, annoSelezionato, searchQuery]);

  const totaleFatturato = fattureFiltrate.reduce((s, f) => s + f.importoLordo, 0);

  const handleSaveEdit = (id: string, dati: Omit<Fattura, "id">) => {
    onModifica(id, dati);
    setEditingId(null);
    toast.success("Fattura modificata");
  };

  if (fatture.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nessuna fattura registrata. Aggiungi la tua prima fattura!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <YearFilter
            anni={anniDisponibili}
            annoSelezionato={annoSelezionato}
            onChange={setAnnoSelezionato}
          />
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca fatture..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {fattureFiltrate.length} fatture · Totale: <span className="font-semibold text-foreground">{formatCurrency(totaleFatturato)}</span>
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>N.</TableHead>
            <TableHead>Emessa</TableHead>
            <TableHead>Incassata</TableHead>
            <TableHead>Descrizione</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="text-right">Importo lordo</TableHead>
            <TableHead className="text-right" title="INPS + imposta dell'anno di incasso, al margine">
              Tasse
            </TableHead>
            <TableHead className="text-right">Netto</TableHead>
            <TableHead className="text-center">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fattureFiltrate.map((fattura) => {
            // Tasse di competenza al margine: INPS e imposta dell'anno in cui
            // il compenso è (o sarà) incassato. Gli acconti non sono un costo.
            const tasse = fattura.importoLordo * quotaTasseMarginale(annoDi(fattura));

            if (editingId === fattura.id) {
              return (
                <TableRow key={fattura.id}>
                  <TableCell colSpan={9} className="p-4">
                    <FormFattura
                      fattura={fattura}
                      onSubmit={(dati) => handleSaveEdit(fattura.id, dati)}
                      onCancel={() => setEditingId(null)}
                      clientiSuggeriti={clientiSuggeriti}
                      descrizioniSuggerite={descrizioniSuggerite}
                    />
                  </TableCell>
                </TableRow>
              );
            }

            return (
              <TableRow key={fattura.id}>
                <TableCell className="whitespace-nowrap tabular-nums">{fattura.numero ?? "–"}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {fattura.dataEmissione ? formatDate(fattura.dataEmissione) : "–"}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {fattura.data ? (
                    formatDate(fattura.data)
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-600">
                      da incassare
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{fattura.descrizione}</span>
                    {fattura.note && (
                      <span className="text-xs text-muted-foreground">{fattura.note}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>{fattura.cliente || "-"}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(fattura.importoLordo)}
                </TableCell>
                <TableCell className="text-right font-medium text-destructive">
                  {formatCurrency(tasse)}
                </TableCell>
                <TableCell className="text-right font-semibold text-green-600">
                  {formatCurrency(fattura.importoLordo - tasse)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingId(fattura.id)}
                      title="Modifica"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Sei sicuro di voler eliminare questa fattura?")) {
                          onElimina(fattura.id);
                          toast.success("Fattura eliminata");
                        }
                      }}
                      title="Elimina"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
