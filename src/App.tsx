import { useState } from "react";
import { useSupabaseCashFlow } from "./hooks/useSupabaseCashFlow";
import { useSupabaseAuth } from "./hooks/useSupabaseAuth";
import { AuthForm } from "./components/AuthForm";
import { RiepilogoCard } from "./components/RiepilogoCard";
import { NettoDisponibile } from "./components/NettoDisponibile";
import { TabellaFatture } from "./components/TabellaFatture";
import { FormFattura } from "./components/FormFattura";
import { GestioneMovimenti } from "./components/GestioneMovimenti";
import { ScenarioSimulator } from "./components/ScenarioSimulator";
import { ANNO } from "./constants/fiscali";
import { Button } from "@/components/ui/button";
import { Plus, X, LogOut } from "lucide-react";

function App() {
  const { user, loading: authLoading, signIn, signUp, signOut } = useSupabaseAuth();
  const {
    fatture,
    prelievi,
    uscite,
    isLoading: dataLoading,
    error,
    aggiungiFattura,
    modificaFattura,
    eliminaFattura,
    aggiungiPrelievo,
    eliminaPrelievo,
    aggiungiUscita,
    eliminaUscita,
  } = useSupabaseCashFlow();
  const [showForm, setShowForm] = useState(false);

  // Mostra schermata di caricamento durante verifica auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  // Mostra schermata login se non autenticato
  if (!user) {
    return <AuthForm onSignIn={signIn} onSignUp={signUp} />;
  }

  // Mostra schermata di caricamento dati
  if (dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-muted-foreground">Caricamento dati...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Gestione Fatture {ANNO}</h1>
              <p className="text-muted-foreground">Regime Forfettario - Partita IVA</p>
            </div>
            <Button variant="outline" onClick={signOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Esci
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
            <p className="text-sm">{error}</p>
          </div>
        )}

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
