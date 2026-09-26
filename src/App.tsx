import { useState, useMemo } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { toast } from "sonner";
import { useSupabaseCashFlow } from "./hooks/useSupabaseCashFlow";
import { useSupabaseAuth } from "./hooks/useSupabaseAuth";
import { AuthForm } from "./components/AuthForm";
import { Sidebar, type SidebarSection } from "./components/Sidebar";
import { Prelevabile } from "./components/dashboard/Prelevabile";
import { Scadenzario } from "./components/dashboard/Scadenzario";
import { FattureDaIncassare } from "./components/dashboard/FattureDaIncassare";
import { GuadagnoSpesa } from "./components/dashboard/GuadagnoSpesa";
import { LimiteForfettario } from "./components/dashboard/LimiteForfettario";
import { Patrimonio } from "./components/Patrimonio";

import { TabellaFatture } from "./components/TabellaFatture";
import { FormFattura } from "./components/FormFattura";
import { GestioneMovimenti } from "./components/GestioneMovimenti";
import { ImportBBVA } from "./components/ImportBBVA";
import { GraficoClienti } from "./components/GraficoClienti";
import { ScenarioSimulator } from "./components/ScenarioSimulator";
import { Analisi } from "./components/analisi/Analisi";
import { Toaster } from "./components/ui/sonner";


import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { caricaDescrizioniSalvate, salvaDescrizione } from "./utils/storage";
import {
  margineMensile,
  patrimonio,
  situazione,
  verificaBanca,
  type InputSituazione,
} from "./utils/fisco";

function App() {
  const { user, loading: authLoading, signIn, signOut } = useSupabaseAuth();
  const {
    fatture,
    movimenti,
    prelievi,
    uscite,
    entrate,
    scadenzeSalvate,
    strumenti,
    valori,
    apertura,
    cuscinetto,
    mesiRiserva,
    versatoEsterno,
    isLoading: dataLoading,
    error,
    aggiungiFattura,
    modificaFattura,
    eliminaFattura,
    incassaFattura,
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
    pagaScadenze,
    annullaPagamento,
    salvaScadenza,
    eliminaScadenza,
    aggiungiStrumento,
    aggiornaValore,
    assegnaStrumento,
    salvaCuscinetto,
    salvaMesiRiserva,
    salvaVersatoEsterno,
    refresh,
  } = useSupabaseCashFlow();

  // Categorie già in uso: alimentano il menu dell'anteprima di import, così le
  // nuove righe si agganciano a quelle esistenti invece di creare doppioni.
  const categorieEsistenti = useMemo(
    () =>
      Array.from(
        new Set([...uscite, ...entrate].map((m) => m.categoria).filter((c): c is string => !!c))
      ),
    [uscite, entrate]
  );
  const [showForm, setShowForm] = useState(false);
  const [activeSection, setActiveSection] = useState<SidebarSection>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Descrizioni salvate in localStorage: lette una sola volta al primo render
  // (lazy initializer, non un effect: evita il render a vuoto iniziale).
  const [descrizioniSalvate, setDescrizioniSalvate] = useState<string[]>(caricaDescrizioniSalvate);

  const clientiSuggeriti = useMemo(() => {
    const clienti = new Set(fatture.map((f) => f.cliente).filter(Boolean));
    return Array.from(clienti).sort();
  }, [fatture]);

  const descrizioniSuggerite = descrizioniSalvate;

  // UNA sola situazione, calcolata una volta: Dashboard, Simulatore e
  // Patrimonio leggono tutti da qui.
  const oggi = new Date().toISOString().slice(0, 10);
  const input = useMemo<InputSituazione>(
    () => ({
      fatture,
      movimenti,
      scadenzeSalvate,
      apertura,
      cuscinetto,
      mesiRiserva,
      oggi,
    }),
    [fatture, movimenti, scadenzeSalvate, apertura, cuscinetto, mesiRiserva, oggi]
  );
  const s = useMemo(() => situazione(input), [input]);
  const banca = useMemo(() => verificaBanca(apertura, movimenti), [apertura, movimenti]);
  const mesi = useMemo(
    () => margineMensile(fatture, movimenti, s.scadenze, oggi),
    [fatture, movimenti, s.scadenze, oggi]
  );
  const posizioni = useMemo(
    () => patrimonio(strumenti, valori, movimenti, versatoEsterno).posizioni,
    [strumenti, valori, movimenti, versatoEsterno]
  );

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
              <div>
                <h2 className="text-2xl font-bold mb-1">Dashboard</h2>
                <p className="text-muted-foreground">Quanto puoi prelevare oggi, e perché</p>
              </div>
              <Prelevabile
                s={s}
                banca={banca}
                mesiRiserva={mesiRiserva}
                onSalvaCuscinetto={salvaCuscinetto}
                onSalvaMesiRiserva={salvaMesiRiserva}
              />
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                <Scadenzario
                  scadenze={s.scadenze}
                  oggi={oggi}
                  onPaga={(righe, data) => {
                    pagaScadenze(righe, data);
                    toast.success("F24 registrato come pagato");
                  }}
                  onAnnulla={annullaPagamento}
                  onSalvaImporto={salvaScadenza}
                  onRipristinaStima={eliminaScadenza}
                />
                <div className="space-y-6">
                  <LimiteForfettario incassi={s.incassiAnno} anno={Number(oggi.slice(0, 4))} />
                  <FattureDaIncassare
                    fatture={fatture}
                    oggi={oggi}
                    onIncassa={(id, data) => {
                      incassaFattura(id, data);
                      toast.success("Fattura incassata");
                    }}
                  />
                </div>
              </div>
              <GuadagnoSpesa mesi={mesi} />
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
                    onSubmit={(dati, salvaDescrizioneFlag) => {
                      // Se è già incassata, l'hook crea anche il movimento di incasso.
                      aggiungiFattura(dati);
                      if (salvaDescrizioneFlag && dati.descrizione) {
                        salvaDescrizione(dati.descrizione);
                        setDescrizioniSalvate(caricaDescrizioniSalvate());
                        toast.success("Fattura aggiunta e descrizione salvata");
                      } else {
                        toast.success("Fattura aggiunta");
                      }
                      setShowForm(false);
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
                descrizioniSuggerite={descrizioniSuggerite}
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

          {activeSection === "import" && (
            <ImportBBVA
              categorieEsistenti={categorieEsistenti}
              fatture={fatture}
              onImportCompletato={refresh}
            />
          )}

          {activeSection === "analisi" && (
            <Analisi
              fatture={fatture}
              movimenti={movimenti}
              uscite={uscite}
              entrate={entrate}
              prelievi={prelievi}
              apertura={apertura}
            />
          )}

          {activeSection === "patrimonio" && (
            <Patrimonio
              posizioni={posizioni}
              strumenti={strumenti}
              movimenti={movimenti}
              fondoInvestimenti={s.fondoInvestimenti}
              oggi={oggi}
              onAggiornaValore={aggiornaValore}
              onAssegna={assegnaStrumento}
              onAggiungiStrumento={aggiungiStrumento}
              onSalvaVersatoEsterno={salvaVersatoEsterno}
            />
          )}

          {activeSection === "simulatore" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-1">Simulatore</h2>
                <p className="text-muted-foreground">Cosa cambia con un incasso in più</p>
              </div>
              <ScenarioSimulator input={input} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
