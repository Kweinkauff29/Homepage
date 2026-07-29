import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ORIGINAL_LAYOUT_COMMIT = 'f8867fa03ce066a22af830346b57ee53cbe34f27';
const ORIGINAL_LAYOUT_PATH = '2026/AFFILIATEDIRECTORY.html';
const here = dirname(fileURLToPath(import.meta.url));
const controllerPath = resolve(here, 'affiliate-directory-secure-api-v2.js');
const outputPath = resolve(here, 'AFFILIATEDIRECTORY.html');

const original = execFileSync(
  'git',
  ['show', `${ORIGINAL_LAYOUT_COMMIT}:${ORIGINAL_LAYOUT_PATH}`],
  { encoding: 'utf8', maxBuffer: 5 * 1024 * 1024 }
);
const controller = readFileSync(controllerPath, 'utf8').trim();

const startMarker = '<script>\n            (function () {';
const start = original.indexOf(startMarker);
if (start < 0) throw new Error('The original Affiliate Directory controller could not be located.');
const end = original.indexOf('</script>', start);
if (end < 0) throw new Error('The original Affiliate Directory controller does not have a closing script tag.');

const restored = `${original.slice(0, start)}<script>\n${controller}\n        </script>${original.slice(end + '</script>'.length)}`;

const requiredLayoutMarkers = [
  'Find an Affiliated Business Partner',
  'id="categoryTiles"',
  'class="category-tile"',
  'class="agent-card"',
  'id="agentModal"',
  'id="ccor-waves-bg"'
];
for (const marker of requiredLayoutMarkers) {
  if (!restored.includes(marker)) throw new Error(`Restored layout is missing: ${marker}`);
}
if (/apiKey\s*[:=]|Authorization\s*:|ApiKey\s+|growthzoneapp\.com\/api\//i.test(restored)) {
  throw new Error('The restored page contains a browser-visible GrowthZone credential or direct GrowthZone request.');
}
if (!restored.includes('ccor-member-hub-prototype.bonitaspringsrealtors.workers.dev/api/public/directory')) {
  throw new Error('The restored page is not connected to the secured Member Hub directory API.');
}

writeFileSync(outputPath, restored, 'utf8');
console.log('Restored the original Affiliate Directory layout with the indexed secure Worker API controller v2.');