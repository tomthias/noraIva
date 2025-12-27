/**
 * Script di analisi completa: Entrate e Uscite
 *
 * Analizza il file Excel delle transazioni bancarie e genera un report dettagliato:
 * - Entrate extra-fattura (vendite personali, interessi, bonus, rimborsi)
 * - Uscite categorizzate (tasse, affitto, investimenti, ecc.)
 *
 * NON modifica il database - solo analisi e report
 */

import XLSX from 'xlsx';

// ===== DATI FATTURE (da import-fatture.mjs e import-fatture-2024.mjs) =====

const fatture2024 = [
  { data: '2024-01-26', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza progettazione Design System', importo_lordo: 4000.00 },
  { data: '2024-02-26', cliente: 'BELKA S.R.L.', descrizione: 'Design System Bonus x', importo_lordo: 3962.50 },
  { data: '2024-03-13', cliente: 'Plannix Inc', descrizione: 'Consulenza e tutoring', importo_lordo: 218.40 },
  { data: '2024-03-26', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Soundtrap e BonusX', importo_lordo: 3900.00 },
  { data: '2024-03-26', cliente: 'BILLDING S.R.L.', descrizione: 'Consulenza - Riunioni programmate e Design Operativo', importo_lordo: 1443.00 },
  { data: '2024-04-29', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza per la progettazione di design system', importo_lordo: 4000.00 },
  { data: '2024-04-29', cliente: 'BILLDING S.R.L.', descrizione: 'Consulenza Design', importo_lordo: 145.60 },
  { data: '2024-05-16', cliente: 'Valentina Beauty Specialist', descrizione: 'Grafica biglietti da visita', importo_lordo: 52.00 },
  { data: '2024-05-25', cliente: 'BILLDING S.R.L.', descrizione: 'Consulenza design', importo_lordo: 72.80 },
  { data: '2024-05-31', cliente: 'BELKA S.R.L.', descrizione: 'Design System Docsity', importo_lordo: 4000.00 },
  { data: '2024-06-28', cliente: 'BELKA S.R.L.', descrizione: 'Design System NeN', importo_lordo: 4240.00 },
  { data: '2024-07-29', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Design System NeN', importo_lordo: 4240.00 },
  { data: '2024-08-28', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Design System', importo_lordo: 4240.00 },
  { data: '2024-09-27', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Design System NeN', importo_lordo: 4240.00 },
  { data: '2024-10-28', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Design System NeN', importo_lordo: 4240.00 },
  { data: '2024-11-28', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Design System NeN', importo_lordo: 4240.00 },
  { data: '2024-12-02', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Design System NeN + Rimborso', importo_lordo: 4297.67 },
  { data: '2024-12-16', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Design System NeN', importo_lordo: 4240.00 },
  { data: '2024-12-23', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Design System NeN - Dicembre', importo_lordo: 4240.00 },
];

const fatture2025 = [
  { data: '2025-01-20', cliente: 'BELKA S.R.L.', descrizione: 'Design System NeN, Formazione a Clienti + Rimborso Spese trasferta Milano', importo_lordo: 4297.67 },
  { data: '2025-02-28', cliente: 'BELKA S.R.L.', descrizione: 'Design System NeN, Formazione a Clienti, Formazione Poli Design + Rimborso Spese', importo_lordo: 4293.00 },
  { data: '2025-03-28', cliente: 'BELKA S.R.L.', descrizione: 'Design System NeN, Formazione a Clienti + Rimborso trasporti', importo_lordo: 4268.70 },
  { data: '2025-04-19', cliente: 'Calisti Gianni', descrizione: 'Consulenza progettazione Design pratiche sisma', importo_lordo: 2082.08 },
  { data: '2025-04-22', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Design System NeN, Segugio', importo_lordo: 4240.00 },
  { data: '2025-05-19', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Banca Sella, Design System NeN + Rimborso trasferte + Corso formazione media engine', importo_lordo: 4305.67 },
  { data: '2025-06-25', cliente: 'BELKA S.R.L.', descrizione: 'NeN Design System - Consulenza Banca Sella', importo_lordo: 4240.00 },
  { data: '2025-07-24', cliente: 'Elisa Cravero', descrizione: 'Mentoring Design', importo_lordo: 50.00 },
  { data: '2025-07-28', cliente: 'BELKA S.R.L.', descrizione: 'NeN - Progettazione Componenti e Documentazione', importo_lordo: 4240.00 },
  { data: '2025-07-31', cliente: 'Elisa Cravero', descrizione: 'Mentoring Design', importo_lordo: 50.00 },
  { data: '2025-08-07', cliente: 'Elisa Cravero', descrizione: 'Mentoring Design', importo_lordo: 50.00 },
  { data: '2025-08-12', cliente: 'Elisa Cravero', descrizione: 'Mentoring Design', importo_lordo: 50.00 },
  { data: '2025-08-29', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Design System', importo_lordo: 3744.00 },
  { data: '2025-09-01', cliente: 'MARKETING ARENA S.P.A.', descrizione: 'Consulenza oraria Design System e libreria componenti (10h)', importo_lordo: 603.20 },
  { data: '2025-09-22', cliente: 'IUBENDA S.R.L.', descrizione: 'Mockup User Interface: Footer e Widget .Hub', importo_lordo: 520.00 },
  { data: '2025-09-26', cliente: 'BELKA S.R.L.', descrizione: 'Documentazione NeN', importo_lordo: 3000.00 },
  { data: '2025-10-02', cliente: 'Elisa Cravero', descrizione: 'Mentoring Design', importo_lordo: 50.00 },
  { data: '2025-10-16', cliente: 'Elisa Cravero', descrizione: 'Mentoring Design', importo_lordo: 50.00 },
  { data: '2025-10-20', cliente: 'BELKA S.R.L.', descrizione: 'Pagamento anticipato 20% Refactor Foundation Mooney', importo_lordo: 4485.00 },
  { data: '2025-10-29', cliente: 'Bitcomet', descrizione: 'Consulenza Strategica Prodotto Digitale', importo_lordo: 676.00 },
  { data: '2025-10-29', cliente: 'BELKA S.R.L.', descrizione: 'Refactor Foundation Mooney - Acconto avvio progetto', importo_lordo: 400.00 },
  { data: '2025-11-13', cliente: 'Elisa Cravero', descrizione: 'Mentoring Design', importo_lordo: 50.00 },
  { data: '2025-11-24', cliente: 'BELKA S.R.L.', descrizione: 'Contratto Mooney: Servizi Novembre + Workshop Design System', importo_lordo: 5200.00 },
  { data: '2025-11-27', cliente: 'BELKA S.R.L.', descrizione: 'Acconto fornitura e documentazione 20 componenti NeN', importo_lordo: 1260.00 },
  { data: '2025-12-11', cliente: 'Elisa Cravero', descrizione: 'Mentoring Design', importo_lordo: 50.00 },
  { data: '2025-12-17', cliente: 'BELKA S.R.L.', descrizione: 'Contratto Mooney: Servizi Dicembre 2025', importo_lordo: 2000.00 },
  { data: '2025-12-17', cliente: 'Bitcomet', descrizione: 'Consulenza Strategica Prodotto Digitale', importo_lordo: 540.80 },
];

const TUTTE_FATTURE = [...fatture2024, ...fatture2025];

// ===== UTILITÀ =====

function convertDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
}

function categorizzaEntrata(concetto, movimento, importo) {
  const desc = (concetto + ' ' + movimento).toLowerCase();

  // Interessi bancari
  if (desc.includes('liquidazione interessi') || desc.includes('interessi bbva')) {
    return 'Interessi';
  }

  // Bonus
  if (desc.includes('bonus') || desc.includes('cashback') || desc.includes('passaparola')) {
    return 'Bonus';
  }

  // Vendite personali (Vinted, privati)
  if (desc.includes('vinted') || desc.includes('vendita') || desc.includes('liska') || desc.includes('felpa')) {
    return 'Vendita';
  }

  // Rimborsi
  if (desc.includes('rimborso') || desc.includes('restituzione')) {
    return 'Rimborso';
  }

  // Giroconti
  if (desc.includes('giroconto')) {
    return 'Giroconto';
  }

  return 'Altro';
}

function categorizzaUscita(concetto, movimento) {
  const desc = (concetto + ' ' + movimento).toLowerCase();

  // Stipendi (bonifici a te stesso - NON sono uscite vere, sono prelievi)
  if (desc.includes('mattia marinangeli') || desc.includes('stipendio')) {
    return 'Stipendio';
  }

  // Tasse
  if (desc.includes('tasse') || desc.includes('f24') || desc.includes('imposta')) {
    return 'Tasse';
  }

  // Affitto
  if (desc.includes('dovevivo') || desc.includes('joivy') || desc.includes('affitto') || desc.includes('impact hub')) {
    return 'Affitto';
  }

  // Investimenti
  if (desc.includes('moneyfarm') || desc.includes('investiment') || desc.includes('pensione')) {
    return 'Investimenti';
  }

  // Software/Abbonamenti
  if (desc.includes('claude') || desc.includes('fiscozen') || desc.includes('software') || desc.includes('preply')) {
    return 'Software';
  }

  // Salute
  if (desc.includes('psicolog') || desc.includes('sedute') || desc.includes('benigni') ||
      desc.includes('tecnomed') || desc.includes('terme')) {
    return 'Salute';
  }

  // Viaggi/Trasporti
  if (desc.includes('flydubai') || desc.includes('wizz') || desc.includes('airbnb') ||
      desc.includes('skitour') || desc.includes('albania') || desc.includes('georgia') ||
      desc.includes('benzina') || desc.includes('q8') || desc.includes('eni') ||
      desc.includes('autostrada') || desc.includes('trento') || desc.includes('rovereto')) {
    return 'Viaggi';
  }

  // Shopping
  if (desc.includes('vinted') || desc.includes('north face') || desc.includes('smartwool') ||
      desc.includes('maxi sport') || desc.includes('aldi')) {
    return 'Shopping';
  }

  // Assicurazioni
  if (desc.includes('prima assicurazion') || desc.includes('cai') || desc.includes('assicurazione')) {
    return 'Assicurazione';
  }

  // Intrattenimento
  if (desc.includes('ticketmaster') || desc.includes('foo')) {
    return 'Intrattenimento';
  }

  // Prelievi contanti
  if (desc.includes('rit. contanti') || desc.includes('prelievo contanti') || desc.includes('comm. rit. cont')) {
    return 'Contanti';
  }

  // Commercialista
  if (desc.includes('commercialista')) {
    return 'Commercialista';
  }

  return 'Altro';
}

function isFattura(importo) {
  const tolleranza = 0.02; // Tolleranza di 2 centesimi
  return TUTTE_FATTURE.some(f => Math.abs(f.importo_lordo - importo) < tolleranza);
}

function getFatturaMatch(importo) {
  const tolleranza = 0.02;
  return TUTTE_FATTURE.find(f => Math.abs(f.importo_lordo - importo) < tolleranza);
}

// ===== MAIN =====

async function analizzaEntrateUscite() {
  console.log('📊 ANALISI COMPLETA ENTRATE E USCITE\n');
  console.log('=' .repeat(80));

  // Carica Excel
  const excelPath = '/Users/mattia/Desktop/2025Y-12M-26D-19_28_54-Ultime transazioni.xlsx';
  console.log(`\n📂 Caricamento file: ${excelPath}`);

  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  console.log(`✅ File caricato: ${data.length} righe totali`);

  // Filtra transazioni valide (salta intestazioni)
  const transazioni = data.slice(5).filter(row => row[1] && row[4]);

  console.log(`✅ Transazioni valide: ${transazioni.length}`);

  // ===== ANALISI ENTRATE =====
  console.log('\n' + '='.repeat(80));
  console.log('💰 ANALISI ENTRATE');
  console.log('='.repeat(80));

  const entratePositive = transazioni.filter(row => row[4] > 0);
  console.log(`\nTotale entrate positive trovate: ${entratePositive.length}`);

  const entrateExtraFattura = [];
  const fattureMatchate = [];

  for (const row of entratePositive) {
    const data = convertDate(row[1]);
    const concetto = row[2] || '';
    const movimento = row[3] || '';
    const importo = row[4];

    if (isFattura(importo)) {
      const fattura = getFatturaMatch(importo);
      fattureMatchate.push({
        data,
        importo,
        fattura: fattura ? `${fattura.cliente} - ${fattura.descrizione}` : 'Match trovato'
      });
    } else {
      const categoria = categorizzaEntrata(concetto, movimento, importo);
      entrateExtraFattura.push({
        data,
        descrizione: movimento || concetto,
        importo,
        categoria,
        concetto
      });
    }
  }

  console.log(`\n✅ Fatture matchate: ${fattureMatchate.length}`);
  console.log(`✅ Entrate extra-fattura: ${entrateExtraFattura.length}`);

  // Report entrate extra
  console.log('\n📋 ENTRATE EXTRA-FATTURA (NON FATTURE)\n');
  console.log('Data'.padEnd(12) + '| ' + 'Descrizione'.padEnd(50) + '| ' + 'Importo'.padStart(10) + ' | ' + 'Categoria');
  console.log('-'.repeat(12) + '+-' + '-'.repeat(50) + '+-' + '-'.repeat(10) + '-+-' + '-'.repeat(15));

  const entrateOrdinatePerData = entrateExtraFattura.sort((a, b) => a.data.localeCompare(b.data));

  for (const e of entrateOrdinatePerData) {
    const desc = e.descrizione.substring(0, 50).padEnd(50);
    const importoStr = `€${e.importo.toFixed(2)}`.padStart(10);
    console.log(`${e.data.padEnd(12)}| ${desc}| ${importoStr} | ${e.categoria}`);
  }

  const totaleEntrateExtra = entrateExtraFattura.reduce((sum, e) => sum + e.importo, 0);
  console.log('-'.repeat(12) + '+-' + '-'.repeat(50) + '+-' + '-'.repeat(10) + '-+-' + '-'.repeat(15));
  console.log(`${''.padEnd(64)}TOTALE: €${totaleEntrateExtra.toFixed(2)}`);

  // Breakdown per categoria
  console.log('\n📊 BREAKDOWN PER CATEGORIA (Entrate Extra)\n');
  const entratePerCategoria = {};
  for (const e of entrateExtraFattura) {
    entratePerCategoria[e.categoria] = (entratePerCategoria[e.categoria] || 0) + e.importo;
  }

  for (const [cat, tot] of Object.entries(entratePerCategoria).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat.padEnd(20)}: €${tot.toFixed(2)}`);
  }

  // ===== ANALISI USCITE =====
  console.log('\n' + '='.repeat(80));
  console.log('💸 ANALISI USCITE');
  console.log('='.repeat(80));

  const usciteNegative = transazioni.filter(row => row[4] < 0);
  console.log(`\nTotale uscite negative trovate: ${usciteNegative.length}`);

  const uscite = [];
  const stipendi = [];

  for (const row of usciteNegative) {
    const data = convertDate(row[1]);
    const concetto = row[2] || '';
    const movimento = row[3] || '';
    const importo = Math.abs(row[4]);
    const categoria = categorizzaUscita(concetto, movimento);

    const item = {
      data,
      descrizione: movimento || concetto,
      importo,
      categoria,
      concetto
    };

    if (categoria === 'Stipendio') {
      stipendi.push(item);
    } else {
      uscite.push(item);
    }
  }

  console.log(`\n✅ Stipendi (prelievi): ${stipendi.length}`);
  console.log(`✅ Uscite vere: ${uscite.length}`);

  // Report uscite
  console.log('\n📋 USCITE (SPESE)\n');
  console.log('Data'.padEnd(12) + '| ' + 'Descrizione'.padEnd(50) + '| ' + 'Importo'.padStart(10) + ' | ' + 'Categoria');
  console.log('-'.repeat(12) + '+-' + '-'.repeat(50) + '+-' + '-'.repeat(10) + '-+-' + '-'.repeat(20));

  const usciteOrdinatePerData = uscite.sort((a, b) => a.data.localeCompare(b.data));

  for (const u of usciteOrdinatePerData) {
    const desc = u.descrizione.substring(0, 50).padEnd(50);
    const importoStr = `€${u.importo.toFixed(2)}`.padStart(10);
    console.log(`${u.data.padEnd(12)}| ${desc}| ${importoStr} | ${u.categoria}`);
  }

  const totaleUscite = uscite.reduce((sum, u) => sum + u.importo, 0);
  console.log('-'.repeat(12) + '+-' + '-'.repeat(50) + '+-' + '-'.repeat(10) + '-+-' + '-'.repeat(20));
  console.log(`${''.padEnd(64)}TOTALE: €${totaleUscite.toFixed(2)}`);

  // Breakdown per categoria
  console.log('\n📊 BREAKDOWN PER CATEGORIA (Uscite)\n');
  const uscitePerCategoria = {};
  for (const u of uscite) {
    uscitePerCategoria[u.categoria] = (uscitePerCategoria[u.categoria] || 0) + u.importo;
  }

  for (const [cat, tot] of Object.entries(uscitePerCategoria).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat.padEnd(20)}: €${tot.toFixed(2)}`);
  }

  // ===== RIEPILOGO FINALE =====
  console.log('\n' + '='.repeat(80));
  console.log('📈 RIEPILOGO GENERALE');
  console.log('='.repeat(80));

  const totaleFatture = TUTTE_FATTURE.reduce((sum, f) => sum + f.importo_lordo, 0);
  const totaleStipendi = stipendi.reduce((sum, s) => sum + s.importo, 0);
  const totaleEntrate = totaleFatture + totaleEntrateExtra;
  const saldoCalcolato = totaleEntrate - totaleStipendi - totaleUscite;

  console.log(`\n💼 Fatturato (da fatture):          €${totaleFatture.toFixed(2)}`);
  console.log(`💰 Entrate extra-fattura:           €${totaleEntrateExtra.toFixed(2)}`);
  console.log(`   ${'─'.repeat(50)}`);
  console.log(`📥 TOTALE ENTRATE:                  €${totaleEntrate.toFixed(2)}`);
  console.log('');
  console.log(`💸 Uscite (spese):                  €${totaleUscite.toFixed(2)}`);
  console.log(`💵 Stipendi (prelievi):             €${totaleStipendi.toFixed(2)}`);
  console.log(`   ${'─'.repeat(50)}`);
  console.log(`📤 TOTALE USCITE + STIPENDI:        €${(totaleUscite + totaleStipendi).toFixed(2)}`);
  console.log('');
  console.log(`💰 SALDO CALCOLATO:                 €${saldoCalcolato.toFixed(2)}`);

  console.log('\n' + '='.repeat(80));
  console.log('✅ Analisi completata!\n');
}

// Esegui
analizzaEntrateUscite().catch(err => {
  console.error('❌ Errore:', err.message);
  process.exit(1);
});
