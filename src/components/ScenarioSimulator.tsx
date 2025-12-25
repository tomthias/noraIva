import { useState } from "react";
import type { Fattura } from "../types/fattura";
import { calcolaRiepilogoAnnuale, simulaNuovaFattura } from "../utils/calcoliFisco";
import { formatCurrency } from "../utils/format";
import "./ScenarioSimulator.css";

interface Props {
  fatture: Fattura[];
}

export function ScenarioSimulator({ fatture }: Props) {
  const [importo, setImporto] = useState("");

  const importoNum = parseFloat(importo) || 0;
  const riepilogoAttuale = calcolaRiepilogoAnnuale(fatture);
  const riepilogoSimulato = importoNum > 0 ? simulaNuovaFattura(fatture, importoNum) : null;

  const differenzaTasse = riepilogoSimulato
    ? riepilogoSimulato.tasseTotali - riepilogoAttuale.tasseTotali
    : 0;
  const differenzaNetto = riepilogoSimulato
    ? riepilogoSimulato.nettoAnnuo - riepilogoAttuale.nettoAnnuo
    : 0;

  return (
    <div className="scenario-card">
      <h2>Simulazione Scenario</h2>
      <p className="scenario-desc">
        Inserisci l'importo di una nuova fattura ipotetica per vedere come cambierebbe la tua
        situazione fiscale.
      </p>

      <div className="scenario-input">
        <label htmlFor="nuova-fattura">Nuova fattura prevista</label>
        <div className="input-wrapper">
          <span className="currency-symbol">€</span>
          <input
            type="number"
            id="nuova-fattura"
            value={importo}
            onChange={(e) => setImporto(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      {riepilogoSimulato && importoNum > 0 && (
        <div className="scenario-results">
          <div className="scenario-row">
            <span className="label">Nuovo totale incassato</span>
            <span className="value">{formatCurrency(riepilogoSimulato.totaleIncassato)}</span>
          </div>
          <div className="scenario-row">
            <span className="label">Tasse aggiuntive</span>
            <span className="value negative">+ {formatCurrency(differenzaTasse)}</span>
          </div>
          <div className="scenario-row">
            <span className="label">Nuovo totale tasse</span>
            <span className="value">{formatCurrency(riepilogoSimulato.tasseTotali)}</span>
          </div>
          <div className="scenario-row highlight">
            <span className="label">Netto aggiuntivo</span>
            <span className="value positive">+ {formatCurrency(differenzaNetto)}</span>
          </div>
          <div className="scenario-row total">
            <span className="label">Nuovo netto annuo</span>
            <span className="value">{formatCurrency(riepilogoSimulato.nettoAnnuo)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
