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
  catenaSaldi,
  leggiEstrattoBBVA,
  leggiEstrattoPdf,
  type EstrattoLetto,
  type RigaEstratto,
} from "../utils/importBBVA";
import {
  abbinaFatture,
  patternSuggerito,
  proponiCategoria,
  testoRiga,
  type Proposta,
  type RegolaCategoria,
} from "../utils/categorizzazione";
import { normalizzaCategoria } from "../utils/analisiCalcoli";
import { eIncassoFattura } from "../constants/fiscali";
import type { Fattura } from "../types/fattura";

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
  /** Fatture segnate incassate grazie al bonifico abbinato. */
  fattureIncassate: string[];
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
      const dati = await file.arrayBuffer();
      const estratto = file.name.toLowerCase().endsWith(".pdf")
        ? leggiEstrattoPdf(await (await import("../utils/pdfTesto")).righeDiTestoPdf(dati))
        : leggiEstrattoBBVA(dati);
      // Il saldo dopo ogni movimento permette di accorgersi di una riga letta
      // male: meglio fermarsi che importare un estratto bucato.
      const { rotture } = catenaSaldi(estratto.righe);
      if (rotture > 0) {
        estratto.scartate.push({
          riga: 0,
          motivo: `${rotture} saldi non tornano: una riga potrebbe essere stata letta male`,
        });
      }

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
      nomeFile: string,
      fatture: Fattura[]
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

        // Incassi → fatture. Candidate: quelle ancora aperte e quelle segnate
        // incassate a mano, il cui movimento manuale ora lo sostituisce la banca.
        const { data: manuali, error: erroreManuali } = await supabase
          .from("movimenti")
          .select("id, fattura_id")
          .eq("fonte", "manuale")
          .not("fattura_id", "is", null);
        if (erroreManuali) throw erroreManuali;
        const conIncassoManuale = new Set((manuali ?? []).map((m) => m.fattura_id as string));
        const candidate = fatture
          .filter((f) => f.data === null || conIncassoManuale.has(f.id))
          .map((f) => ({ ...f, data: null }));

        const abbinate = new Map<RigaAnteprima, Fattura[]>();
        for (const r of [...daScrivere].sort((a, b) => a.riga.dataValuta.localeCompare(b.riga.dataValuta))) {
          if (!eIncassoFattura(r.categoria)) continue;
          const libere = candidate.filter((f) => f.data === null);
          const trovate = abbinaFatture(
            { testo: testoRiga(r.riga), importo: r.riga.importo, dataValuta: r.riga.dataValuta },
            libere
          );
          for (const f of trovate) f.data = r.riga.dataValuta;
          if (trovate.length) abbinate.set(r, trovate);
        }

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
            fattura_id: abbinate.get(r)?.[0]?.id ?? null,
          }));

          for (let i = 0; i < righe.length; i += 200) {
            const { error } = await supabase.from("movimenti").insert(righe.slice(i, i + 200));
            if (error) throw error;
          }
        }

        const fattureIncassate: string[] = [];
        for (const trovate of abbinate.values()) {
          for (const f of trovate) {
            const { error } = await supabase.from("fatture").update({ data: f.data }).eq("id", f.id);
            if (error) throw error;
            fattureIncassate.push(f.numero ?? f.cliente);
            // Il bonifico vero sostituisce l'incasso segnato a mano.
            const manuale = (manuali ?? []).find((m) => m.fattura_id === f.id);
            if (manuale) await supabase.from("movimenti").delete().eq("id", manuale.id);
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
          fattureIncassate,
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
