# Deferred Mongoose connections — Design Spec

**Date:** 2026-08-31  
**Status:** Approved

## Summary

Stop opening MongoDB sockets when a model file (or the `glint-js` barrel) is imported. `AbstractModel.createModel` keeps the same signature and still returns a real Mongoose model. It only binds the schema to a **disconnected** per-key connection handle. Sockets open later: `Server.start()` opens PRIMARY, then AUTH (fallback PRIMARY), then any other keys registered while routes load. `getConnection` / `init` remain the explicit lazy-open path for scripts and tests.

Importing `glint-js` or `UserService` does no network I/O.

## Requirements

### Functional

1. **`createModel(connectionKey = "PRIMARY", fallbackKey)` stays the public API.** `export default await new FooModel().createModel("AUTH", "PRIMARY")` remains valid. The function stays `async` (returns a Promise). The resolved value is a real Mongoose model (`find`, `new Model()`, `.schema`, `loadClass` statics, `ModelWarehouse` entry).
2. **`createModel` must not open a socket.** It must not call `getConnection`, Secret Manager, or `openUri`.
3. **One handle per logical key.** `AUTH`, `PRIMARY`, `ORDERS`, and any other key each own a `mongoose.Connection` for the process lifetime. Fallback never merges two keys onto one Connection object. Two handles may use the same URI (two pools); that is accepted.
4. **Fallback is URI fallback, and is generic.** For any `(key, fallbackKey)` pair: resolve `key`’s URI (`Config` then Secret Manager, same as today); if missing, resolve `fallbackKey`’s URI; if still missing, throw the existing “MongoDB connection not specified” error. Open **`key`’s handle** with that URI. Record `fallbackKey` on the handle at `ensureHandle` / `createModel` time.
5. **AUTH is a first-class connection.** `Server.start()` always opens PRIMARY, then AUTH with fallback PRIMARY, even if no AUTH URI is configured (AUTH then uses PRIMARY’s URI). AUTH is mandatory.
6. **App-specific keys** registered during route import (after PRIMARY/AUTH are already open) must still be opened before the server listens.
7. **`MONGODB_DISABLED`:** unchanged. `createModel` uses `mongoose.model(...)` on the default mongoose instance. `init` / `getConnection` return without connecting.
8. **`configureUserSchema` / `registerMetadataIndex`:** keep working at import time (schema exists on the model bound to the disconnected handle).
9. **Mutex:** keep the existing process-wide `MongoClient.mutex` around the full async open path (`already open?`, URI resolve, `openUri`). Do not wrap sync `ensureHandle` in the mutex.

### Non-functional

- Minimize consumer source changes: no new required calls in app model files that already use `await createModel(...)`.
- Barrel import must be free of Mongo network I/O (Secret Manager for URIs and `openUri` both count as I/O).
- Breaking behavior that is accepted: importing a model and querying with **no** `Server.start()` / `init` / `getConnection` no longer auto-connects on import. That path must call `init` (or use `Server`).
- Do not share one Connection object across keys (old fallback caching under the fallback key only).
- Note the behavior change in `CHANGELOG.md` (importing models no longer opens Mongo).

### Out of scope

- Proxy / facade models
- Removing top-level `await` from library model files (optional later; not required)
- Per-query schema hooks that auto-open on first `find()`
- Changing barrel exports or `UserService`’s public API
- Per-key mutexes (keep one process-wide mutex)

## Architecture

### Approach: disconnected handle at `createModel`, `openUri` at startup

```
import model file
  → new FooModel()           // schema + plugins + error middleware
  → createModel(key, fallback)
      → ensureHandle(key, fallback)   // sync, URI-less createConnection
      → loadClass + connection.model
      → ModelWarehouse[name] = model
      → return model                  // disconnected, real Mongoose Model

Server.start()
  → init PRIMARY
  → init AUTH (fallback PRIMARY)
  → register middlewares + routes     // app models may ensureHandle extra keys
  → init every registered handle that is not yet open
```

### MongoClient

Cache entry: `{ connection, uri, fallbackKey }` keyed by the **requested** env key.

| Method | Sync/async | Behavior |
|--------|------------|----------|
| `ensureHandle(key, fallbackKey)` | sync | If `connections[key]` is missing, `mongoose.createConnection({ autoIndex: false, bufferCommands: false })` (no URI). Store `{ connection, uri: null, fallbackKey }`. If the handle exists and `fallbackKey` is provided but the stored one is unset, record it. Return the Connection. No Config, no Secret Manager. |
| `init()` (instance) | async | Mutex-guarded. If `MONGODB_DISABLED`, return. `ensureHandle(this.envKey, this.fallbackEnvKey)`. If **this key’s** handle is already open (`readyState === 1`), copy it onto the instance and return. An open fallback handle does **not** count as open for this key. Resolve URI for `envKey`, else for `fallbackEnvKey` or the handle’s recorded `fallbackKey`. Throw the existing error if none. `await connection.openUri(uri, { autoIndex: false })`. Set `entry.uri` and instance `connection` / `mongoUri`. Log success, including when the URI came from fallback. **Always cache under `envKey`**, never only under the fallback key. |
| `getConnection(key, fallbackKey)` | async | If `MONGODB_DISABLED`, return `undefined`. `ensureHandle` + `init` for **that key**. Return `connections[key].connection`. Do **not** return `connections[fallbackKey]` as a stand-in. |
| `initPrimaryAndAuth()` | async | `new MongoClient("PRIMARY").init()` then `new MongoClient("AUTH", "PRIMARY").init()`. |
| `initRegistered()` | async | For each key in `connections` that is not open, `new MongoClient(key, entry.fallbackKey).init()`. |

`bufferCommands: false` so a query against a disconnected handle fails immediately instead of buffering for ~10s.

### AbstractModel.createModel

```
async createModel(connectionKey = "PRIMARY", fallbackKey) {
  const connection = Config.MONGODB_DISABLED
    ? mongoose
    : MongoClient.ensureHandle(connectionKey, fallbackKey);
  this.schema.loadClass(this.constructor);
  const modelName = this.constructor.name.replace(/Model$/, "");
  const model = connection.model(modelName, this.schema);
  ModelWarehouse[modelName] = model;
  return model;
}
```

No `await` on the Mongo path except the method remaining `async` for API compatibility.

### Server._onBeforeStart

Replace `await new MongoClient().init()` with:

1. `await MongoClient.initPrimaryAndAuth()`
2. Existing middleware + `_registerRoutes()` (RouteRegister still dynamically imports mappings; app `createModel` calls only `ensureHandle`)
3. `await MongoClient.initRegistered()`

Update RouteRegister’s comment: models no longer require a live connection at import; extra connection keys are opened in step 3.

### Library model files

Leave `user-model.js`, `permission-model.js`, and `refresh-token-model.js` on `await createModel("AUTH", "PRIMARY")`. No consumer-facing change.

### Tests / global-setup

After setting `PRIMARY_MONGODB_URI` and `AUTH_MONGODB_URI` from memory Mongo, `import("glint-js")` (registers AUTH handle, no socket), then `MongoClient.initPrimaryAndAuth()` (this also creates and opens PRIMARY; `initRegistered()` alone would skip PRIMARY if no PRIMARY model was imported), then `SysRoute.syncIndexes()`.

`closeTestConnections` must always clear `MongoClient.connections` after `mongoose.disconnect()`, even when every `readyState` was `0`. Disconnected handles would otherwise leak across tests. It still must not import the public barrel (unnecessary coupling), but barrel import will no longer open a socket.

## Data flow

1. **Barrel import:** `UserService` → `UserModel` → `createModel("AUTH", "PRIMARY")` → AUTH handle created, models registered. PRIMARY handle does not exist yet. No URI resolve.
2. **`configureUserSchema` (app startup, before `Server.start`):** mutates `UserModel.schema` on the disconnected model.
3. **`Server.start`:** open PRIMARY (creates PRIMARY handle + `openUri`), open AUTH (`openUri` on existing handle, AUTH URI or PRIMARY URI).
4. **Route load:** app models `createModel("PRIMARY")` bind to the already-open PRIMARY handle, or `createModel("ORDERS", "PRIMARY")` creates a disconnected ORDERS handle.
5. **`initRegistered`:** opens ORDERS (and any other pending keys) with URI fallback.
6. **Request handling:** models already bound; queries use open connections.

Scripts/tests that never call `Server.start()` must call `init` / `getConnection` / `initPrimaryAndAuth` before querying.

## Error handling

| Condition | Behavior |
|-----------|----------|
| Import barrel / model with no Mongo env | Success. Disconnected handle(s) only. |
| `init` / `getConnection` / `initPrimaryAndAuth` with no URI for key or fallback | Existing `MongoDB connection not specified` error (now at open time, not import). |
| `openUri` throws | Log and rethrow (same as today’s `createConnection(uri)` failure). |
| Parallel `init` of the same or different keys | Serialized by the existing process-wide mutex. |
| Query while `readyState === 0` | Immediate driver/Mongoose error (`bufferCommands: false`). No auto-open. |
| `MONGODB_DISABLED` | No handles, no sockets. |

## Testing

### `test/services/database/mongo-client.test.js`

Rewrite for handle vs open:

- `ensureHandle` is sync, does not call Secret Manager, does not `openUri`, is idempotent per key.
- `init` uses `openUri`, not `mongoose.createConnection(uri)`.
- Mutex: `init` still runs inside `runExclusive`.
- Fallback: `new MongoClient("PRIMARY", "FALLBACK").init()` with only FALLBACK URI set → `connections.PRIMARY` exists and is open with that URI; do **not** require the entry to live only under `FALLBACK`.
- `getConnection("AUTH", "PRIMARY")` returns the AUTH connection object, not PRIMARY’s, even when AUTH used PRIMARY’s URI.
- Missing URI still throws from `init`.
- `MONGODB_DISABLED` short-circuits `init` and `getConnection` as today.
- `initPrimaryAndAuth` opens PRIMARY then AUTH (AUTH may use PRIMARY URI).
- `initRegistered` opens extra keys with recorded fallback.

Mocks: URI-less `createConnection` is synchronous; do not `mockResolvedValue` that call. Mock `openUri` (or Connection#openUri) for the open path.

### `test/services/database/abstract-model.test.js`

- `createModel` does **not** call `getConnection`.
- When Mongo is enabled, it uses `ensureHandle` / a URI-less connection.
- `MONGODB_DISABLED` still calls `mongoose.model`.
- `ModelWarehouse` is populated after `createModel`.

### Import-does-not-connect

New test: import the barrel and/or `UserModel`, spy on `openUri` / `createConnection` called with a URI, assert neither ran.

### `global-setup.js`

Call `initPrimaryAndAuth()` after `import("glint-js")` and before `syncIndexes`.

### `close-test-connections`

Always clear `MongoClient.connections`. Extend tests: after a barrel/`ensureHandle` with nothing opened, teardown still empties the cache and does not call `openUri`.

### `Server`

Assert `_onBeforeStart` opens PRIMARY and AUTH (AUTH with PRIMARY fallback) and, after routes, opens any extra registered keys.

### Existing DB tests

`user-model.test.js` and route tests keep their assertions; they rely on global-setup having opened AUTH/PRIMARY.

## Consumer impact

| Consumer code | Change |
|---------------|--------|
| `await new MyModel().createModel("PRIMARY")` | None |
| `import { UserModel, UserService, Server } from "glint-js"` then `Server.start()` | None. Barrel import no longer connects; `start()` opens PRIMARY + AUTH. |
| `UserModel.configureUserSchema` before `start()` | None |
| Script: import model, query, never `init`/`start` | Must call `MongoClient.init` / `getConnection` / `initPrimaryAndAuth` first |
| Tests that imported the barrel to “warm” Mongo | Must `init` explicitly (this repo’s `global-setup` is updated) |
