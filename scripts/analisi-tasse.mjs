import XLSX from 'xlsx';

const wb = XLSX.readFile('/Users/mattia/Downloads/excel/2025Y-12M-25D-16_36_15-Ultime transazioni.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);

// Filtra pagamenti tasse
const tasse = data.filter(r => {
  const desc = (r.__EMPTY_3 || '').toLowerCase();
  const isTasse = desc.includes('tass') || desc.includes('f24') || desc.includes('giroconto per tass');
  const isViaggio = desc.includes('viaggio');
  return isTasse && !isViaggio;
});

// Raggruppa per anno
const perAnno = {};
tasse.forEach(r => {
  const dataVal = r.__EMPTY || '';
  const anno = dataVal.split('/')[2];
  if (!perAnno[anno]) perAnno[anno] = [];
  perAnno[anno].push({ data: r.__EMPTY, desc: r.__EMPTY_3, importo: r.__EMPTY_4 });
});

console.log('=== PAGAMENTI TASSE PER ANNO ===\n');
Object.keys(perAnno).sort().forEach(anno => {
  const totale = perAnno[anno].reduce((s, t) => s + t.importo, 0);
  console.log(`ANNO ${anno}:`);
  perAnno[anno].forEach(t => console.log(`  ${t.data} | ${t.desc} | ${t.importo} EUR`));
  console.log(`  TOTALE: ${totale.toFixed(2)} EUR\n`);
});

// Calcolo totale
const totaleTasse = tasse.reduce((s, t) => s + t.importo, 0);
console.log(`\nTOTALE TASSE PAGATE: ${totaleTasse.toFixed(2)} EUR`);
