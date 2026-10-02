# TagSpark Arena

A complete static browser game for 2–4 people sharing one keyboard. Eight enlarged arenas, six optional round modifiers, a permanent double-jump toggle, speed bursts and shield bubbles. Built with Phaser 3, TypeScript and Vite. No API keys, accounts, database or game server.

## Play and scoring

Press each player's jump key to join the lobby, or use the Join button. At least two players must join. Touch another player to pass the spark. **The player who is It at time zero loses the round; everyone else gets one round win.** Most round wins wins the match. Equal wins share victory. Time as It is displayed only as a statistic, never used to override the winning rule.

Default match: three 90-second rounds. Initial It rotates fairly through the joined players. A 1.25-second tag lock prevents immediate tag-backs. Short spawn protection, gentle separation, coyote time, buffered jumps and bounded catch-up speed reduce frustration.

| Player     | Left | Right | Jump | Drop through |
| ---------- | ---- | ----- | ---- | ------------ |
| P1 Mint ●  | A    | D     | W    | S            |
| P2 Peach ▲ | ←    | →     | ↑    | ↓            |
| P3 Sunny ◆ | F    | H     | T    | G            |
| P4 Sky ■   | J    | L     | I    | K            |

Escape pauses/resumes. R restarts only while paused. Hold jump for height, tap for a short hop. Double Jump adds one air jump while active. Remap keys in the lobby; conflicts are rejected. Test everyone’s simultaneous keys before playing.

## Local setup

Use Node.js 22.12+ (Node 24 LTS recommended) and pnpm. Run from this project folder:

```sh
pnpm install --frozen-lockfile
pnpm dev --port 5173
```

Open http://127.0.0.1:5173. To create and preview the deployment:

```sh
pnpm build
pnpm preview --port 4173
```

Upload the **contents of `dist/`** to a static host. Opening index.html directly with a file:// URL is not supported; use a local HTTP server.

`npm run dev`, `npm run build` and `npm run preview` also invoke these scripts after dependencies are installed. The checked-in pnpm lockfile is the authoritative reproducible install.

## Commands and verification

```sh
pnpm test
pnpm lint
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Unit tests cover score rules, exact buzzer timing, tag locks, power-up duration, shield cooldown, double jumps, coyote-friendly movement, simultaneous input, moving platforms, portals, seeded fairness and a 56-combination map/modifier stress simulation. Browser tests cover the complete match journey, all pickups, pause, rematch, 3/4 players, resizing and accessibility.

The dev-only `?test` URL exposes repeatable test hooks and a `development_test_action` WebMCP tool. These hooks are removed from production by Vite. `read_game_status` is an optional read-only progressive enhancement for browsers supporting WebMCP. Ordinary browsers do not need it.

See `QA_REPORT.md` for which checks actually ran in the delivery environment; included tests are not automatically a claim of passing browser verification.

## Project structure

- `src/main.ts`: landing, lobby, custom match, remapping, HUD, dialogs, results and information pages.
- `src/game.ts`: Phaser rendering, fixed-step integration, particles and visual feedback.
- `src/engine.ts`: pure simulation, collision, scoring, tag/pickup rules, seeded selection.
- `src/config.ts`: gameplay tuning, player colors, control defaults and power-up configuration.
- `src/maps.ts`: eight flat, multi-level maps, portal locations and optional modifiers.
- `src/input.ts`: held keys plus queued short taps; blur/pause reset.
- `src/audio.ts`: original synthesized effects and an adjustable soft music loop.
- `src/storage.ts`: validated, fallible local settings and lifetime-stat storage.
- `src/ads.ts`: inert ad configuration and reserved placeholders.
- `src/style.css`: responsive UI and reduced-motion styling.
- `tests/`: deterministic unit tests. `e2e/`: Playwright browser tests.
- `public/`: local textures, license, favicon, manifest and 404 page.
- `vite.config.ts`: build-time canonical/OG URL and sitemap generation.

## Balance and tuning

Edit `TUNING` in `src/config.ts`. Base speed 600 units/s; speed power-up ×1.35 (810 units/s) for 4 seconds; shield 3 seconds with another 7-second cooldown; double jump 8 seconds. Ground acceleration and braking are 11000 units/s², air acceleration is 8500, and reversals gain a 1.5× acceleration multiplier. Jump impulse is 1060 with gravity 2800, so a brief tap clears the enlarged platform spacing. Catch-up starts after 9 seconds without a tag, ramps over 12 seconds, and caps at 12%. Catch-up and Speed Burst multiply, for a bounded maximum ×1.512 before any global round modifier.

Pickups telegraph for 1.1 seconds, expire after 13 active seconds, appear every 7 seconds (3.5 for Power-Up Rain), and cap at three. Shields are runners-only. Buffs reset every round. The single active modifier applies equally to everyone. With no modifiers selected, Classic is used.

Maps use a 1400 × 784 coordinate system: 40% wider and taller than before, with unchanged player collision size. Blue dashed platforms are one-way: jump up through them or hold the action key to drop through continuously. Dark platforms block sides and undersides as well as supporting players on top. Rooftop Garden, Clockwork Crossing, Crystal Cavern and Pinwheel Plaza also have solid vertical walls. Moving Platform Mayhem moves only one-way platforms to avoid crushing players. Cloud's paired low portals have a cooldown. New profiles default to Classic.

Permanent Double Jump is a separate checkbox in Customize match. It stays active for all players across every round, combines with any round modifier, resets the extra jump on landing, and suppresses redundant double-jump pickups. It defaults off and is saved with match settings. Collision regression tests cover both sides of walls, solid undersides, drop-through, and all 112 map/round-modifier/double-jump combinations with four players. Automated checks do not replace human balance testing.

Player pickup counts are recorded separately by kind during a round (`World.players[].pickups`) and aggregated in match results. Use those counts during human playtests to identify dominant power-ups. Seed reproduces map/modifier selection and initial random sequence; it is not a full input replay.

## Assets

Kenney Pattern Pack textures are locally bundled and CC0. See `ASSET_CREDITS.md` and `public/assets/License.txt`. Original drawn characters and platform shapes keep silhouettes readable. Sound is synthesized with Web Audio. The game does not fetch third-party textures, fonts or audio at runtime.

## Domain and Cloudflare Pages

1. Choose a game name/domain and check availability and renewal price with a registrar. Purchase it yourself when ready; this project has not purchased or registered anything.
2. Put this project in a Git repository and connect it to Cloudflare Pages, or upload a locally built `dist` directory.
3. For Git builds set the project root to this folder, build command `pnpm build`, output directory `dist`, and a compatible Node version. Use the lockfile for installation.
4. Set `VITE_SITE_URL=https://your-real-domain.com` in the host's build variables. Set `VITE_BASE_PATH=/` for a normal domain. No secrets are required. Rebuild after changing these values.
5. Add the domain under Workers & Pages → your Pages project → Custom domains. For an apex domain, Cloudflare requires the domain to be a Cloudflare zone with the appropriate nameservers. For a subdomain you can use the Pages-provided CNAME after associating the custom domain in the dashboard.
6. Wait for DNS and HTTPS activation, verify both the apex and www behavior, choose one canonical version, and redirect the other.
7. Test loading directly on the real domain, all pages, cached assets, 404 handling and the social preview. Fill in Contact and revise Privacy for your actual hosting/operator details.
8. Verify ownership in Google Search Console and submit `/sitemap.xml`. The sitemap is intentionally empty until the real site URL is configured. Hash-based in-app pages are not separate search landing URLs.

Official guide: https://developers.cloudflare.com/pages/configuration/custom-domains/

Netlify/Vercel: use the same build and `dist` output as a static Vite app. GitHub Pages project sites: set `VITE_BASE_PATH=/repository-name/` and set VITE_SITE_URL to the origin, e.g. `https://account.github.io`; do not include the repository path twice.

## Ads and consent

No live ads, analytics or tracking run in this version. Advertising placeholders appear only on the landing and results screens. There are no ad requests during gameplay.

To enable ads later:

1. Launch a working site with original content, clear navigation, accurate About/Privacy/Contact pages and game instructions.
2. Apply to an ad provider such as Google AdSense. Site/account approval is separate from having a working game and is not guaranteed.
3. Add only the actual publisher ID supplied by the provider. `AD_CONFIG.publisherId` in `src/ads.ts` is currently blank; setting it alone does not load an ad. A provider integration must be implemented deliberately.
4. Create `public/ads.txt` with the exact authorized entry supplied by your account. It will deploy at `/ads.txt`. No fabricated ads.txt publisher entry is included.
5. Implement the provider's current consent requirements for your audience before requesting ads. For Google advertising in the EEA/UK/Switzerland, consult its current certified-CMP requirements. Child-directed sites need their own policy review; a friendly visual style does not settle the audience classification.
6. Load provider scripts only in production and after the appropriate consent decision. Keep them disabled on localhost, previews and tests. Define an adapter around the reserved slots in `src/ads.ts`/`src/main.ts`, with reserved dimensions to prevent layout shifts.
7. Keep ordinary display ads away from gameplay and play controls. Google's game-page guidance recommends at least 150 px separation. Do not place ordinary AdSense display units in custom full-screen interstitials.
8. If eligible for H5 Games Ads, use its supported API only at natural match breaks. Keep `betweenMatches` off until that program is approved and integrated. Never interrupt a chase.
9. Never click your own ads, encourage clicks, incentivize ordinary ad clicks, or use automated/bought low-quality traffic. Test with provider test mode only.

Sources:

- Site review: https://support.google.com/adsense/answer/7584263
- Game placements: https://support.google.com/adsense/answer/2768340
- H5 Games Ads: https://support.google.com/adsense/answer/9959170
- Consent requirements: https://support.google.com/adsense/answer/13554116
- Invalid traffic: https://support.google.com/adsense/answer/16737

Revenue is not guaranteed. An estimate is page views / 1,000 × page RPM; RPM and fill vary. Retention, discoverability and genuine traffic matter. Share gameplay clips, collect feedback, publish useful map tips and updates, and add the game to suitable game communities without spam.

## Manual playtest checklist

- Join 2, 3 and 4 players; confirm unjoined players are absent.
- Hold multiple movement/jump keys on several real keyboards; remap missed combinations.
- Chase in both directions and try every route and modifier.
- Check short/long jumps, one extra air jump, drop-through, optional moving platforms and portal cooldown.
- Attempt immediate retags, shield chaining, and power-up pickups at expiry.
- Pause by Esc and by switching tabs; resume with no stuck keys or elapsed match time.
- Finish all rounds, confirm last-It loss, shared ties, next round and rematch.
- Resize, use fullscreen, inspect at 200% text size, and check mobile keyboard guidance.
- Mute sound/music, reload and verify preferences persist.
- Review browser console and confirm no advertising/network calls are made to third parties.

## Current limits

- Local multiplayer only; no online rooms, bots in playable matches, gamepad or touch controls.
- Keyboard hardware can suppress simultaneous keys. Software cannot repair hardware ghosting; remapping or a rollover-capable keyboard may be needed.
- Human balance and cross-browser testing are still valuable. Automated simulation checks validity, not whether a route is fun or competitively optimal.
- Contact is intentionally a placeholder and must be filled before launch. Advertising and consent are documented integration points, not an activated network.
- TypeScript 6 is used because the current TypeScript ESLint parser supports versions below 6.1; Phaser is pinned to 3.90 as requested, even though Phaser 4 exists.

Published game: https://tusharkumar-tag.github.io/Tag-Spark-Arena/. Site homepage: https://tusharkumar-tag.github.io/. Live advertising remains disabled; ownership verification is not ad approval.
