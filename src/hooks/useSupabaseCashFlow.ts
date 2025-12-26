/**
 * Hook per gestire fatture, prelievi e uscite con Supabase
 */

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { Fattura, Prelievo, Uscita } from "../types/fattura";
import type { Database } from "../types/database";

type FatturaRow = Database['public']['Tables']['fatture']['Row'];
type PrelievoRow = Database['public']['Tables']['prelievi']['Row'];
type UscitaRow = Database['public']['Tables']['uscite']['Row'];

// Funzioni per convertire tra tipi DB e tipi app
const dbToFattura = (row: FatturaRow): Fattura => ({
  id: row.id,
  data: row.data,
  descrizione: row.descrizione,
  cliente: row.cliente,
  importoLordo: Number(row.importo_lordo),
  note: row.note || undefined,
});

const fatturaToDb = (fattura: Omit<Fattura, "id">, userId: string) => ({
  user_id: userId,
  data: fattura.data,
  descrizione: fattura.descrizione,
  cliente: fattura.cliente,
  importo_lordo: fattura.importoLordo,
  note: fattura.note || null,
});

const dbToPrelievo = (row: PrelievoRow): Prelievo => ({
  id: row.id,
  data: row.data,
  descrizione: row.descrizione,
  importo: Number(row.importo),
  note: row.note || undefined,
});

const prelievoToDb = (prelievo: Omit<Prelievo, "id">, userId: string) => ({
  user_id: userId,
  data: prelievo.data,
  descrizione: prelievo.descrizione,
  importo: prelievo.importo,
  note: prelievo.note || null,
});

const dbToUscita = (row: UscitaRow): Uscita => ({
  id: row.id,
  data: row.data,
  descrizione: row.descrizione,
  categoria: row.categoria || undefined,
  importo: Number(row.importo),
  note: row.note || undefined,
  esclusa_da_statistiche: row.esclusa_da_statistiche || false,
});

const uscitaToDb = (uscita: Omit<Uscita, "id">, userId: string) => ({
  user_id: userId,
  data: uscita.data,
  descrizione: uscita.descrizione,
  categoria: uscita.categoria || null,
  importo: uscita.importo,
  note: uscita.note || null,
  esclusa_da_statistiche: uscita.esclusa_da_statistiche || false,
});

export function useSupabaseCashFlow() {
  const [fatture, setFatture] = useState<Fattura[]>([]);
  const [prelievi, setPrelievi] = useState<Prelievo[]>([]);
  const [uscite, setUscite] = useState<Uscita[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carica i dati all'avvio
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Carica fatture
      const { data: fattureData, error: fattureError } = await supabase
        .from('fatture')
        .select('*')
        .order('data', { ascending: false });

      if (fattureError) throw fattureError;
      setFatture(fattureData?.map(dbToFattura) || []);

      // Carica prelievi
      const { data: prelieviData, error: prelieviError } = await supabase
        .from('prelievi')
        .select('*')
        .order('data', { ascending: false });

      if (prelieviError) throw prelieviError;
      setPrelievi(prelieviData?.map(dbToPrelievo) || []);

      // Carica uscite
      const { data: usciteData, error: usciteError } = await supabase
        .from('uscite')
        .select('*')
        .order('data', { ascending: false });

      if (usciteError) throw usciteError;
      setUscite(usciteData?.map(dbToUscita) || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Errore nel caricamento dei dati');
    } finally {
      setIsLoading(false);
    }
  };

  // ===== GESTIONE FATTURE =====

  const aggiungiFattura = async (dati: Omit<Fattura, "id">) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('fatture')
        .insert(fatturaToDb(dati, user.id))
        .select()
        .single();

      if (error) throw error;
      if (data) {
        const nuovaFattura = dbToFattura(data);
        setFatture(prev => [nuovaFattura, ...prev].sort(
          (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
        ));
      }
    } catch (err) {
      console.error('Error adding fattura:', err);
      setError(err instanceof Error ? err.message : 'Errore nell\'aggiunta della fattura');
    }
  };

  const modificaFattura = async (id: string, dati: Partial<Fattura>) => {
    try {
      const updateData: any = {};
      if (dati.data !== undefined) updateData.data = dati.data;
      if (dati.descrizione !== undefined) updateData.descrizione = dati.descrizione;
      if (dati.cliente !== undefined) updateData.cliente = dati.cliente;
      if (dati.importoLordo !== undefined) updateData.importo_lordo = dati.importoLordo;
      if (dati.note !== undefined) updateData.note = dati.note || null;

      const { error } = await supabase
        .from('fatture')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setFatture(prev => prev.map(f => f.id === id ? { ...f, ...dati } : f));
    } catch (err) {
      console.error('Error updating fattura:', err);
      setError(err instanceof Error ? err.message : 'Errore nella modifica della fattura');
    }
  };

  const eliminaFattura = async (id: string) => {
    try {
      const { error } = await supabase
        .from('fatture')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setFatture(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      console.error('Error deleting fattura:', err);
      setError(err instanceof Error ? err.message : 'Errore nell\'eliminazione della fattura');
    }
  };

  // ===== GESTIONE PRELIEVI =====

  const aggiungiPrelievo = async (dati: Omit<Prelievo, "id">) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('prelievi')
        .insert(prelievoToDb(dati, user.id))
        .select()
        .single();

      if (error) throw error;
      if (data) {
        const nuovoPrelievo = dbToPrelievo(data);
        setPrelievi(prev => [nuovoPrelievo, ...prev].sort(
          (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
        ));
      }
    } catch (err) {
      console.error('Error adding prelievo:', err);
      setError(err instanceof Error ? err.message : 'Errore nell\'aggiunta del prelievo');
    }
  };

  const modificaPrelievo = async (id: string, dati: Partial<Prelievo>) => {
    try {
      const updateData: any = {};
      if (dati.data !== undefined) updateData.data = dati.data;
      if (dati.descrizione !== undefined) updateData.descrizione = dati.descrizione;
      if (dati.importo !== undefined) updateData.importo = dati.importo;
      if (dati.note !== undefined) updateData.note = dati.note || null;

      const { error } = await supabase
        .from('prelievi')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setPrelievi(prev => prev.map(p => p.id === id ? { ...p, ...dati } : p));
    } catch (err) {
      console.error('Error updating prelievo:', err);
      setError(err instanceof Error ? err.message : 'Errore nella modifica del prelievo');
    }
  };

  const eliminaPrelievo = async (id: string) => {
    try {
      const { error } = await supabase
        .from('prelievi')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPrelievi(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error deleting prelievo:', err);
      setError(err instanceof Error ? err.message : 'Errore nell\'eliminazione del prelievo');
    }
  };

  // ===== GESTIONE USCITE =====

  const aggiungiUscita = async (dati: Omit<Uscita, "id">) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('uscite')
        .insert(uscitaToDb(dati, user.id))
        .select()
        .single();

      if (error) throw error;
      if (data) {
        const nuovaUscita = dbToUscita(data);
        setUscite(prev => [nuovaUscita, ...prev].sort(
          (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
        ));
      }
    } catch (err) {
      console.error('Error adding uscita:', err);
      setError(err instanceof Error ? err.message : 'Errore nell\'aggiunta dell\'uscita');
    }
  };

  const modificaUscita = async (id: string, dati: Partial<Uscita>) => {
    try {
      const updateData: any = {};
      if (dati.data !== undefined) updateData.data = dati.data;
      if (dati.descrizione !== undefined) updateData.descrizione = dati.descrizione;
      if (dati.categoria !== undefined) updateData.categoria = dati.categoria || null;
      if (dati.importo !== undefined) updateData.importo = dati.importo;
      if (dati.note !== undefined) updateData.note = dati.note || null;
      if (dati.esclusa_da_statistiche !== undefined) updateData.esclusa_da_statistiche = dati.esclusa_da_statistiche;

      const { error } = await supabase
        .from('uscite')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setUscite(prev => prev.map(u => u.id === id ? { ...u, ...dati } : u));
    } catch (err) {
      console.error('Error updating uscita:', err);
      setError(err instanceof Error ? err.message : 'Errore nella modifica dell\'uscita');
    }
  };

  const eliminaUscita = async (id: string) => {
    try {
      const { error } = await supabase
        .from('uscite')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setUscite(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      console.error('Error deleting uscita:', err);
      setError(err instanceof Error ? err.message : 'Errore nell\'eliminazione dell\'uscita');
    }
  };

  return {
    fatture,
    prelievi,
    uscite,
    isLoading,
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
    refresh: loadData,
  };
}
