#!/usr/bin/env node
/**
 * Regenerates src/lib/state-links.generated.ts from vote.gov's official state data.
 *
 * Source: https://github.com/usagov/vote-gov (U.S. General Services Administration), data/states.json.
 * The file is a U.S. Government work in the public domain.
 *
 * Usage: npm run links:refresh
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const SOURCE_URL = 'https://raw.githubusercontent.com/usagov/vote-gov/staging/data/states.json';
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../src/lib/state-links.generated.ts');

const res = await fetch(SOURCE_URL);
if (!res.ok) throw new Error(`Failed to download ${SOURCE_URL}: HTTP ${res.status}`);
const raw = await res.json();
const rows = (Array.isArray(raw) ? raw : Object.values(raw))
  .filter((s) => s && s.state_abbreviation && s.hp_link && s.confirm_registration_link)
  .sort((a, b) => a.state_abbreviation.localeCompare(b.state_abbreviation));

const https = (u) => {
  if (!u) return undefined;
  if (!/^https:\/\//.test(u)) throw new Error(`Non-https link for ${u}`);
  return u;
};

const entries = rows.map((s) => {
  const code = s.state_abbreviation.toUpperCase();
  const obj = {
    code,
    name: s.state_name,
    isState: s.is_state === 'true',
    registrationType: s.registration_type,
    electionWebsite: https(s.hp_link),
    register: https(s.registration_link),
    checkRegistration: https(s.confirm_registration_link),
    moreInfo: https(s.more_info_link),
  };
  const body = Object.entries(obj)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `    ${k}: ${JSON.stringify(v)},`)
    .join('\n');
  return `  ${code}: {\n${body}\n  },`;
});

const today = new Date().toISOString().slice(0, 10);
const file = `// GENERATED FILE - do not edit by hand. Run \`npm run links:refresh\`.
// Source: vote.gov (U.S. General Services Administration), data/states.json
//   ${SOURCE_URL}
// Snapshot: ${today}. Public domain (U.S. Government work).
import type { StateLinks } from './types';

export const STATE_LINKS_SNAPSHOT_DATE = '${today}';

export const STATE_LINKS: Record<string, StateLinks> = {
${entries.join('\n')}
};
`;

writeFileSync(OUT, file);
console.log(`Wrote ${rows.length} entries to ${OUT}`);
