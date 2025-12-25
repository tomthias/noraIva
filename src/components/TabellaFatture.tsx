import { useState } from "react";
import type { Fattura, StatoIncasso } from "../types/fattura";
import { calcolaRiepilogoPerFattura } from "../utils/calcoliFisco";
import { formatCurrency, formatDate } from "../utils/format";
import { FormFattura } from "./FormFattura";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2 } from "lucide-react";

interface Props {
  fatture: Fattura[];
  onModifica: (id: string, dati: Partial<Fattura>) => void;
  onElimina: (id: string) => void;
  onAggiornaStato: (id: string, stato: StatoIncasso) => void;
}

const STATO_LABELS: Record<StatoIncasso, string> = {
  non_incassata: "Non incassata",
  parzialmente_incassata: "Parziale",
  incassata: "Incassata",
};

export function TabellaFatture({ fatture, onModifica, onElimina, onAggiornaStato }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const riepiloghi = calcolaRiepilogoPerFattura(fatture);

  const handleSaveEdit = (
    id: string,
    dati: Omit<Fattura, "id" | "stato"> & { stato?: StatoIncasso }
  ) => {
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
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Descrizione</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="text-right">Importo lordo</TableHead>
            <TableHead className="text-right">Incassato</TableHead>
            <TableHead>Stato</TableHead>
            <TableHead className="text-right">Netto stimato</TableHead>
            <TableHead className="text-center">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fatture.map((fattura) => {
            const riepilogo = riepiloghi.find((r) => r.id === fattura.id);

            if (editingId === fattura.id) {
              return (
                <TableRow key={fattura.id}>
                  <TableCell colSpan={8} className="p-4">
                    <FormFattura
                      fattura={fattura}
                      onSubmit={(dati) => handleSaveEdit(fattura.id, dati)}
                      onCancel={() => setEditingId(null)}
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
                <TableCell className="text-right font-medium">
                  {formatCurrency(fattura.incassato)}
                </TableCell>
                <TableCell>
                  <Select
                    value={fattura.stato}
                    onValueChange={(value) => onAggiornaStato(fattura.id, value as StatoIncasso)}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="non_incassata">{STATO_LABELS.non_incassata}</SelectItem>
                      <SelectItem value="parzialmente_incassata">
                        {STATO_LABELS.parzialmente_incassata}
                      </SelectItem>
                      <SelectItem value="incassata">{STATO_LABELS.incassata}</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {riepilogo ? formatCurrency(riepilogo.nettoStimato) : "-"}
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
  );
}
