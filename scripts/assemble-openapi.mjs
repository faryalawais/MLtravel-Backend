/**
 * Assembles docs/openapi/openapi.yaml from all feature fragments in
 * docs/openapi/paths/*.yaml.
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pathsDir = resolve(__dirname, '../docs/openapi/paths');
const outFile = resolve(__dirname, '../docs/openapi/openapi.yaml');

const fragmentFiles = readdirSync(pathsDir)
  .filter((f) => f.endsWith('.yaml'))
  .sort();

const mergedPaths = {};
const mergedSchemas = {};

for (const file of fragmentFiles) {
  const raw = readFileSync(resolve(pathsDir, file), 'utf8');
  const parsed = yaml.load(raw);
  if (!parsed || typeof parsed !== 'object') continue;

  for (const [key, value] of Object.entries(parsed)) {
    if (key.startsWith('/')) {
      if (mergedPaths[key]) {
        console.warn(`[assemble] duplicate path ${key} in ${file} — skipping`);
      } else {
        mergedPaths[key] = value;
      }
    }
  }

  for (const [name, schema] of Object.entries(parsed.components?.schemas ?? {})) {
    if (!mergedSchemas[name]) {
      mergedSchemas[name] = schema;
    }
  }
}

const root = {
  openapi: '3.1.0',
  info: {
    title: 'MLtravel API',
    version: '1.0.0',
    description: 'HTTP contract for MLtravel-Backend NestJS routes',
  },
  servers: [{ url: 'http://localhost:3001', description: 'Local dev' }],
  paths: mergedPaths,
  components: { schemas: mergedSchemas },
};

writeFileSync(outFile, yaml.dump(root, { lineWidth: -1, noRefs: true }), 'utf8');

const pathCount = Object.keys(mergedPaths).length;
const schemaCount = Object.keys(mergedSchemas).length;
console.log(
  `openapi:assemble — ${fragmentFiles.length} fragments → ${pathCount} paths, ${schemaCount} schemas → docs/openapi/openapi.yaml`,
);
