# Changelog

## 0.13.5

Importing `glint-js` or a model file no longer opens MongoDB. `createModel` binds schemas to disconnected per-key handles. `Server.start()` opens PRIMARY, then AUTH (fallback PRIMARY), then any other registered keys. Scripts that query without `Server` must call `MongoClient.init` / `getConnection` / `initPrimaryAndAuth` first.

## 0.13.4

Patch: Jest per-file teardown no longer opens an AUTH Mongo connection.
