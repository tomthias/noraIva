import { useState } from "react";
import type { Fattura, StatoIncasso } from "../types/fattura";
import { calcolaRiepilogoPerFattura } from "../utils/calcoliFisco";
import { formatCurrency, formatDate } from "../utils/format";
import { FormFattura } from "./FormFattura";
import "./TabellaFatture.css";

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
      <div className="tabella-empty">
        <p>Nessuna fattura registrata. Aggiungi la tua prima fattura!</p>
      </div>
    );
  }

  return (
    <div className="tabella-container">
      <div className="tabella-scroll">
        <table className="tabella-fatture">
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrizione</th>
              <th>Cliente</th>
              <th>Importo lordo</th>
              <th>Incassato</th>
              <th>Stato</th>
              <th>Netto stimato</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {fatture.map((fattura) => {
              const riepilogo = riepiloghi.find((r) => r.id === fattura.id);

              if (editingId === fattura.id) {
                return (
                  <tr key={fattura.id} className="editing-row">
                    <td colSpan={8}>
                      <FormFattura
                        fattura={fattura}
                        onSubmit={(dati) => handleSaveEdit(fattura.id, dati)}
                        onCancel={() => setEditingId(null)}
                      />
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={fattura.id}>
                  <td data-label="Data">{formatDate(fattura.data)}</td>
                  <td data-label="Descrizione" className="descrizione-cell">
                    {fattura.descrizione}
                    {fattura.note && <span className="note">{fattura.note}</span>}
                  </td>
                  <td data-label="Cliente">{fattura.cliente || "-"}</td>
                  <td data-label="Importo lordo">{formatCurrency(fattura.importoLordo)}</td>
                  <td data-label="Incassato">{formatCurrency(fattura.incassato)}</td>
                  <td data-label="Stato">
                    <select
                      value={fattura.stato}
                      onChange={(e) => onAggiornaStato(fattura.id, e.target.value as StatoIncasso)}
                      className={`stato-select stato-${fattura.stato}`}
                    >
                      <option value="non_incassata">{STATO_LABELS.non_incassata}</option>
                      <option value="parzialmente_incassata">
                        {STATO_LABELS.parzialmente_incassata}
                      </option>
                      <option value="incassata">{STATO_LABELS.incassata}</option>
                    </select>
                  </td>
                  <td data-label="Netto stimato" className="netto-cell">
                    {riepilogo ? formatCurrency(riepilogo.nettoStimato) : "-"}
                  </td>
                  <td className="actions-cell">
                    <button
                      className="btn-icon edit"
                      onClick={() => setEditingId(fattura.id)}
                      title="Modifica"
                    >
                      Modifica
                    </button>
                    <button
                      className="btn-icon delete"
                      onClick={() => {
                        if (confirm("Sei sicuro di voler eliminare questa fattura?")) {
                          onElimina(fattura.id);
                        }
                      }}
                      title="Elimina"
                    >
                      Elimina
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
