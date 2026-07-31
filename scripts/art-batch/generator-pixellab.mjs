import { readFileSync } from 'node:fs';

/**
 * PIXELLAB GENERATOR ADAPTER (Pass 8) — the ONLY file that talks to the
 * PixelLab API, and the single point of change if their endpoints move.
 * Entered exclusively on human-triggered `npm run art:batch` runs with
 * PIXELLAB_SECRET set — the gate never reaches this module.
 *
 * Endpoint shapes below follow PixelLab's published v1 API (pixflux for
 * text-only, bitforge for STYLE-REFERENCE generation — the locked reference
 * image rides every call as `style_image`). PixelLab's docs were not
 * reachable from the build environment when this shipped (proxy 403), so
 * VERIFY AGAINST THEIR CURRENT DOCS ON THE FIRST LIVE RUN — any drift is a
 * one-line fix here and nowhere else.
 */

const API = 'https://api.pixellab.ai/v1';

async function call(path, body, secret) {
  const res = await fetch(`${API}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`pixellab ${path}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  const b64 = json.image?.base64 ?? json.image;
  if (!b64) throw new Error(`pixellab ${path}: no image in response`);
  return Buffer.from(b64, 'base64');
}

/** Generate one manifest item against the category's locked reference. */
export async function generatePixellab(item, lock, secret) {
  const styleImage = readFileSync(lock.reference).toString('base64');
  const prompt = `${lock.prompt ?? ''} ${item.spec.promptHint ?? item.id}`.trim();
  try {
    if (item.spec.kind === 'rotations-8') {
      // 8-directional character frames, one bitforge call per facing (the
      // remote MCP's create_character is the interactive alternative).
      const dirs = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west'];
      const frames = {};
      for (const d of dirs) {
        frames[d] = await call('generate-image-bitforge', {
          description: `${prompt}, facing ${d}`,
          image_size: { width: 128, height: 128 }, // master; the drop pipeline auto-fits
          style_image: { type: 'base64', base64: styleImage },
          no_background: true,
        }, secret);
      }
      return { frames };
    }
    const size = item.spec.kind === 'sheet-256x128' ? { width: 256, height: 128 } : { width: item.spec.w ?? 128, height: item.spec.h ?? 128 };
    const image = await call('generate-image-bitforge', {
      description: prompt,
      image_size: size,
      style_image: { type: 'base64', base64: styleImage },
      no_background: item.spec.kind !== 'sheet-256x128',
    }, secret);
    return { image };
  } catch (e) {
    return { error: String(e.message ?? e) };
  }
}
