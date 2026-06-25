# Building Airhorn Hero for Android & iOS

Airhorn Hero is a static web app wrapped with [Capacitor](https://capacitorjs.com),
so the *same* code that runs in the browser becomes a real native app you can
submit to the Play Store and App Store. There is no web build step — Capacitor
just packages the static files in `www/`.

---

## 0. Prerequisites

- **Node.js 18+** (for the Capacitor CLI and the `copy-www` step).
- **Android:** [Android Studio](https://developer.android.com/studio) (includes
  the Android SDK + an emulator). Works on Windows, macOS, or Linux.
- **iOS:** a **Mac** with [Xcode](https://developer.apple.com/xcode/) and
  [CocoaPods](https://cocoapods.org) (`sudo gem install cocoapods`). iOS apps can
  only be built on macOS — this is an Apple requirement, not a Capacitor one.

```bash
cd airhorn-game
npm install
```

---

## 1. Android (APK / AAB)

```bash
npm run android:add      # copies www/ then `cap add android` -> creates ./android
npm run android:open     # opens the project in Android Studio
```

In Android Studio:

1. Let Gradle finish syncing.
2. **Run ▶** on an emulator or a USB-connected device to test.
3. To produce a shippable build: **Build → Generate Signed Bundle / APK**
   - choose **Android App Bundle (.aab)** for the Play Store, or **APK** for
     sideloading,
   - create/select a signing key when prompted.

After changing any web file, re-sync before rebuilding:

```bash
npm run cap:sync         # re-copies www/ and updates the native projects
```

---

## 2. iOS (IPA) — macOS only

```bash
npm run ios:add          # copies www/ then `cap add ios` -> creates ./ios
npx cap open ios         # opens the project in Xcode
```

In Xcode:

1. Select the **App** target → **Signing & Capabilities** → pick your Apple
   Developer **Team** (a free account works for running on your own device).
2. Choose a simulator or your plugged-in iPhone and press **Run ▶**.
3. To ship: **Product → Archive**, then distribute through the Organizer
   (App Store Connect / TestFlight / Ad Hoc).

Re-sync after web changes the same way: `npm run cap:sync`.

---

## 3. App identity

Edit [`capacitor.config.json`](./capacitor.config.json) before your first
`cap add` to set your own values:

| Field     | Current               | What it is                                  |
| --------- | --------------------- | ------------------------------------------- |
| `appId`   | `com.airhornhero.app` | Reverse-DNS bundle id. **Must be globally unique** before store submission — change it to your own domain. |
| `appName` | `Airhorn Hero`        | Display name under the icon.                |

App icons live in [`icons/`](./icons). For polished per-platform icon and splash
generation, the standard tool is
[`@capacitor/assets`](https://github.com/ionic-team/capacitor-assets):

```bash
npx @capacitor/assets generate --iconBackgroundColor '#ff5a2b' --iconBackgroundColorDark '#0d0f1a'
```

(point it at a 1024×1024 source; `icons/icon-512.png` here is a good starting
point, upscale to 1024 for store-quality output).

---

## 4. Why these choices

- **No audio files** → nothing to license, ship, or lazy-load; the synth in
  `audio.js` builds every honk from oscillators at runtime.
- **No web bundler** → the `www/` payload is just the hand-written files, so the
  native shell loads instantly and the project stays easy to read.
- **`www/`, `android/`, `ios/`, and `node_modules/` are git-ignored** — they're
  generated. Commit only the source; regenerate the native projects with the
  commands above on any machine.

---

## Troubleshooting

- **No sound on iOS:** audio must start from a user gesture. The app already
  unlocks the `AudioContext` on first tap — make sure you tapped a pad / Start.
- **`cap: command not found`:** run the npm scripts (which use the local CLI) or
  prefix with `npx`, e.g. `npx cap sync`.
- **Gradle / SDK errors:** open Android Studio once and let it install the SDK
  components it prompts for, then re-run.
- **Stale assets after editing web files:** run `npm run cap:sync` — `cap add`
  only copies `www/` the first time.
