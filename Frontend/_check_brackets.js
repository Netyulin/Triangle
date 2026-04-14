const fs = require('fs')
const c = fs.readFileSync('components/dashboard/app-signing-card.tsx', 'utf8')
let p = 0, b = 0
for (let i = 0; i < c.length; i++) {
  if (c[i] === '(') p++
  if (c[i] === ')') p--
  if (c[i] === '{') b++
  if (c[i] === '}') b--
}
console.log('parens:', p, 'braces:', b)
if (p !== 0 || b !== 0) console.log('UNBALANCED!')
else console.log('OK')
