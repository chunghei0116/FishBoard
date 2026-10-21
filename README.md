# FISH LOG · Personal fish collection

A private fishing journal with a pixel aquarium and catch timeline. The UI follows the supplied reference: warm off-white surfaces, monospaced typography, thin borders and small blue accents.

## Fisherman’s Island

The home screen is a public, playable Three.js island with original procedural scenery and character art. Walk with WASD / arrow keys, click the ground or an object label to find a route, and press E near a station. Phones include directional touch controls. The Your island menu also opens each feature directly.

- Red toolbox: existing catch photo upload and pixel-fish generation.
- Glass aquarium: existing fish collection, placement, and details.
- Journal table: catch timeline and filters.
- Map board: existing fishing-waters view.
- Cabin: existing settings and account controls.

The island can be explored without signing in. Feature panels retain Firebase sign-in and owner-only data access. The small fish in the island scenery are decorative; saved catches are shown inside the authenticated aquarium. Gameplay pauses while panels are open. Reduced motion disables decorative movement.

Run `npm run test:island` for boundary, movement, interaction-range, and route-finding checks.

The player is an original low-poly island angler: sand bucket hat, sea-blue shirt, olive fishing vest, shorts and a canvas equipment pack. Its articulated Idle/Walk loops follow movement distance. See [character design and asset workflow](art/character/README.md) for regeneration and geometry checks.

## Features

- Firebase Google sign-in. Collections are isolated by Firebase user ID.
- Firestore catch records at `users/{uid}/catches/{id}`. Server endpoints verify Firebase ID tokens; Firestore also enforces owner rules.
- Authenticated Cloudinary images. Image endpoints verify document ownership and the account-specific asset path; credentials stay server-side.
- Photo-to-pixel-fish generation through the existing OpenAI Images integration. JPG/PNG/WebP up to 10 MB.
- Independent fish swimming, turns and resting. Motion respects reduced-motion preferences and pauses off screen, in background tabs and while dragging or using the keyboard.
- Manual placement persists; autonomous swimming does not write each animation frame to Firestore.
- Responsive aquarium, timeline, collection and filters. Empty collections show clearly labelled sample fish, never counted or saved.
- The existing record fields are name, date, position and image references. Time, location and length show as unrecorded; Map explains when no location data is available.

## Local development

Requires Node.js 22.13 or newer.

```sh
npm ci
npm run dev
```

Google sign-in is real in local development. Firebase allows `localhost` and `127.0.0.1`. The public Web App configuration is in `lib/firebase-client.ts`; it contains no administrative credentials.

Generation requires server-only values in the Git-ignored `.dev.vars` file (see `.env.example`): `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` and `OPENAI_API_KEY`. Keep existing configured values when adding a key. Image generation incurs provider usage charges.

```sh
npm run test:firebase
npm run test:storage
npm run test:motion
npx tsc --noEmit
npm run build
```

## Service setup and verification

Verified on 2026-10-06:

- Firebase project `fishboard-36a96`: Google provider enabled; default Standard Firestore database created in `asia-east2` (Hong Kong).
- `firestore.rules` published: owner-only access, schema checks, immutable image references and position-only updates.
- Live Google sign-in, Firestore create, API list and position persistence passed. Anonymous access, cross-account reads and forged image-reference updates were rejected. Temporary test records were cleaned up.
- Cloudinary local credentials configured in owner-readable `.dev.vars`. Authenticated Admin API ping, a tiny test image upload and signed image read returned HTTP 200. The test image was cleaned up.
- Automated token-verification, storage rollback, account isolation and fish-motion checks passed.

OpenAI generation has not been exercised because no OpenAI key is configured locally. Firebase and Cloudinary are connected; the complete photo-to-generated-fish flow still requires that key.

## Deployment and old data

Vercel uses `vercel.json` → `npm run build:vercel` (`next build --webpack`) and the `.next` output directory. Do not use the default `npm run build` for Vercel: it runs Vinext and does not produce Next.js's `routes-manifest.json`. The Next.js build maps the API's `cloudflare:workers` environment import to server-only environment variables; it does not change the island or its feature panels.

```sh
npm run build:vercel
```

Local development and Cloudflare/Sites builds retain Vinext (`npm run dev` / `npm run build`) and native Worker bindings. Production must receive the Cloudinary credentials and OpenAI key as server secrets; local `.dev.vars` is not deployed. For local Next.js verification, use an ignored `.env.local`. Never prefix server secrets with `NEXT_PUBLIC_`. Add the actual deployed hostname to Firebase Authentication's authorized domains before using Google login there. Build success does not indicate deployment.

New catch records use Firestore. Existing D1 records, migrations and R2 objects are preserved, but are not automatically imported or shown under Firebase accounts. A later migration needs an explicit mapping from the old account IDs to Firebase UIDs. No service-account key or unsigned Cloudinary upload preset is needed.
