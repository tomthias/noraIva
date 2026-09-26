/**
 * Testo di un PDF, una stringa per riga visiva: quello che serve a
 * `leggiEstrattoPdf`. Solo browser (pdfjs), caricato su richiesta perché è
 * pesante e serve solo nella pagina Import.
 *
 * Le parole con la stessa coordinata verticale formano una riga; fra una
 * parola e la successiva si mettono tanti spazi quanta è la distanza, così le
 * colonne restano separate da almeno due spazi come in `pdftotext -layout`.
 */
export async function righeDiTestoPdf(dati: ArrayBuffer): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const documento = await pdfjs.getDocument({ data: dati }).promise;
  const righe: string[] = [];

  for (let p = 1; p <= documento.numPages; p++) {
    const pagina = await documento.getPage(p);
    const { items } = await pagina.getTextContent();
    const perRiga = new Map<number, { x: number; fine: number; testo: string }[]>();

    for (const item of items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const [, , , , x, y] = item.transform as number[];
      const chiave = Math.round(y / 2) * 2; // tolleranza di 2pt fra parole della stessa riga
      const riga = perRiga.get(chiave) ?? [];
      riga.push({ x, fine: x + item.width, testo: item.str });
      perRiga.set(chiave, riga);
    }

    const ordinate = [...perRiga.entries()].sort((a, b) => b[0] - a[0]);
    for (const [, parole] of ordinate) {
      parole.sort((a, b) => a.x - b.x);
      let linea = "";
      let fine = parole[0].x;
      for (const parola of parole) {
        const spazio = parola.x - fine;
        linea += linea ? (spazio > 6 ? "   " : spazio > 1 ? " " : "") : "";
        linea += parola.testo;
        fine = parola.fine;
      }
      righe.push(linea);
    }
  }

  return righe;
}
