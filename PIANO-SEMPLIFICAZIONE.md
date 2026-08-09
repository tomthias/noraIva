# Piano di semplificazione — noraIva

> Documento da dare a Claude Code come brief di refactor. Va letto INSIEME a
> `CLAUDE.md` (che resta valido per le regole fiscali) e aggiornato man mano
> che le fasi vengono completate.

## 0. Contesto e obiettivo

L'app serve a UNA cosa: rispondere a **"quanto netto posso prelevare adesso
dal conto BBVA senza mangiarmi i soldi delle tasse"**. Tutto il resto
(grafici, analisi, simulatore) è contorno.

Oggi l'utente ha:

- **Fiscozen** (abbonamento): fatturazione, controllo limite 85k, stima tasse.
  È già la fonte di verità fiscale "ufficiale".
- **BBVA**: unico conto dove entrano le fatture e dove si accantonano le
  tasse. Rende il 2,1% sulla liquidità. Esporta i movimenti in Excel.
- **Questa app**: calcola il netto prelevabile. È l'unica delle tre a farlo.

### Diagnosi della complessità attuale

La complessità dell'app è di due tipi, e vanno trattati in modo opposto:

1. **Complessità essenziale** — il sistema saldo/acconti italiano
   (`calcolaAccantonamento()` in `calcoliFisco.ts`). Questa è complessità del
   dominio, non del codice: il codice è corretto, centralizzato, testato
   (`tests/accantonamento.test.ts`). **NON va toccata se non nei punti
   indicati in questo piano.** Fiscozen dà stime annuali a intervallo ("nel
   2026 pagherai tra 4.600 e 5.200 €") ma NON la ripartizione per scadenza
   (giugno/novembre) né la proiezione al netto dei versamenti: per sapere
   quanto tenere da parte OGGI serve il motore interno.

2. **Complessità accidentale** — la ricostruzione manuale della realtà:
   - il cash reale è ricostruito dal basso (saldo iniziale + entrate − uscite
     − prelievi inseriti a mano), con casi speciali fragili: categoria "Saldo
     Iniziale" (con warning se ce n'è più d'uno), categoria "Fatture" esclusa
     dalle entrate, flag `escludiDaGrafico`, tre tabelle separate
     (prelievi/uscite/entrate) con macchinario di conversione tra tipi;
   - le fatture vengono inserite due volte (in Fiscozen e nell'app), con il
     rischio data-emissione vs data-incasso che ha reso necessario il
     meccanismo delle rettifiche;
   - le rettifiche vivono in localStorage (legate al browser, non
     sincronizzate).

   **Questa va eliminata.** L'export BBVA contiene la colonna "Disponibile"
   (saldo progressivo dopo ogni movimento): la banca sa già quanto c'è sul
   conto, non serve ricostruirlo.

### Valutazione della proposta "top-down" (Gemini)

Direzione giusta, tre correzioni:

- ✅ Giusto: il saldo BBVA come fonte di verità del cash; gli interessi 2,1%
  non vanno previsti, arrivano da soli come accredito mensile; il cuscinetto
  di emergenza configurabile è una buona idea.
- ❌ Sbagliato eliminare il motore fiscale: le stime Fiscozen sono intervalli
  annuali, senza ripartizione per scadenza né scomputo dei versamenti. Il
  motore resta; Fiscozen diventa un **check di verifica**, non un sostituto
  (vedi Fase 3).
- ❌ Sbagliato "non tracciare i movimenti": con l'import Excel il tracciamento
  costa zero e alimenta le analisi (stipendio medio, categorie di spesa,
  interessi maturati) che l'utente usa. Gemini non sapeva della colonna
  "Disponibile" né dell'export mensile.
- ⚠️ La formula `Netto = Saldo BBVA − Debito fiscale` è giusta ma il debito
  fiscale deve includere anche la proiezione dell'anno prossimo (saldo anno
  corrente + 1° acconto), come l'app già fa.

### Principio guida del refactor

> **La banca dice quanto c'è. Fiscozen dice quanto è giusto. L'app dice
> quanto puoi prelevare.**

---

## 1. Vincoli NON negoziabili

1. **Nessuna perdita di dati.** I dati Supabase attuali sono corretti. Ogni
   migrazione è additiva: si COPIA, non si sposta; le tabelle vecchie restano
   finché la verifica non è completata. Prima di ogni fase con migrazioni:
   `node scripts/backup-database.mjs`.
2. **I test fiscali restano verdi.** `tests/accantonamento.test.ts`,
   `calcoliFisco.test.ts` ecc. Si aggiornano solo consapevolmente, mai per
   "far passare" una modifica.
3. **Le regole di CLAUDE.md restano valide**: principio di cassa, acconti
   INPS ≠ acconti imposta, niente fallback sugli acconti, getter per anno.
4. Ogni fase si chiude con: lint + test verdi, verifica manuale dei numeri in
   dashboard, commit. Fasi piccole e rilasciabili singolarmente.

---

## 2. Fase 1 — Fondamenta dati (Supabase)

Obiettivo: un modello dati pronto per l'import e sincronizzato tra dispositivi.

### 2.1 Tabella unificata `movimenti`

Sostituisce nel tempo `prelievi`, `uscite`, `entrate` (che oggi obbligano al
macchinario `convertiTipoMovimento`):

```sql
CREATE TABLE public.movimenti (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  data DATE NOT NULL,                    -- data valuta
  descrizione TEXT NOT NULL,
  categoria TEXT,                        -- es. 'Stipendio', 'Tasse - Acconto', 'Interessi BBVA', 'Incasso fattura', ...
  importo DECIMAL(12,2) NOT NULL,        -- CON SEGNO: entrate >0, uscite <0
  fonte TEXT NOT NULL DEFAULT 'manuale', -- 'manuale' | 'import_bbva'
  import_hash TEXT,                      -- per il dedup (vedi Fase 2); UNIQUE(user_id, import_hash)
  saldo_dopo DECIMAL(12,2),              -- colonna "Disponibile" dell'export, se da import
  escludi_da_grafico BOOLEAN DEFAULT false,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- + RLS identiche alle tabelle esistenti + indici su (user_id, data)
```

Migrazione (script `scripts/migra-movimenti-unificati.mjs`):
- copia `entrate` → `movimenti` con importo positivo;
- copia `uscite` e `prelievi` → `movimenti` con importo negativo
  (i prelievi con categoria `'Stipendio'`);
- il movimento "Saldo Iniziale" viene copiato con categoria `'Saldo Iniziale'`
  (servirà solo finché il saldo non sarà ancorato all'import, poi diventa
  storico);
- **verifica obbligatoria**: somma per anno e per categoria identica tra
  vecchie tabelle e nuova, stampata a confronto; la migrazione fallisce se
  diverge di 1 centesimo.
- Le tabelle vecchie NON si eliminano in questa fase.

### 2.2 Tabelle di supporto

```sql
-- rettifiche: escono da localStorage, si sincronizzano
CREATE TABLE public.rettifiche_incassi (
  user_id UUID ..., anno INT NOT NULL, importo DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (user_id, anno)
);

-- stime Fiscozen per il check di verifica (Fase 3)
CREATE TABLE public.stime_fiscozen (
  user_id UUID ..., anno_pagamento INT NOT NULL,   -- "nel 2026 pagherai..."
  tasse_min DECIMAL(12,2), tasse_max DECIMAL(12,2),
  incassato_dichiarato DECIMAL(12,2),              -- "I tuoi incassi" da Fiscozen (es. 52.924 per il 2026)
  aggiornato_il DATE,
  PRIMARY KEY (user_id, anno_pagamento)
);

-- regole di categorizzazione apprese dall'import (Fase 2)
CREATE TABLE public.regole_categorie (
  user_id UUID ..., pattern TEXT NOT NULL,   -- match case-insensitive su "Parola chiave" o descrizione
  categoria TEXT NOT NULL,
  PRIMARY KEY (user_id, pattern)
);
```

Migrare i valori attuali: rettifica 2026 = 8.460 € (da
`RETTIFICHE_INCASSI_INIZIALI`); seed stime Fiscozen dai dati reali di oggi:
anno_pagamento 2026 → 4.600–5.200, anno_pagamento 2027 → 12.600–14.000,
incassato 2026 → 52.924.

### 2.3 Adeguamento hook

`useSupabaseCashFlow` legge da `movimenti` (un solo CRUD invece di tre +
conversione). Espone gli stessi dati derivati di oggi per non rompere i
componenti: `prelievi` = movimenti categoria Stipendio, ecc. Rimuovere
`convertiTipoMovimento` (con la tabella unica cambiare tipo = cambiare
categoria/segno).

**Chiusura fase**: dashboard identica a prima della migrazione (stessi numeri
al centesimo), test verdi.

---

## 3. Fase 2 — Import Excel BBVA (cuore del refactor)

Obiettivo: l'inserimento manuale diventa l'eccezione. Una volta al mese si
trascina l'Excel e l'app si aggiorna da sola.

### 3.1 Specifica del formato (verificata sull'export reale del 08/08/2026)

- Un foglio, nome tipo `Informe BBVA 73 10`. Intestazione alla **riga 5**,
  dati dalla riga 6. Colonne (A vuota):
  | Col | Campo | Note |
  |---|---|---|
  | B | Data valuta | `dd/mm/yyyy` — **usare questa come `data`** |
  | C | Data | data contabile, può essere futura; ignorare |
  | D | Parola chiave | tipo operazione BBVA (es. "Bonifico ricevuto") |
  | E | Movimento | descrizione libera (può essere vuota) |
  | F | Importo | con segno, numero |
  | G | Valuta | sempre EUR |
  | H | Disponibile | **saldo dopo il movimento** — l'oro di questo export |
  | I | Valuta | EUR |
  | J | Osservazioni | descrizione estesa |
- Righe ordinate dalla più recente alla più vecchia.
- Parsing nel browser con SheetJS (`xlsx`), nessun backend.
- Essere tolleranti: individuare la riga di intestazione cercando la cella
  "Data valuta" (non hardcodare la riga 5), ignorare righe senza importo.

### 3.2 Dedup (gli export mensili si sovrappongono)

`import_hash = sha256(dataValuta | importo | disponibile | osservazioni)`.
Vincolo `UNIQUE(user_id, import_hash)`: un movimento già importato viene
saltato in silenzio e conteggiato nel report finale ("12 nuovi, 56 già
presenti"). Il campo `disponibile` nell'hash distingue anche due movimenti
identici nello stesso giorno.

### 3.3 Categorizzazione automatica (regole base + apprendimento)

Ordine di applicazione:
1. regole utente da `regole_categorie` (vincono sempre);
2. regole predefinite:
   - `Parola chiave` contiene `Liquidazione interessi` → **Interessi BBVA** (entrata);
   - `Pagamento imposte`, o descrizione/osservazioni contengono `F24`,
     `tasse`, `imposte` → **Tasse** (proporre la sottocategoria per periodo:
     giugno/luglio → `Tasse - Saldo` + `Tasse - Acconto`, novembre →
     `Tasse - Acconto`; l'utente conferma nell'anteprima — le categorie
     Saldo/Acconto pilotano `sommaTassePagate()`, la precisione qui conta);
   - `Bonifico eseguito` + descrizione contiene `stipendio` → **Stipendio**;
   - `Bonifico ricevuto` + descrizione contiene `fattura|ft |ft-|saldo` →
     **Incasso fattura** (vedi 3.5);
   - importo negativo, nessun match → **Spese** (generica);
   - importo positivo, nessun match → **Entrata** (generica).
3. Nell'anteprima ogni correzione manuale della categoria propone: "applica
   sempre a movimenti simili?" → salva in `regole_categorie`.

### 3.4 UI di import

Nuova sezione "Import" nella sidebar:
1. drag & drop del file;
2. **anteprima tabellare**: ogni riga con categoria proposta (modificabile),
   badge "duplicato" per le righe che verranno saltate;
3. conferma → insert batch;
4. report: n nuovi, n saltati, intervallo date coperto, **saldo BBVA
   aggiornato a X €** (dal `Disponibile` del movimento più recente).

### 3.5 Incassi fatture: chiude il cerchio del principio di cassa

I bonifici ricevuti classificati "Incasso fattura" alimentano la tabella
`fatture` con **data = data valuta del bonifico** (data di incasso per
costruzione, mai più errori emissione/incasso). Nell'anteprima l'utente
completa cliente/descrizione (l'export non li contiene) o collega il bonifico
a una fattura già registrata invece di crearne una nuova. Conseguenza: il
meccanismo delle rettifiche serve sempre meno, resta solo per gli anni
storici.

### 3.6 Il saldo BBVA diventa la fonte di verità del cash

In `calcoliFisco.ts` (o nuovo `utils/saldoBanca.ts`):

```
saldoBBVA = saldo_dopo del movimento importato più recente
cashDisponibileReale = saldoBBVA
                     + somma dei movimenti MANUALI con data > dataUltimoImport
```

- Il vecchio calcolo bottom-up (saldo iniziale + tutti i movimenti) resta
  come **riconciliazione**: se diverge dal saldo BBVA oltre 1 €, la dashboard
  mostra "Scostamento di X € rispetto alla banca" con la scomposizione già
  esistente (`dettaglioCash`) per capire quale voce manca.
- Con l'ancora al saldo BBVA spariscono: i warning sul doppio "Saldo
  Iniziale", la dipendenza dal non dimenticare movimenti, l'ansia da numero
  sbagliato. Un movimento dimenticato al massimo sposta la riconciliazione,
  non il netto prelevabile.

**Chiusura fase**: importare l'export reale di agosto due volte di fila →
la seconda volta 0 nuovi movimenti; saldo mostrato = 25.855,97 € (valore
reale dell'export di prova); test del parser con fixture copiata dal file
reale (anonimizzata).

---

## 4. Fase 3 — Fiscozen come verifica, cuscinetto, interessi

### 4.1 Fiscozen = check, non override

Il motore interno resta l'unico percorso di calcolo (niente doppi rami di
logica). Le stime Fiscozen inserite dall'utente (`stime_fiscozen`, form
minimale: 4 numeri l'anno) vengono usate per una **spia di coerenza** in
dashboard:

- confronto A: `scadenzeAnnoCorrente + accontiVersatiNellAnno` (cioè il
  totale dovuto nell'anno secondo l'app) dentro l'intervallo "nel 2026
  pagherai 4.600–5.200"? → ✓ verde / ⚠ ambra con delta;
- confronto B: `saldoAnnoCorrente + primoAccontoAnnoProssimo +
  secondoAccontoAnnoProssimo` dentro l'intervallo "nel 2027 pagherai
  12.600–14.000"? (⚠ ATTENZIONE: l'intervallo Fiscozen dell'anno prossimo
  include ANCHE il 2° acconto di novembre, che il "totale da tenere da
  parte" dell'app esclude di proposito — confrontare grandezze omogenee);
- confronto C: `incassiAnnoCorrente` dell'app vs `incassato_dichiarato`
  Fiscozen (52.924) → se divergono, quasi certamente manca un incasso o una
  rettifica: è il check più utile di tutti.

Se una spia è rossa, il numero sbagliato è quasi sempre nei DATI (una
fattura non registrata, una categoria tasse errata), non nel motore: la UI
deve dire questo, con link alla sezione giusta.

### 4.2 Cuscinetto di emergenza (da Gemini, buona idea)

Nuovo parametro utente `cuscinetto` (default 0, salvato in Supabase in una
piccola tabella `preferenze` o colonna in `stime_fiscozen`… scelta
implementativa libera, purché sincronizzato):

```
nettoSicuro = cashDisponibileReale − totaleDaAccantonare − cuscinetto
```

In dashboard il cuscinetto appare come riga nella scomposizione.

### 4.3 Interessi BBVA

Nessuna previsione. Gli accrediti mensili arrivano dall'import (categoria
`Interessi BBVA`) e la sezione Analisi mostra "interessi maturati quest'anno"
(somma della categoria). Facoltativo: nota informativa "≈ 2,1% lordo sulla
liquidità" senza alcun calcolo previsionale.

---

## 5. Fase 4 — Dieta della UI

- **Dashboard** (unica schermata che conta, ordine dall'alto):
  1. hero "Netto prelevabile sicuro" (invariato ma alimentato dal saldo BBVA,
     con riga cuscinetto e data ultimo import: "saldo BBVA al 08/08/2026");
  2. spie di coerenza Fiscozen (Fase 3);
  3. stato accantonamento (invariato);
  4. riconciliazione (solo se c'è scostamento).
- **Fatture**: resta, ma alimentata principalmente dall'import (3.5);
  l'inserimento manuale rimane per i casi limite.
- **Movimenti**: diventa in sola lettura/correzione, non più inserimento
  primario. Sparisce la conversione tra tipi.
- **Import**: nuova sezione (Fase 2).
- **Analisi**: invariata nei contenuti; verificare che consumi la tabella
  `movimenti` e la stessa `calcolaAccantonamento()` (regola CLAUDE.md).
- **Simulatore**: resta (è piccolo e utile).
- Da RIMUOVERE una volta stabile l'ancora al saldo: warning multi-saldo
  iniziale, logica speciale categoria "Fatture" nelle entrate (con la tabella
  unica gli incassi fattura sono movimenti categoria `Incasso fattura`,
  esclusi dal cash-bottom-up in un unico punto documentato).
- Aggiornare `CLAUDE.md`: sezione nuova su import BBVA e ancora del saldo;
  la sezione rettifiche va marcata come "meccanismo legacy per anni storici".

---

## 6. Fase 5 — Test e verifica finale

1. Test nuovi: parser BBVA (fixture reale), dedup su import ripetuto,
   regole di categorizzazione, ancora del saldo + movimenti manuali
   successivi, spie Fiscozen (dentro/fuori intervallo, grandezze omogenee).
2. Test esistenti: tutti verdi senza modifiche ai valori attesi fiscali.
3. Verifica end-to-end a mano (obbligatoria, con i dati reali):
   - il netto prelevabile prima/dopo il refactor deve essere spiegabile
     voce per voce (non necessariamente identico: l'ancora al saldo BBVA
     può correggere errori del bottom-up — ogni differenza va motivata);
   - import dell'Excel di agosto → saldo 25.855,97 €, interessi luglio
     28,87 € in categoria Interessi, "Tasse luglio" 6.961,24 € proposta
     come categoria Tasse;
   - scenario CLAUDE.md n.4 (prima fattura in anno vuoto, nessun salto).
4. Solo a questo punto, in un commit separato e reversibile: deprecare le
   tabelle `prelievi`/`uscite`/`entrate` (rinominare con suffisso `_legacy`,
   NON eliminare).

---

## 7. Ordine di esecuzione e note per Claude Code

| Fase | Contenuto | Rischio dati | Rilasciabile da sola |
|---|---|---|---|
| 1 | Tabella `movimenti` + migrazione + rettifiche su Supabase | medio (mitigato: copia + verifica) | sì |
| 2 | Import BBVA + dedup + ancora saldo | basso (solo additivo) | sì |
| 3 | Spie Fiscozen + cuscinetto + interessi | nullo | sì |
| 4 | Dieta UI + aggiornamento CLAUDE.md | nullo | sì |
| 5 | Test finali + deprecazione tabelle legacy | basso | sì |

- Prima di iniziare QUALSIASI fase: `node scripts/backup-database.mjs`.
- Una fase per sessione di lavoro; commit atomici; mai mischiare migrazione
  dati e refactor UI nello stesso commit.
- In caso di dubbio su una regola fiscale: fa fede `CLAUDE.md`, poi i test.
  Mai "sistemare" un test fiscale per far passare il codice.
