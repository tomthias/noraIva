/**
 * Import dell'estratto BBVA: dal file alle righe scritte in `movimenti`.
 *
 * Sta fuori da `useSupabaseCashFlow` di proposito: è un flusso a sé (leggi →
 * proponi → conferma → scrivi) che tocca tre tabelle e non serve a nessun'altra
 * schermata. L'hook centrale si limita a ricaricare quando l'import finisce.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  calcolaImportHash,
  leggiEstrattoBBVA,
  type EstrattoLetto,
  type RigaEstratto,
} from "../utils/importBBVA";
import {
  patternSuggerito,
  proponiCategoria,
  type Proposta,
  type RegolaCategoria,
} from "../utils/categorizzazione";
import { normalizzaCategoria } from "../utils/analisiCalcoli";

/** Una riga dell'anteprima: quello che è stato letto più quello che sarà scritto. */
export interface RigaAnteprima {
  riga: RigaEstratto;
  importHash: string;
  categoria: string;
  proposta: Proposta;
  /** true se un movimento con lo stesso hash è già in database. */
  duplicato: boolean;
  /** true se l'utente ha cambiato la categoria proposta. */
  corretta: boolean;
  /** true per salvare una regola dalla correzione fatta. */
  imparaRegola: boolean;
}

export interface EsitoImport {
  nuovi: number;
  saltati: number;
  dal?: string;
  al?: string;
  saldo?: { data: string; saldo: number };
}

export interface UltimoImport {
  dataSaldo: string;
  saldo: number;
  importatoIl?: string;
  nomeFile?: string;
}

export function useImportBBVA() {
  const [regole, setRegole] = useState<RegolaCategoria[]>([]);
  const [ultimoImport, setUltimoImport] = useState<UltimoImport | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  const caricaContesto = useCallback(async () => {
    const [regoleRes, importRes] = await Promise.all([
      supabase.from("regole_categorie").select("pattern, categoria"),
      supabase
        .from("import_estratti")
        .select("data_saldo, saldo, importato_il, nome_file")
        .order("data_saldo", { ascending: false })
        .limit(1),
    ]);

    if (!regoleRes.error) setRegole(regoleRes.data ?? []);

    const ultimo = importRes.data?.[0];
    setUltimoImport(
      ultimo
        ? {
            dataSaldo: ultimo.data_saldo,
            saldo: Number(ultimo.saldo),
            importatoIl: ultimo.importato_il ?? undefined,
            nomeFile: ultimo.nome_file ?? undefined,
          }
        : null
    );
  }, []);

  useEffect(() => {
    caricaContesto().catch((e) => console.error("Errore nel caricamento del contesto import:", e));
  }, [caricaContesto]);

  /**
   * Legge il file e prepara l'anteprima: categoria proposta per ogni riga e
   * marchio "duplicato" per quelle già presenti.
   *
   * Il controllo dei duplicati si fa qui, non al momento della scrittura: chi
   * conferma deve poter vedere prima quante righe verranno saltate.
   */
  const preparaAnteprima = useCallback(
    async (file: File): Promise<{ estratto: EstrattoLetto; anteprima: RigaAnteprima[] }> => {
      const estratto = leggiEstrattoBBVA(await file.arrayBuffer());

      const { data: esistenti, error } = await supabase
        .from("movimenti")
        .select("import_hash")
        .not("import_hash", "is", null);
      if (error) throw error;

      const gia = new Set((esistenti ?? []).map((m) => m.import_hash as string));

      const anteprima = await Promise.all(
        estratto.righe.map(async (riga): Promise<RigaAnteprima> => {
          const proposta = proponiCategoria(riga, regole);
          const importHash = await calcolaImportHash(riga);
          return {
            riga,
            importHash,
            categoria: proposta.categoria,
            proposta,
            duplicato: gia.has(importHash),
            corretta: false,
            imparaRegola: false,
          };
        })
      );

      return { estratto, anteprima };
    },
    [regole]
  );

  /**
   * Scrive i movimenti confermati.
   *
   * Salta i duplicati in silenzio (finiscono nel conteggio del report) e
   * registra il saldo di chiusura in `import_estratti`: è l'ancora del cash,
   * e non si può ricavare riordinando i movimenti perché due movimenti dello
   * stesso giorno non hanno un ordine.
   */
  const conferma = useCallback(
    async (
      anteprima: RigaAnteprima[],
      estratto: EstrattoLetto,
      nomeFile: string
    ): Promise<EsitoImport> => {
      setInCorso(true);
      setErrore(null);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Sessione scaduta: rientra e riprova");

        const daScrivere = anteprima.filter((r) => !r.duplicato);
        const saltati = anteprima.length - daScrivere.length;

        if (daScrivere.length > 0) {
          const righe = daScrivere.map((r) => ({
            user_id: user.id,
            data: r.riga.dataValuta,
            data_contabile: r.riga.dataContabile ?? null,
            descrizione: r.riga.descrizione,
            categoria: normalizzaCategoria(r.categoria),
            importo: r.riga.importo,
            fonte: "import_bbva" as const,
            import_hash: r.importHash,
            saldo_dopo: r.riga.disponibile ?? null,
            escludi_da_grafico: false,
            note: r.riga.osservazioni ?? null,
          }));

          for (let i = 0; i < righe.length; i += 200) {
            const { error } = await supabase.from("movimenti").insert(righe.slice(i, i + 200));
            if (error) throw error;
          }
        }

        // Regole imparate dalle correzioni: una riga corretta a mano vale per
        // tutte le prossime simili.
        const nuoveRegole = daScrivere
          .filter((r) => r.imparaRegola && r.corretta)
          .map((r) => ({
            user_id: user.id,
            pattern: patternSuggerito(r.riga),
            categoria: normalizzaCategoria(r.categoria),
          }))
          .filter((r) => r.pattern !== "");

        if (nuoveRegole.length > 0) {
          await supabase
            .from("regole_categorie")
            .upsert(nuoveRegole, { onConflict: "user_id,pattern" });
        }

        if (estratto.saldoFinale) {
          await supabase.from("import_estratti").insert({
            user_id: user.id,
            nome_file: nomeFile,
            data_saldo: estratto.saldoFinale.data,
            saldo: estratto.saldoFinale.saldo,
            movimenti_nuovi: daScrivere.length,
            movimenti_saltati: saltati,
          });
        }

        await caricaContesto();

        const date = anteprima.map((r) => r.riga.dataValuta).sort();
        return {
          nuovi: daScrivere.length,
          saltati,
          dal: date[0],
          al: date[date.length - 1],
          saldo: estratto.saldoFinale,
        };
      } catch (err) {
        const messaggio = err instanceof Error ? err.message : "Errore durante l'import";
        setErrore(messaggio);
        throw err;
      } finally {
        setInCorso(false);
      }
    },
    [caricaContesto]
  );

  return { regole, ultimoImport, preparaAnteprima, conferma, inCorso, errore, ricarica: caricaContesto };
}
