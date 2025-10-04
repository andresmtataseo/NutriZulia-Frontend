import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load .env if present
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
const publicDir = resolve(projectRoot, 'public');
const outFile = resolve(publicDir, 'env.js');

// Whitelist of variables exposed to the frontend
const allowedKeys = ['API_URL', 'APP_NAME', 'VERSION'];

const envObject = allowedKeys.reduce((acc, key) => {
  const value = process.env[key];
  if (typeof value === 'string' && value.length > 0) {
    acc[key] = value;
  }
  return acc;
}, {});

const content = `window.__env = ${JSON.stringify(envObject, null, 2)};\n`;

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(outFile, content, { encoding: 'utf8' });

console.log(`Generated ${outFile} with keys: ${Object.keys(envObject).join(', ') || 'none'}`);