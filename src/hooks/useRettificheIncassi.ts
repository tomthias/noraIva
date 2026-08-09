/**
 * Rettifiche degli incassi per anno, su Supabase.
 *
 *     incassi anno = somma fatture dell'anno + rettifica[anno]
 *
 * La rettifica si SOMMA, non sostituisce: così ogni fattura aggiunta dopo
 * continua a contare (vedi CLAUDE.md). Prima viveva in localStorage ed era
 * legata a un solo browser; ora è sincronizzata come il resto dei dati.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { RETTIFICHE_INCASSI_INIZIALI } from "../constants/fiscali";
import {
  leggiRettificheLocali,
  rettificheGiaMigrate,
  segnaRettificheMigrate,
} from "../utils/storage";

type Rettifiche = Record<number, number>;

export function useRettificheIncassi() {
  const [rettifiche, setRettifiche] = useState<Rettifiche>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carica = useCallback(async (): Promise<Rettifiche> => {
    const { data, error: err } = await supabase
      .from("rettifiche_incassi")
      .select("anno, importo");

    if (err) throw err;

    return Object.fromEntries(
      (data ?? []).map((r) => [Number(r.anno), Number(r.importo)])
    );
  }, []);

  /**
   * Recupera una volta sola le rettifiche rimaste in questo browser.
   *
   * Un anno locale viene importato se su Supabase manca, oppure se contiene
   * ancora il valore di seed (`RETTIFICHE_INCASSI_INIZIALI`): il seed è un
   * default, una scelta fatta dall'utente in questo browser vale di più.
   * Se invece il valore remoto è stato cambiato da un altro dispositivo,
   * quello vince: è più recente del residuo locale.
   */
  const importaDaLocalStorage = useCallback(
    async (remote: Rettifiche, userId: string): Promise<Rettifiche> => {
      if (rettificheGiaMigrate()) return remote;

      const soloSeed = (anno: number) =>
        remote[anno] === undefined || remote[anno] === RETTIFICHE_INCASSI_INIZIALI[anno];

      const locali = leggiRettificheLocali();
      const daImportare = Object.entries(locali)
        .filter(([anno, importo]) => importo !== 0 && soloSeed(Number(anno)))
        .map(([anno, importo]) => ({
          user_id: userId,
          anno: Number(anno),
          importo,
        }));

      if (daImportare.length === 0) {
        segnaRettificheMigrate();
        return remote;
      }

      const { error: err } = await supabase
        .from("rettifiche_incassi")
        .upsert(daImportare, { onConflict: "user_id,anno" });

      if (err) throw err;

      segnaRettificheMigrate();
      return {
        ...remote,
        ...Object.fromEntries(daImportare.map((r) => [r.anno, r.importo])),
      };
    },
    []
  );

  useEffect(() => {
    let annullato = false;

    const avvia = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const remote = await carica();
        const finali = await importaDaLocalStorage(remote, user.id);
        if (!annullato) setRettifiche(finali);
      } catch (err) {
        console.error("Errore nel caricamento delle rettifiche:", err);
        if (!annullato) {
          setError(err instanceof Error ? err.message : "Errore nel caricamento delle rettifiche");
        }
      } finally {
        if (!annullato) setIsLoading(false);
      }
    };

    avvia();
    return () => { annullato = true; };
  }, [carica, importaDaLocalStorage]);

  /** Rettifica 0 = assente: la riga viene rimossa, non salvata a zero. */
  const impostaRettifica = useCallback(async (anno: number, importo: number) => {
    // Aggiornamento ottimistico: la card degli incassi deve rispondere subito.
    setRettifiche((prev) => {
      const next = { ...prev };
      if (importo === 0) delete next[anno];
      else next[anno] = importo;
      return next;
    });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error: err } = importo === 0
        ? await supabase.from("rettifiche_incassi").delete().eq("anno", anno)
        : await supabase
            .from("rettifiche_incassi")
            .upsert({ user_id: user.id, anno, importo }, { onConflict: "user_id,anno" });

      if (err) throw err;
    } catch (err) {
      console.error("Errore nel salvataggio della rettifica:", err);
      setError(err instanceof Error ? err.message : "Errore nel salvataggio della rettifica");
      // Rimette in pari lo stato con il database, invece di lasciare a schermo
      // un valore che non è stato salvato.
      try {
        setRettifiche(await carica());
      } catch {
        /* il messaggio d'errore è già stato mostrato */
      }
    }
  }, [carica]);

  return { rettifiche, impostaRettifica, isLoading, error };
}
