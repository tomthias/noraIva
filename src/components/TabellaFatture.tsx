import { useState } from "react";
import type { Fattura } from "../types/fattura";
import { calcolaRiepilogoPerFattura } from "../utils/calcoliFisco";
import { formatCurrency, formatDate } from "../utils/format";
import { FormFattura } from "./FormFattura";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";

interface Props {
  fatture: Fattura[];
  onModifica: (id: string, dati: Partial<Fattura>) => void;
  onElimina: (id: string) => void;
}

export function TabellaFatture({ fatture, onModifica, onElimina }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const riepiloghi = calcolaRiepilogoPerFattura(fatture);

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
          {fatture.map((fattura) => {
            const riepilogo = riepiloghi.find((r) => r.id === fattura.id);

            if (editingId === fattura.id) {
              return (
                <TableRow key={fattura.id}>
                  <TableCell colSpan={7} className="p-4">
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
  );
}
