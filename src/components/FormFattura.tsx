import { useState, type FormEvent } from "react";
import type { Fattura } from "../types/fattura";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";

interface Props {
  fattura?: Fattura;
  onSubmit: (dati: Omit<Fattura, "id">, salvaDescrizione?: boolean) => void;
  onCancel?: () => void;
  clientiSuggeriti?: string[];
  descrizioniSuggerite?: string[];
}

export function FormFattura({
  fattura,
  onSubmit,
  onCancel,
  clientiSuggeriti = [],
  descrizioniSuggerite = [],
}: Props) {
  const oggi = new Date().toISOString().split("T")[0];
  const [numero, setNumero] = useState(fattura?.numero || "");
  const [dataEmissione, setDataEmissione] = useState(fattura?.dataEmissione || fattura?.data || oggi);
  // Una fattura nuova nasce da incassare: si segna incassata quando arriva il
  // bonifico, così le tasse partono dal giorno giusto.
  const [incassata, setIncassata] = useState(Boolean(fattura?.data));
  const [data, setData] = useState(fattura?.data || oggi);
  const [descrizione, setDescrizione] = useState(fattura?.descrizione || "");
  const [cliente, setCliente] = useState(fattura?.cliente || "");
  const [importoLordo, setImportoLordo] = useState(fattura?.importoLordo?.toString() || "");
  const [note, setNote] = useState(fattura?.note || "");
  const [salvaDescrizioneFlag, setSalvaDescrizioneFlag] = useState(false);

  // Controlla se la descrizione è già salvata
  const isDescrizioneGiaSalvata = descrizioniSuggerite.includes(descrizione);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const importoNum = parseFloat(importoLordo) || 0;

    onSubmit({
      data: incassata ? data : null,
      numero: numero.trim() || undefined,
      dataEmissione,
      descrizione,
      cliente,
      importoLordo: importoNum,
      note: note || undefined,
    }, salvaDescrizioneFlag && !isDescrizioneGiaSalvata);

    // Reset form se non è in edit mode
    if (!fattura) {
      setDescrizione("");
      setCliente("");
      setImportoLordo("");
      setNote("");
      setNumero("");
      setIncassata(false);
      setSalvaDescrizioneFlag(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="numero">Numero</Label>
          <Input
            id="numero"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="23/2026"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dataEmissione">Data emissione</Label>
          <Input
            type="date"
            id="dataEmissione"
            value={dataEmissione}
            onChange={(e) => setDataEmissione(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="data" className="flex items-center gap-2">
            <input
              type="checkbox"
              id="incassata"
              checked={incassata}
              onChange={(e) => setIncassata(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Già incassata il
          </Label>
          <Input
            type="date"
            id="data"
            value={data}
            onChange={(e) => setData(e.target.value)}
            disabled={!incassata}
            required={incassata}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Le tasse contano dal giorno dell'<strong>incasso</strong>, non dell'emissione: il
        forfettario tassa per cassa. Una fattura non ancora pagata resta in "Da incassare".
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cliente">Cliente</Label>
          <Combobox
            items={clientiSuggeriti}
            value={cliente}
            onChange={setCliente}
            placeholder="Seleziona o scrivi cliente..."
            emptyText="Nessun cliente trovato."
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="descrizione">Descrizione</Label>
        <Combobox
          items={descrizioniSuggerite}
          value={descrizione}
          onChange={setDescrizione}
          placeholder="Seleziona o scrivi descrizione..."
          emptyText="Nessuna descrizione trovata."
        />
        {/* Checkbox per salvare la descrizione - mostra solo se non è già salvata e c'è una descrizione */}
        {descrizione && !isDescrizioneGiaSalvata && !fattura && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer mt-2">
            <input
              type="checkbox"
              checked={salvaDescrizioneFlag}
              onChange={(e) => setSalvaDescrizioneFlag(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            Salva descrizione per il futuro
          </label>
        )}
        {descrizione && isDescrizioneGiaSalvata && !fattura && (
          <p className="text-xs text-muted-foreground mt-1">
            Questa descrizione è già salvata
          </p>
        )}
      </div>

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
