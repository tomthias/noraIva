/**
 * Hook centrale: fatture, movimenti, scadenzario F24, patrimonio e
 * preferenze su Supabase. Carica e scrive i dati; i CONTI li fa `utils/fisco.ts`.
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
  AperturaConto,
  Fattura,
  Movimento,
  Prelievo,
  ScadenzaFiscale,
  StrumentoPatrimonio,
  TipoStrumento,
  Uscita,
  Entrata,
  ValorePatrimonio,
} from "../types/fattura";
import type { Database } from "../types/database";
import { normalizzaCategoria } from "../utils/analisiCalcoli";
import {
  CATEGORIA_INCASSO_FATTURA,
  CATEGORIA_STIPENDIO,
  eStipendio,
} from "../constants/fiscali";
import { entrateDa, prelieviDa, usciteDa } from "../utils/movimenti";

type FatturaRow = Database["public"]["Tables"]["fatture"]["Row"];
type MovimentoRow = Database["public"]["Tables"]["movimenti"]["Row"];
type FatturaUpdate = Database["public"]["Tables"]["fatture"]["Update"];
type MovimentoUpdate = Database["public"]["Tables"]["movimenti"]["Update"];
type ScadenzaRow = Database["public"]["Tables"]["scadenze_fiscali"]["Row"];

/**
 * Dal più recente al più vecchio. Le fatture non ancora incassate (data null)
 * stanno in cima: sono quelle che chiedono un'azione.
 */
const ordinaPerData = <T extends { data: string | null }>(items: T[]): T[] =>
  [...items].sort((a, b) => (b.data ?? "9999").localeCompare(a.data ?? "9999"));

/** Punto di partenza del conto finché l'utente non ne salva uno. */
export const APERTURA_PREDEFINITA: AperturaConto = { data: "1900-01-01", saldo: 0 };

// ===== conversioni DB ⇄ app =====

const dbToFattura = (row: FatturaRow): Fattura => ({
  id: row.id,
  data: row.data,
  numero: row.numero || undefined,
  dataEmissione: row.data_emissione || undefined,
  descrizione: row.descrizione,
  cliente: row.cliente,
  importoLordo: Number(row.importo_lordo),
  note: row.note || undefined,
});

const fatturaToDb = (fattura: Omit<Fattura, "id">, userId: string) => ({
  user_id: userId,
  data: fattura.data,
  numero: fattura.numero || null,
  data_emissione: fattura.dataEmissione || null,
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
  strumentoId: row.strumento_id || undefined,
});

const dbToScadenza = (row: ScadenzaRow): ScadenzaFiscale => ({
  id: row.id,
  annoImposta: Number(row.anno_imposta),
  tributo: row.tributo as ScadenzaFiscale["tributo"],
  tipo: row.tipo as ScadenzaFiscale["tipo"],
  dataScadenza: row.data_scadenza,
  importo: Number(row.importo),
  pagataIl: row.pagata_il || undefined,
  movimentoId: row.movimento_id || undefined,
  note: row.note || undefined,
  calcolata: false,
});

const scadenzaToDb = (s: ScadenzaFiscale, userId: string) => ({
  user_id: userId,
  anno_imposta: s.annoImposta,
  tributo: s.tributo,
  tipo: s.tipo,
  data_scadenza: s.dataScadenza,
  importo: Math.round(s.importo * 100) / 100,
  pagata_il: s.pagataIl ?? null,
  movimento_id: s.movimentoId ?? null,
  note: s.note ?? null,
});

async function utenteCorrente() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");
  return user;
}

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
  strumento_id: movimento.strumentoId ?? null,
});

// Le tre liste storiche sono derivate dal segno e dalla categoria: la
// partizione vive in `utils/movimenti.ts` (dove i test la raggiungono) e
// riproduce esattamente la vecchia aritmetica `fatture + entrate − prelievi
// − uscite`.

export function useSupabaseCashFlow() {
  const [fatture, setFatture] = useState<Fattura[]>([]);
  const [movimenti, setMovimenti] = useState<Movimento[]>([]);
  /** Solo le righe F24 reali: quelle stimate le calcola `fisco.ts`. */
  const [scadenzeSalvate, setScadenzeSalvate] = useState<ScadenzaFiscale[]>([]);
  const [strumenti, setStrumenti] = useState<StrumentoPatrimonio[]>([]);
  const [valori, setValori] = useState<ValorePatrimonio[]>([]);
  const [apertura, setApertura] = useState<AperturaConto>(APERTURA_PREDEFINITA);
  /** Riserva di emergenza, tolta dal netto prelevabile. */
  const [cuscinetto, setCuscinetto] = useState(0);
  /** Mesi di vita da coprire prima di alimentare il fondo investimenti. */
  const [mesiRiserva, setMesiRiserva] = useState(3);
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

      const [fattureRes, movimentiRes, scadenzeRes, strumentiRes, valoriRes, preferenzeRes] =
        await Promise.all([
          supabase.from("fatture").select("*"),
          supabase.from("movimenti").select("*").order("data", { ascending: false }),
          supabase.from("scadenze_fiscali").select("*").order("data_scadenza"),
          supabase.from("strumenti_patrimonio").select("*").order("created_at"),
          supabase.from("valori_patrimonio").select("*").order("data", { ascending: false }),
          supabase.from("preferenze").select("chiave, valore"),
        ]);

      if (fattureRes.error) throw fattureRes.error;
      if (movimentiRes.error) throw movimentiRes.error;
      // Le tabelle nuove possono non esistere finché la migrazione SQL non è
      // stata applicata: l'app resta usabile, lo scadenzario è tutto stimato.
      if (scadenzeRes.error) console.warn("scadenze_fiscali:", scadenzeRes.error.message);

      setFatture(ordinaPerData(fattureRes.data?.map(dbToFattura) ?? []));
      setMovimenti(movimentiRes.data?.map(dbToMovimento) ?? []);
      setScadenzeSalvate(scadenzeRes.error ? [] : (scadenzeRes.data ?? []).map(dbToScadenza));
      setStrumenti(
        strumentiRes.error
          ? []
          : (strumentiRes.data ?? []).map((r) => ({
              id: r.id,
              nome: r.nome,
              tipo: r.tipo as TipoStrumento,
            }))
      );
      setValori(
        valoriRes.error
          ? []
          : (valoriRes.data ?? []).map((r) => ({
              id: r.id,
              strumentoId: r.strumento_id,
              data: r.data,
              valore: Number(r.valore),
            }))
      );

      const preferenza = (chiave: string) =>
        preferenzeRes.error ? undefined : preferenzeRes.data?.find((p) => p.chiave === chiave)?.valore;
      const aperturaSalvata = preferenza("apertura_conto") as AperturaConto | undefined;
      if (aperturaSalvata?.data) {
        setApertura({ data: aperturaSalvata.data, saldo: Number(aperturaSalvata.saldo) });
      }
      setCuscinetto(Number(preferenza("cuscinetto") ?? 0) || 0);
      setMesiRiserva(Number(preferenza("mesi_riserva_vita") ?? 3) || 0);
    } catch (err) {
      console.error("Error loading data:", err);
      setError(err instanceof Error ? err.message : "Errore nel caricamento dei dati");
    } finally {
      setIsLoading(false);
    }
  };

  const riportaErrore = (messaggio: string) => (err: unknown) => {
    console.error(messaggio, err);
    setError(err instanceof Error ? err.message : messaggio);
  };

  // ===== FATTURE =====

  const aggiungiFattura = async (dati: Omit<Fattura, "id">): Promise<Fattura | undefined> => {
    try {
      const user = await utenteCorrente();
      const { data, error } = await supabase
        .from("fatture")
        .insert(fatturaToDb(dati, user.id))
        .select()
        .single();
      if (error) throw error;
      if (!data) return undefined;
      const nuova = dbToFattura(data);
      setFatture((prev) => ordinaPerData([nuova, ...prev]));
      await allineaIncasso(nuova);
      return nuova;
    } catch (err) {
      riportaErrore("Errore nell'aggiunta della fattura")(err);
      return undefined;
    }
  };

  const modificaFattura = async (id: string, dati: Partial<Fattura>) => {
    try {
      const updateData: FatturaUpdate = {};
      if (dati.data !== undefined) updateData.data = dati.data;
      if (dati.numero !== undefined) updateData.numero = dati.numero || null;
      if (dati.dataEmissione !== undefined) updateData.data_emissione = dati.dataEmissione || null;
      if (dati.descrizione !== undefined) updateData.descrizione = dati.descrizione;
      if (dati.cliente !== undefined) updateData.cliente = dati.cliente;
      if (dati.importoLordo !== undefined) updateData.importo_lordo = dati.importoLordo;
      if (dati.note !== undefined) updateData.note = dati.note || null;

      const { error } = await supabase.from("fatture").update(updateData).eq("id", id);
      if (error) throw error;

      setFatture((prev) => ordinaPerData(prev.map((f) => (f.id === id ? { ...f, ...dati } : f))));
      const prima = fatture.find((f) => f.id === id);
      if (prima) await allineaIncasso({ ...prima, ...dati });
    } catch (err) {
      riportaErrore("Errore nella modifica della fattura")(err);
    }
  };

  const eliminaFattura = async (id: string) => {
    try {
      const prima = fatture.find((f) => f.id === id);
      if (prima) await allineaIncasso({ ...prima, data: null });
      const { error } = await supabase.from("fatture").delete().eq("id", id);
      if (error) throw error;
      setFatture((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      riportaErrore("Errore nell'eliminazione della fattura")(err);
    }
  };

  /**
   * Tiene il conto allineato alla fattura: una fattura incassata ha il suo
   * movimento di incasso, così la cassa sale nel momento in cui la segni.
   *
   * - bonifico già importato da BBVA e collegato → comanda la banca, niente da fare;
   * - incassata senza movimento → si crea un movimento manuale;
   * - data o importo cambiati → si aggiorna il movimento manuale;
   * - non più incassata (o eliminata) → si toglie il movimento manuale.
   *
   * Quando poi arriva l'import BBVA, il bonifico vero prende il posto di quello
   * manuale (`useImportBBVA`): nessun doppione.
   */
  const allineaIncasso = async (fattura: Fattura) => {
    const collegati = movimenti.filter((m) => m.fatturaId === fattura.id);
    if (collegati.some((m) => m.fonte === "import_bbva")) return;
    const manuale = collegati[0];

    if (fattura.data === null) {
      if (manuale) await eliminaMovimento(manuale.id);
      return;
    }
    const importo = Math.abs(fattura.importoLordo);
    if (manuale) {
      if (manuale.data !== fattura.data || manuale.importo !== importo)
        await modificaMovimento(manuale.id, { data: fattura.data, importo });
      return;
    }
    await aggiungiMovimento({
      data: fattura.data,
      descrizione: `Incasso fattura ${fattura.numero ?? ""} ${fattura.cliente}`.replace(/\s+/g, " ").trim(),
      categoria: CATEGORIA_INCASSO_FATTURA,
      importo,
      fonte: "manuale",
      fatturaId: fattura.id,
    });
  };

  const incassaFattura = (id: string, data: string) => modificaFattura(id, { data });

  // ===== MOVIMENTI =====

  const aggiungiMovimento = async (dati: Omit<Movimento, "id">): Promise<Movimento | undefined> => {
    try {
      const user = await utenteCorrente();
      const { data, error } = await supabase
        .from("movimenti")
        .insert(movimentoToDb(dati, user.id))
        .select()
        .single();
      if (error) throw error;
      if (!data) return undefined;
      const nuovo = dbToMovimento(data);
      setMovimenti((prev) => ordinaPerData([nuovo, ...prev]));
      return nuovo;
    } catch (err) {
      riportaErrore("Errore nell'aggiunta del movimento")(err);
      return undefined;
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
      if ("fatturaId" in dati) updateData.fattura_id = dati.fatturaId ?? null;
      if ("strumentoId" in dati) updateData.strumento_id = dati.strumentoId ?? null;

      const { error } = await supabase.from("movimenti").update(updateData).eq("id", id);
      if (error) throw error;

      setMovimenti((prev) =>
        ordinaPerData(prev.map((m) => (m.id === id ? { ...m, ...dati } : m)))
      );
    } catch (err) {
      riportaErrore("Errore nella modifica del movimento")(err);
    }
  };

  const eliminaMovimento = async (id: string) => {
    try {
      const { error } = await supabase.from("movimenti").delete().eq("id", id);
      if (error) throw error;
      setMovimenti((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      riportaErrore("Errore nell'eliminazione del movimento")(err);
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
      const user = await utenteCorrente();
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

  // ===== SCADENZARIO F24 =====

  /**
   * Paga un F24: un movimento "Tasse" per il totale, e ogni riga salvata come
   * pagata e collegata a quel movimento. Le righe stimate diventano reali con
   * l'importo che si sta pagando. Cassa e "da tenere" scendono della stessa
   * cifra: il netto non cambia.
   */
  const pagaScadenze = async (righe: ScadenzaFiscale[], data: string) => {
    try {
      const user = await utenteCorrente();
      const totale = righe.reduce((s, r) => s + r.importo, 0);
      const movimento = await aggiungiMovimento({
        data,
        descrizione: `F24 ${data.split("-").reverse().join("/")}`,
        categoria: "Tasse",
        importo: -Math.round(totale * 100) / 100,
        fonte: "manuale",
      });
      if (!movimento) return;

      const pagate = righe.map((r) => ({ ...r, pagataIl: data, movimentoId: movimento.id }));
      const salvate = await salvaRigheScadenze(pagate, user.id);
      setScadenzeSalvate((prev) => unisciScadenze(prev, salvate));
    } catch (err) {
      riportaErrore("Errore nel pagamento dell'F24")(err);
    }
  };

  /** Annulla un pagamento: via il movimento, le righe tornano da pagare. */
  const annullaPagamento = async (movimentoId: string) => {
    try {
      const { error } = await supabase
        .from("scadenze_fiscali")
        .update({ pagata_il: null, movimento_id: null })
        .eq("movimento_id", movimentoId);
      if (error) throw error;
      await eliminaMovimento(movimentoId);
      setScadenzeSalvate((prev) =>
        prev.map((s) =>
          s.movimentoId === movimentoId ? { ...s, pagataIl: undefined, movimentoId: undefined } : s
        )
      );
    } catch (err) {
      riportaErrore("Errore nell'annullamento del pagamento")(err);
    }
  };

  /** Salva l'importo reale di una riga (es. quando Fiscozen emette l'F24). */
  const salvaScadenza = async (riga: ScadenzaFiscale) => {
    try {
      const user = await utenteCorrente();
      const salvate = await salvaRigheScadenze([riga], user.id);
      setScadenzeSalvate((prev) => unisciScadenze(prev, salvate));
    } catch (err) {
      riportaErrore("Errore nel salvataggio della scadenza")(err);
    }
  };

  /** Torna alla stima: elimina la riga salvata. */
  const eliminaScadenza = async (id: string) => {
    try {
      const { error } = await supabase.from("scadenze_fiscali").delete().eq("id", id);
      if (error) throw error;
      setScadenzeSalvate((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      riportaErrore("Errore nell'eliminazione della scadenza")(err);
    }
  };

  // ===== PATRIMONIO =====

  const aggiungiStrumento = async (nome: string, tipo: TipoStrumento) => {
    try {
      const user = await utenteCorrente();
      const { data, error } = await supabase
        .from("strumenti_patrimonio")
        .insert({ user_id: user.id, nome, tipo })
        .select()
        .single();
      if (error) throw error;
      if (data) setStrumenti((prev) => [...prev, { id: data.id, nome: data.nome, tipo }]);
    } catch (err) {
      riportaErrore("Errore nella creazione dello strumento")(err);
    }
  };

  const aggiornaValore = async (strumentoId: string, data: string, valore: number) => {
    try {
      const user = await utenteCorrente();
      const { data: riga, error } = await supabase
        .from("valori_patrimonio")
        .insert({ user_id: user.id, strumento_id: strumentoId, data, valore })
        .select()
        .single();
      if (error) throw error;
      if (riga)
        setValori((prev) => [
          { id: riga.id, strumentoId, data, valore: Number(riga.valore) },
          ...prev,
        ]);
    } catch (err) {
      riportaErrore("Errore nel salvataggio del valore")(err);
    }
  };

  const assegnaStrumento = (movimentoId: string, strumentoId: string | undefined) =>
    modificaMovimento(movimentoId, { strumentoId });

  // ===== PREFERENZE =====

  const salvaPreferenza = useCallback(async (chiave: string, valore: unknown) => {
    try {
      await scriviPreferenza(chiave, valore);
    } catch (err) {
      console.error("Errore nel salvataggio delle preferenze", err);
      setError(err instanceof Error ? err.message : "Errore nel salvataggio delle preferenze");
    }
  }, []);

  /** Si scrive subito a schermo e poi in database: la card deve rispondere al momento. */
  const salvaCuscinetto = useCallback(
    async (valore: number) => {
      const importo = Math.max(0, valore);
      setCuscinetto(importo);
      await salvaPreferenza("cuscinetto", importo);
    },
    [salvaPreferenza]
  );

  const salvaMesiRiserva = useCallback(
    async (valore: number) => {
      const mesi = Math.max(0, Math.round(valore));
      setMesiRiserva(mesi);
      await salvaPreferenza("mesi_riserva_vita", mesi);
    },
    [salvaPreferenza]
  );

  const salvaApertura = useCallback(
    async (nuova: AperturaConto) => {
      setApertura(nuova);
      await salvaPreferenza("apertura_conto", nuova);
    },
    [salvaPreferenza]
  );

  // ===== API RETROCOMPATIBILE (GestioneMovimenti, Analisi) =====

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

  /** Cambiare tipo = cambiare segno e categoria dello stesso movimento. */
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
    const categoria = eStipendio(movimento.categoria) ? undefined : movimento.categoria;
    await modificaMovimento(id, {
      importo: targetType === "uscita" ? -modulo : modulo,
      categoria,
    });
  };

  const prelievi = useMemo<Prelievo[]>(() => prelieviDa(movimenti), [movimenti]);
  const uscite = useMemo<Uscita[]>(() => usciteDa(movimenti), [movimenti]);
  const entrate = useMemo<Entrata[]>(() => entrateDa(movimenti), [movimenti]);

  return {
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
    isLoading,
    error,
    aggiungiFattura,
    modificaFattura,
    eliminaFattura,
    incassaFattura,
    aggiungiMovimento,
    modificaMovimento,
    eliminaMovimento,
    importaMovimenti,
    pagaScadenze,
    annullaPagamento,
    salvaScadenza,
    eliminaScadenza,
    aggiungiStrumento,
    aggiornaValore,
    assegnaStrumento,
    salvaCuscinetto,
    salvaMesiRiserva,
    salvaApertura,
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

async function scriviPreferenza(chiave: string, valore: unknown) {
  const user = await utenteCorrente();
  const { error } = await supabase
    .from("preferenze")
    .upsert({ user_id: user.id, chiave, valore: valore as never }, { onConflict: "user_id,chiave" });
  if (error) throw error;
}

/**
 * Inserisce o aggiorna righe dello scadenzario, una alla volta.
 *
 * Le righe INPS/imposta sono uniche per anno/tributo/tipo (indice parziale in
 * DB): una riga stimata che diventa reale aggiorna quella eventualmente già
 * salvata invece di duplicarla. PostgREST non sa fare `upsert` su un indice
 * parziale, quindi si cerca prima la riga e poi si decide.
 */
async function salvaRigheScadenze(
  righe: ScadenzaFiscale[],
  userId: string
): Promise<ScadenzaFiscale[]> {
  const risultato: ScadenzaFiscale[] = [];

  for (const r of righe) {
    let id = r.id;
    if (!id && (r.tributo === "inps" || r.tributo === "imposta")) {
      const { data: esistente, error } = await supabase
        .from("scadenze_fiscali")
        .select("id")
        .eq("anno_imposta", r.annoImposta)
        .eq("tributo", r.tributo)
        .eq("tipo", r.tipo)
        .maybeSingle();
      if (error) throw error;
      id = esistente?.id;
    }

    const query = id
      ? supabase.from("scadenze_fiscali").update(scadenzaToDb(r, userId)).eq("id", id)
      : supabase.from("scadenze_fiscali").insert(scadenzaToDb(r, userId));
    const { data, error } = await query.select().single();
    if (error) throw error;
    if (data) risultato.push(dbToScadenza(data));
  }

  return risultato;
}

function unisciScadenze(prima: ScadenzaFiscale[], nuove: ScadenzaFiscale[]): ScadenzaFiscale[] {
  const ids = new Set(nuove.map((n) => n.id));
  return [...prima.filter((p) => !ids.has(p.id)), ...nuove].sort((a, b) =>
    a.dataScadenza.localeCompare(b.dataScadenza)
  );
}
