/**
 * Custom hook per la gestione delle fatture
 */

import { useState, useEffect, useCallback } from "react";
import type { Fattura, StatoIncasso } from "../types/fattura";
import { caricaFatture, salvaFatture, generaId } from "../utils/storage";

export function useFatture() {
  const [fatture, setFatture] = useState<Fattura[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carica fatture da localStorage al mount
  useEffect(() => {
    const loaded = caricaFatture();
    setFatture(loaded);
    setIsLoading(false);
  }, []);

  // Salva in localStorage quando le fatture cambiano
  useEffect(() => {
    if (!isLoading) {
      salvaFatture(fatture);
    }
  }, [fatture, isLoading]);

  const aggiungiFattura = useCallback(
    (dati: Omit<Fattura, "id" | "stato"> & { stato?: StatoIncasso }) => {
      const nuovaFattura: Fattura = {
        ...dati,
        id: generaId(),
        stato: dati.stato || calcolaStato(dati.importoLordo, dati.incassato),
      };
      setFatture((prev) => [...prev, nuovaFattura]);
    },
    []
  );

  const modificaFattura = useCallback((id: string, dati: Partial<Fattura>) => {
    setFatture((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const updated = { ...f, ...dati };
        // Ricalcola lo stato se cambiano importoLordo o incassato
        if (dati.importoLordo !== undefined || dati.incassato !== undefined) {
          updated.stato = calcolaStato(updated.importoLordo, updated.incassato);
        }
        return updated;
      })
    );
  }, []);

  const eliminaFattura = useCallback((id: string) => {
    setFatture((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const aggiornaStato = useCallback((id: string, stato: StatoIncasso) => {
    setFatture((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        let incassato = f.incassato;
        // Aggiorna incassato in base al nuovo stato
        if (stato === "incassata") {
          incassato = f.importoLordo;
        } else if (stato === "non_incassata") {
          incassato = 0;
        }
        return { ...f, stato, incassato };
      })
    );
  }, []);

  return {
    fatture,
    isLoading,
    aggiungiFattura,
    modificaFattura,
    eliminaFattura,
    aggiornaStato,
  };
}

/**
 * Calcola lo stato in base all'importo incassato
 */
function calcolaStato(importoLordo: number, incassato: number): StatoIncasso {
  if (incassato === 0) return "non_incassata";
  if (incassato >= importoLordo) return "incassata";
  return "parzialmente_incassata";
}
