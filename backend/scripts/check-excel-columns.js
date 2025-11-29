const XLSX = require('xlsx');

const wb = XLSX.readFile('/home/william-baptista/TxH/Documentacion desarrollo/AppSheet-Data.xlsx');
const ws = wb.Sheets['Preoperatorio'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log('Column headers in Preoperatorio sheet:');
console.log('='.repeat(80));

const headers = data[0];
headers.forEach((h, i) => {
  if (h && h.toString().trim() !== '') {
    console.log(`Column ${i}: ${h}`);
  }
});

console.log(`\nTotal columns: ${headers.length}`);

// Check specific comorbidity columns
console.log('\n' + '='.repeat(80));
console.log('Looking for comorbidity/complication columns:');
const searchTerms = ['Enf Coronaria', 'HTA', 'Diabetes', 'Fumador', 'EPOC', 'Hipertension Portal', 'Ascitis', 'Varices', 'Encefalopatia'];
searchTerms.forEach(term => {
  const idx = headers.findIndex(h => h && h.toString().includes(term));
  if (idx >= 0) {
    console.log(`Found "${term}" at column ${idx}: ${headers[idx]}`);
  } else {
    console.log(`NOT FOUND: "${term}"`);
  }
});
