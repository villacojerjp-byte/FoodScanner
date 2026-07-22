# Olive Scan

A holistic food & cosmetic barcode scanner, in the mould of
[Olive](https://apps.apple.com/us/app/olive-food-cosmetic-scanner/id6739765789), Yuka and Fig.
Scan a barcode, get a 0–100 score, see exactly which ingredients cost it points, and get a
cleaner swap from the same aisle.

Built with **Expo (SDK 54) + React Native 0.81 + expo-router**, shipped with **EAS Build/Submit/Update**.

> **Why SDK 54?** Expo Go on the iOS App Store is stuck at 54.0.2 while Apple's review queue
> clears ([Expo, May 2026](https://expo.dev/changelog/expo-go-and-app-store-may-2026)). Newer
> SDKs need `eas go` or a development build, both requiring a paid Apple Developer account.
> SDK 54 is the last version that runs on a physical iPhone for free. The SDK 57 build is
> preserved at the `sdk-57` git tag.

## Why the data comes from Open Food Facts

Olive's and Fig's own APIs are private and auth-gated (see `FOOD-SCANNER-API-README.md`). What
they are built on top of is the open database this app uses directly:

| Category | Host |
|---|---|
| Food & drink | `https://world.openfoodfacts.org/api/v2/product/{barcode}.json` |
| Cosmetics & skincare | `https://world.openbeautyfacts.org/api/v2/product/{barcode}.json` |

No API key. The one hard requirement is a descriptive `User-Agent`; set it per environment via
`EXPO_PUBLIC_OFF_USER_AGENT` (already wired into every EAS profile). Data is **ODbL** — the
attribution shown on every product screen is required, not decorative.

A barcode alone doesn't say whether it's yoghurt or shampoo, so `fetchProduct` races both
databases and takes whichever has a real record.

## The scoring layer

Everything the API returns is raw. The "holistic" verdict is ours, and it lives in two files:

- [`src/scoring/rules.ts`](src/scoring/rules.ts) — the rule tables. Seed oils, trans fats, HFCS,
  artificial dyes, nitrites, BHA/BHT, carrageenan, parabens, phthalates, formaldehyde releasers,
  sulfates, fragrance and its EU-declarable allergens, PEGs, silicones, chemical UV filters,
  triclosan — plus high-risk E-numbers, dietary flags and user avoid-lists.
- [`src/scoring/engine.ts`](src/scoring/engine.ts) — turns a product plus the user's preferences
  into `{ score, tier, flags }`.

The design rule is that **every point lost is attributable to a visible flag**. The product screen
renders `assessment.flags` directly, so there is no hidden arithmetic and no black-box score.

Two hard caps keep the score honest:

- anything on the user's personal avoid/diet list caps the score at 38 — a product that breaks
  your own rules can never read as "clean";
- a product with no ingredient list on file caps at 55 — we can't call unknown ingredients good.

## Screens

| Route | What it does |
|---|---|
| `app/onboarding/index.tsx` | 4-step personalisation: welcome → ingredients to avoid → dietary needs → name |
| `app/(tabs)/index.tsx` | Today: scan CTA, weekly stats, active filters, recent scans, Learn cards |
| `app/(tabs)/search.tsx` | Debounced keyword search across food and cosmetics |
| `app/(tabs)/history.tsx` | Recent + saved, grouped Today / Yesterday / Earlier |
| `app/(tabs)/profile.tsx` | Edit preferences, clear cache, attribution, reset |
| `app/scan.tsx` | Full-screen camera with cut-out viewfinder, torch, manual barcode entry |
| `app/product/[barcode].tsx` | Score ring, personal alerts, nutrient breakdown, flags, colour-coded ingredients, nutrition table, smarter swaps, label claims |

The tab bar is custom ([`app/(tabs)/_layout.tsx`](app/(tabs)/_layout.tsx)) so the scan action can
sit raised in the middle — it's the highest-intent action in the app.

## Running it

```bash
npm install
npm start          # then press a / i, or scan the QR with Expo Go
npm run web        # fastest way to look at the UI
```

**On an iPhone:** install Expo Go from the App Store, put the phone on the same Wi-Fi, then scan
the QR with the **Camera app** (iOS has no in-app scanner) or enter `exp://<your-lan-ip>:8081`
manually in Expo Go. Barcode scanning works properly on a real device.

**On Android:** `npm run android` sideloads the matching Expo Go build automatically.

Emulators have no real camera, so the scanner falls back to its manual barcode-entry field —
try `3017620422003` (Nutella) or `8001090662231` (a shampoo, exercising the cosmetics path).

```bash
npm run typecheck  # tsc --noEmit
npm run doctor     # npx expo-doctor
```

## EAS

Profiles live in [`eas.json`](eas.json).

```bash
npm run build:dev       # development client, internal distribution
npm run build:preview    # installable APK / internal iOS build
npm run build:prod       # store builds, remote auto-incremented version
npm run submit:ios
npm run submit:android
npm run update           # OTA to the matching channel
```

Before the first production build, fill in:

- `eas.json` → `submit.production.ios` (`appleId`, `ascAppId`, `appleTeamId`)
- `eas.json` → `submit.production.android.serviceAccountKeyPath` (`credentials/` is git-ignored)
- run `eas init` to attach a real `projectId`

## Caching & rate limits

Open Food Facts allows roughly 100 product reads/min and 10 searches/min, so
[`src/api/openFacts.ts`](src/api/openFacts.ts):

- caches every response in memory **and** AsyncStorage for a week;
- retries once on a transient 5xx (the community hosts throw 502/503 under load);
- falls back between the legacy `cgi/search.pl`, Search-a-licious and `api/v2/search` endpoints,
  which fail independently;
- debounces search input by 550 ms;
- never fails a product screen because the swap lookup failed.

## Not medical advice

Scores are generated from open data by the rules in this repo. They are informational.
