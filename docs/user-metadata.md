# User metadata

## Purpose

Applications often need to update `user.metadata` from more than one place (e.g. `UserRoute.updateMetadata` and a custom profile endpoint). This document describes the supported helpers and how they align with the metadata update policy configured on `UserRoute`.

## Public API

From the package entry (`glint-js`):

- **`UserMetadataService`** — static methods only; no construction required.
- **`UserRoute.setMetadataUpdatePolicy` / `getMetadataUpdatePolicy`** — policy for non-privileged self-updates on the built-in `updateMetadata` route; `getMetadataUpdatePolicy` returns a shallow clone (including a copied `immutableTopLevelKeys` array).

### `UserMetadataService` methods

| Method | Role |
|--------|------|
| `mergeMetadataPatch(base, patch)` | Deep-merge; leaf `null` removes the key. Arrays and non-plain objects are replaced, not merged. |
| `findImmutableTopLevelKeyViolation(existingMetadata, patch, immutableTopLevelKeys)` | Returns the first offending immutable top-level key, or `null`. |
| `isFilledMetadataValue(value)` | Whether a value is considered “set” for immutability (empty string / null / undefined are not filled). |
| `pickMetadataPatch(existingMetadata, rawPatch, { allowedKeys, immutableTopLevelKeys })` | Build a safe patch from raw DTO fields; disallowed keys and immutability violations are listed in `strippedKeys` (does not throw). |

Implementation lives in `src/utils/metadata-patch.js`; the service is the supported import path from the package root.

## Example (custom route / profile sync)

```javascript
import { UserRoute, UserMetadataService } from "glint-js";

const policy = UserRoute.getMetadataUpdatePolicy();
const { patch, strippedKeys } = UserMetadataService.pickMetadataPatch(user.metadata, dtoIn, {
  allowedKeys: ["phone", "email"],
  immutableTopLevelKeys: policy?.immutableTopLevelKeys ?? [],
});
const nextMetadata = UserMetadataService.mergeMetadataPatch(user.metadata, patch);
```

## Semantics summary

- **`pickMetadataPatch`**: Keys not in `allowedKeys` → ignored, named in `strippedKeys`. Allowed keys with `undefined` in `rawPatch` are omitted from `patch`. Allowed keys with `null` stay in `patch` so `mergeMetadataPatch` can remove the key. Immutable keys that already have a filled value and would change are stripped and listed in `strippedKeys`.
- **`UserRoute.updateMetadata`** continues to enforce policy by throwing on violation; these helpers are for building compatible patches elsewhere without changing route behavior.

## Migration from root-level function exports

If you previously imported `mergeMetadataPatch`, `pickMetadataPatch`, etc. directly from `glint-js`, switch to `UserMetadataService` static methods with the same names.

Deep imports under `glint-js/src/utils/metadata-patch.js` remain possible but are not the supported public API.
