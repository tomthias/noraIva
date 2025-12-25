/**
 * Hook per gestire fatture, prelievi e uscite con localStorage
 */

import { useState, useEffect } from "react";
import type { Fattura, Prelievo, Uscita } from "../types/fattura";
import {
  caricaFatture,
  salvaFatture,
  caricaPrelievi,
  salvaPrelievi,
  caricaUscite,
  salvaUscite,
  generaId,
} from "../utils/storage";

export function useCashFlow() {
  const [fatture, setFatture] = useState<Fattura[]>([]);
  const [prelievi, setPrelievi] = useState<Prelievo[]>([]);
  const [uscite, setUscite] = useState<Uscita[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carica i dati all'avvio
  useEffect(() => {
    const fattureCaricate = caricaFatture();
    const prelieviCaricati = caricaPrelievi();
    const usciteCaricate = caricaUscite();

    setFatture(fattureCaricate);
    setPrelievi(prelieviCaricati);
    setUscite(usciteCaricate);
    setIsLoading(false);
  }, []);

  // ===== GESTIONE FATTURE =====

  const aggiungiFattura = (dati: Omit<Fattura, "id">) => {
    const nuovaFattura: Fattura = {
      ...dati,
      id: generaId(),
    };

    const nuoveFatture = [...fatture, nuovaFattura].sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
    );

    setFatture(nuoveFatture);
    salvaFatture(nuoveFatture);
  };

  const modificaFattura = (id: string, dati: Partial<Fattura>) => {
    const nuoveFatture = fatture.map((f) => (f.id === id ? { ...f, ...dati } : f));
    setFatture(nuoveFatture);
    salvaFatture(nuoveFatture);
  };

  const eliminaFattura = (id: string) => {
    const nuoveFatture = fatture.filter((f) => f.id !== id);
    setFatture(nuoveFatture);
    salvaFatture(nuoveFatture);
  };

  // ===== GESTIONE PRELIEVI =====

  const aggiungiPrelievo = (dati: Omit<Prelievo, "id">) => {
    const nuovoPrelievo: Prelievo = {
      ...dati,
      id: generaId(),
    };

    const nuoviPrelievi = [...prelievi, nuovoPrelievo].sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
    );

    setPrelievi(nuoviPrelievi);
    salvaPrelievi(nuoviPrelievi);
  };

  const modificaPrelievo = (id: string, dati: Partial<Prelievo>) => {
    const nuoviPrelievi = prelievi.map((p) => (p.id === id ? { ...p, ...dati } : p));
    setPrelievi(nuoviPrelievi);
    salvaPrelievi(nuoviPrelievi);
  };

  const eliminaPrelievo = (id: string) => {
    const nuoviPrelievi = prelievi.filter((p) => p.id !== id);
    setPrelievi(nuoviPrelievi);
    salvaPrelievi(nuoviPrelievi);
  };

  // ===== GESTIONE USCITE =====

  const aggiungiUscita = (dati: Omit<Uscita, "id">) => {
    const nuovaUscita: Uscita = {
      ...dati,
      id: generaId(),
    };

    const nuoveUscite = [...uscite, nuovaUscita].sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
    );

    setUscite(nuoveUscite);
    salvaUscite(nuoveUscite);
  };

  const modificaUscita = (id: string, dati: Partial<Uscita>) => {
    const nuoveUscite = uscite.map((u) => (u.id === id ? { ...u, ...dati } : u));
    setUscite(nuoveUscite);
    salvaUscite(nuoveUscite);
  };

  const eliminaUscita = (id: string) => {
    const nuoveUscite = uscite.filter((u) => u.id !== id);
    setUscite(nuoveUscite);
    salvaUscite(nuoveUscite);
  };

  return {
    fatture,
    prelievi,
    uscite,
    isLoading,
    aggiungiFattura,
    modificaFattura,
    eliminaFattura,
    aggiungiPrelievo,
    modificaPrelievo,
    eliminaPrelievo,
    aggiungiUscita,
    modificaUscita,
    eliminaUscita,
  };
}
