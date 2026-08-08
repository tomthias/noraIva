/**
 * Campo importo che accetta anche espressioni aritmetiche.
 *
 * Serve a registrare come movimento unico la somma di più voci reali
 * (es. "acquisto auto + assicurazione" → `1000+500`), mostrando in anteprima
 * il totale prima del salvataggio.
 *
 * È `type="text"` e non `type="number"` perché quest'ultimo rifiuta a livello
 * di browser i caratteri `+` e `*`. La validazione che si perde (min/step)
 * viene fatta qui e dal chiamante tramite `onValueChange(null)`.
 */

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { calcolaEspressione } from "../../utils/calcolaEspressione";
import { formatCurrency } from "../../utils/format";
import { cn } from "@/lib/utils";

interface Props {
  /** Testo grezzo del campo (può essere un'espressione, non solo un numero). */
  value: string;
  onChange: (testo: string) => void;
  /**
   * Valore calcolato a ogni digitazione: `null` se il campo è vuoto o
   * l'espressione non è valutabile. Il chiamante usa questo per abilitare il salvataggio.
   */
  onValueChange?: (valore: number | null) => void;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  className?: string;
  /** Nasconde la riga di anteprima (utile in griglie molto strette). */
  compatto?: boolean;
}

export function ImportoInput({
  value,
  onChange,
  onValueChange,
  placeholder = "0,00",
  required,
  autoFocus,
  className,
  compatto = false,
}: Props) {
  const hintId = useId();
  const { valore, errore, eCalcolo } = calcolaEspressione(value);

  const aggiorna = (testo: string) => {
    onChange(testo);
    onValueChange?.(calcolaEspressione(testo).valore);
  };

  // L'anteprima ha senso solo quando c'è davvero un calcolo da mostrare:
  // per un numero secco ripeterebbe quello che l'utente ha già scritto.
  const mostraAnteprima = !compatto && value.trim() !== "" && (eCalcolo || !!errore);

  return (
    <div className="space-y-1">
      <Input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => aggiorna(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        aria-invalid={!!errore}
        aria-describedby={mostraAnteprima ? hintId : undefined}
        className={cn(errore && "border-destructive focus-visible:ring-destructive", className)}
      />
      {mostraAnteprima && (
        <p
          id={hintId}
          className={cn(
            "text-xs tabular-nums",
            errore ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {errore ? errore : valore !== null && <>= {formatCurrency(valore)}</>}
        </p>
      )}
    </div>
  );
}
