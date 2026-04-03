import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log('__filename =', __filename);
console.log('__dirname =', __dirname);
console.log('path.resolve(__dirname, "../V3/public/uploads") =', path.resolve(__dirname, "../V3/public/uploads"));
console.log('path.resolve(__dirname, "../../V3/public/uploads") =', path.resolve(__dirname, "../../V3/public/uploads"));
console.log('path.resolve(__dirname, "../../../V3/public/uploads") =', path.resolve(__dirname, "../../../V3/public/uploads"));
