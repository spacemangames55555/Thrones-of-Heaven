import { CHUNK_RECORD_BYTES, type TerrainSource } from './terrain-schema';
import { createProceduralSource } from './terrain-procedural';
import { createEarthSource, type PlanetGrids, type RegionGrids } from './terrain-earth';

/**
 * TERRAIN SYNTHESIS WORKER (WORLD SCALE V2): the pure TerrainSource runs off
 * the main thread; finished chunk records transfer back as ArrayBuffers.
 * Pass 3: the worker starts on the procedural source and swaps to the
 * earth-backed source when the main thread hands over the decoded pack grids
 * (typed arrays, structured-cloned). Synthesis stays a pure function of
 * (tile coord, grids) — worker and direct paths are byte-identical, and every
 * fill response echoes the sourceVersion it was computed under so the
 * streamer can discard stale fills after a repaint bump.
 */
const regions: RegionGrids[] = [];
let source: TerrainSource = createProceduralSource();

type Msg =
  | { type: 'fill'; cx: number; cy: number; version: number }
  | { type: 'use-earth'; planet: PlanetGrids }
  | { type: 'region'; region: RegionGrids };

self.onmessage = (e: MessageEvent<Msg>) => {
  const m = e.data;
  if (m.type === 'use-earth') {
    source = createEarthSource(m.planet, regions);
    return;
  }
  if (m.type === 'region') {
    regions.push(m.region);
    return;
  }
  const bytes = new Uint8Array(CHUNK_RECORD_BYTES);
  source.fillChunk(m.cx, m.cy, bytes);
  (self as unknown as { postMessage(msg: unknown, transfer: Transferable[]): void }).postMessage(
    { cx: m.cx, cy: m.cy, version: m.version, buffer: bytes.buffer },
    [bytes.buffer],
  );
};
