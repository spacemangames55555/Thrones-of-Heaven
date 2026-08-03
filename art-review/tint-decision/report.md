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

---

# MODEL C — baked domain rim (follow-up stage, Art Session 7)

Derived **in-repo** from the archived master — no generation call, spend
unchanged at 1. Full-colour body untouched; domain carried by an **outer rim
of pure `DOMAIN_TINT`, unmultiplied**, dilated ~4 source px outward from the
silhouette so no body art is eaten. No runtime tint, no new pools, hit-flash
untouched. BAKEOFF-ONLY.

## Why 4 source px

Not arbitrary. This row renders at 24×34 from a 96×136 master — a 4:1
downscale, nearest-neighbour. Sampling takes every 4th pixel, so a rim thinner
than 4 px can fall between samples and vanish on some edges. **4 px is the
thinnest rim that survives the fit**, which is what makes it a ~1 px outline
at the size that ships. Verified by downscaling and counting.

Frame headroom on the master is 9 px left/right, 13 top, 14 bottom, so the
rim fits without growing the canvas.

## Measured, same as the others

| | Model A | Model B | **Model C** |
|---|---|---|---|
| body luminance | 34.1 (−59 %) | 56.8 (unchanged) | **56.8 (unchanged)** |
| painterly colour kept | no | yes | **yes** |
| physical vs mental | 77.4 | n/a (aura) | **237.4** |
| physical vs spiritual | 58.7 | n/a | **180.2** |
| **mental vs spiritual** | **33.3** ❌ | n/a | **102.2** ✅ |

Model C's domain separation is the **raw tint distance**, because the rim is
pure unmultiplied `DOMAIN_TINT`. Its weakest pair (mental vs spiritual, 102.2)
is **3× Model A's best-case weakest pair** and comfortably over this project's
48 "reads as the same thing" threshold — the specific failure that sent the
decision to a follow-up stage is gone.

### The cost the numbers show

At shipped size the rim is **36 % of the visible sprite** (151 rim px against
272 body px at 24×34). That is not a hairline outline — it is a substantial
coloured halo, and the beast reads as a coloured shape with a body inside it.
The thickness is a dial, measured:

| rim | share of sprite at 24×34 |
|---|---|
| 2 px | 26 % |
| 3 px | 32 % |
| **4 px (staged)** | **36 %** |
| 6 px | 45 % |

2 px is thinner but risks dropping out on some edges under the 4:1 fit. The
staged 4 px buys guaranteed survival at the cost of a fat rim.

### Silhouette contrast — where the mean-luminance metric misleads

| | A | B | C |
|---|---|---|---|
| forest | 58.0 | 35.3 | 19.7 |
| swamp | 54.1 | 31.4 | 15.8 |
| desert | 148.9 | 126.2 | 110.6 |
| snow | 202.2 | 179.5 | 163.8 |

By mean luminance Model C looks worst. **That number understates it**, and it
would be dishonest to leave it standing alone: C's contrast is concentrated at
the boundary, not spread over the body. The rim's own luminance is 101.8–106.5,
so against forest (92) and swamp (88) the rim separates by **hue at near-equal
value** — gaps of 12.6 and 16.5 — while against desert (183) and snow (236) it
separates by value too, 78.3 and 131.6. So on the two dark biomes C leans
entirely on hue; on the two bright ones it is unambiguous. Judge the forest and
swamp panels hardest.

## The structural finding — Model C does not multiply the asset count

Checked rather than assumed: **every enemy family has exactly one fixed
domain**. `EXISTING_FAMILY_DOMAIN` and `ENEMY_ROSTER[].domain` are per-family
constants, and the only per-spawn domain lookups (`spawnSuezPack`, region
spawns) read that same constant. Region champions carry their own domain in
`CHAMPION_SPECS` — 6 Physical, 4 Mental, 4 Spiritual — but each champion is a
named individual with one domain.

So a baked rim costs **one sprite per entity, exactly like Model A**. No 3×
multiplication. That removes what would otherwise be Model C's obvious
objection.

### What it costs instead

**Domain becomes an art property, not a data property.** Re-domaining a family
stops being a one-line table edit and becomes a regeneration. This is not
hypothetical — `enemy-roster.ts` carries the receipt:

> `'lesser-evil-scouts': 'physical', // CANON FIX: was mis-mapped 'mental' (blue scouts on Rome)`

That canon fix was a single-character data change. Under Model C it would have
been a re-bake of every lesser-evil-scouts sprite. Fifteen zones use that
family. Whether that matters depends on how settled the domain table is.

Secondary: the hit-flash sets `FILL` white over the whole sprite, so it briefly
covers the rim along with everything else, then restores — no special handling
needed, but the domain cue is absent for the flash duration. Model A has the
same behaviour, so this is parity, not a regression.

## Verdict options

**MODEL A** / **MODEL B** / **MODEL C** / **rerun with notes**.

Spend unchanged: **1 generation** total for the session — Model C is derived,
not generated.
