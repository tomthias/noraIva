# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # TypeScript compile + Vite build
npm run lint         # ESLint
npm run test         # Vitest in watch mode
npm run test:run     # Vitest single run (used in CI)
```

## Architecture

**Stack**: React 19 + TypeScript + Vite + Vitest

Invoice management webapp for Italian "Partita IVA" (freelance VAT) under the flat-rate tax regime (regime forfettario).

### Core Layers

- **Types** (`src/types/fattura.ts`): `Fattura` (data incasso nullable), `Movimento`, `ScadenzaFiscale`, patrimonio
- **Constants** (`src/constants/fiscali.ts`): aliquote per anno, acconti, soglie, categorie strutturali
- **Motore** (`src/utils/fisco.ts`): **unica fonte dei numeri** — tasse, scadenzario, cassa, netto, fondo, patrimonio
- **State** (`src/hooks/useSupabaseCashFlow.ts`): carica e scrive i dati; i conti li fa `fisco.ts`
- **Movimenti** (`src/utils/movimenti.ts`): tabella unica `movimenti` (importo CON SEGNO)
  ⇄ le tre viste storiche `prelievi` / `uscite` / `entrate` (importi positivi), usate da Analisi e GestioneMovimenti
- **Import BBVA** (`src/utils/importBBVA.ts`, `categorizzazione.ts`, `hooks/useImportBBVA.ts`):
  Excel o PDF "Ultime transazioni", dedup, categoria proposta, abbinamento bonifico → fattura
- **Storage** (`src/utils/storage.ts`): localStorage solo per le descrizioni salvate

### Components

- `dashboard/Prelevabile`: netto prelevabile, cassa, tasse da tenere, cuscinetto, fondo investimenti
- `dashboard/Scadenzario`: F24 aperti (reali o stimati), "segna pagato", importi reali
- `dashboard/FattureDaIncassare`, `dashboard/LimiteForfettario`, `dashboard/GuadagnoSpesa`
- `Patrimonio`: pensione, investimenti, Moneyfarm — mai prelevabile
- `TabellaFatture` / `FormFattura`: numero, emissione, incasso
- `ScenarioSimulator`: "se incasso X oggi" via `simulaIncasso`
- `analisi/Analisi`: solo grafici descrittivi

### Test Pattern

Tests in `tests/` verify fiscal calculations with known values. Use `toBeCloseTo()` for floating-point comparisons.

## Deploy

GitHub Pages via GitHub Actions. Push to `main` triggers: test → build → deploy. Base path configured as `/noraIva/` in `vite.config.ts`.

---

# CRITICAL: Regime Forfettario — come l'app fa i conti

**⚠️ Leggi tutta questa sezione prima di toccare `src/utils/fisco.ts`.**

La logica è stata ricostruita a settembre 2026 perché la versione precedente
(rettifiche, tasse riconosciute dal nome della categoria, saldo iniziale come
categoria, 8 schermate che rifacevano i conti) dava un netto sbagliato di
migliaia di euro. Il modello attuale ricalcola **al centesimo** gli F24 reali
del 2024 e del 2025 (`tests/fisco.test.ts`): se una modifica rompe quel
backtest, è sbagliata la modifica.

## Tre fonti, una funzione

| Fonte | Tabella | Cosa decide |
|---|---|---|
| Movimenti del conto | `movimenti` | la **cassa** = apertura + Σ movimenti dopo l'apertura |
| Fatture con data di incasso | `fatture.data` | gli **incassi**, quindi le tasse e il limite 85k |
| F24 reali | `scadenze_fiscali` | cosa è stato pagato/emesso; il resto lo stima l'app |

Tutto passa da `situazione()` in `fisco.ts`. Dashboard, Simulatore e Patrimonio
leggono lo stesso oggetto. **Non rifare conti nei componenti.**

```
daTenere        = Σ righe F24 non pagate (reali + stimate, crediti inclusi)
liberoDaTasse   = cassa − daTenere
netto           = liberoDaTasse − cuscinetto          ← "netto prelevabile"
fondoInvestim.  = max(0, netto − mesiRiserva × costoVitaMensile)
```

- **Cassa**: `preferenze.apertura_conto` {data, saldo} + i movimenti con data
  successiva. Nessuna categoria "Saldo Iniziale". Il controllo è
  `verificaBanca()`: saldo dell'ultimo movimento importato (`saldo_dopo`)
  contro la cassa alla stessa data. Uno scostamento = movimento mancante o doppio.
- **Incassi dell'anno** = Σ fatture con `data` nell'anno. `data` è la data di
  **incasso** (principio di cassa, Telefisco 18/09/2025); `null` = emessa e non
  ancora pagata, non conta. La data di emissione sta in `data_emissione` e serve
  solo al bollo. Niente rettifiche.
- **Costo di vita**: media degli ultimi 12 mesi di tutti i movimenti tranne
  quelli strutturali (tasse, investimenti, lavoro, incassi fattura). Gli
  stipendi verso il conto personale sono vita.

## Regole fiscali (verificate sugli F24 reali)

| Regola | Valore |
|---|---|
| Reddito | incassi × 78% (ATECO 74.12.01) |
| INPS Gestione Separata | reddito × 26,07% (2024–2026, circ. INPS 8/2026). Nessun minimale dovuto, massimale mai vincolante |
| Imposta sostitutiva | aliquota × max(0, reddito − **INPS VERSATO nell'anno**) |
| Aliquota imposta | 5% per i periodi 2022–2026 (start-up, attività dal 23/06/2022), **15% dal 2027** |
| Acconti INPS | 40% + 40% dei contributi dell'anno prima |
| Acconti imposta | **50% + 50%** (art. 58 DL 124/2019 + ris. 93/E/2019: attività soggetta a ISA) |
| Soglie acconto imposta | < 51,65 € niente; < 257,52 € tutto a novembre |
| Metodo | storico: gli acconti N+1 si calcolano sulle tasse N |
| Bollo fatture | 2 € per fattura > 77,47 €; trimestri I–III entro 30/11, IV entro 28/02 |

**⚠️ La deduzione è per CASSA.** L'imposta dell'anno N deduce l'INPS pagato
nell'anno N (saldo N-1 + acconti N), non l'INPS calcolato sul reddito N. La
versione precedente sbagliava qui.

**⚠️ Gli acconti dell'imposta sono 50/50, non 40/60.** Gli F24 lo confermano:
803,50 + 803,50 (2024), 613 + 613 (2025), 724 + 724 (2026).

**⚠️ Saldi negativi = crediti.** Il saldo imposta 2024 era −381 €, compensato
nell'F24 di luglio 2025. Mai `Math.max(0, …)` su un saldo.

**2027**: l'aliquota sale al 15% ma gli acconti 2027 si calcolano sull'imposta
2026 al 5%, quindi il saldo 2027 (giugno 2028) sarà alto. Lo scadenzario lo avvisa.

Usa sempre `getAliquotaSostitutiva(anno)` e `getAliquotaInps(anno)`.

## Lo scadenzario

`scadenzario(fatture, salvate, oggi)` restituisce le righe F24:
- le **salvate** (`scadenze_fiscali`, `calcolata: false`): F24 reali, pagati o emessi;
- le **stimate** (`calcolata: true`), aggiunte solo se manca la riga salvata
  con lo stesso anno/tributo/tipo, per l'anno scorso e l'anno in corso:
  acconti dell'anno, saldo dell'anno, acconti dell'anno dopo, bollo.

Una riga salvata **vince sempre** sulla stima. Quando Fiscozen emette l'F24,
si scrive l'importo reale (matita nello scadenzario) e la stima sparisce.

"Segna pagato" crea UN movimento `Tasse` per il totale dell'F24 e marca le
righe con `pagata_il` e `movimento_id`. Cassa e daTenere scendono della stessa
cifra: **il netto non cambia pagando le tasse** (c'è un test).

Le tasse pagate NON si deducono più dai movimenti per categoria: la categoria
`Tasse` serve solo a tenerle fuori dal costo di vita.

## Categorie strutturali

Riconosciute con i predicati di `constants/fiscali.ts`, mai con `===`:
`eTassa`, `eStipendio`, `eInvestimento`, `eLavoro`, `eIncassoFattura`, `eInteressi`.

- **Tasse**: bonifico verso Intesa per pagare l'F24 (causale "Tasse…")
- **Stipendi**: bonifico verso il conto personale ("Stipendio…" o solo "Mattia marinangeli")
- **Investimenti**: Moneyfarm, "Verso.agg. mand.", "Mm288318" → collegabili a uno strumento del patrimonio
- **Lavoro**: Fiscozen, Claude, Vercel… (costi dell'attività, fuori dal costo di vita)
- **Incasso Fattura**: bonifico ricevuto con `fattura_id`

## Import BBVA

- Excel o PDF "Ultime transazioni" (`leggiEstrattoPdf`, testo via pdfjs in `pdfTesto.ts`).
- `catenaSaldi()` verifica che saldo precedente + importo = saldo: una rottura è una riga persa.
- Dedup: `sha256(data valuta | importo | saldo dopo)`. Il testo NON entra quando
  c'è il saldo: Excel e PDF descrivono lo stesso movimento con parole diverse.
- Abbinamento incasso → fattura (`abbinaFatture`): numero citato in causale con
  importo che torna (anche più fatture in un bonifico), altrimenti la fattura
  aperta con lo stesso importo emessa per prima. L'importo deve SEMPRE tornare.
- Un incasso segnato a mano viene sostituito dal bonifico importato.

## Dati di partenza (migrazione settembre 2026)

`scripts/ricostruzione-dati.mts` ha ricostruito movimenti (406, dal 30/11/2024,
estratto BBVA), fatture 2025–2026 (PDF Fiscozen) e scadenzario (F24 2024–2026).
Apertura: 22.393,75 € al 29/11/2024. Fattura 6/2026 annullata.

## Testing

`tests/fisco.test.ts` è il riferimento: backtest sugli F24 reali, soglie,
15% dal 2027, crediti, "pagare non cambia il netto", simulazione di un incasso.
Ogni modifica fiscale passa da lì. Usa `toBeCloseTo()`.

## Sources

- [INPS – Gestione Separata aliquote 2026](https://www.inps.it/it/it/inps-comunica/notizie/dettaglio-news-page.news.2026.02.gestione-separata-le-aliquote-contributive-per-il-2026.html)
- [Il Sole 24 Ore – Acconti al 50% anche per forfettari](https://www.ilsole24ore.com/art/partite-iva-acconti-ridotti-50percento-anche-forfettari-e-minimi-ACn36Sy)
- [EC News – Forfettari, scadenze di versamento](https://www.ecnews.it/fiscale/in-pratica/guida-agli-adempimenti/contribuenti-forfettari-le-scadenze-di-versamento-delle-imposte/)
- [Fiscozen – Contributi INPS nel forfettario](https://www.fiscozen.it/guide/regime-forfettario-contributi-inps/)
