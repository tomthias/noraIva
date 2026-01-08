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
- **Constants** (`src/constants/fiscali.ts`): 2025 tax parameters (78% profitability coefficient, 26.07% INPS, 5% substitute tax)
- **Calculations** (`src/utils/calcoliFisco.ts`): Pure functions implementing Italian tax formulas - all calculations derive from constants
- **State** (`src/hooks/useSupabaseCashFlow.ts`): Central hook managing invoice CRUD + Supabase persistence
- **Storage** (`src/utils/storage.ts`): localStorage wrapper for local data (descriptions, etc.)

### Tax Calculation Chain

```
Invoiced Amount → × 78% → Gross Taxable Income
                  → × 26.07% → INPS Contributions
Gross Income - INPS → Net Taxable Income → × 5% → Substitute Tax
Invoiced - (INPS + Tax) → Net Annual
```

### Components

- `RiepilogoCard`: Annual summary with all fiscal values
- `NettoDisponibile`: "How much can I withdraw" card - CRITICAL fiscal logic here
- `TabellaFatture`: Invoice list with inline editing
- `FormFattura`: Add/edit invoice form
- `ScenarioSimulator`: Simulate adding hypothetical invoices

### Test Pattern

Tests in `tests/` verify fiscal calculations with known values. Use `toBeCloseTo()` for floating-point comparisons.

## Deploy

GitHub Pages via GitHub Actions. Push to `main` triggers: test → build → deploy. Base path configured as `/noraIva/` in `vite.config.ts`.

---

## CRITICAL: Italian Tax System Rules (Regime Forfettario)

**READ THIS BEFORE MODIFYING ANY FISCAL CALCULATION CODE.**

### The Advance Payment System (Sistema degli Acconti)

In Italy, taxes are paid with a **1-year delay** using an advance payment system:

```
Year N taxes are paid in Year N+1:
- June N+1: Saldo Year N (balance) + 1° Acconto Year N+1 (40% of Year N taxes)
- November N+1: 2° Acconto Year N+1 (60% of Year N taxes)
```

**Example for 2025 taxes (12,258€):**
- June 2026: Saldo 2025 + 1° Acconto 2026 (40% × 12,258 = 4,903€)
- November 2026: 2° Acconto 2026 (60% × 12,258 = 7,355€)

### "Totale da Tenere da Parte" Calculation

When viewing Year N, the user needs to set aside money for:

1. **Current Year Deadlines** (based on Year N-1 taxes):
   - Saldo Year N-1 (if not already paid)
   - 1° Acconto Year N (40% of Year N-1 taxes)
   - 2° Acconto Year N (60% of Year N-1 taxes)
   - MINUS taxes already paid in Year N

2. **Next Year Projection** (based on Year N taxes):
   - Saldo Year N (Year N taxes - advances paid in Year N)
   - 1° Acconto Year N+1 (40% of Year N taxes)

```
totaleDaAccantonare = scadenzeAnnoCorrente + proiezioneAnnoProssimo
```

### "Netto Prelevabile Sicuro" Calculation

This shows how much the user can safely withdraw:

```
nettoSicuro = cashDisponibileReale - totaleDaAccantonare
```

**CRITICAL**: `cashDisponibileReale` MUST include:
- All invoiced amounts (fatturato)
- All extra income (entrate)
- **Saldo Iniziale** (initial bank balance) - DO NOT EXCLUDE THIS
- Minus withdrawals (prelievi)
- Minus expenses (uscite)

### Common Mistakes to AVOID

1. **DO NOT use fallback logic for advances**: Never calculate next year's advance based on previous year's taxes when current year has no invoices. This causes huge jumps when the first invoice is added.

   ```typescript
   // WRONG - causes discontinuity
   const acconto = tasseCorrenti > 0 ? tasseCorrenti * 0.4 : tassePrecedenti * 0.4;

   // CORRECT - always use current year
   const acconto = tasseCorrenti * 0.4;
   ```

2. **DO NOT exclude Saldo Iniziale from cash calculations**: The initial bank balance is real money that's available.

3. **DO NOT forget current year deadlines**: When showing "Totale da Tenere da Parte", include BOTH current year deadlines AND next year projection.

4. **Year filtering matters**: When filtering by year, be careful about:
   - Cumulative data (all years up to selected) vs single year data
   - Advances are based on PREVIOUS year taxes
   - Saldo is the difference between actual taxes and advances paid

### Key Files for Fiscal Logic

- `src/components/NettoDisponibile.tsx`: Main fiscal calculations for dashboard
- `src/components/analisi/Analisi.tsx`: Analytics page calculations (should mirror NettoDisponibile)
- `src/utils/calcoliFisco.ts`: Pure calculation functions

### Testing Fiscal Changes

When modifying fiscal calculations:

1. Test with multiple scenarios:
   - Year with invoices and all taxes paid
   - Year with invoices and no taxes paid yet
   - Year with NO invoices (but previous year had invoices)
   - Adding first invoice to an empty year

2. Verify the math manually:
   - Calculate expected values by hand
   - Compare with app output
   - Check year transitions don't cause jumps

3. Test year switching:
   - Values should be consistent when switching between years
   - No sudden jumps when adding/removing single invoices
