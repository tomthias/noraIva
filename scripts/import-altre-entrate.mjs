import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';

const supabaseUrl = 'https://mrrzgtdsaezvuugmemxd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ycnpndGRzYWV6dnV1Z21lbXhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MTMyNjIsImV4cCI6MjA4MjE4OTI2Mn0.YrA1ZLZWRuPyzstRe9w0bfi5u4obyv5NhA_yeuQ0XK8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function convertDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
}

// Controlla se è una fattura già registrata
function isFattura(concetto, movimento) {
  const desc = (concetto + ' ' + movimento).toLowerCase();
  return desc.includes('fattur') ||
         desc.includes('saldo fat') ||
         desc.includes('pagamento della fattura') ||
         desc.includes('pagamento fattura');
}

async function importAltreEntrate() {
  console.log('Login in corso...');

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'mattia.marinangeli@gmail.com',
    password: 'Ver0n1ca'
  });

  if (authError) {
    console.error('Errore login:', authError.message);
    return;
  }

  const userId = authData.user.id;
  console.log('Login riuscito!');

  // Leggi Excel
  const workbook = XLSX.readFile('/Users/mattia/Downloads/2025Y-12M-25D-16_36_15-Ultime transazioni.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Filtra entrate (importo positivo) che NON sono fatture
  const entrate = data.slice(5).filter(row => {
    if (row[4] <= 0 || !row[1]) return false;
    const concetto = row[2] || '';
    const movimento = row[3] || '';
    return !isFattura(concetto, movimento);
  });

  console.log(`\nTrovate ${entrate.length} altre entrate (non fatture)`);

  // Calcola totale
  const totaleAltreEntrate = entrate.reduce((sum, row) => sum + row[4], 0);
  console.log(`Totale altre entrate: €${totaleAltreEntrate.toFixed(2)}`);

  // Aggiungi come uscite NEGATIVE (per bilanciare il calcolo)
  // Oppure creiamo una singola uscita di aggiustamento

  // Verifica: fatture nel DB
  const { data: fatture } = await supabase.from('fatture').select('importo_lordo');
  const totaleFatture = fatture.reduce((s, f) => s + f.importo_lordo, 0);

  const { data: prelievi } = await supabase.from('prelievi').select('importo');
  const totalePrelievi = prelievi.reduce((s, p) => s + p.importo, 0);

  const { data: uscite } = await supabase.from('uscite').select('importo');
  const totaleUscite = uscite.reduce((s, u) => s + u.importo, 0);

  console.log('\n=== SITUAZIONE ATTUALE ===');
  console.log(`Fatture: €${totaleFatture.toFixed(2)}`);
  console.log(`Altre entrate (non in DB): €${totaleAltreEntrate.toFixed(2)}`);
  console.log(`Totale entrate reali: €${(totaleFatture + totaleAltreEntrate).toFixed(2)}`);
  console.log(`Prelievi: €${totalePrelievi.toFixed(2)}`);
  console.log(`Uscite: €${totaleUscite.toFixed(2)}`);

  const saldoConAltreEntrate = totaleFatture + totaleAltreEntrate - totalePrelievi - totaleUscite;
  console.log(`\nSaldo calcolato (con altre entrate): €${saldoConAltreEntrate.toFixed(2)}`);
  console.log(`Saldo reale conto: €20.549,90`);

  // Soluzione: aggiungiamo un'uscita negativa per bilanciare
  // Questo equivale a "altre entrate non tracciate"
  const differenza = 20549.90 - (totaleFatture - totalePrelievi - totaleUscite);
  console.log(`\nDifferenza da bilanciare: €${differenza.toFixed(2)}`);

  // Invece di complicare, aggiungiamo semplicemente le altre entrate come uscite negative
  // (un trucco per bilanciare senza modificare lo schema)

  // Oppure: inseriamo un'uscita con importo negativo chiamata "Altre entrate"
  const { error: insertError } = await supabase.from('uscite').insert({
    user_id: userId,
    data: '2025-12-25',
    descrizione: 'Altre entrate (rimborsi, interessi, giroconti)',
    categoria: 'Altre entrate',
    importo: -totaleAltreEntrate, // Negativo = entrata
    note: 'Bilanciamento automatico'
  });

  if (insertError) {
    console.error('Errore:', insertError.message);
  } else {
    console.log('\nAggiunto bilanciamento "Altre entrate" nel DB');
  }

  // Verifica finale
  const { data: usciteFinali } = await supabase.from('uscite').select('importo');
  const totaleUsciteFinale = usciteFinali.reduce((s, u) => s + u.importo, 0);
  const saldoFinale = totaleFatture - totalePrelievi - totaleUsciteFinale;
  console.log(`\nSaldo finale calcolato: €${saldoFinale.toFixed(2)}`);
}

importAltreEntrate();
