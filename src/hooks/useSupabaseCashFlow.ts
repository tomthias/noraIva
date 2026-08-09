/**
 * Hook per gestire fatture e movimenti con Supabase.
 *
 * I movimenti stanno in UNA tabella (`movimenti`, importo con segno). Le tre
 * viste storiche — prelievi, uscite, entrate — sono derivate, non tabelle:
 * vedi `utils/movimenti.ts`. Il resto dell'app continua a consumarle come
 * prima, con importi positivi.
 */

import { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabase";
import type { Fattura, Movimento, Prelievo, Uscita, Entrata } from "../types/fattura";
import type { Database } from "../types/database";
import { normalizzaCategoria } from "../utils/analisiCalcoli";
import {
  categoriaPerTipo,
  entrateDa,
  importoConSegno,
  prelieviDa,
  usciteDa,
  type TipoMovimento,
} from "../utils/movimenti";

type FatturaRow = Database['public']['Tables']['fatture']['Row'];
type MovimentoRow = Database['public']['Tables']['movimenti']['Row'];
type FatturaUpdate = Database['public']['Tables']['fatture']['Update'];
type MovimentoUpdate = Database['public']['Tables']['movimenti']['Update'];

/** Movimenti e fatture sono sempre mostrati dal più recente al più vecchio. */
const ordinaPerData = <T extends { data: string }>(items: T[]): T[] =>
  [...items].sort((a, b) => b.data.localeCompare(a.data));

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

const dbToMovimento = (row: MovimentoRow): Movimento => ({
  id: row.id,
  data: row.data,
  descrizione: row.descrizione,
  categoria: row.categoria || undefined,
  importo: Number(row.importo),
  fonte: row.fonte,
  saldoDopo: row.saldo_dopo === null ? undefined : Number(row.saldo_dopo),
  note: row.note || undefined,
  escludiDaGrafico: row.escludi_da_grafico || false,
});

/**
 * Da una delle tre viste alla riga della tabella unica.
 * `dati.importo` arriva sempre positivo: il segno lo decide il tipo.
 */
const vistaToDb = (
  tipo: TipoMovimento,
  dati: Omit<Prelievo, "id"> | Omit<Uscita, "id"> | Omit<Entrata, "id">,
  userId: string
) => {
  const categoria = (dati as Omit<Uscita, "id">).categoria;
  return {
    user_id: userId,
    data: dati.data,
    descrizione: dati.descrizione,
    categoria: categoriaPerTipo(tipo, categoria && normalizzaCategoria(categoria)),
    importo: importoConSegno(dati.importo, tipo),
    fonte: 'manuale',
    note: dati.note || null,
    escludi_da_grafico: (dati as Omit<Uscita, "id">).escludiDaGrafico || false,
  };
};

export function useSupabaseCashFlow() {
  const [fatture, setFatture] = useState<Fattura[]>([]);
  const [movimenti, setMovimenti] = useState<Movimento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Le tre viste storiche: stessa forma di prima (importi positivi), ma ora
  // calcolate dai movimenti invece che da tre tabelle separate.
  const prelievi = useMemo(() => prelieviDa(movimenti), [movimenti]);
  const uscite = useMemo(() => usciteDa(movimenti), [movimenti]);
  const entrate = useMemo(() => entrateDa(movimenti), [movimenti]);

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

      // Carica movimenti (ex prelievi + uscite + entrate)
      const { data: movimentiData, error: movimentiError } = await supabase
        .from('movimenti')
        .select('*')
        .order('data', { ascending: false });

      if (movimentiError) throw movimentiError;
      setMovimenti(movimentiData?.map(dbToMovimento) || []);
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
        setFatture(prev => ordinaPerData([nuovaFattura, ...prev]));
      }
    } catch (err) {
      console.error('Error adding fattura:', err);
      setError(err instanceof Error ? err.message : 'Errore nell\'aggiunta della fattura');
    }
  };

  const modificaFattura = async (id: string, dati: Partial<Fattura>) => {
    try {
      const updateData: FatturaUpdate = {};
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

      setFatture(prev => ordinaPerData(prev.map(f => f.id === id ? { ...f, ...dati } : f)));
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

  // ===== GESTIONE MOVIMENTI =====
  //
  // Un solo CRUD per tutti e tre i tipi: cambia solo il segno dell'importo e,
  // per gli stipendi, la categoria.

  const aggiungiMovimento = async (
    tipo: TipoMovimento,
    dati: Omit<Prelievo, "id"> | Omit<Uscita, "id"> | Omit<Entrata, "id">
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('movimenti')
        .insert(vistaToDb(tipo, dati, user.id))
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setMovimenti(prev => ordinaPerData([dbToMovimento(data), ...prev]));
      }
    } catch (err) {
      console.error('Error adding movimento:', err);
      setError(err instanceof Error ? err.message : 'Errore nell\'aggiunta del movimento');
    }
  };

  /**
   * Modifica un movimento restando nello stesso tipo.
   *
   * `dati.importo` arriva positivo dalle viste: va riportato al segno del
   * movimento, altrimenti modificare l'importo di un'uscita la trasformerebbe
   * in un'entrata.
   */
  const modificaMovimento = async (
    tipo: TipoMovimento,
    id: string,
    dati: Partial<Prelievo & Uscita & Entrata>
  ) => {
    try {
      const updateData: MovimentoUpdate = {};
      if (dati.data !== undefined) updateData.data = dati.data;
      if (dati.descrizione !== undefined) updateData.descrizione = dati.descrizione;
      if (dati.categoria !== undefined) {
        updateData.categoria = categoriaPerTipo(
          tipo,
          dati.categoria && normalizzaCategoria(dati.categoria)
        );
      }
      if (dati.importo !== undefined) updateData.importo = importoConSegno(dati.importo, tipo);
      if (dati.note !== undefined) updateData.note = dati.note || null;
      if (dati.escludiDaGrafico !== undefined) {
        updateData.escludi_da_grafico = dati.escludiDaGrafico || false;
      }

      const { error } = await supabase
        .from('movimenti')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setMovimenti(prev => ordinaPerData(prev.map(m => m.id === id ? {
        ...m,
        ...dati,
        importo: dati.importo !== undefined ? importoConSegno(dati.importo, tipo) : m.importo,
        categoria: updateData.categoria === undefined
          ? m.categoria
          : updateData.categoria ?? undefined,
      } : m)));
    } catch (err) {
      console.error('Error updating movimento:', err);
      setError(err instanceof Error ? err.message : 'Errore nella modifica del movimento');
    }
  };

  const eliminaMovimento = async (id: string) => {
    try {
      const { error } = await supabase
        .from('movimenti')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMovimenti(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error('Error deleting movimento:', err);
      setError(err instanceof Error ? err.message : 'Errore nell\'eliminazione del movimento');
    }
  };

  /**
   * Cambia il tipo di un movimento (stipendio ⇄ uscita ⇄ entrata).
   *
   * Con la tabella unica è un semplice UPDATE di segno e categoria: sparisce
   * il vecchio insert-in-un'altra-tabella + delete, che poteva lasciare il
   * movimento duplicato se il delete falliva.
   */
  const cambiaTipoMovimento = async (
    id: string,
    nuovoTipo: TipoMovimento,
    dati: Omit<Uscita, "id">
  ) => {
    try {
      // La categoria si scrive SEMPRE, anche vuota: diventando stipendio deve
      // passare a "Stipendio", e smettendo di esserlo non deve restare tale.
      const aggiornamento: MovimentoUpdate = {
        data: dati.data,
        descrizione: dati.descrizione,
        categoria: categoriaPerTipo(
          nuovoTipo,
          dati.categoria && normalizzaCategoria(dati.categoria)
        ),
        importo: importoConSegno(dati.importo, nuovoTipo),
        note: dati.note || null,
      };

      const { error } = await supabase
        .from('movimenti')
        .update(aggiornamento)
        .eq('id', id);

      if (error) throw error;

      setMovimenti(prev => ordinaPerData(prev.map(m => m.id === id ? {
        ...m,
        data: aggiornamento.data!,
        descrizione: aggiornamento.descrizione!,
        categoria: aggiornamento.categoria ?? undefined,
        importo: aggiornamento.importo!,
        note: aggiornamento.note ?? undefined,
      } : m)));
    } catch (err) {
      console.error('Error changing movimento type:', err);
      setError(err instanceof Error ? err.message : 'Errore nel cambio di tipo del movimento');
    }
  };

  return {
    fatture,
    movimenti,
    prelievi,
    uscite,
    entrate,
    isLoading,
    error,
    aggiungiFattura,
    modificaFattura,
    eliminaFattura,
    aggiungiPrelievo: (dati: Omit<Prelievo, "id">) => aggiungiMovimento('prelievo', dati),
    modificaPrelievo: (id: string, dati: Partial<Prelievo>) => modificaMovimento('prelievo', id, dati),
    eliminaPrelievo: eliminaMovimento,
    aggiungiUscita: (dati: Omit<Uscita, "id">) => aggiungiMovimento('uscita', dati),
    modificaUscita: (id: string, dati: Partial<Uscita>) => modificaMovimento('uscita', id, dati),
    eliminaUscita: eliminaMovimento,
    aggiungiEntrata: (dati: Omit<Entrata, "id">) => aggiungiMovimento('entrata', dati),
    modificaEntrata: (id: string, dati: Partial<Entrata>) => modificaMovimento('entrata', id, dati),
    eliminaEntrata: eliminaMovimento,
    cambiaTipoMovimento,
    refresh: loadData,
  };
}
