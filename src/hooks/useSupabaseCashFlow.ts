/**
 * Hook per gestire fatture, prelievi e uscite con Supabase
 */

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { Fattura, Prelievo, Uscita, Entrata } from "../types/fattura";
import type { Database } from "../types/database";
import { normalizzaCategoria } from "../utils/analisiCalcoli";

type FatturaRow = Database['public']['Tables']['fatture']['Row'];
type PrelievoRow = Database['public']['Tables']['prelievi']['Row'];
type UscitaRow = Database['public']['Tables']['uscite']['Row'];
type EntrataRow = Database['public']['Tables']['entrate']['Row'];

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
  escludiDaGrafico: row.escludi_da_grafico || false,
});

const uscitaToDb = (uscita: Omit<Uscita, "id">, userId: string) => ({
  user_id: userId,
  data: uscita.data,
  descrizione: uscita.descrizione,
  categoria: uscita.categoria ? normalizzaCategoria(uscita.categoria) : null,
  importo: uscita.importo,
  note: uscita.note || null,
  escludi_da_grafico: uscita.escludiDaGrafico || false,
});

const dbToEntrata = (row: EntrataRow): Entrata => ({
  id: row.id,
  data: row.data,
  descrizione: row.descrizione,
  categoria: row.categoria || undefined,
  importo: Number(row.importo),
  note: row.note || undefined,
  escludiDaGrafico: row.escludi_da_grafico || false,
});

const entrataToDb = (entrata: Omit<Entrata, "id">, userId: string) => ({
  user_id: userId,
  data: entrata.data,
  descrizione: entrata.descrizione,
  categoria: entrata.categoria ? normalizzaCategoria(entrata.categoria) : null,
  importo: entrata.importo,
  note: entrata.note || null,
  escludi_da_grafico: entrata.escludiDaGrafico || false,
});

export function useSupabaseCashFlow() {
  const [fatture, setFatture] = useState<Fattura[]>([]);
  const [prelievi, setPrelievi] = useState<Prelievo[]>([]);
  const [uscite, setUscite] = useState<Uscita[]>([]);
  const [entrate, setEntrate] = useState<Entrata[]>([]);
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

      // Carica entrate
      const { data: entrateData, error: entrateError } = await supabase
        .from('entrate')
        .select('*')
        .order('data', { ascending: false });

      if (entrateError) throw entrateError;
      setEntrate(entrateData?.map(dbToEntrata) || []);
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
      if (dati.categoria !== undefined) updateData.categoria = dati.categoria ? normalizzaCategoria(dati.categoria) : null;
      if (dati.importo !== undefined) updateData.importo = dati.importo;
      if (dati.note !== undefined) updateData.note = dati.note || null;
      if (dati.escludiDaGrafico !== undefined) updateData.escludi_da_grafico = dati.escludiDaGrafico || false;

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

  // ===== GESTIONE ENTRATE =====

  const aggiungiEntrata = async (dati: Omit<Entrata, "id">) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('entrate')
        .insert(entrataToDb(dati, user.id))
        .select()
        .single();

      if (error) throw error;
      if (data) {
        const nuovaEntrata = dbToEntrata(data);
        setEntrate(prev => [nuovaEntrata, ...prev].sort(
          (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
        ));
      }
    } catch (err) {
      console.error('Error adding entrata:', err);
      setError(err instanceof Error ? err.message : 'Errore nell\'aggiunta dell\'entrata');
    }
  };

  const modificaEntrata = async (id: string, dati: Partial<Entrata>) => {
    try {
      const updateData: any = {};
      if (dati.data !== undefined) updateData.data = dati.data;
      if (dati.descrizione !== undefined) updateData.descrizione = dati.descrizione;
      if (dati.categoria !== undefined) updateData.categoria = dati.categoria ? normalizzaCategoria(dati.categoria) : null;
      if (dati.importo !== undefined) updateData.importo = dati.importo;
      if (dati.note !== undefined) updateData.note = dati.note || null;
      if (dati.escludiDaGrafico !== undefined) updateData.escludi_da_grafico = dati.escludiDaGrafico || false;

      const { error } = await supabase
        .from('entrate')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setEntrate(prev => prev.map(e => e.id === id ? { ...e, ...dati } : e));
    } catch (err) {
      console.error('Error updating entrata:', err);
      setError(err instanceof Error ? err.message : 'Errore nella modifica dell\'entrata');
    }
  };

  const eliminaEntrata = async (id: string) => {
    try {
      const { error } = await supabase
        .from('entrate')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEntrate(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Error deleting entrata:', err);
      setError(err instanceof Error ? err.message : 'Errore nell\'eliminazione dell\'entrata');
    }
  };

  // ===== CONVERSIONE TIPO MOVIMENTO =====

  type TipoMovimento = 'prelievo' | 'uscita' | 'entrata';

  const convertiTipoMovimento = async (
    sourceType: TipoMovimento,
    targetType: TipoMovimento,
    id: string,
    movimento: Prelievo | Uscita | Entrata
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Normalizza il movimento in una struttura comune
      const movimentoComune = {
        data: movimento.data,
        descrizione: movimento.descrizione,
        importo: movimento.importo,
        note: movimento.note,
        categoria: (movimento as Uscita | Entrata).categoria,
        escludiDaGrafico: (movimento as Uscita | Entrata).escludiDaGrafico,
      };

      // Crea il payload per la tabella di destinazione
      let targetPayload: any;
      if (targetType === 'prelievo') {
        // Stipendio: rimuovi categoria e escludiDaGrafico
        targetPayload = prelievoToDb(
          {
            data: movimentoComune.data,
            descrizione: movimentoComune.descrizione,
            importo: movimentoComune.importo,
            note: movimentoComune.note,
          },
          user.id
        );
      } else if (targetType === 'uscita') {
        // Uscita: mantieni categoria (se da entrata) o imposta a null (se da stipendio)
        targetPayload = uscitaToDb(
          {
            data: movimentoComune.data,
            descrizione: movimentoComune.descrizione,
            categoria: movimentoComune.categoria || undefined,
            importo: movimentoComune.importo,
            note: movimentoComune.note,
            escludiDaGrafico: movimentoComune.escludiDaGrafico || false,
          },
          user.id
        );
      } else {
        // Entrata: mantieni categoria (se da uscita) o imposta a null (se da stipendio)
        targetPayload = entrataToDb(
          {
            data: movimentoComune.data,
            descrizione: movimentoComune.descrizione,
            categoria: movimentoComune.categoria || undefined,
            importo: movimentoComune.importo,
            note: movimentoComune.note,
            escludiDaGrafico: movimentoComune.escludiDaGrafico || false,
          },
          user.id
        );
      }

      // Step 1: Inserisci nella tabella di destinazione
      const targetTable = targetType === 'prelievo' ? 'prelievi' : targetType === 'uscita' ? 'uscite' : 'entrate';
      const { data: insertedData, error: insertError } = await supabase
        .from(targetTable)
        .insert(targetPayload)
        .select()
        .single();

      if (insertError) throw insertError;

      // Step 2: Elimina dalla tabella di origine (solo se insert è riuscito)
      const sourceTable = sourceType === 'prelievo' ? 'prelievi' : sourceType === 'uscita' ? 'uscite' : 'entrate';
      const { error: deleteError } = await supabase
        .from(sourceTable)
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.warn('Delete failed after insert:', deleteError);
        setError('Avviso: Conversione completata ma eliminazione non riuscita. Aggiorna la pagina.');
        await loadData();
        return;
      }

      // Step 3: Aggiorna gli stati locali
      // Rimuovi dall'array di origine
      if (sourceType === 'prelievo') {
        setPrelievi(prev => prev.filter(p => p.id !== id));
      } else if (sourceType === 'uscita') {
        setUscite(prev => prev.filter(u => u.id !== id));
      } else {
        setEntrate(prev => prev.filter(e => e.id !== id));
      }

      // Aggiungi all'array di destinazione
      if (targetType === 'prelievo') {
        const nuovoPrelievo = dbToPrelievo(insertedData as PrelievoRow);
        setPrelievi(prev => [nuovoPrelievo, ...prev].sort(
          (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
        ));
      } else if (targetType === 'uscita') {
        const nuovaUscita = dbToUscita(insertedData as UscitaRow);
        setUscite(prev => [nuovaUscita, ...prev].sort(
          (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
        ));
      } else {
        const nuovaEntrata = dbToEntrata(insertedData as EntrataRow);
        setEntrate(prev => [nuovaEntrata, ...prev].sort(
          (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
        ));
      }
    } catch (err) {
      console.error('Error converting movement type:', err);
      setError(err instanceof Error ? err.message : 'Errore nella conversione del movimento');
    }
  };

  return {
    fatture,
    prelievi,
    uscite,
    entrate,
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
    aggiungiEntrata,
    modificaEntrata,
    eliminaEntrata,
    convertiTipoMovimento,
    refresh: loadData,
  };
}
