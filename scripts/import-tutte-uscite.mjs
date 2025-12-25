import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';

const supabaseUrl = 'https://mrrzgtdsaezvuugmemxd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ycnpndGRzYWV6dnV1Z21lbXhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MTMyNjIsImV4cCI6MjA4MjE4OTI2Mn0.YrA1ZLZWRuPyzstRe9w0bfi5u4obyv5NhA_yeuQ0XK8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Funzione per convertire data DD/MM/YYYY a YYYY-MM-DD
function convertDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
}

// Funzione per categorizzare le uscite
function categorizzaUscita(concetto, movimento, importo) {
  const desc = (concetto + ' ' + movimento).toLowerCase();

  // Prelievi/Stipendi (bonifici a te stesso)
  if (desc.includes('mattia marinangeli') ||
      desc.includes('stipendio') ||
      (desc.includes('bonifico eseguito') && desc.includes('mattia'))) {
    return { tipo: 'prelievo', categoria: 'Stipendio' };
  }

  // Tasse
  if (desc.includes('tasse') || desc.includes('f24') || desc.includes('imposta')) {
    return { tipo: 'uscita', categoria: 'Tasse' };
  }

  // Affitto/Casa
  if (desc.includes('dovevivo') || desc.includes('joivy') || desc.includes('affitto') || desc.includes('impact hub')) {
    return { tipo: 'uscita', categoria: 'Affitto' };
  }

  // Investimenti
  if (desc.includes('moneyfarm') || desc.includes('investiment') || desc.includes('pensione')) {
    return { tipo: 'uscita', categoria: 'Investimenti' };
  }

  // Software/Abbonamenti
  if (desc.includes('claude') || desc.includes('fiscozen') || desc.includes('software') || desc.includes('preply')) {
    return { tipo: 'uscita', categoria: 'Software' };
  }

  // Psicoterapia/Salute
  if (desc.includes('psicolog') || desc.includes('sedute') || desc.includes('consulenza psicolog') ||
      desc.includes('benigni') || desc.includes('tecnomed') || desc.includes('terme')) {
    return { tipo: 'uscita', categoria: 'Salute' };
  }

  // Viaggi/Trasporti
  if (desc.includes('flydubai') || desc.includes('wizz') || desc.includes('airbnb') ||
      desc.includes('skitour') || desc.includes('albania') || desc.includes('georgia') ||
      desc.includes('benzina') || desc.includes('q8') || desc.includes('eni') || desc.includes('petrolvilla') ||
      desc.includes('autostrada') || desc.includes('trento sud') || desc.includes('rovereto')) {
    return { tipo: 'uscita', categoria: 'Viaggi' };
  }

  // Shopping/Abbigliamento
  if (desc.includes('vinted') || desc.includes('north face') || desc.includes('smartwool') ||
      desc.includes('maxi sport') || desc.includes('aldi')) {
    return { tipo: 'uscita', categoria: 'Shopping' };
  }

  // Assicurazioni
  if (desc.includes('prima assicurazion') || desc.includes('cai') || desc.includes('assicurazione')) {
    return { tipo: 'uscita', categoria: 'Assicurazione' };
  }

  // Intrattenimento
  if (desc.includes('ticketmaster') || desc.includes('foo')) {
    return { tipo: 'uscita', categoria: 'Intrattenimento' };
  }

  // Prelievi contanti
  if (desc.includes('rit. contanti') || desc.includes('prelievo contanti') || desc.includes('comm. rit. cont')) {
    return { tipo: 'uscita', categoria: 'Contanti' };
  }

  // Fatture pagate (a fornitori)
  if (desc.includes('fattura') && !desc.includes('ricevut')) {
    return { tipo: 'uscita', categoria: 'Fatture' };
  }

  // Default
  return { tipo: 'uscita', categoria: 'Altro' };
}

async function importAll() {
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
  console.log('Login riuscito! User ID:', userId);

  // Elimina tutti i prelievi e uscite esistenti
  console.log('\nEliminazione dati esistenti...');
  await supabase.from('prelievi').delete().eq('user_id', userId);
  await supabase.from('uscite').delete().eq('user_id', userId);
  console.log('Dati eliminati.');

  // Leggi Excel
  const workbook = XLSX.readFile('/Users/mattia/Downloads/2025Y-12M-25D-16_36_15-Ultime transazioni.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Filtra solo le uscite (importo negativo)
  const transazioni = data.slice(5).filter(row => row[4] < 0 && row[1]);

  const prelievi = [];
  const uscite = [];

  for (const row of transazioni) {
    const data = convertDate(row[1]);
    if (!data) continue;

    const concetto = row[2] || '';
    const movimento = row[3] || '';
    const importo = Math.abs(row[4]);
    const { tipo, categoria } = categorizzaUscita(concetto, movimento, importo);

    const descrizione = movimento || concetto;

    if (tipo === 'prelievo') {
      prelievi.push({
        user_id: userId,
        data,
        descrizione,
        importo,
        note: concetto
      });
    } else {
      uscite.push({
        user_id: userId,
        data,
        descrizione,
        categoria,
        importo,
        note: concetto
      });
    }
  }

  // Inserisci prelievi
  console.log(`\nInserimento ${prelievi.length} prelievi...`);
  if (prelievi.length > 0) {
    const { error: prelieviError } = await supabase.from('prelievi').insert(prelievi);
    if (prelieviError) console.error('Errore prelievi:', prelieviError.message);
  }
  const totalePrelievi = prelievi.reduce((s, p) => s + p.importo, 0);
  console.log(`Totale prelievi: €${totalePrelievi.toFixed(2)}`);

  // Inserisci uscite
  console.log(`\nInserimento ${uscite.length} uscite...`);
  if (uscite.length > 0) {
    const { error: usciteError } = await supabase.from('uscite').insert(uscite);
    if (usciteError) console.error('Errore uscite:', usciteError.message);
  }
  const totaleUscite = uscite.reduce((s, u) => s + u.importo, 0);
  console.log(`Totale uscite: €${totaleUscite.toFixed(2)}`);

  // Riepilogo per categoria
  console.log('\n=== RIEPILOGO PER CATEGORIA ===');
  const perCategoria = {};
  for (const u of uscite) {
    perCategoria[u.categoria] = (perCategoria[u.categoria] || 0) + u.importo;
  }
  for (const [cat, tot] of Object.entries(perCategoria).sort((a, b) => b[1] - a[1])) {
    console.log(`${cat}: €${tot.toFixed(2)}`);
  }

  // Verifica finale
  console.log('\n=== VERIFICA ===');
  const { data: fatture } = await supabase.from('fatture').select('importo_lordo');
  const totaleFatturato = fatture.reduce((s, f) => s + f.importo_lordo, 0);

  const saldoCalcolato = totaleFatturato - totalePrelievi - totaleUscite;
  console.log(`Fatturato totale: €${totaleFatturato.toFixed(2)}`);
  console.log(`Prelievi totali: €${totalePrelievi.toFixed(2)}`);
  console.log(`Uscite totali: €${totaleUscite.toFixed(2)}`);
  console.log(`Saldo calcolato: €${saldoCalcolato.toFixed(2)}`);
  console.log(`Saldo reale conto: €20.549,90`);
}

importAll();
