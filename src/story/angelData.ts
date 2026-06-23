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
  /** How close (world px) to the rift the player must be to trigger it. */
  triggerRange: 70,

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
