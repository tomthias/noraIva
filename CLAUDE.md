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

- **Types** (`src/types/fattura.ts`): `Fattura`, `RiepilogoFattura`, `RiepilogoAnnuale` interfaces
- **Constants** (`src/constants/fiscali.ts`): Tax parameters (78% profitability coefficient, 26.07% INPS, 5% substitute tax)
- **Calculations** (`src/utils/calcoliFisco.ts`): Pure functions implementing Italian tax formulas
- **State** (`src/hooks/useSupabaseCashFlow.ts`): Central hook managing invoice CRUD + Supabase persistence
- **Storage** (`src/utils/storage.ts`): localStorage wrapper for local data (descriptions, etc.)

### Components

- `RiepilogoCard`: Annual summary with all fiscal values
- `NettoDisponibile`: "How much can I withdraw" card - **CRITICAL fiscal logic here**
- `TabellaFatture`: Invoice list with inline editing
- `FormFattura`: Add/edit invoice form
- `ScenarioSimulator`: Simulate adding hypothetical invoices

### Test Pattern

Tests in `tests/` verify fiscal calculations with known values. Use `toBeCloseTo()` for floating-point comparisons.

## Deploy

GitHub Pages via GitHub Actions. Push to `main` triggers: test → build → deploy. Base path configured as `/noraIva/` in `vite.config.ts`.

---

# CRITICAL: Italian Tax System - Regime Forfettario

**⚠️ READ THIS ENTIRE SECTION BEFORE MODIFYING ANY FISCAL CALCULATION CODE ⚠️**

## Overview

This app is for Italian freelancers under the "Regime Forfettario" (flat-rate tax regime). The tax system is complex because taxes are paid with a **1-year delay** using **advances (acconti)**.

## Tax Parameters (from `constants/fiscali.ts`)

| Parameter | Value | Description |
|-----------|-------|-------------|
| Coefficiente Redditività | 78% | For ATECO 74.12.01 (graphic design) |
| INPS Gestione Separata | 26.07% | 2024–2026 (25% IVS + 0.72% maternità/ANF + 0.35% ISCRO) |
| Imposta Sostitutiva | 5% | Startup rate — periodi d'imposta **2022–2026** |
| Imposta Sostitutiva | 15% | Standard rate — **dal 2027** |

**⚠️ Le aliquote NON sono costanti globali.** Attività iniziata il **23/06/2022**, quindi
il 5% copre i primi 5 periodi d'imposta (2022–2026) e dal 2027 diventa 15%.
Usa SEMPRE i getter di `constants/fiscali.ts`, mai i valori nudi:

```ts
getAliquotaSostitutiva(anno)  // 0.05 fino al 2026, 0.15 dal 2027
getAliquotaInps(anno)         // per anno, con fallback stimato sugli anni futuri
aliquoteStimate(anno)         // true se l'aliquota INPS di quell'anno è una stima
```

Tutte le funzioni di `calcoliFisco.ts` accettano un parametro `anno`.
La Gestione Separata **non ha minimale** per i professionisti, e il massimale
(122.295 € nel 2026) è sopra il tetto forfettario di 85.000 €: mai vincolante.

## ⚠️ PRINCIPIO DI CASSA — `Fattura.data` è la data di INCASSO

Il regime forfettario tassa **per cassa**: contano i compensi *percepiti*
nell'anno, non le fatture *emesse*. Vale sia per il reddito imponibile sia per
il limite degli 85.000 € (confermato dall'Agenzia delle Entrate, Telefisco
18/09/2025: una fattura emessa a dicembre e incassata a gennaio conta nell'anno
dell'incasso).

**Convenzione di questa app**: il campo `data` di `Fattura` contiene la data di
**incasso**, non di emissione. Tutti i filtri per anno (tasse, acconti, limite
85k, grafici) si basano su quel campo. La UI lo dice esplicitamente: il form
mostra "Data incasso" con la spiegazione, e la tabella ha la stessa intestazione.

Conseguenza pratica: il fatturato mostrato dall'app coincide con gli **incassi**
del gestionale del commercialista, non con il suo "fatturato emesso". Se i due
numeri divergono, quasi certamente una fattura è stata registrata con la data
sbagliata.

Non esiste (per scelta) un campo separato per la data di emissione: se in futuro
servisse, va aggiunta una colonna `data_emissione` lasciando `data` come incasso,
mai il contrario.

### Override degli incassi annuali

Quando le fatture registrate non rispecchiano l'incassato reale (date sbagliate,
o anni non presenti in database), l'incassato di un anno si può **dichiarare a
mano** da Dashboard → card "Incassi" → matita.

- Storage: `localStorage` (`incassi-override`), gestito da `utils/storage.ts`.
  **Legato al browser, non sincronizzato.** Se serve su più dispositivi va
  spostato su Supabase in una tabella `incassi_annuali`.
- L'override sostituisce l'imponibile **solo ai fini fiscali** (tasse, acconti,
  limite 85k). Il **cash disponibile continua a derivare dai movimenti reali**:
  dichiarare un incasso diverso non fa comparire soldi sul conto.
- È per anno, quindi vale anche per l'anno precedente: è così che si alimentano
  gli acconti quando le fatture dell'anno prima non ci sono.
- `incassiOverride[anno] === 0` è un valore valido, non "assente".

## Tax Calculation Formula

```
Fatturato (Invoiced) × 78% = Reddito Imponibile Lordo (Gross Taxable Income)
Reddito Imponibile × 26.07% = Contributi INPS
Reddito Imponibile - INPS = Reddito Imponibile Netto
Reddito Netto × 5% = Imposta Sostitutiva
TASSE TOTALI = INPS + Imposta Sostitutiva
```

**Example with 10,000€ invoiced:**
```
10,000 × 78% = 7,800€ (reddito imponibile)
7,800 × 26.07% = 2,033.46€ (INPS)
7,800 - 2,033.46 = 5,766.54€ (reddito netto)
5,766.54 × 5% = 288.33€ (imposta sostitutiva)
TOTALE TASSE = 2,033.46 + 288.33 = 2,321.79€
```

---

## The Advance Payment System (Sistema Saldo e Acconti)

### Core Concept

In Italy, you pay taxes for Year N in Year N+1, using this system:

1. **Saldo (Balance)**: The remaining taxes for Year N (after subtracting advances already paid)
2. **Acconti (Advances)**: Prepayments for Year N+1 (calculated on Year N taxes)

### Timeline

```
YEAR N (e.g., 2025):
├── You invoice clients and earn income
├── June: Pay Saldo N-1 + 1° Acconto N (based on Year N-1 taxes)
└── November: Pay 2° Acconto N (based on Year N-1 taxes)

YEAR N+1 (e.g., 2026):
├── June: Pay Saldo N + 1° Acconto N+1 (based on Year N taxes)
└── November: Pay 2° Acconto N+1 (based on Year N taxes)
```

### Advance Percentages

**Imposta Sostitutiva (Substitute Tax) — total 100%:**
- 1° Acconto: **40%** of previous year's tax (June)
- 2° Acconto: **60%** of previous year's tax (November)
- Soglie: sotto **51,65 €** nessun acconto; fra 51,65 € e **257,52 €** unica rata a novembre

**INPS Gestione Separata — total 80%:**
- 1° Acconto: **40%** of previous year's contribution (June)
- 2° Acconto: **40%** of previous year's contribution (November)

**⚠️ I due tributi hanno acconti DIVERSI.** Applicare 40%/60% al *totale* delle tasse
sovrastima l'acconto INPS del 20%. Usa `calcolaAccontiInps()` e `calcolaAccontiImposta()`
di `calcoliFisco.ts`, mai una percentuale sul totale.

### How Saldo (Balance) is Calculated

```
Saldo Anno N = Tasse Dovute Anno N - Acconti Versati Anno N

Where:
- Tasse Dovute Anno N = actual taxes based on Year N income
- Acconti Versati Anno N = advances paid during Year N (based on Year N-1)
```

**Key insight**: If you earned MORE in Year N than Year N-1, your saldo will be positive (you owe money). If you earned LESS, your saldo could be zero or negative (credit).

### Concrete Example

**Year 2025:** Invoiced 52,796€ → Taxes due: 12,258€

**June 2025 payment:**
- Saldo 2024: (2024 taxes - 2024 advances paid)
- 1° Acconto 2025: 40% × 2024 taxes (let's say 2024 taxes were 11,850€ → 4,740€)

**November 2025 payment:**
- 2° Acconto 2025: 60% × 2024 taxes = 7,110€

**Total advances paid in 2025:** 4,740 + 7,110 = 11,850€ (based on 2024)

**June 2026 payment:**
- Saldo 2025: 12,258€ - 11,850€ = **408€** (taxes 2025 - advances paid)
- 1° Acconto 2026: 40% × 12,258€ = **4,903€**

**November 2026 payment:**
- 2° Acconto 2026: 60% × 12,258€ = **7,355€**

---

## Calculating "Totale da Tenere da Parte"

When viewing Year N, the user needs to set aside money for:

### 1. Current Year Deadlines (Scadenze Anno Corrente)

Based on **Year N-1 taxes**, due to be paid in Year N:

```
scadenzeAnnoCorrente =
    saldoAnnoPrecedente           // Year N-1 taxes minus advances paid in N-1
  + primoAccontoAnnoCorrente      // 40% of Year N-1 taxes
  + secondoAccontoAnnoCorrente    // 60% of Year N-1 taxes
  - accontiGiaVersatiAnnoCorrente // Taxes already paid this year
```

### 2. Next Year Projection (Proiezione Anno Prossimo)

Based on **Year N taxes** (current year), to be paid in Year N+1:

```
proiezioneAnnoProssimo =
    saldoAnnoCorrente        // Year N taxes minus advances that WILL BE paid in N
  + primoAccontoAnnoProssimo // 40% of Year N taxes
```

### 3. Total to Set Aside

```
totaleDaAccantonare = scadenzeAnnoCorrente + proiezioneAnnoProssimo
```

---

## Calculating "Netto Prelevabile Sicuro"

This shows how much the user can safely withdraw:

```
nettoSicuro = cashDisponibileReale - totaleDaAccantonare
```

### CRITICAL: What is "Cash Disponibile Reale"?

```
cashDisponibileReale =
    totaleFatturato           // All invoiced amounts
  + totaleEntrate             // Extra income (bonuses, refunds, etc.)
  + saldoIniziale             // Initial bank balance - DO NOT EXCLUDE!
  - totalePrelievi            // Withdrawals (stipends)
  - totaleUscite              // Expenses (including taxes paid)
```

**⚠️ CRITICAL**: The `saldoIniziale` (initial bank balance) MUST be included. This is real money in the bank account!

---

## Common Mistakes to AVOID

### 1. ❌ DO NOT use fallback logic for advances

```typescript
// WRONG - causes huge jumps when adding first invoice
const acconto = tasseCorrenti > 0
  ? tasseCorrenti * 0.4
  : tassePrecedenti * 0.4;

// CORRECT - always use current year taxes (even if 0)
const acconto = tasseCorrenti * 0.4;
```

**Why**: If Year N has no invoices yet, using Year N-1 taxes inflates the "totale da tenere da parte". When you add the first small invoice, the calculation suddenly uses the small current year taxes, causing a massive drop that confuses the user.

### 2. ❌ DO NOT exclude Saldo Iniziale

The initial bank balance is real money. The "Netto Prelevabile Sicuro" must reflect the actual bank account balance.

### 3. ❌ DO NOT forget current year deadlines

The "Totale da Tenere da Parte" must include BOTH:
- Current year deadlines (based on previous year taxes)
- Next year projection (based on current year taxes)

### 4. ❌ DO NOT confuse year filtering

- **Cumulative data**: All years up to selected year (for cash flow)
- **Single year data**: Only selected year (for calculating that year's taxes)
- **Previous year data**: Year N-1 (for calculating advances due in Year N)

---

## Key Files for Fiscal Logic

| File | Purpose |
|------|---------|
| `src/utils/calcoliFisco.ts` | **Unica fonte di verità.** `calcolaAccantonamento()` + funzioni pure |
| `src/constants/fiscali.ts` | Aliquote per anno, percentuali acconto, soglie, limiti |
| `src/components/NettoDisponibile.tsx` | Dashboard: solo presentazione, consuma `calcolaAccantonamento()` |
| `src/components/analisi/Analisi.tsx` | Analisi: consuma la **stessa** funzione |
| `src/components/SogliaForfettario.tsx` | Avviso limiti 85.000 € / 100.000 € |

**⚠️ NON reimplementare la logica di accantonamento nei componenti.** Prima era
copia-incollata fra Dashboard e Analisi e divergeva a ogni modifica (5 commit
consecutivi di "align Analisi with Dashboard"). Ogni cambiamento fiscale va fatto
in `calcolaAccantonamento()` e coperto da `tests/accantonamento.test.ts`.

---

## Testing Fiscal Changes

### Mandatory Test Scenarios

1. **Year with invoices, all taxes paid**: Verify totale da tenere da parte shows only next year projection
2. **Year with invoices, no taxes paid yet**: Verify includes full current year deadlines
3. **Year with NO invoices** (but previous year had invoices): Verify current year deadlines are still shown
4. **Adding first invoice to empty year**: Verify NO sudden jumps in calculations
5. **Year switching**: Values should be consistent, no discontinuities

Questi scenari sono coperti da `tests/accantonamento.test.ts`: se cambi la logica
fiscale, i test devono restare verdi o vanno aggiornati consapevolmente.

### Verification Process

1. Calculate expected values **by hand** first
2. Compare with app output
3. Check that adding/removing small invoices doesn't cause disproportionate changes
4. Test with real-world data if available

---

## Quick Reference: Variable Names

| Variable | Meaning |
|----------|---------|
| `annoSelezionato` | Year N (selected year) |
| `annoPrecedente` | Year N-1 |
| `tasseTeoricheAnnoCorrente` | Taxes calculated on Year N invoices |
| `tasseTeoricheAnnoPrecedente` | Taxes calculated on Year N-1 invoices |
| `saldoAnnoPrecedente` | Year N-1 taxes - advances paid in N-1 |
| `saldoAnnoCorrente` | Year N taxes - advances to be paid in N |
| `primoAccontoAnnoCorrente` | 40% of Year N-1 taxes (due June Year N) |
| `secondoAccontoAnnoCorrente` | 60% of Year N-1 taxes (due Nov Year N) |
| `primoAccontoAnnoProssimo` | 40% of Year N taxes (due June Year N+1) |
| `accontiVersatiNellAnno` | Taxes actually paid in Year N |

---

## Sources

- [QuickFisco - Calcolo acconti Regime Forfettario](https://quickfisco.it/blog/calcolo-acconti-saldo-regime-forfettario-scadenze-esempi/)
- [INPS - Gestione Separata aliquote 2025](https://www.inps.it/it/it/inps-comunica/notizie/dettaglio-news-page.news.2025.01.gestione-separata-le-aliquote-contributive-per-il-2025.html)
- [TaxMan - Scadenze fiscali 2025](https://www.taxmanapp.it/blog/2025/03/12/scadenze-fiscali-2025-liberi-professionisti-in-regime-forfettario/)
- [Regime-Forfettario.it - Versamento acconti](https://www.regime-forfettario.it/versamento-imposta-acconti-regime-forfettario/)
