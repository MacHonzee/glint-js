# BlobStore.getSignedUrl — Design Spec

**Date:** 2026-08-11  
**Status:** Approved

## Summary

Add `BlobStore.getSignedUrl(fileId, options)` that returns a V4 GCS signed URL for reading or writing a single object. Callers get a URL string; duration strings like `'15m'` are normalized via the existing `ms` dependency.

## Requirements

### Functional

1. **Signature:**
   ```js
   /**
    * @param {string} fileId - Object name in the configured bucket
    * @param {object} options
    * @param {'read'|'write'} [options.action='read']
    * @param {string|number|Date} options.expires - duration (`'15m'`), absolute `Date`, or ms epoch `number`
    * @param {string} [options.contentType] - recommended for write (PUT)
    * @returns {Promise<string>} signed URL
    */
   await BlobStore.getSignedUrl(fileId, { action: 'write', expires: '15m', contentType: 'image/jpeg' });
   ```
2. **Return value:** URL string only (not GCS’s `[url]` tuple, not `{ url, expires }`).
3. **`expires` normalization:**
   - `string` → `new Date(Date.now() + ms(expires))` (same `ms` package as auth)
   - `Date` → pass through
   - `number` → absolute ms epoch (GCS-compatible via `new Date(n)`)
   - Missing / unparseable duration string → throw a clear error
4. **`action`:** default `'read'`; only `'read'` | `'write'` accepted; anything else throws.
5. **GCS call:** `bucket.file(fileId).getSignedUrl({ version: 'v4', action, expires, contentType })`, then return the first element of the response array.
6. **Lazy init:** same `_active` / `_init()` pattern as `save` / `download` / `delete` / `setMetadata`.

### Non-functional

- No new dependencies (`ms` and `@google-cloud/storage` already present).
- Do not re-validate GCS V4’s 7-day max expiry; let the client library throw.
- Keep the method thin — no separate read/write helpers in this change.

## Architecture

### Approach: thin normalize + GCS `getSignedUrl`

```
getSignedUrl(fileId, options)
  → ensure _init
  → validate action
  → normalizeExpires(expires)
  → file.getSignedUrl({ version: 'v4', action, expires, contentType })
  → return url
```

### Out of scope

- `responseDisposition`, custom headers, `virtualHostedStyle`, `cname`, `queryParams`
- Generating upload policies / resumable-session URLs
- Public (unsigned) URLs

## Testing

Extend `test/services/blob-store/blob-store.test.js`:

1. Add `MockFile#getSignedUrl(config)` that stores the last config and resolves to `['https://signed.example/' + this.id]`.
2. Cases:
   - default `action: 'read'`
   - `action: 'write'` with `contentType`
   - `expires` as `'15m'`, `Date`, and absolute `number`
   - lazy-init when `_active === false`
   - reject missing `expires`
   - reject invalid `action`

## Error handling

| Condition | Behavior |
|-----------|----------|
| Missing `expires` | Throw before calling GCS |
| Invalid duration string (`ms` returns falsy / fails) | Throw before calling GCS |
| Invalid `action` | Throw before calling GCS |
| GCS / signing failure | Propagate as-is |

## Files touched

- `src/services/blob-store/blob-store.js` — implement `getSignedUrl` (+ small private helper for expires if useful)
- `test/services/blob-store/blob-store.test.js` — mock + coverage
