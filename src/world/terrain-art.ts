import Phaser from 'phaser';
import { BIOME_SHEET_NAME, PROP_TABLE } from './terrain-visuals-config';
import { buildTerrainAtlases, propTextureKey, type ArtSheets } from './terrain-placeholder';
import type { ChunkStreamer } from './chunk-streamer';

/**
 * TERRAIN ART LOADER (Pass 5): probes the drop-contract paths at boot and
 * activates whatever real art exists, PER BIOME and PER PROP — a missing or
 * malformed file falls back to the procedural placeholder for that entry
 * alone, loudly (console.warn), never silently and never fatally. No art
 * shipped = every probe 404s = the all-procedural boot Passes 2–4 shipped.
 */

const SHEET_W = 256;
const SHEET_H = 128;

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // missing art is the normal state
    img.src = url;
  });
}

/** Probe + validate every biome sheet. Wrong-size sheets are REJECTED (the
 *  drop contract is exact) — that biome stays procedural. */
export async function loadTerrainSheets(): Promise<ArtSheets> {
  const sheets: ArtSheets = new Map();
  await Promise.all(
    Object.entries(BIOME_SHEET_NAME).map(async ([biome, stem]) => {
      const img = await loadImage(`/art/terrain/${stem}.png`);
      if (!img) return;
      if (img.naturalWidth !== SHEET_W || img.naturalHeight !== SHEET_H) {
        console.warn(`ToH terrain art: ${stem}.png is ${img.naturalWidth}×${img.naturalHeight}, contract is ${SHEET_W}×${SHEET_H} — biome stays procedural`);
        return;
      }
      sheets.set(Number(biome), img);
    }),
  );
  return sheets;
}

/** Probe + validate every prop drop; replace the silhouette texture by key. */
export async function loadTerrainProps(scene: Phaser.Scene): Promise<string[]> {
  const applied: string[] = [];
  await Promise.all(
    Object.entries(PROP_TABLE).map(async ([id, dim]) => {
      const img = await loadImage(`/art/terrain/props/${id}.png`);
      if (!img) return;
      if (img.naturalWidth !== dim.w || img.naturalHeight !== dim.h) {
        console.warn(`ToH terrain art: props/${id}.png is ${img.naturalWidth}×${img.naturalHeight}, contract is ${dim.w}×${dim.h} — prop stays procedural`);
        return;
      }
      const key = propTextureKey(id);
      if (scene.textures.exists(key)) scene.textures.remove(key);
      scene.textures.addImage(key, img);
      applied.push(id);
    }),
  );
  return applied;
}

/** Boot entry: load whatever art exists and activate it. Rebuilds the atlases
 *  and repaints cached chunk layers only when at least one sheet landed. */
export async function applyTerrainArt(scene: Phaser.Scene, streamer: ChunkStreamer): Promise<{ sheets: number; props: number }> {
  const [sheets, props] = await Promise.all([loadTerrainSheets(), loadTerrainProps(scene)]);
  if (sheets.size > 0) {
    buildTerrainAtlases(scene, sheets);
    streamer.repaintAllLayers();
  }
  if (sheets.size > 0 || props.length > 0) console.info(`ToH terrain art: ${sheets.size} biome sheets + ${props.length} props active (rest procedural)`);
  return { sheets: sheets.size, props: props.length };
}
