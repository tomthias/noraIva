# Gestione Fatture - Regime Forfettario 2025

Webapp per gestire le fatture della Partita IVA in regime forfettario e calcolare il netto disponibile.

## Caratteristiche

- Gestione fatture (aggiungi, modifica, elimina)
- Calcolo automatico tasse e contributi secondo regime forfettario
- Riepilogo annuale con tutti i valori fiscali
- Card "Quanto posso ritirare" per vedere il netto disponibile
- Simulatore scenario per prevedere l'impatto di nuove fatture
- Salvataggio locale (localStorage)
- Deploy automatico su GitHub Pages

## Parametri Fiscali (2025)

| Parametro | Valore |
|-----------|--------|
| Coefficiente redditività | 78% (codice ATECO 74.12.01) |
| Contributi INPS GS | 26,07% |
| Imposta sostitutiva | 5% (regime startup) |

## Formule di Calcolo

1. **Reddito Imponibile Lordo** = Fatturato Incassato × 78%
2. **Contributi INPS** = Reddito Imponibile Lordo × 26,07%
3. **Reddito Imponibile Netto** = Reddito Imponibile Lordo - Contributi
4. **Imposta Sostitutiva** = Reddito Imponibile Netto × 5%
5. **Totale Tasse** = Contributi + Imposta
6. **Netto Annuo** = Fatturato Incassato - Totale Tasse

## Sviluppo

```bash
# Installa dipendenze
npm install

# Avvia server di sviluppo
npm run dev

# Esegui test
npm run test

# Build per produzione
npm run build
```

## Deploy

Il deploy su GitHub Pages avviene automaticamente ad ogni push sul branch `main`.

## Tecnologie

- React 19 + TypeScript
- Vite
- Vitest per i test
- GitHub Actions per CI/CD
