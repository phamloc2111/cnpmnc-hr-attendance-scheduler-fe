# Goong workplace map

The manager/admin Workplace page supports a Goong street map, click-to-select,
draggable workplace pin and two metre-based circles: the workplace radius in blue
and radius plus GPS tolerance in amber. Map selection, manual input and fresh GPS
update the same unsaved form. Only **Lưu cấu hình** persists settings through the
existing authorized backend API. No database migration or mobile changes are needed.

## Configure the map

1. Open [Goong Account](https://account.goong.io/), then create/select a **Maptiles key**.
   A REST API key is a different key and cannot replace it.
2. Add to `fe/.env.local` (or the frontend hosting environment):

   ```dotenv
   VITE_GOONG_MAPTILES_KEY=your-maptiles-key
   ```

3. Restart Vite after changing local environment values. For hosting, set the
   variable before `npm run build` and redeploy; Vite embeds it at build time.
4. Restrict the key to the actual website domains in the Goong console, including
   localhost for local development. A browser Maptiles key is visible in requests;
   never use a private REST/server key here or commit real keys to Git.

The map SDK, CSS and map requests load only when **Mở bản đồ Goong** is clicked.
No key means no SDK/map requests; manual coordinates and browser GPS remain usable.
Loading, network/auth/quota errors and unsupported WebGL show a fallback with retry.
The map's default viewport is for browsing and is never saved as a workplace.
Failed map loads do not change saved settings or disable manual configuration.

This integration does not call Places, autocomplete, reverse geocoding, routing or
Google Maps. Selecting/dragging a pin and drawing circles happen in the browser.
Employee attendance still uses browser GPS and backend distance checks; it does
not load this map or call Goong APIs. Existing timestamp, image, GPS accuracy and
authorization checks continue to apply.

Goong charges according to its current account plan and usage. A Free plan's
request limit does not imply recurring free credit. Consult the
[current pricing](https://goong.io/bang-gia/) and account usage dashboard.

## Implementation and validation

Use the official `@goongmaps/goong-js` 1.0.9 SDK and documented street style.
The feature includes narrow TypeScript declarations because the SDK publishes
Flow types. Overrides update the SDK's old CLI dependency `minimist` and
`@mapbox/geojson-rewind` dependency chain; do not run a broad forced audit update.

Run `npm test`, `npm run build`, and `npm audit`. Tests mock Goong/WebGL and cover
selection, disabled state, retry, cleanup, missing key and metre-based geometry.
An actual restricted Maptiles key is required to verify live tiles and billing.

References: [Goong JavaScript API](https://document.goong.io/tutorial-Javascript-Api.html),
[SDK source](https://github.com/goong-io/goong-js).
