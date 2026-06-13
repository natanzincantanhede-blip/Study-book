const fs = require('fs');
let code = fs.readFileSync('src/api.ts', 'utf8');

const startStr = '// --- AI Mode Quiz & Summary ---';
const endStr = '// --- Reset Data ---';

const startIdx = code.indexOf(startStr);
const endIdx = code.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
  code = code.substring(0, startIdx) + code.substring(endIdx);
  fs.writeFileSync('src/api.ts', code, 'utf8');
  console.log('Removed AI sections');
} else {
  console.log('Could not find AI sections');
}
