# Enemy-tint decision bake-off (Art Session 7)

**Preview:** `/tint-decision.html` on this branch's deployment. Two surfaces —
a static row (2 models × 3 domains over live terrain, 1×–4×) and a **combat
pocket** (nine mixed-domain enemies in motion at phone width, models
toggleable). Nothing here is live art; the two masters archive below.

## Step 0 — recon of the live path

**How enemies are drawn and tinted today.** `Demon.setBaseTint()` does
`sprite.setTint(t).setTintMode(Phaser.TintModes.MULTIPLY)`, and
`MainScene` feeds it `DOMAIN_TINT[EXISTING_FAMILY_DOMAIN[family]]` at every
spawn site — physical `#e04a3a`, mental `#3a6de0`, spiritual `#9a4ae0`. The
hit-flash swaps to `FILL` white and restores the base tint on recovery, so
whatever model wins has to survive that round trip.

**The shipped sprites are already built for this model.** Measured, not
assumed: `enemy-corrupted-wildlife.png` is **mean gray 84, saturation
0.000**; `enemy-lesser-evil-scouts.png` is mean gray 70, saturation 0.000.
Every enemy row is pure grayscale, and the placeholder `Demon` graphic draws
its body in `0xffffff` precisely so a multiply tint can colour it. Model A is
not a proposal — it is what ships today, and Model B is the change.

**Sizes come from the manifest rows, not from me:** corrupted-wildlife
24×34, lesser-evil-scouts 30×38, the angelic/caster families 48×56. The
bake-off master was generated at 96×136 (4× the subject's row) and is shown
fitted to 24×34, which is what `SPRITE_OVERRIDES` does at boot.

**FX pooling for an aura.** `CircleFxPool` exists but is a **transient flash
pool** — `show()` fades an item out over ~180 ms and releases it. There is no
persistent under-glow object today, so Model B implies a new pooled class
with acquire-on-spawn / release-on-death, a cap, and depth ordering beneath
the sprite. That is a real cost and it is counted below.

**Subject: `corrupted-wildlife`** — the most numerous common combatant by
both measures: **21 zones** reference it (next is lesser-evil-scouts at 15)
and its pack size is **6** (the largest). Deliberately ordinary.

## The tint math, stated before the pictures

MULTIPLY can only darken (Pass 9's finding, restated on this path). Measured
on the actual bake-off master:

| | luminance | mean RGB |
|---|---|---|
| neutral master (normalised to the shipped gray 84) | 83.1 | 83,83,83 |
| → physical | **34.1** | 73,24,18 |
| → mental | **34.7** | 18,35,73 |
| → spiritual | **33.2** | 50,24,73 |

**Every domain lands at luminance ~34 — a 59 % drop.** The three domains are
within 1.5 luminance of each other, so under Model A domain is carried by
**hue alone, at low luminance**, which is where hue discrimination is weakest.

### The number I did not expect

Pairwise mean-RGB distance between the tinted domains:

| pair | distance |
|---|---|
| physical vs mental | 77.4 |
| physical vs spiritual | 58.7 |
| **mental vs spiritual** | **33.3** |

This project already uses **≤ 48** as its "these read as the same thing"
threshold for terrain variants. By that same yardstick, **mental and
spiritual enemies are not reliably distinguishable under Model A** — blue and
violet collapse toward each other once both are darkened to a third of their
value. Look hard at the middle and right columns of the static row.

### Why Model A needs the neutral master (the no-flattering-fake row)

The preview shows **A-naive** — the painterly master multiplied directly:

| | luminance | mean RGB |
|---|---|---|
| painterly master, untinted | 56.8 | 94,47,36 |
| → physical | 28.2 | 83,13,8 |
| → mental | **21.4** | 21,20,32 |
| → spiritual | 24.4 | 57,13,32 |

A warm-brown beast under the mental tint becomes **(21,20,32)** — effectively
black. This is the trap: under Model A you cannot have painterly enemy art at
all, only value studies. That constraint is the decision.

## Honest tradeoffs

### Model A — whole-body domain tint (what ships today)

**For:** zero new render code, zero new pooled objects, one call per spawn.
Best silhouette contrast of the two on every biome — the darkened body reads
against ground: forest **58.0** vs Model B's 35.4, swamp 54.1 vs 31.5, desert
148.9 vs 126.3, snow 202.2 vs 179.5. Survives the hit-flash round trip
unchanged. Nine sprites are already drawn this way.

**Against:** all enemy art must be grayscale value studies forever — no
painterly colour, no material identity (rust vs fur vs cloth), every family
the same gray under three hues. Domain readability rests on hue at luminance
34, and **mental vs spiritual measures 33.3 apart, under this project's own
48 threshold**. A brown creature and a grey creature tint to nearly the same
thing, so families will be told apart by silhouette alone.

### Model B — full colour + domain aura

**For:** the master keeps its colour, so the art can carry species and
material, and domain becomes an independent channel instead of competing with
the art. Domain separation no longer degrades with the sprite's own value —
the aura is drawn at full strength whatever the creature looks like.

**Against:** it needs a **persistent pooled under-glow that does not exist**
— `CircleFxPool` is transient, so this is a new pooled class with per-enemy
acquire/release, a cap in the manner of the terrain pools, and depth ordering
under the sprite but over terrain. Lower silhouette contrast (35.4 vs 58.0 on
forest) because the body is no longer darkened. **Auras overlap in crowds** —
visible in the combat pocket with nine bodies; a pack of six corrupted
wildlife puts six glows in one place. Extra draw per enemy on the phone
budget. And the hit-flash interaction is unspecified: today the flash
replaces the tint, but with an aura the flash and the glow coexist.

**The aura in the preview is placeholder-class and deliberately crude — a
flat radial gradient.** The model is what is being judged, not the aura art.

## What lands on the verdict

The **decision**, not assets: ledger entry, docs, and the manifest fence
`enemy-tint-ruling` resolved to the chosen model — which unblocks all nine
enemy rows plus the hostile-creature rows, the largest fenced category in the
manifest. The two masters here stay archived under `art-review/`; no enemy
style lock is created (that is the bestiary session's own opening bake-off,
run under whichever model wins).

## Spend

**1 generation** of the ≤ 4 allowed — one master, marked BAKEOFF-ONLY. The
neutral master is derived from it in-repo (luminance-preserving grayscale
renormalised to the shipped mean of 84), not generated, so both models are
judged on the same drawing.

Archived: `bakeoff-master-corrupted-wildlife.png`,
`bakeoff-neutral-corrupted-wildlife.png`.
