// TODO CENSUS (npx esbuild tools/census-todo.ts --bundle --format=esm --platform=node --outfile=node_modules/.cache/toh-census.mjs && node node_modules/.cache/toh-census.mjs): every game slot still carrying a HAND_AUTHORED_TODO after
// the insertion run — hand-authored beats with no canon banner entry.
declare const console: { log(msg: string): void };
import { WORLD } from '../src/world/world-manifest';
import { narrativeBannerFor, HERALD_DUELS } from '../src/world/narrative-canon';

const remaining: string[] = [];
for (const zone of WORLD) {
  for (const beat of zone.questChain) {
    const reserved = beat.handAuthored ?? zone.handAuthored === true;
    if (!reserved) continue;
    if (narrativeBannerFor(beat.id, 'monk')) continue; // canon banner owns it
    if (HERALD_DUELS[beat.id]) continue; // two-voice canon owns it
    remaining.push(`${beat.id} (${zone.id})`);
  }
}
console.log(remaining.join('\n'));
console.log(`TOTAL remaining hand-authored TODO beats: ${remaining.length}`);
