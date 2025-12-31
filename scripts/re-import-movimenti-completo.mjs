/**
 * RE-IMPORT COMPLETO DAL CSV ORIGINALE
 *
 * Categorizzazione intelligente:
 * - Giroconti gennaio 2024 → SALDO_INIZIALE (esclusi da grafici)
 * - Bonifici "Saldo fat", "Pagamento fattura" → FATTURE
 * - Bonifici "Stipendio", "Mattia marinangeli" → STIPENDI (→ prelievi)
 * - Bonifici "Tasse" → TASSE (→ uscite)
 * - Altri bonifici ricevuti → categorizza per contenuto
 * - Pagamenti carta, altro → VARIO/SERVIZI/etc
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const USER_ID = process.env.SUPABASE_USER_ID;

const CSV_PATH = '/Users/mattia/Desktop/noraiva conti/nuovo/movimenti.csv';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const stats = {
  entrate: 0,
  uscite: 0,
  prelievi: 0,
  errori: 0,
  saltati: 0,
};

/**
 * Parse importo (gestisce formato italiano con virgola)
 */
function parseImporto(str) {
  const cleaned = str.replace(/[^\d.,-]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

/**
 * Converti data da DD/MM/YYYY a YYYY-MM-DD
 */
function convertiData(ddmmyyyy) {
  const [giorno, mese, anno] = ddmmyyyy.split('/');
  return `${anno}-${mese.padStart(2, '0')}-${giorno.padStart(2, '0')}`;
}

/**
 * Categorizza movimento in base a descrizione e concetto
 */
function categorizzaMovimento(concetto, movimento, importo, data) {
  const desc = (concetto + ' ' + movimento).toLowerCase();

  // SALDO INIZIALE: giroconti gennaio-febbraio 2024
  if (data >= '2024-01-16' && data <= '2024-02-05') {
    if (desc.includes('giroconto') || desc.includes('bonifico giroconto')) {
      return { categoria: 'SALDO_INIZIALE', tipo: 'ENTRATA', escludi: true };
    }
  }

  // ENTRATE
  if (importo > 0) {
    // Pagamenti fatture
    if (desc.includes('saldo fat') ||
        desc.includes('pagamento fat') ||
        desc.includes('pagamento della fattura') ||
        desc.includes('accredito dello stipendio')) {
      return { categoria: 'FATTURE', tipo: 'ENTRATA', escludi: false };
    }

    // Rimborsi
    if (desc.includes('rimborso') || desc.includes('restituzione')) {
      return { categoria: 'RIMBORSI', tipo: 'ENTRATA', escludi: false };
    }

    // Interessi
    if (desc.includes('liquidazione interessi') || desc.includes('interessi')) {
      return { categoria: 'INTERESSI', tipo: 'ENTRATA', escludi: false };
    }

    // Mentoring, formazione
    if (desc.includes('mentoring') || desc.includes('formazione')) {
      return { categoria: 'SERVIZI', tipo: 'ENTRATA', escludi: false };
    }

    // Bonus, cashback
    if (desc.includes('bonus') || desc.includes('cashback')) {
      return { categoria: 'ALTRO', tipo: 'ENTRATA', escludi: false };
    }

    // Vinted, vendite
    if (desc.includes('vinted')) {
      return { categoria: 'ALTRO', tipo: 'ENTRATA', escludi: false };
    }

    // Default entrate
    return { categoria: 'ALTRO', tipo: 'ENTRATA', escludi: false };
  }

  // USCITE
  if (importo < 0) {
    // Stipendi personali
    if (desc.includes('mattia marinangeli') ||
        desc.includes('stipendio') ||
        desc.includes('netto') ||
        desc.includes('prelievo')) {
      return { categoria: 'STIPENDI', tipo: 'USCITA', escludi: false };
    }

    // Tasse
    if (desc.includes('tasse') || desc.includes('imposta')) {
      return { categoria: 'TASSE', tipo: 'USCITA', escludi: false };
    }

    // Affitto
    if (desc.includes('dovevivo') || desc.includes('affitto') || desc.includes('joivy')) {
      return { categoria: 'SERVIZI', tipo: 'USCITA', escludi: false };
    }

    // Psicologa
    if (desc.includes('psico') || desc.includes('consulenza psicologica')) {
      return { categoria: 'SERVIZI', tipo: 'USCITA', escludi: false };
    }

    // Trasporti
    if (desc.includes('autostrada') || desc.includes('pedaggi') || desc.includes('trento sud')) {
      return { categoria: 'AUTOSTRADA', tipo: 'USCITA', escludi: false };
    }

    if (desc.includes('benzina') || desc.includes('q8') || desc.includes('eni')) {
      return { categoria: 'TRASPORTO', tipo: 'USCITA', escludi: false };
    }

    // Investimenti, risparmi
    if (desc.includes('investimenti') || desc.includes('risparmi') || desc.includes('moneyfarm')) {
      return { categoria: 'INVESTIMENTI', tipo: 'USCITA', escludi: false };
    }

    // Software, servizi
    if (desc.includes('software services') || desc.includes('fiscozen') || desc.includes('claude')) {
      return { categoria: 'SERVIZI', tipo: 'USCITA', escludi: false };
    }

    // Default uscite
    return { categoria: 'VARIO', tipo: 'USCITA', escludi: false };
  }

  return null;
}

async function reimportMovimenti() {
  console.log('🔄 RE-IMPORT COMPLETO DAL CSV ORIGINALE\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const csv = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = csv.split(/\r?\n/).filter(l => l.trim());

  console.log(`📄 Trovate ${lines.length - 1} righe nel CSV\n`);

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(',');

    if (parts.length < 5) {
      stats.saltati++;
      continue;
    }

    try {
      const dataValuta = parts[0];
      const data = parts[1];
      const concetto = parts[2];
      const movimento = parts[3];
      const importoStr = parts[4];

      if (!data || !importoStr) {
        stats.saltati++;
        continue;
      }

      const importo = parseImporto(importoStr);
      const dataISO = convertiData(data);
      const descrizione = (movimento || concetto).replace(/"/g, '').trim();

      // Categorizza
      const cat = categorizzaMovimento(concetto, movimento, importo, dataISO);

      if (!cat) {
        stats.saltati++;
        continue;
      }

      // Inserisci nel database
      const importoAbs = Math.abs(importo);

      if (cat.categoria === 'STIPENDI') {
        // → Tabella prelievi
        const { error } = await supabase.from('prelievi').insert({
          user_id: USER_ID,
          data: dataISO,
          descrizione,
          importo: importoAbs,
          escludi_da_grafico: cat.escludi,
        });

        if (error) {
          console.error(`❌ Errore prelievi: ${descrizione}`, error.message);
          stats.errori++;
        } else {
          stats.prelievi++;
        }
      } else if (cat.tipo === 'USCITA') {
        // → Tabella uscite
        const { error } = await supabase.from('uscite').insert({
          user_id: USER_ID,
          data: dataISO,
          descrizione,
          importo: importoAbs,
          categoria: cat.categoria,
          escludi_da_grafico: cat.escludi,
        });

        if (error) {
          console.error(`❌ Errore uscite: ${descrizione}`, error.message);
          stats.errori++;
        } else {
          stats.uscite++;
        }
      } else if (cat.tipo === 'ENTRATA') {
        // → Tabella entrate
        const { error } = await supabase.from('entrate').insert({
          user_id: USER_ID,
          data: dataISO,
          descrizione,
          importo: importoAbs,
          categoria: cat.categoria,
          escludi_da_grafico: cat.escludi,
        });

        if (error) {
          console.error(`❌ Errore entrate: ${descrizione}`, error.message);
          stats.errori++;
        } else {
          stats.entrate++;
        }
      }

      // Progress
      if ((i % 50) === 0) {
        console.log(`   Processate ${i}/${lines.length - 1} righe...`);
      }

    } catch (err) {
      console.error(`❌ Errore riga ${i}:`, err.message);
      stats.errori++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 RIEPILOGO IMPORT\n');
  console.log(`   Entrate importate:  ${stats.entrate}`);
  console.log(`   Uscite importate:   ${stats.uscite}`);
  console.log(`   Prelievi importati: ${stats.prelievi}`);
  console.log(`   Saltati:            ${stats.saltati}`);
  console.log(`   Errori:             ${stats.errori}`);
  console.log('\n✅ IMPORT COMPLETATO!\n');
}

reimportMovimenti().catch(err => {
  console.error('❌ Errore fatale:', err);
  process.exit(1);
});
