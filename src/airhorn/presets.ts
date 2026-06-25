/**
 * The soundboard's pads. The hero is the big AIRHORN; the rest are flavour
 * variants you'd find on a Klang-style board — all the same synth, different
 * knobs. Each preset is just BlastOptions plus presentation metadata.
 */
import type { BlastOptions } from './audio';

export interface Pad {
  id: string;
  label: string;
  emoji: string;
  /** Accent colour for the pad and its blast flash. */
  color: string;
  blast: BlastOptions;
  /** Optional multi-stab pattern: extra blasts at these second-offsets. */
  pattern?: number[];
}

export const HERO_PAD: Pad = {
  id: 'airhorn',
  label: 'AIRHORN',
  emoji: '📢',
  color: '#ff3b30',
  blast: { freq: 233, duration: 0.7, drive: 0.55, gain: 0.95, glide: 5 },
};

export const PADS: Pad[] = [
  {
    id: 'classic',
    label: 'Classic',
    emoji: '📣',
    color: '#ff9f0a',
    blast: { freq: 220, duration: 0.6, drive: 0.45, gain: 0.85, glide: 4 },
  },
  {
    id: 'mlg',
    label: 'MLG',
    emoji: '🔥',
    color: '#ff375f',
    blast: { freq: 277, duration: 0.22, drive: 0.85, gain: 0.95, glide: 7 },
    pattern: [0, 0.26, 0.52],
  },
  {
    id: 'bass',
    label: 'Bass Drop',
    emoji: '🔊',
    color: '#bf5af2',
    blast: { freq: 110, duration: 0.9, drive: 0.7, gain: 1.0, glide: 9 },
  },
  {
    id: 'rave',
    label: 'Rave',
    emoji: '🎉',
    color: '#0a84ff',
    blast: { freq: 330, duration: 0.7, drive: 0.6, gain: 0.85, glide: 12 },
  },
  {
    id: 'triple',
    label: 'Triple',
    emoji: '🎺',
    color: '#30d158',
    blast: { freq: 247, duration: 0.18, drive: 0.5, gain: 0.85, glide: 3 },
    pattern: [0, 0.22, 0.44],
  },
];

/**
 * Pitch the hero horn up as the player racks up rapid taps / combo "hype":
 * each step adds a semitone, capped so it never gets squeaky.
 */
export function hypeBlast(base: BlastOptions, hype: number): BlastOptions {
  const semis = Math.min(12, hype);
  return { ...base, freq: (base.freq ?? 233) * Math.pow(2, semis / 12) };
}
