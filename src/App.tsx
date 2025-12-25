import { useState } from "react";
import { useFatture } from "./hooks/useFatture";
import { RiepilogoCard } from "./components/RiepilogoCard";
import { NettoDisponibile } from "./components/NettoDisponibile";
import { TabellaFatture } from "./components/TabellaFatture";
import { FormFattura } from "./components/FormFattura";
import { ScenarioSimulator } from "./components/ScenarioSimulator";
import { ANNO } from "./constants/fiscali";
import "./App.css";

function App() {
  const { fatture, isLoading, aggiungiFattura, modificaFattura, eliminaFattura, aggiornaStato } =
    useFatture();
  const [showForm, setShowForm] = useState(false);

  if (isLoading) {
    return <div className="loading">Caricamento...</div>;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Gestione Fatture {ANNO}</h1>
        <p className="subtitle">Regime Forfettario - Partita IVA</p>
      </header>

      <main className="app-main">
        <section className="section-cards">
          <div className="cards-grid">
            <RiepilogoCard fatture={fatture} />
            <NettoDisponibile fatture={fatture} />
          </div>
        </section>

        <section className="section-fatture">
          <div className="section-header">
            <h2>Fatture</h2>
            <button className="btn-add" onClick={() => setShowForm(!showForm)}>
              {showForm ? "Chiudi" : "Nuova fattura"}
            </button>
          </div>

          {showForm && (
            <div className="form-container">
              <FormFattura
                onSubmit={(dati) => {
                  aggiungiFattura(dati);
                  setShowForm(false);
                }}
                onCancel={() => setShowForm(false)}
              />
            </div>
          )}

          <TabellaFatture
            fatture={fatture}
            onModifica={modificaFattura}
            onElimina={eliminaFattura}
            onAggiornaStato={aggiornaStato}
          />
        </section>

        <section className="section-scenario">
          <ScenarioSimulator fatture={fatture} />
        </section>
      </main>

      <footer className="app-footer">
        <p>
          Regime forfettario: coefficiente 78%, imposta sostitutiva 5%, contributi INPS GS 26,07%
        </p>
      </footer>
    </div>
  );
}

export default App;
