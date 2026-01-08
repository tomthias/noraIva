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
| INPS Gestione Separata | 26.07% | Social security contribution |
| Imposta Sostitutiva | 5% | Flat tax (startup rate, first 5 years) |
| Imposta Sostitutiva | 15% | Flat tax (standard rate after 5 years) |

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

**Imposta Sostitutiva (Substitute Tax):**
- 1° Acconto: **40%** of previous year's tax (June)
- 2° Acconto: **60%** of previous year's tax (November)
- Total: 100%

**INPS Gestione Separata:**
- 1° Acconto: **40%** of previous year's contribution (June)
- 2° Acconto: **40%** of previous year's contribution (November)
- Total: 80%

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
| `src/components/NettoDisponibile.tsx` | Main fiscal calculations for dashboard |
| `src/components/analisi/Analisi.tsx` | Analytics page (should mirror NettoDisponibile) |
| `src/utils/calcoliFisco.ts` | Pure calculation functions |
| `src/constants/fiscali.ts` | Tax rates and parameters |

---

## Testing Fiscal Changes

### Mandatory Test Scenarios

1. **Year with invoices, all taxes paid**: Verify totale da tenere da parte shows only next year projection
2. **Year with invoices, no taxes paid yet**: Verify includes full current year deadlines
3. **Year with NO invoices** (but previous year had invoices): Verify current year deadlines are still shown
4. **Adding first invoice to empty year**: Verify NO sudden jumps in calculations
5. **Year switching**: Values should be consistent, no discontinuities

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
