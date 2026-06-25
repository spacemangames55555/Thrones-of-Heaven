# 📢 Airhorn Hero

A **soundboard you can play** — inspired by [Klang](https://github.com/unorderly/Klang),
turned into a game with airhorns front and center. Runs on the **web, Android,
and iOS** from a single codebase.

Every honk is **synthesized live in the browser with the Web Audio API** — there
are no `.mp3`/`.wav` sample files anywhere in the app. That keeps it tiny, fully
offline-capable, and free of any audio licensing concerns.

## What's in it

**Two modes, one tab bar:**

- **Soundboard** — six big pads, each a different airhorn (Classic, MLG, Deep,
  Rave, Vuvu, Siren). Tap-and-hold to blast; the sustained ones ring for as long
  as you hold. This is the Klang-style soundboard.
- **Frenzy** — a 30-second reaction game on a 3×3 grid. Tap the horns before they
  drop. Chaining hits builds a combo that **raises the airhorn's pitch** and your
  score multiplier; missed horns drain your REP meter. High score is saved
  locally. Pick which horn you play with before each round.

**Built for phones:** pointer/touch input, no-zoom/no-scroll handling, safe-area
insets, audio unlock on first tap (required by iOS), installable as a PWA, and
works with no network once loaded.

## The airhorn synth (`audio.js`)

Each horn is a small Web Audio graph:

- two-to-four **sawtooth "horn" tones** stacked a musical interval apart (root +
  fifth + octave) for the brassy two-tone honk,
- a quick **pitch bend up at the onset** (the classic "waaah"),
- gentle **vibrato** via an LFO on detune,
- a **soft-clip waveshaper** for grit, a low-pass to tame the top, and
- a shared **master limiter** so stacking voices never clips.

Styles differ only by data (base frequency, partials, drive, vibrato, filter,
and pattern — `sustain`, `triple`, or `siren`), so adding a new horn is a few
lines in the `STYLES` table.

## Run it locally

No build step. Any static server works:

```bash
cd airhorn-game
npm start            # zero-dependency dev server -> http://localhost:5050
# or: python3 -m http.server 5050
```

Open the URL on your phone (same Wi-Fi) to feel it on a real touchscreen.

## Ship it as native Android & iOS apps

The web app is wrapped with [Capacitor](https://capacitorjs.com). See
[`BUILD.md`](./BUILD.md) for the full step-by-step. Short version:

```bash
npm install
npm run android:add   # creates ./android (open in Android Studio -> build APK/AAB)
npm run ios:add       # creates ./ios     (open in Xcode on a Mac -> build IPA)
```

## Files

```
airhorn-game/
  index.html            # app shell: tabs, soundboard, game grid, overlay
  styles.css            # mobile-first UI
  audio.js              # procedural airhorn synth (Web Audio)
  game.js               # "Frenzy" reaction game logic
  main.js               # UI wiring (pads, tabs, game, mute, PWA)
  manifest.webmanifest  # PWA install metadata
  sw.js                 # offline service worker
  icons/                # app icons (SVG source + rendered PNGs)
  capacitor.config.json # native app id / name / colors
  copy-www.mjs          # assembles the clean ./www payload for Capacitor
  serve.mjs             # zero-dep local dev server
  BUILD.md              # native Android/iOS build guide
```
