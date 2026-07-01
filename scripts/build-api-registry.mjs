/**
 * api-registry validator.
 *   node scripts/build-api-registry.mjs --validate
 */

import { readFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const registryPath = join(root, 'tokens/api-registry.json');

const VALIDATE = process.argv.includes('--validate');

let registry;
try {
  registry = JSON.parse(readFileSync(registryPath, 'utf-8'));
} catch (err) {
  console.error(`FAIL: cannot read tokens/api-registry.json — ${err.message}`);
  process.exit(1);
}

const errors = [];
const entries = Object.entries(registry).filter(([k]) => !k.startsWith('_'));

for (const [key, value] of entries) {
  if (!key.startsWith('field.')) {
    errors.push(`"${key}" — key must start with "field."`);
    continue;
  }
  if (typeof value !== 'object' || !value.$jsonPath) {
    errors.push(`"${key}" — missing required "$jsonPath" property`);
    continue;
  }
  if (typeof value.$jsonPath !== 'string' || !value.$jsonPath.startsWith('$')) {
    errors.push(`"${key}" — "$jsonPath" must be a string starting with "$" (got: ${value.$jsonPath})`);
  }
}

if (VALIDATE) {
  if (errors.length) {
    console.error('api-registry:validate FAIL');
    for (const e of errors) console.error('  ✗', e);
    process.exit(1);
  }

  const byFeature = {};
  for (const [, val] of entries) {
    const f = val.feature ?? 'unknown';
    byFeature[f] = (byFeature[f] ?? 0) + 1;
  }

  console.log(`api-registry:validate PASS — ${entries.length} fields registered`);
  for (const [feature, count] of Object.entries(byFeature).sort()) {
    console.log(`  ${feature}: ${count} field(s)`);
  }
  process.exit(0);
}

console.log(`api-registry — ${entries.length} fields\n`);
for (const [key, val] of entries) {
  console.log(`  ${key.padEnd(42)} ${val.$jsonPath}`);
}
