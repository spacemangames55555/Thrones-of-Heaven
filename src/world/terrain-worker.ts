import { CHUNK_RECORD_BYTES } from './terrain-schema';
import { createProceduralSource } from './terrain-procedural';

/**
 * TERRAIN SYNTHESIS WORKER (WORLD SCALE V2, Pass 2): the pure TerrainSource
 * runs off the main thread; finished chunk records transfer back as
 * ArrayBuffers (zero-copy). Because synthesis is a pure function of
 * (tile coord, WORLD_SEED), the worker and the direct main-thread path are
 * byte-identical — the gate asserts it.
 */
const source = createProceduralSource();

self.onmessage = (e: MessageEvent<{ cx: number; cy: number }>) => {
  const { cx, cy } = e.data;
  const bytes = new Uint8Array(CHUNK_RECORD_BYTES);
  source.fillChunk(cx, cy, bytes);
  (self as unknown as { postMessage(msg: unknown, transfer: Transferable[]): void }).postMessage({ cx, cy, buffer: bytes.buffer }, [bytes.buffer]);
};
