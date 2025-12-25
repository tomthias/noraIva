import type { Fattura } from "../types/fattura";
import { calcolaRiepilogoAnnuale } from "../utils/calcoliFisco";
import { formatCurrency } from "../utils/format";
import "./NettoDisponibile.css";

interface Props {
  fatture: Fattura[];
}

export function NettoDisponibile({ fatture }: Props) {
  // Considera solo le fatture incassate (anche parzialmente)
  const fattureIncassate = fatture.filter((f) => f.incassato > 0);
  const riepilogo = calcolaRiepilogoAnnuale(fattureIncassate);

  return (
    <div className="netto-card">
      <h2>Quanto posso ritirare adesso</h2>
      <div className="netto-content">
        <div className="netto-row">
          <span className="label">Incassi cumulati</span>
          <span className="value">{formatCurrency(riepilogo.totaleIncassato)}</span>
        </div>
        <div className="netto-row">
          <span className="label">Tasse & contributi maturati</span>
          <span className="value negative">- {formatCurrency(riepilogo.tasseTotali)}</span>
        </div>
        <div className="netto-row total">
          <span className="label">Netto disponibile</span>
          <span className="value positive">{formatCurrency(riepilogo.nettoAnnuo)}</span>
        </div>
      </div>
      <p className="netto-note">
        Questo importo tiene conto delle tasse e contributi da accantonare sugli incassi effettivi.
      </p>
    </div>
  );
}
