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
- **State** (`src/hooks/useFatture.ts`): Central hook managing invoice CRUD + localStorage persistence
- **Storage** (`src/utils/storage.ts`): localStorage wrapper with key `fatture-mattia-2025`

### Tax Calculation Chain

```
Invoiced Amount → × 78% → Gross Taxable Income
                  → × 26.07% → INPS Contributions
Gross Income - INPS → Net Taxable Income → × 5% → Substitute Tax
Invoiced - (INPS + Tax) → Net Annual
```

### Components

- `RiepilogoCard`: Annual summary with all fiscal values
- `NettoDisponibile`: "How much can I withdraw" card
- `TabellaFatture`: Invoice list with inline editing
- `FormFattura`: Add/edit invoice form
- `ScenarioSimulator`: Simulate adding hypothetical invoices

### Test Pattern

Tests in `tests/` verify fiscal calculations with known values. Use `toBeCloseTo()` for floating-point comparisons.

## Deploy

GitHub Pages via GitHub Actions. Push to `main` triggers: test → build → deploy. Base path configured as `/noraIva/` in `vite.config.ts`.
