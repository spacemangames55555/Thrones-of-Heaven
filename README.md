# 📢 Airhorn Hero

A tap-to-blast **airhorn soundboard game** for **Android & iOS**, inspired by
the soundboard concept of [Klang](https://github.com/unorderly/Klang). Tap the
giant horn to blast, mash the variant pads, then test your timing in **Hype
Rush** — a one-tap rhythm game where you slam the airhorn as the playhead
crosses the target.

Built with **TypeScript + Vite**. The airhorn is **synthesized live with the
Web Audio API** — there are no audio files, so the whole app works offline and
ships nothing but code. It runs as an installable **PWA** in any mobile browser
and packages into native **Android/iOS** apps via **Capacitor**.

---

## What's in it

- **Soundboard** (the Klang homage): a giant **AIRHORN** pad plus five variant
  pads — Classic, MLG (triple stab), Bass Drop, Rave, Triple. Tap to blast;
  **hold the big horn to sustain**. Rapid taps build a **HYPE** meter that
  pitches the horn up.
- **Hype Rush** (the game): a playhead ping-pongs across a track that speeds up.
  Tap the airhorn inside the glowing zone — **Perfect** (tight centre) or
  **Good** (outer band) — to score and build a **combo multiplier**. Three
  misses ends the run. Best score is saved on-device.
- **Feel**: screen flashes, shockwave rings, particle bursts, and **haptic
  feedback** (`navigator.vibrate`, Android) on every hit.
- **Installable & offline**: web manifest + service worker + generated icons, so
  it adds to the home screen on Android (Chrome) and iOS (Safari) and runs with
  no network.

---

## Run it (web / PWA)

```bash
npm install
npm run dev        # local dev server (Vite)
npm run build      # type-check + production build -> dist/
npm run preview    # serve the production build
```

Open it on a phone (or a desktop browser's mobile emulation). **Tap once first**
— mobile browsers only allow audio to start inside a user gesture, so the first
touch unlocks the sound.

Deploy `dist/` to any static host (the included `vercel.json` makes Vercel
zero-config). Installing to the home screen gives a full-screen, offline,
app-like experience on both platforms.

### Icons

App icons are generated (no design tools needed) from a tiny rasterizer:

```bash
npm run icons      # writes public/icons/*.png
```

---

## Native builds (Android & iOS app stores)

The web build is wrapped into real native apps with
[Capacitor](https://capacitorjs.com). Config lives in `capacitor.config.ts`
(`appId: com.airhornhero.app`, `webDir: dist`).

```bash
# one-time platform scaffolding (generates the android/ and ios/ projects)
npm run build
npx cap add android
npx cap add ios          # macOS + Xcode required for iOS

# after any web change, push it into the native shells
npm run cap:sync         # = npm run build && cap sync

# open the native IDEs to run on a device / build a store artifact
npm run cap:open:android # Android Studio -> build APK/AAB
npm run cap:open:ios     # Xcode -> build/Archive for the App Store
```

Notes:
- **Android** needs Android Studio + SDK; **iOS** needs a Mac with Xcode and a
  signing identity. Those toolchains can't run in this cloud sandbox, so the
  `android/` and `ios/` projects are generated locally by `cap add` rather than
  committed here.
- The synthesized audio uses standard Web Audio, which works inside both
  Capacitor webviews — no plugins required.

---

## Project layout

```
index.html                 # app shell (PWA meta, mounts #app)
capacitor.config.ts        # native build config
public/
  manifest.webmanifest     # installable PWA manifest
  sw.js                    # offline service worker
  icons/                   # generated PNG app icons
src/airhorn/
  main.ts                  # entry: mounts App, registers the service worker
  ui.ts                    # DOM shell, soundboard, game canvas + render loop
  audio.ts                 # AirhornEngine — the Web Audio synthesizer
  game.ts                  # HypeRush — timing/scoring state machine
  presets.ts               # the soundboard pads + hype pitch-up
  styles.css               # styling
tools/make-icons.mjs       # PNG icon generator (pure Node, no libraries)
```

## How the airhorn is synthesized

`AirhornEngine` (`src/airhorn/audio.ts`) stacks detuned sawtooth voices at a
root, a fifth, and an octave, pushes them through a `tanh` distortion shaper and
a resonant low-pass, adds a fast upward pitch "honk" on the attack and a gentle
vibrato, and finishes with a short generated reverb tail. Tap fires a one-shot;
press-and-hold sustains. Variant pads are the same engine with different
frequency/drive/glide settings.

---

### About the name / repo history

This branch repurposes the repository as **Airhorn Hero**. The earlier
*Thrones of Heaven* map prototype still lives on `main` (and its source remains
under `src/` for reference); the Airhorn Hero app is fully self-contained under
`src/airhorn/` and does not depend on it.

Inspired by Klang, but an original implementation — Klang's own source is not
reused or redistributed here.
