/**
 * Import dell'estratto BBVA: si trascina il file, si guarda l'anteprima, si
 * conferma.
 *
 * L'anteprima non è un vezzo: la categoria decide dove finisce un movimento
 * nei conti (un pagamento di imposte classificato male sposta
 * l'accantonamento), e i duplicati vanno mostrati PRIMA di scrivere, non
 * spiegati dopo.
 */

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, AlertTriangle, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "../utils/format";
import { useImportBBVA, type EsitoImport, type RigaAnteprima } from "../hooks/useImportBBVA";
import type { EstrattoLetto } from "../utils/importBBVA";
import { ErroreEstratto } from "../utils/importBBVA";
import { CATEGORIA_ENTRATE, CATEGORIA_SPESE, patternSuggerito } from "../utils/categorizzazione";
import {
  CATEGORIA_INCASSO_FATTURA,
  CATEGORIA_INTERESSI,
  CATEGORIA_SALDO_INIZIALE,
  CATEGORIA_STIPENDIO,
  CATEGORIE_TASSE_LISTA,
} from "../constants/fiscali";

interface Props {
  /** Categorie già usate nei movimenti, per il menu a tendina. */
  categorieEsistenti: string[];
  /** Chiamata dopo un import riuscito: ricarica i dati dell'app. */
  onImportCompletato: () => void;
}

export function ImportBBVA({ categorieEsistenti, onImportCompletato }: Props) {
  const { ultimoImport, preparaAnteprima, conferma, inCorso } = useImportBBVA();

  const [estratto, setEstratto] = useState<EstrattoLetto | null>(null);
  const [anteprima, setAnteprima] = useState<RigaAnteprima[]>([]);
  const [nomeFile, setNomeFile] = useState("");
  const [esito, setEsito] = useState<EsitoImport | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [trascinando, setTrascinando] = useState(false);
  const [leggendo, setLeggendo] = useState(false);
  const inputFile = useRef<HTMLInputElement>(null);

  const categorie = useMemo(() => {
    const proposte = [
      CATEGORIA_STIPENDIO,
      CATEGORIA_INCASSO_FATTURA,
      CATEGORIA_INTERESSI,
      CATEGORIA_SALDO_INIZIALE,
      CATEGORIA_SPESE,
      CATEGORIA_ENTRATE,
      ...CATEGORIE_TASSE_LISTA,
      ...categorieEsistenti,
    ];
    return Array.from(new Set(proposte)).sort();
  }, [categorieEsistenti]);

  const nuovi = anteprima.filter((r) => !r.duplicato);
  const duplicati = anteprima.length - nuovi.length;
  const daGuardare = nuovi.filter((r) => r.proposta.daConfermare && !r.corretta).length;

  const azzera = () => {
    setEstratto(null);
    setAnteprima([]);
    setNomeFile("");
    setErrore(null);
    if (inputFile.current) inputFile.current.value = "";
  };

  const apriFile = async (file: File) => {
    setLeggendo(true);
    setErrore(null);
    setEsito(null);
    try {
      const { estratto: letto, anteprima: righe } = await preparaAnteprima(file);
      if (righe.length === 0) {
        setErrore("Nel file non c'è nessun movimento leggibile.");
        return;
      }
      setEstratto(letto);
      setAnteprima(righe);
      setNomeFile(file.name);
    } catch (err) {
      setErrore(
        err instanceof ErroreEstratto
          ? err.message
          : `Non riesco a leggere il file: ${err instanceof Error ? err.message : "errore sconosciuto"}`
      );
    } finally {
      setLeggendo(false);
    }
  };

  const cambiaCategoria = (indice: number, categoria: string) => {
    setAnteprima((prev) =>
      prev.map((r, i) =>
        i === indice
          ? { ...r, categoria, corretta: categoria !== r.proposta.categoria }
          : r
      )
    );
  };

  const cambiaRegola = (indice: number, impara: boolean) => {
    setAnteprima((prev) => prev.map((r, i) => (i === indice ? { ...r, imparaRegola: impara } : r)));
  };

  const salva = async () => {
    if (!estratto) return;
    try {
      const risultato = await conferma(anteprima, estratto, nomeFile);
      setEsito(risultato);
      azzera();
      onImportCompletato();
      toast.success(
        risultato.nuovi > 0
          ? `${risultato.nuovi} movimenti importati`
          : "Nessun movimento nuovo: erano già tutti in archivio"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import non riuscito");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Import</h2>
        <p className="text-muted-foreground">
          Trascina l'export Excel di BBVA: i movimenti già presenti vengono saltati da soli.
        </p>
      </div>

      {ultimoImport && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="text-sm text-muted-foreground">Ultimo import</p>
              <p className="font-medium">
                Saldo BBVA {formatCurrency(ultimoImport.saldo)} al {formatDate(ultimoImport.dataSaldo)}
              </p>
            </div>
            {ultimoImport.nomeFile && (
              <Badge variant="outline" className="font-mono text-xs">
                {ultimoImport.nomeFile}
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      {esito && (
        <Card className="border-emerald-500/40 bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-400">
              <Check className="h-5 w-5" />
              Import completato
            </CardTitle>
            <CardDescription>
              {esito.nuovi} nuovi, {esito.saltati} già presenti
              {esito.dal && esito.al && ` — dal ${formatDate(esito.dal)} al ${formatDate(esito.al)}`}
              {esito.saldo &&
                `. Saldo BBVA aggiornato a ${formatCurrency(esito.saldo.saldo)} al ${formatDate(esito.saldo.data)}`}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {!estratto && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setTrascinando(true);
          }}
          onDragLeave={() => setTrascinando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setTrascinando(false);
            const file = e.dataTransfer.files[0];
            if (file) apriFile(file);
          }}
          className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
            trascinando ? "border-primary bg-primary/5" : "border-muted-foreground/25"
          }`}
        >
          <Upload className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="mb-1 font-medium">
            {leggendo ? "Sto leggendo il file…" : "Trascina qui l'export BBVA"}
          </p>
          <p className="mb-4 text-sm text-muted-foreground">File .xlsx o .xls, un foglio solo</p>
          <input
            ref={inputFile}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) apriFile(file);
            }}
          />
          <Button variant="outline" onClick={() => inputFile.current?.click()} disabled={leggendo}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Scegli il file
          </Button>
        </div>
      )}

      {errore && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <p className="text-sm">{errore}</p>
          </CardContent>
        </Card>
      )}

      {estratto && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{nomeFile}</CardTitle>
              <CardDescription>
                {anteprima.length} movimenti letti · {nuovi.length} da importare · {duplicati} già
                presenti
                {estratto.saldoFinale &&
                  ` · saldo ${formatCurrency(estratto.saldoFinale.saldo)} al ${formatDate(estratto.saldoFinale.data)}`}
              </CardDescription>
            </CardHeader>
            {(daGuardare > 0 || estratto.scartate.length > 0) && (
              <CardContent className="space-y-2 pt-0 text-sm">
                {daGuardare > 0 && (
                  <p className="flex items-start gap-2 text-amber-400">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    {daGuardare} righe hanno una categoria che cambia i conti (tasse, incassi
                    fattura): controllale prima di confermare.
                  </p>
                )}
                {estratto.scartate.length > 0 && (
                  <p className="text-muted-foreground">
                    {estratto.scartate.length} righe del file sono state ignorate:{" "}
                    {estratto.scartate
                      .slice(0, 3)
                      .map((s) => `riga ${s.riga} (${s.motivo})`)
                      .join(", ")}
                    {estratto.scartate.length > 3 && "…"}
                  </p>
                )}
              </CardContent>
            )}
          </Card>

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Data</TableHead>
                  <TableHead>Descrizione</TableHead>
                  <TableHead className="w-32 text-right">Importo</TableHead>
                  <TableHead className="w-64">Categoria</TableHead>
                  <TableHead className="w-40">Regola</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {anteprima.map((r, i) => (
                  <TableRow key={r.importHash} className={r.duplicato ? "opacity-50" : undefined}>
                    <TableCell className="whitespace-nowrap">{formatDate(r.riga.dataValuta)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{r.riga.descrizione}</span>
                        <span className="text-xs text-muted-foreground">
                          {r.riga.parolaChiave}
                          {r.duplicato && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              già importato
                            </Badge>
                          )}
                          {!r.duplicato && r.proposta.daConfermare && !r.corretta && (
                            <span className="ml-2 text-amber-400">{r.proposta.motivo}</span>
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${
                        r.riga.importo < 0 ? "text-red-400" : "text-emerald-400"
                      }`}
                    >
                      {formatCurrency(r.riga.importo)}
                    </TableCell>
                    <TableCell>
                      <Combobox
                        items={categorie}
                        value={r.categoria}
                        onChange={(v) => cambiaCategoria(i, v)}
                        allowCustom
                        placeholder="Categoria"
                      />
                    </TableCell>
                    <TableCell>
                      {r.corretta && !r.duplicato ? (
                        <label className="flex cursor-pointer items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={r.imparaRegola}
                            onChange={(e) => cambiaRegola(i, e.target.checked)}
                          />
                          <span title={`Pattern: "${patternSuggerito(r.riga)}"`}>
                            sempre così
                          </span>
                        </label>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={salva} disabled={inCorso || nuovi.length === 0}>
              <Check className="mr-2 h-4 w-4" />
              {inCorso
                ? "Sto importando…"
                : nuovi.length === 0
                  ? "Niente da importare"
                  : `Importa ${nuovi.length} movimenti`}
            </Button>
            <Button variant="ghost" onClick={azzera} disabled={inCorso}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Annulla
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
