import { useState, useMemo } from "react";
import type { Fattura } from "../types/fattura";
import { calcolaRiepilogoPerFattura, calcolaTotaleFatture } from "../utils/calcoliFisco";
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
}

export function TabellaFatture({ fatture, onModifica, onElimina }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [annoSelezionato, setAnnoSelezionato] = useState<number | null>(ANNO);
  const [searchQuery, setSearchQuery] = useState("");

  // Estrai anni disponibili dalle fatture
  const anniDisponibili = useMemo(() => {
    const anni = new Set(fatture.map((f) => parseInt(f.data.substring(0, 4))));
    return Array.from(anni).sort((a, b) => b - a);
  }, [fatture]);

  // Estrai clienti e descrizioni uniche per autocomplete
  const clientiSuggeriti = useMemo(() => {
    const clienti = new Set(fatture.map((f) => f.cliente).filter(Boolean));
    return Array.from(clienti).sort();
  }, [fatture]);

  const descrizioniSuggerite = useMemo(() => {
    const descrizioni = new Set(fatture.map((f) => f.descrizione).filter(Boolean));
    return Array.from(descrizioni).sort();
  }, [fatture]);

  // Filtra fatture per anno e search
  const fattureFiltrate = useMemo(() => {
    let filtered = annoSelezionato === null ? fatture : fatture.filter((f) => f.data.startsWith(String(annoSelezionato)));

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((f) =>
        f.descrizione.toLowerCase().includes(query) ||
        (f.cliente || "").toLowerCase().includes(query) ||
        (f.note || "").toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [fatture, annoSelezionato, searchQuery]);

  const riepiloghi = calcolaRiepilogoPerFattura(fattureFiltrate);
  const totaleFatturato = calcolaTotaleFatture(fattureFiltrate);

  const handleSaveEdit = (id: string, dati: Omit<Fattura, "id">) => {
    onModifica(id, dati);
    setEditingId(null);
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
            <TableHead>Data</TableHead>
            <TableHead>Descrizione</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="text-right">Importo lordo</TableHead>
            <TableHead className="text-right">Tasse & Contributi</TableHead>
            <TableHead className="text-right">Netto</TableHead>
            <TableHead className="text-center">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fattureFiltrate.map((fattura) => {
            const riepilogo = riepiloghi.find((r) => r.id === fattura.id);

            if (editingId === fattura.id) {
              return (
                <TableRow key={fattura.id}>
                  <TableCell colSpan={7} className="p-4">
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
                <TableCell className="whitespace-nowrap">{formatDate(fattura.data)}</TableCell>
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
                  {riepilogo ? formatCurrency(riepilogo.tasseContributi) : "-"}
                </TableCell>
                <TableCell className="text-right font-semibold text-green-600">
                  {riepilogo ? formatCurrency(riepilogo.netto) : "-"}
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
