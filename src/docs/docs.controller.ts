import { Controller, Get, Head, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

const ROOT_SPEC = join(process.cwd(), 'docs/openapi/openapi.yaml');
const PATHS_DIR = join(process.cwd(), 'docs/openapi/paths');

function collectRefs(node: unknown, refs: Set<string>) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((n) => collectRefs(n, refs));
    return;
  }
  const obj = node as Record<string, unknown>;
  for (const [k, v] of Object.entries(obj)) {
    if (k === '$ref' && typeof v === 'string') {
      const match = v.match(/^#\/components\/schemas\/(.+)$/);
      if (match) refs.add(match[1]);
    } else {
      collectRefs(v, refs);
    }
  }
}

function expandRefs(
  names: Set<string>,
  allSchemas: Record<string, unknown>,
  visited = new Set<string>(),
) {
  for (const name of [...names]) {
    if (visited.has(name)) continue;
    visited.add(name);
    collectRefs(allSchemas[name], names);
  }
}

@Controller('docs')
export class DocsController {
  @Get()
  getDocs(@Query('feature') feature: string = '', @Res() res: Response) {
    let featureOptions = '';
    try {
      const files = readdirSync(PATHS_DIR)
        .filter((f) => f.endsWith('.yaml'))
        .map((f) => f.replace('.yaml', ''));

      featureOptions = [
        `<option value="">Full spec (all features)</option>`,
        ...files.map(
          (f) => `<option value="${f}" ${f === feature ? 'selected' : ''}>${f}</option>`,
        ),
      ].join('\n          ');
    } catch {
      featureOptions = `<option value="">Full spec (all features)</option>`;
    }

    const specUrl = feature
      ? `/api/docs/spec?feature=${encodeURIComponent(feature)}`
      : '/api/docs/spec';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>API Docs${feature ? ` — ${feature}` : ''}</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; font-family: sans-serif; }
    #feature-bar {
      background: #1b1b1b;
      padding: 10px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      position: sticky;
      top: 0;
      z-index: 1000;
    }
    #feature-bar label { color: #fff; font-size: 13px; white-space: nowrap; }
    #feature-select {
      padding: 5px 10px;
      border-radius: 4px;
      border: none;
      font-size: 13px;
      min-width: 220px;
      cursor: pointer;
    }
    #swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div id="feature-bar">
    <label for="feature-select">Feature:</label>
    <select id="feature-select" onchange="switchFeature(this.value)">
      ${featureOptions}
    </select>
    <span style="color:#aaa;font-size:12px;" id="path-count"></span>
  </div>

  <div id="swagger-ui"></div>

  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    let ui;

    function initSwagger(url) {
      const container = document.getElementById('swagger-ui');
      container.innerHTML = '';
      ui = SwaggerUIBundle({
        url,
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: 'StandaloneLayout',
        deepLinking: true,
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 2,
        docExpansion: 'list',
        filter: true,
        tryItOutEnabled: true,
        onComplete: () => {
          const paths = document.querySelectorAll('.opblock').length;
          document.getElementById('path-count').textContent = paths + ' endpoint' + (paths !== 1 ? 's' : '');
        },
      });
    }

    function switchFeature(value) {
      const url = value
        ? '/api/docs/spec?feature=' + encodeURIComponent(value)
        : '/api/docs/spec';
      const newHref = value ? '?feature=' + encodeURIComponent(value) : '?';
      history.replaceState(null, '', newHref);
      initSwagger(url);
    }

    initSwagger('${specUrl}');
  </script>
</body>
</html>`;

    return res.status(200).setHeader('Content-Type', 'text/html').send(html);
  }

  @Get('spec')
  getSpec(@Query('feature') feature: string = '', @Res() res: Response) {
    const root = yaml.load(readFileSync(ROOT_SPEC, 'utf-8')) as Record<string, unknown>;

    if (!feature) {
      return res
        .status(200)
        .setHeader('Content-Type', 'application/yaml')
        .setHeader('Access-Control-Allow-Origin', '*')
        .send(readFileSync(ROOT_SPEC, 'utf-8'));
    }

    const fragmentPath = join(PATHS_DIR, `${feature}.yaml`);
    let fragment: Record<string, unknown>;
    try {
      fragment = yaml.load(readFileSync(fragmentPath, 'utf-8')) as Record<string, unknown>;
    } catch {
      return res.status(404).json({ error: `Feature spec not found: ${feature}` });
    }

    const featurePathKeys = Object.keys(fragment).filter((k) => k.startsWith('/'));

    const allPaths = root.paths as Record<string, unknown>;
    const filteredPaths: Record<string, unknown> = {};
    for (const key of featurePathKeys) {
      if (allPaths[key]) filteredPaths[key] = allPaths[key];
    }

    const usedSchemas = new Set<string>();
    collectRefs(filteredPaths, usedSchemas);
    const allSchemas =
      (root.components as Record<string, Record<string, unknown>>)?.schemas ?? {};
    expandRefs(usedSchemas, allSchemas);

    const filteredSchemas: Record<string, unknown> = {};
    for (const name of usedSchemas) {
      if (allSchemas[name]) filteredSchemas[name] = allSchemas[name];
    }

    const featureSpec = {
      openapi: root.openapi,
      info: {
        ...(root.info as object),
        title: `${(root.info as Record<string, string>).title} — ${feature}`,
      },
      servers: root.servers,
      paths: filteredPaths,
      components: { schemas: filteredSchemas },
    };

    return res
      .status(200)
      .setHeader('Content-Type', 'application/yaml')
      .setHeader('Access-Control-Allow-Origin', '*')
      .send(yaml.dump(featureSpec));
  }

  @Head('spec')
  headSpec(@Res() res: Response) {
    try {
      const files = readdirSync(PATHS_DIR)
        .filter((f) => f.endsWith('.yaml'))
        .map((f) => f.replace('.yaml', ''));
      return res.status(200).setHeader('X-Available-Features', files.join(',')).send();
    } catch {
      return res.status(500).send();
    }
  }
}
