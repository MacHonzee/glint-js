# Changelog

## 0.14.0

`BlobStore` is no longer a process-wide singleton. Obtain instances with `BlobStore.create(options)`. Explicit `projectId`, `apiEndpoint`, `keyFilename`, and `bucketName` intern to one instance; omitted fields fall back to Config (`GOOGLE_CLOUD_PROJECT`, `GCP_STORAGE_ENDPOINT`, `GCP_KEY_FILENAME`, `GCP_BUCKET_NAME`) on first use. `list` and `deleteMany` now lazy-init like the other methods.

Breaking: `BlobStore.save(...)` and the other instance methods must be called on `BlobStore.create()` (or a named interned instance), not on the exported class.

## 0.13.5

Importing `glint-js` or a model file no longer opens MongoDB. `createModel` binds schemas to disconnected per-key handles. `Server.start()` opens PRIMARY, then AUTH (fallback PRIMARY), then any other registered keys. Scripts that query without `Server` must call `MongoClient.init` / `getConnection` / `initPrimaryAndAuth` first.

## 0.13.4

Patch: Jest per-file teardown no longer opens an AUTH Mongo connection.
