import { useState } from "react";
import { useCashFlow } from "./hooks/useCashFlow";
import { RiepilogoCard } from "./components/RiepilogoCard";
import { NettoDisponibile } from "./components/NettoDisponibile";
import { TabellaFatture } from "./components/TabellaFatture";
import { FormFattura } from "./components/FormFattura";
import { GestioneMovimenti } from "./components/GestioneMovimenti";
import { ScenarioSimulator } from "./components/ScenarioSimulator";
import { ANNO } from "./constants/fiscali";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

function App() {
  const {
    fatture,
    prelievi,
    uscite,
    isLoading,
    aggiungiFattura,
    modificaFattura,
    eliminaFattura,
    aggiungiPrelievo,
    eliminaPrelievo,
    aggiungiUscita,
    eliminaUscita,
  } = useCashFlow();
  const [showForm, setShowForm] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Gestione Fatture {ANNO}</h1>
          <p className="text-muted-foreground">Regime Forfettario - Partita IVA</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RiepilogoCard fatture={fatture} />
            <NettoDisponibile fatture={fatture} prelievi={prelievi} uscite={uscite} />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Fatture</h2>
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? (
                <>
                  <X className="h-4 w-4" /> Chiudi
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" /> Nuova fattura
                </>
              )}
            </Button>
          </div>

          {showForm && (
            <div className="border rounded-lg p-6 bg-card">
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
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Prelievi & Uscite</h2>
          <GestioneMovimenti
            prelievi={prelievi}
            uscite={uscite}
            onAggiungiPrelievo={aggiungiPrelievo}
            onEliminaPrelievo={eliminaPrelievo}
            onAggiungiUscita={aggiungiUscita}
            onEliminaUscita={eliminaUscita}
          />
        </section>

        <section>
          <ScenarioSimulator fatture={fatture} />
        </section>
      </main>

      <footer className="border-t mt-12">
        <div className="container mx-auto px-4 py-6">
          <p className="text-sm text-muted-foreground text-center">
            Regime forfettario: coefficiente 78%, imposta sostitutiva 5%, contributi INPS GS 26,07%
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
