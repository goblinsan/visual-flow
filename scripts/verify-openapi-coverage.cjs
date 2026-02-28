const fs = require('fs');
const path = require('path');

const specPath = path.join(__dirname, '..', 'workers', 'api', 'src', 'openapiSpec.ts');
const indexPath = path.join(__dirname, '..', 'workers', 'api', 'src', 'index.ts');

const specText = fs.readFileSync(specPath, 'utf8');
const indexText = fs.readFileSync(indexPath, 'utf8');

function extractSpecPaths(text) {
  const matches = text.match(/'\/[^']+':\s*\{/g) || [];
  return new Set(matches.map((m) => m.slice(1, -4)));
}

function normalizeRoute(route) {
  return route.replace(/\{[^}]+\}/g, '{id}');
}

function stripApiPrefix(route) {
  return route.startsWith('/api/') ? route.slice(4) : route;
}

function extractIndexPaths(text) {
  const paths = new Set();
  const literalRegex = /'\/(?:health|api\/health|api\/agent\/discover|api\/agent\/connect|api\/agent\/link-code|api\/agent\/link-code\/exchange|api\/openapi\.json|api\/debug|api\/auth\/signin|api\/auth\/signout|api\/whoami|api\/user\/display-name|api\/canvases|api\/images)'/g;

  for (const match of text.matchAll(literalRegex)) {
    paths.add(match[0].slice(1, -1));
  }

  const routeRegex = /new RegExp\('\^\/(api\/[^']+)\$'\)/g;
  for (const match of text.matchAll(routeRegex)) {
    const route = match[1].replace(/\(\[\^\/\]\+\)/g, '{id}');
    paths.add(`/${route}`);
  }

  return paths;
}

const specPaths = new Set(
  [...extractSpecPaths(specText)].map((p) => normalizeRoute(stripApiPrefix(p)))
);
const indexPaths = new Set(
  [...extractIndexPaths(indexText)].map((p) => normalizeRoute(stripApiPrefix(p)))
);

const ignore = new Set([
  '/agent/discover',
  '/openapi.json',
  '/debug',
  '/auth/signin',
  '/auth/signout',
]);

const missingInSpec = [];
for (const route of indexPaths) {
  if (ignore.has(route)) continue;
  if (!specPaths.has(route)) missingInSpec.push(route);
}

const extraInSpec = [];
for (const route of specPaths) {
  if (!indexPaths.has(route)) extraInSpec.push(route);
}

if (missingInSpec.length || extraInSpec.length) {
  console.error('OpenAPI coverage check failed.');
  if (missingInSpec.length) {
    console.error('Missing in spec:', missingInSpec.sort().join(', '));
  }
  if (extraInSpec.length) {
    console.error('Extra in spec:', extraInSpec.sort().join(', '));
  }
  process.exit(1);
}

console.log('OpenAPI coverage check passed.');
