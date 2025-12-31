import { useState, useMemo } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { toast } from "sonner";
import { useSupabaseCashFlow } from "./hooks/useSupabaseCashFlow";
import { useSupabaseAuth } from "./hooks/useSupabaseAuth";
import { AuthForm } from "./components/AuthForm";
import { Sidebar, type SidebarSection } from "./components/Sidebar";
import { RiepilogoCard } from "./components/RiepilogoCard";
import { NettoDisponibile } from "./components/NettoDisponibile";

import { TabellaFatture } from "./components/TabellaFatture";
import { FormFattura } from "./components/FormFattura";
import { GestioneMovimenti } from "./components/GestioneMovimenti";
import { GraficoClienti } from "./components/GraficoClienti";
import { ScenarioSimulator } from "./components/ScenarioSimulator";
import { YearFilter } from "./components/YearFilter";
import { Analisi } from "./components/analisi/Analisi";
import { Toaster } from "./components/ui/sonner";

import { ANNO } from "./constants/fiscali";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

function App() {
  const { user, loading: authLoading, signIn, signOut } = useSupabaseAuth();
  const {
    fatture,
    prelievi,
    uscite,
    entrate,
    isLoading: dataLoading,
    error,
    aggiungiFattura,
    modificaFattura,
    eliminaFattura,
    aggiungiPrelievo,
    modificaPrelievo,
    eliminaPrelievo,
    aggiungiUscita,
    modificaUscita,
    eliminaUscita,
    aggiungiEntrata,
    modificaEntrata,
    eliminaEntrata,
    convertiTipoMovimento,
  } = useSupabaseCashFlow();
  const [showForm, setShowForm] = useState(false);
  const [activeSection, setActiveSection] = useState<SidebarSection>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [annoDashboard, setAnnoDashboard] = useState<number>(ANNO);

  // Estrai anni disponibili dalle fatture
  const anniDisponibili = useMemo(() => {
    const anni = new Set(fatture.map((f) => parseInt(f.data.substring(0, 4))));
    return Array.from(anni).sort((a, b) => b - a);
  }, [fatture]);

  // Estrai clienti e descrizioni uniche per autocomplete
  const clientiSuggeriti = useMemo(() => {
    const clienti = new Set(fatture.map((f) => f.cliente).filter(Boolean));
    return Array.from(clienti).sort();
  }, [fatture]);

  const descrizioniSuggerite = useMemo(() => {
    const descrizioni = new Set(fatture.map((f) => f.descrizione).filter(Boolean));
    return Array.from(descrizioni).sort();
  }, [fatture]);

  // Filtra fatture per anno selezionato (per il riepilogo)
  const fattureAnnoSelezionato = fatture.filter((f) => f.data.startsWith(String(annoDashboard)));



  // Mostra schermata di caricamento durante verifica auth
  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <DotLottieReact
          src="https://lottie.host/39b0daf0-2b9f-4b8a-8152-0ea79e0f2cf2/EwJoAQGdc3.lottie"
          loop
          autoplay
          style={{ width: 200, height: 200 }}
        />
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
      <div className="flex flex-col items-center justify-center min-h-screen">
        <DotLottieReact
          src="https://lottie.host/39b0daf0-2b9f-4b8a-8152-0ea79e0f2cf2/EwJoAQGdc3.lottie"
          loop
          autoplay
          style={{ width: 200, height: 200 }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
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
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Dashboard</h2>
                  <p className="text-muted-foreground">Panoramica della tua situazione fiscale</p>
                </div>
                <YearFilter
                  anni={anniDisponibili}
                  annoSelezionato={annoDashboard}
                  onChange={(anno) => setAnnoDashboard(anno ?? ANNO)}
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <RiepilogoCard fatture={fattureAnnoSelezionato} anno={annoDashboard} />
                <NettoDisponibile fatture={fatture} prelievi={prelievi} uscite={uscite} entrate={entrate} annoSelezionato={annoDashboard} />
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
                      toast.success("Fattura aggiunta");
                    }}
                    onCancel={() => setShowForm(false)}
                    clientiSuggeriti={clientiSuggeriti}
                    descrizioniSuggerite={descrizioniSuggerite}
                  />
                </div>
              )}

              <GraficoClienti fatture={fatture} />

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
                entrate={entrate}
                onAggiungiPrelievo={aggiungiPrelievo}
                onModificaPrelievo={modificaPrelievo}
                onEliminaPrelievo={eliminaPrelievo}
                onAggiungiUscita={aggiungiUscita}
                onModificaUscita={modificaUscita}
                onEliminaUscita={eliminaUscita}
                onAggiungiEntrata={aggiungiEntrata}
                onModificaEntrata={modificaEntrata}
                onEliminaEntrata={eliminaEntrata}
                onConvertiTipoMovimento={convertiTipoMovimento}
              />
            </div>
          )}

          {activeSection === "analisi" && (
            <Analisi
              fatture={fatture}
              uscite={uscite}
              entrate={entrate}
              prelievi={prelievi}
            />
          )}

          {activeSection === "simulatore" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-1">Simulatore</h2>
                <p className="text-muted-foreground">Calcola il netto di una singola fattura</p>
              </div>
              <ScenarioSimulator />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
