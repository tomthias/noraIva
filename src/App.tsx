import { useState } from "react";
import { useSupabaseCashFlow } from "./hooks/useSupabaseCashFlow";
import { useSupabaseAuth } from "./hooks/useSupabaseAuth";
import { AuthForm } from "./components/AuthForm";
import { Sidebar, type SidebarSection } from "./components/Sidebar";
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
  const { user, loading: authLoading, signIn, signOut } = useSupabaseAuth();
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
  const [activeSection, setActiveSection] = useState<SidebarSection>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Filtra fatture per anno corrente (per il riepilogo)
  const fattureAnnoCorrente = fatture.filter((f) => f.data.startsWith(String(ANNO)));

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
    return <AuthForm onSignIn={signIn} />;
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
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onLogout={signOut}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <main className="md:ml-64 min-h-screen">
        <div className="p-4 pt-16 md:p-8 md:pt-8">
          {error && (
            <div className="bg-red-950 border border-red-800 text-red-200 px-4 py-3 rounded mb-6">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {activeSection === "dashboard" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-1">Dashboard</h2>
                <p className="text-muted-foreground">Panoramica della tua situazione fiscale {ANNO}</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RiepilogoCard fatture={fattureAnnoCorrente} />
                <NettoDisponibile fatture={fatture} prelievi={prelievi} uscite={uscite} />
              </div>
            </div>
          )}

          {activeSection === "fatture" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Fatture</h2>
                  <p className="text-muted-foreground">Gestisci le tue fatture emesse</p>
                </div>
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
            </div>
          )}

          {activeSection === "movimenti" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-1">Movimenti</h2>
                <p className="text-muted-foreground">Prelievi e uscite dal conto</p>
              </div>
              <GestioneMovimenti
                prelievi={prelievi}
                uscite={uscite}
                onAggiungiPrelievo={aggiungiPrelievo}
                onEliminaPrelievo={eliminaPrelievo}
                onAggiungiUscita={aggiungiUscita}
                onEliminaUscita={eliminaUscita}
              />
            </div>
          )}

          {activeSection === "simulatore" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-1">Simulatore</h2>
                <p className="text-muted-foreground">Simula l'impatto di nuove fatture</p>
              </div>
              <ScenarioSimulator fatture={fatture} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
