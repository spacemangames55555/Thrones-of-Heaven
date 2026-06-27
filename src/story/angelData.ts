/**
 * The Angel's Choice — DATA for the encounter at the Corruption Rift.
 *
 * >>> TO REWRITE THE ANGEL'S DIALOGUE, CHOICE LABELS, OR THE RIGHTEOUS
 *     ACKNOWLEDGMENT: edit the strings below. No code changes needed. <<<
 *
 * (The angel's world position is derived at runtime from the rift, so it stays
 * correct at any map scale — only the text lives here.)
 */
export const ANGEL_ENCOUNTER = {
  /** How close (world px) to the rift the player must be to trigger it (~3.5 tiles at 32px). */
  triggerRange: 110,

  /** Spoken via the existing dialogue box when the angel manifests. */
  lines: [
    'A figure of light unfolds from the air above the rift, wings like drawn breath.',
    'Angel: Stay your steps. This place is a wound, and the wound is hungry.',
    'Angel: I can set the light of vigil in your eyes — the strength to turn away from it.',
    'Angel: Take my hand and walk in the light. Refuse, and you walk alone into the dark.',
  ],

  /** Shown above the two choice buttons. */
  prompt: 'The angel extends a radiant hand.',
  acceptLabel: 'Accept the light',
  refuseLabel: 'Refuse',

  /** Placeholder acknowledgment shown if the player accepts (righteous stub). */
  righteousAck: [
    "You take the angel's hand, and a steady warmth settles in your chest.",
    'Angel: Then the path of light is yours. Walk it well — we will speak again.',
  ],
};

/**
 * SUPPRESSED-ANGEL placeholder (Batch 2): the on-screen angel manifestation +
 * Accept/Refuse choice are suppressed so Uriel isn't duplicated as a second angel.
 * The corruption grant is preserved — it now fires at the rift with these short,
 * understated lines instead of the angel scene. This is a temporary seam; Batch 4
 * replaces the whole beat with the proper rift/lie/choice scene.
 *
 * >>> EDIT THE PLACEHOLDER RIFT-CORRUPTION LINES HERE. <<<
 */
export const RIFT_CORRUPTION_LINES = [
  'At the eastern edge of town the ground is black and violet, and the rift breathes a cold that has nothing to do with weather.',
  'You step close, and it reaches back — not with hands, but with knowing. Something on the far side has been waiting for someone exactly like you.',
  'The cold pours into your eyes and does not leave. When you blink, the world is the same — and utterly changed. You can see them now. The things that move between things. There is no closing your eyes to it again.',
];
