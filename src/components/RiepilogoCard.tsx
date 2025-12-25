import type { Fattura } from "../types/fattura";
import { calcolaRiepilogoAnnuale, calcolaPercentualeTasse } from "../utils/calcoliFisco";
import { formatCurrency, formatPercentage } from "../utils/format";
import "./RiepilogoCard.css";

interface Props {
  fatture: Fattura[];
}

export function RiepilogoCard({ fatture }: Props) {
  const riepilogo = calcolaRiepilogoAnnuale(fatture);
  const percentualeTasse = calcolaPercentualeTasse(fatture);

  return (
    <div className="riepilogo-card">
      <h2>Riepilogo Annuale 2025</h2>
      <div className="riepilogo-grid">
        <div className="riepilogo-item">
          <span className="label">Totale fatture emesse</span>
          <span className="value">{formatCurrency(riepilogo.totaleFatture)}</span>
        </div>
        <div className="riepilogo-item">
          <span className="label">Totale incassato</span>
          <span className="value highlight">{formatCurrency(riepilogo.totaleIncassato)}</span>
        </div>
        <div className="riepilogo-item">
          <span className="label">Reddito imponibile lordo (78%)</span>
          <span className="value">{formatCurrency(riepilogo.redditoImponibileLordo)}</span>
        </div>
        <div className="riepilogo-item">
          <span className="label">Contributi INPS (26,07%)</span>
          <span className="value negative">{formatCurrency(riepilogo.contributiINPS)}</span>
        </div>
        <div className="riepilogo-item">
          <span className="label">Imposta sostitutiva (5%)</span>
          <span className="value negative">{formatCurrency(riepilogo.impostaSostitutiva)}</span>
        </div>
        <div className="riepilogo-item">
          <span className="label">Totale tasse & contributi</span>
          <span className="value negative">
            {formatCurrency(riepilogo.tasseTotali)} ({formatPercentage(percentualeTasse)})
          </span>
        </div>
        <div className="riepilogo-item total">
          <span className="label">Netto annuo stimato</span>
          <span className="value positive">{formatCurrency(riepilogo.nettoAnnuo)}</span>
        </div>
      </div>
    </div>
  );
}
