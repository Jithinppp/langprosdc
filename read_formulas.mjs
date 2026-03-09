import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const wb = XLSX.readFile('Delay Switch Calculation.xls', { cellFormula: true, cellNF: true });
const ws = wb.Sheets['1TX - (Cable Lenght)'];

// Output some cells that contain the switch calculation.
// In the XLS, Rad 1 switch on Output 1 is probably cell Y13 or Z13 or similar.
// Let's just dump the formulas for the Switch column.
const range = XLSX.utils.decode_range(ws['!ref']);
for (let R = 11; R <= 20; R++) { // Rows 12 to 21
    for (let C = 0; C <= range.e.c; C++) {
        const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
        if (cell && cell.f) {
            console.log(`Cell ${XLSX.utils.encode_cell({ r: R, c: C })}: Formula=${cell.f}, Value=${cell.v}`);
        }
    }
}
