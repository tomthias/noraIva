/**
 * Tooltip condiviso per tutti i grafici Recharts.
 *
 * Perché esiste: i grafici passavano stili inline tipo
 * `backgroundColor: "hsl(var(--popover))"`, ma il tema usa la sintassi Tailwind v4
 * `@theme` e definisce `--color-popover`, non `--popover`. La variabile risultava
 * vuota, `hsl()` produceva un colore invalido e il tooltip appariva TRASPARENTE.
 *
 * Qui si usano le classi Tailwind (`bg-popover`, `border-border`), che leggono i
 * token corretti, e si mostra sempre il NOME della voce accanto all'importo.
 */

import { formatCurrency } from "../../utils/format";

interface VoceTooltip {
  name?: string | number;
  value?: number | string;
  payload?: Record<string, unknown>;
}

interface Props {
  /** Iniettati da Recharts tramite `content={<ChartTooltip />}` */
  active?: boolean;
  payload?: VoceTooltip[];
  label?: string | number;

  /**
   * Chiave del dato da usare come titolo, quando il nome troncato mostrato
   * nell'asse non è quello che si vuole nel tooltip (es. "nomeCompleto").
   */
  titoloKey?: string;
  /** Etichetta della serie quando il payload non ne porta una (es. barre a serie singola). */
  etichetta?: string;
  /** Se valorizzato, mostra anche la percentuale sul totale. */
  totale?: number;
  /** Riga aggiuntiva sotto l'importo (es. "3 fatture"). */
  dettaglio?: (dato: Record<string, unknown>) => string | null;
}

export function ChartTooltip({
  active,
  payload,
  label,
  titoloKey,
  etichetta,
  totale,
  dettaglio,
}: Props) {
  if (!active || !payload?.length) return null;

  const voce = payload[0];
  const dato = voce.payload ?? {};

  // Ordine di risoluzione del titolo: chiave esplicita → label dell'asse →
  // nome della serie. Serve perché torte, barre verticali e barre orizzontali
  // mettono il nome della voce in tre posti diversi.
  const daKey = titoloKey ? dato[titoloKey] : undefined;
  const titolo =
    (typeof daKey === "string" && daKey) ||
    (label !== undefined && label !== "" ? String(label) : "") ||
    (voce.name !== undefined ? String(voce.name) : "") ||
    etichetta ||
    "";

  const valore = Number(voce.value ?? 0);
  const percentuale =
    totale && totale > 0 ? (valore / totale) * 100 : null;

  const rigaExtra = dettaglio?.(dato) ?? null;

  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
      {titolo && (
        <p className="font-medium text-popover-foreground">{titolo}</p>
      )}
      {etichetta && titolo !== etichetta && (
        <p className="text-xs text-muted-foreground">{etichetta}</p>
      )}
      <p className="font-semibold text-popover-foreground tabular-nums">
        {formatCurrency(valore)}
        {percentuale !== null && (
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {percentuale.toFixed(1)}% del totale
          </span>
        )}
      </p>
      {rigaExtra && (
        <p className="text-xs text-muted-foreground">{rigaExtra}</p>
      )}
    </div>
  );
}
