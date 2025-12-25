import { useState, type FormEvent } from "react";
import type { Fattura, StatoIncasso } from "../types/fattura";
import "./FormFattura.css";

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
    <form className="form-fattura" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="data">Data</label>
          <input
            type="date"
            id="data"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="cliente">Cliente</label>
          <input
            type="text"
            id="cliente"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            placeholder="Nome cliente"
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="descrizione">Descrizione</label>
        <input
          type="text"
          id="descrizione"
          value={descrizione}
          onChange={(e) => setDescrizione(e.target.value)}
          placeholder="Descrizione fattura"
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="importoLordo">Importo lordo (€)</label>
          <input
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
        <div className="form-group">
          <label htmlFor="incassato">Incassato (€)</label>
          <input
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

      <div className="form-group">
        <label htmlFor="note">Note (opzionale)</label>
        <input
          type="text"
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note aggiuntive"
        />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-primary">
          {fattura ? "Salva modifiche" : "Aggiungi fattura"}
        </button>
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Annulla
          </button>
        )}
      </div>
    </form>
  );
}
