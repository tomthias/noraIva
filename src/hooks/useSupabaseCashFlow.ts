/**
 * Hook centrale: fatture, movimenti e rettifiche su Supabase.
 *
 * I movimenti vivono in UNA tabella (`movimenti`) con l'importo con segno.
 * Prima erano tre (`prelievi`, `uscite`, `entrate`) e ogni operazione andava
 * scritta tre volte, con in più il macchinario di conversione fra tipi.
 *
 * Per non riscrivere tutti i componenti in un colpo solo, l'hook continua a
 * esporre le tre liste derivate (`prelievi`, `uscite`, `entrate`) nella forma
 * vecchia — importi POSITIVI, tipo implicito. Sono viste in sola lettura: le
 * scritture passano tutte da `movimenti`.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type {
  Fattura,
  Movimento,
  Prelievo,
  Uscita,
  Entrata,
} from "../types/fattura";
import type { Database } from "../types/database";
import { normalizzaCategoria } from "../utils/analisiCalcoli";
import {
  CATEGORIA_STIPENDIO,
  eStipendio,
  RETTIFICHE_INCASSI_INIZIALI,
} from "../constants/fiscali";
import {
  caricaRettificheLocali,
  marcaRettificheMigrate,
  rettificheGiaMigrate,
} from "../utils/storage";
import { entrateDa, prelieviDa, usciteDa } from "../utils/movimenti";

type FatturaRow = Database["public"]["Tables"]["fatture"]["Row"];
type MovimentoRow = Database["public"]["Tables"]["movimenti"]["Row"];
type FatturaUpdate = Database["public"]["Tables"]["fatture"]["Update"];
type MovimentoUpdate = Database["public"]["Tables"]["movimenti"]["Update"];

/** Movimenti e fatture sono sempre mostrati dal più recente al più vecchio. */
const ordinaPerData = <T extends { data: string }>(items: T[]): T[] =>
  [...items].sort((a, b) => b.data.localeCompare(a.data));

// ===== conversioni DB ⇄ app =====

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
  fonte: (row.fonte as Movimento["fonte"]) ?? "manuale",
  importHash: row.import_hash || undefined,
  saldoDopo: row.saldo_dopo === null ? undefined : Number(row.saldo_dopo),
  dataContabile: row.data_contabile || undefined,
  escludiDaGrafico: row.escludi_da_grafico || false,
  note: row.note || undefined,
  fatturaId: row.fattura_id || undefined,
});

export const movimentoToDb = (
  movimento: Omit<Movimento, "id">,
  userId: string
) => ({
  user_id: userId,
  data: movimento.data,
  descrizione: movimento.descrizione,
  categoria: movimento.categoria ? normalizzaCategoria(movimento.categoria) : null,
  importo: movimento.importo,
  fonte: movimento.fonte,
  import_hash: movimento.importHash ?? null,
  saldo_dopo: movimento.saldoDopo ?? null,
  data_contabile: movimento.dataContabile ?? null,
  escludi_da_grafico: movimento.escludiDaGrafico ?? false,
  note: movimento.note || null,
  fattura_id: movimento.fatturaId ?? null,
});

// Le tre liste storiche sono derivate dal segno e dalla categoria: la
// partizione vive in `utils/movimenti.ts` (dove i test la raggiungono) e
// riproduce esattamente la vecchia aritmetica `fatture + entrate − prelievi
// − uscite`.

export function useSupabaseCashFlow() {
  const [fatture, setFatture] = useState<Fattura[]>([]);
  const [movimenti, setMovimenti] = useState<Movimento[]>([]);
  const [rettifiche, setRettifiche] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const [fattureRes, movimentiRes] = await Promise.all([
        supabase.from("fatture").select("*").order("data", { ascending: false }),
        supabase.from("movimenti").select("*").order("data", { ascending: false }),
      ]);

      if (fattureRes.error) throw fattureRes.error;
      if (movimentiRes.error) throw movimentiRes.error;

      setFatture(fattureRes.data?.map(dbToFattura) ?? []);
      setMovimenti(movimentiRes.data?.map(dbToMovimento) ?? []);
      setRettifiche(await caricaRettifiche(user.id));
    } catch (err) {
      console.error("Error loading data:", err);
      setError(err instanceof Error ? err.message : "Errore nel caricamento dei dati");
    } finally {
      setIsLoading(false);
    }
  };

  // ===== FATTURE =====

  const aggiungiFattura = async (dati: Omit<Fattura, "id">) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("fatture")
        .insert(fatturaToDb(dati, user.id))
        .select()
        .single();

      if (error) throw error;
      if (data) setFatture((prev) => ordinaPerData([dbToFattura(data), ...prev]));
    } catch (err) {
      console.error("Error adding fattura:", err);
      setError(err instanceof Error ? err.message : "Errore nell'aggiunta della fattura");
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

      const { error } = await supabase.from("fatture").update(updateData).eq("id", id);
      if (error) throw error;

      setFatture((prev) => ordinaPerData(prev.map((f) => (f.id === id ? { ...f, ...dati } : f))));
    } catch (err) {
      console.error("Error updating fattura:", err);
      setError(err instanceof Error ? err.message : "Errore nella modifica della fattura");
    }
  };

  const eliminaFattura = async (id: string) => {
    try {
      const { error } = await supabase.from("fatture").delete().eq("id", id);
      if (error) throw error;
      setFatture((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      console.error("Error deleting fattura:", err);
      setError(err instanceof Error ? err.message : "Errore nell'eliminazione della fattura");
    }
  };

  // ===== MOVIMENTI =====

  const aggiungiMovimento = async (dati: Omit<Movimento, "id">) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("movimenti")
        .insert(movimentoToDb(dati, user.id))
        .select()
        .single();

      if (error) throw error;
      if (data) setMovimenti((prev) => ordinaPerData([dbToMovimento(data), ...prev]));
    } catch (err) {
      console.error("Error adding movimento:", err);
      setError(err instanceof Error ? err.message : "Errore nell'aggiunta del movimento");
    }
  };

  const modificaMovimento = async (id: string, dati: Partial<Movimento>) => {
    try {
      const updateData: MovimentoUpdate = {};
      if (dati.data !== undefined) updateData.data = dati.data;
      if (dati.descrizione !== undefined) updateData.descrizione = dati.descrizione;
      if (dati.categoria !== undefined)
        updateData.categoria = dati.categoria ? normalizzaCategoria(dati.categoria) : null;
      if (dati.importo !== undefined) updateData.importo = dati.importo;
      if (dati.note !== undefined) updateData.note = dati.note || null;
      if (dati.escludiDaGrafico !== undefined)
        updateData.escludi_da_grafico = dati.escludiDaGrafico;
      if (dati.fatturaId !== undefined) updateData.fattura_id = dati.fatturaId ?? null;

      const { error } = await supabase.from("movimenti").update(updateData).eq("id", id);
      if (error) throw error;

      setMovimenti((prev) =>
        ordinaPerData(prev.map((m) => (m.id === id ? { ...m, ...dati } : m)))
      );
    } catch (err) {
      console.error("Error updating movimento:", err);
      setError(err instanceof Error ? err.message : "Errore nella modifica del movimento");
    }
  };

  const eliminaMovimento = async (id: string) => {
    try {
      const { error } = await supabase.from("movimenti").delete().eq("id", id);
      if (error) throw error;
      setMovimenti((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error("Error deleting movimento:", err);
      setError(err instanceof Error ? err.message : "Errore nell'eliminazione del movimento");
    }
  };

  /**
   * Inserisce in blocco i movimenti di un import, saltando quelli già presenti.
   * Il dedup è affidato all'indice unique su (user_id, import_hash): si usa
   * `upsert(..., ignoreDuplicates)` invece di rileggere e confrontare, così due
   * import concorrenti non possono infilare lo stesso movimento due volte.
   *
   * Restituisce i movimenti effettivamente inseriti.
   */
  const importaMovimenti = useCallback(
    async (nuovi: Omit<Movimento, "id">[]): Promise<Movimento[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("movimenti")
        .upsert(
          nuovi.map((m) => movimentoToDb(m, user.id)),
          { onConflict: "user_id,import_hash", ignoreDuplicates: true }
        )
        .select();

      if (error) throw error;

      const inseriti = (data ?? []).map(dbToMovimento);
      setMovimenti((prev) => ordinaPerData([...inseriti, ...prev]));
      return inseriti;
    },
    []
  );

  // ===== RETTIFICHE INCASSI =====

  const impostaRettifica = async (anno: number, importo: number) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Rettifica 0 = assente: si rimuove invece di salvare uno zero.
      if (importo === 0) {
        const { error } = await supabase
          .from("rettifiche_incassi")
          .delete()
          .eq("user_id", user.id)
          .eq("anno", anno);
        if (error) throw error;
        setRettifiche((prev) => {
          const next = { ...prev };
          delete next[anno];
          return next;
        });
        return;
      }

      const { error } = await supabase
        .from("rettifiche_incassi")
        .upsert({ user_id: user.id, anno, importo }, { onConflict: "user_id,anno" });
      if (error) throw error;

      setRettifiche((prev) => ({ ...prev, [anno]: importo }));
    } catch (err) {
      console.error("Error saving rettifica:", err);
      setError(err instanceof Error ? err.message : "Errore nel salvataggio della rettifica");
    }
  };

  // ===== API RETROCOMPATIBILE =====
  // Wrapper sottili sopra `movimenti`, per non riscrivere `GestioneMovimenti`
  // nello stesso commit della migrazione dati. Spariranno con la dieta della UI.

  const aggiungiPrelievo = (dati: Omit<Prelievo, "id">) =>
    aggiungiMovimento({
      data: dati.data,
      descrizione: dati.descrizione,
      categoria: CATEGORIA_STIPENDIO,
      importo: -Math.abs(dati.importo),
      note: dati.note,
      fonte: "manuale",
    });

  const aggiungiUscita = (dati: Omit<Uscita, "id">) =>
    aggiungiMovimento({
      data: dati.data,
      descrizione: dati.descrizione,
      categoria: dati.categoria,
      importo: -Math.abs(dati.importo),
      note: dati.note,
      escludiDaGrafico: dati.escludiDaGrafico,
      fonte: "manuale",
    });

  const aggiungiEntrata = (dati: Omit<Entrata, "id">) =>
    aggiungiMovimento({
      data: dati.data,
      descrizione: dati.descrizione,
      categoria: dati.categoria,
      importo: Math.abs(dati.importo),
      note: dati.note,
      escludiDaGrafico: dati.escludiDaGrafico,
      fonte: "manuale",
    });

  /** Le viste espongono importi positivi: rimettere il segno alla scrittura. */
  const conSegno = (importo: number | undefined, negativo: boolean) =>
    importo === undefined ? undefined : negativo ? -Math.abs(importo) : Math.abs(importo);

  const modificaPrelievo = (id: string, dati: Partial<Prelievo>) =>
    modificaMovimento(id, { ...dati, importo: conSegno(dati.importo, true) });

  const modificaUscita = (id: string, dati: Partial<Uscita>) =>
    modificaMovimento(id, { ...dati, importo: conSegno(dati.importo, true) });

  const modificaEntrata = (id: string, dati: Partial<Entrata>) =>
    modificaMovimento(id, { ...dati, importo: conSegno(dati.importo, false) });

  /**
   * Cambiare tipo a un movimento è ora un UPDATE, non più un insert+delete fra
   * tabelle diverse: cambiano solo il segno dell'importo e la categoria.
   */
  const convertiTipoMovimento = async (
    _sourceType: "prelievo" | "uscita" | "entrata",
    targetType: "prelievo" | "uscita" | "entrata",
    id: string
  ) => {
    const movimento = movimenti.find((m) => m.id === id);
    if (!movimento) return;

    const modulo = Math.abs(movimento.importo);
    if (targetType === "prelievo") {
      await modificaMovimento(id, { importo: -modulo, categoria: CATEGORIA_STIPENDIO });
      return;
    }
    // Uscendo da "stipendio" la categoria non ha più senso: si azzera, come
    // faceva la vecchia conversione fra tabelle.
    const categoria = eStipendio(movimento.categoria) ? undefined : movimento.categoria;
    await modificaMovimento(id, {
      importo: targetType === "uscita" ? -modulo : modulo,
      categoria,
    });
  };

  // ===== VISTE DERIVATE (retrocompatibilità) =====

  const prelievi = useMemo<Prelievo[]>(() => prelieviDa(movimenti), [movimenti]);
  const uscite = useMemo<Uscita[]>(() => usciteDa(movimenti), [movimenti]);
  const entrate = useMemo<Entrata[]>(() => entrateDa(movimenti), [movimenti]);

  return {
    fatture,
    movimenti,
    prelievi,
    uscite,
    entrate,
    rettifiche,
    isLoading,
    error,
    aggiungiFattura,
    modificaFattura,
    eliminaFattura,
    aggiungiMovimento,
    modificaMovimento,
    eliminaMovimento,
    importaMovimenti,
    impostaRettifica,
    // Retrocompatibilità, in attesa della dieta della UI:
    aggiungiPrelievo,
    modificaPrelievo,
    eliminaPrelievo: eliminaMovimento,
    aggiungiUscita,
    modificaUscita,
    eliminaUscita: eliminaMovimento,
    aggiungiEntrata,
    modificaEntrata,
    eliminaEntrata: eliminaMovimento,
    convertiTipoMovimento,
    refresh: loadData,
  };
}

/**
 * Le rettifiche stavano in localStorage, quindi erano legate a un browser.
 * Al primo caricamento su Supabase si recuperano i valori locali di questo
 * browser (se ce ne sono) e solo in loro assenza si usa il seed di
 * `RETTIFICHE_INCASSI_INIZIALI`: chi aveva già corretto un anno a mano non se
 * lo vede sovrascritto dal valore di partenza.
 */
async function caricaRettifiche(userId: string): Promise<Record<number, number>> {
  const { data, error } = await supabase
    .from("rettifiche_incassi")
    .select("anno, importo");
  if (error) throw error;

  const remote = Object.fromEntries(
    (data ?? []).map((r) => [Number(r.anno), Number(r.importo)])
  );

  if (Object.keys(remote).length > 0 || rettificheGiaMigrate()) return remote;

  const locali = caricaRettificheLocali();
  const daScrivere = Object.keys(locali).length > 0 ? locali : RETTIFICHE_INCASSI_INIZIALI;
  const righe = Object.entries(daScrivere)
    .map(([anno, importo]) => ({ user_id: userId, anno: Number(anno), importo }))
    .filter((r) => r.importo !== 0);

  if (righe.length === 0) {
    marcaRettificheMigrate();
    return {};
  }

  const { error: erroreUpsert } = await supabase
    .from("rettifiche_incassi")
    .upsert(righe, { onConflict: "user_id,anno" });
  if (erroreUpsert) throw erroreUpsert;

  marcaRettificheMigrate();
  return Object.fromEntries(righe.map((r) => [r.anno, r.importo]));
}
