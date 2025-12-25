import { useState, type FormEvent } from "react";
import type { Fattura, StatoIncasso } from "../types/fattura";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  fattura?: Fattura;
  onSubmit: (dati: Omit<Fattura, "id" | "stato"> & { stato?: StatoIncasso }) => void;
  onCancel?: () => void;
}

export function FormFattura({ fattura, onSubmit, onCancel }: Props) {
  const [data, setData] = useState(fattura?.data || new Date().toISOString().split("T")[0]);
  const [descrizione, setDescrizione] = useState(fattura?.descrizione || "");
  const [cliente, setCliente] = useState(fattura?.cliente || "");
  const [importoLordo, setImportoLordo] = useState(fattura?.importoLordo?.toString() || "");
  const [incassato, setIncassato] = useState(fattura?.incassato?.toString() || "");
  const [note, setNote] = useState(fattura?.note || "");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const importoNum = parseFloat(importoLordo) || 0;
    const incassatoNum = parseFloat(incassato) || 0;

    onSubmit({
      data,
      descrizione,
      cliente,
      importoLordo: importoNum,
      incassato: Math.min(incassatoNum, importoNum),
      note: note || undefined,
    });

    // Reset form se non è in edit mode
    if (!fattura) {
      setDescrizione("");
      setCliente("");
      setImportoLordo("");
      setIncassato("");
      setNote("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="data">Data</Label>
          <Input
            type="date"
            id="data"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cliente">Cliente</Label>
          <Input
            type="text"
            id="cliente"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            placeholder="Nome cliente"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="descrizione">Descrizione</Label>
        <Input
          type="text"
          id="descrizione"
          value={descrizione}
          onChange={(e) => setDescrizione(e.target.value)}
          placeholder="Descrizione fattura"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="importoLordo">Importo lordo (€)</Label>
          <Input
            type="number"
            id="importoLordo"
            value={importoLordo}
            onChange={(e) => setImportoLordo(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="incassato">Incassato (€)</Label>
          <Input
            type="number"
            id="incassato"
            value={incassato}
            onChange={(e) => setIncassato(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Note (opzionale)</Label>
        <Input
          type="text"
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note aggiuntive"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit">
          {fattura ? "Salva modifiche" : "Aggiungi fattura"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Annulla
          </Button>
        )}
      </div>
    </form>
  );
}
