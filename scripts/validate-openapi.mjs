import SwaggerParser from '@apidevtools/swagger-parser';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const specPath = resolve(__dirname, '../docs/openapi/openapi.yaml');

try {
  const api = await SwaggerParser.validate(specPath);
  console.log(
    `openapi:validate PASS — ${Object.keys(api.paths).length} paths, version ${api.info.version}`,
  );
  process.exit(0);
} catch (err) {
  console.error('openapi:validate FAIL');
  console.error(err.message);
  process.exit(1);
}
