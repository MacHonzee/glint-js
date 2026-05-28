# lastLoginTs — Design Spec

**Date:** 2026-05-28  
**Status:** Approved

## Summary

Add a `lastLoginTs` field to `UserModel` that records when a user last authenticated. The timestamp is updated on registration, login, and token refresh. It is returned on every API response that includes a user object, with no special projection to hide it.

## Requirements

### Functional

1. **Schema:** Add optional `lastLoginTs: Date` to the User schema. No default value — existing users remain `undefined` until their next qualifying event.
2. **Update triggers:** Set `lastLoginTs` to the current time on:
   - Successful **register** (both basic and email-verification flows)
   - Successful **login** (after password auth and verified check)
   - Successful **refreshToken** (after CSRF and token validation)
3. **Non-triggers:** Do **not** update on `changePassword`, `verifyRegistration`, metadata/username updates, or failed login attempts.
4. **API exposure:** Include `lastLoginTs` wherever a user object is returned (`login`, `register`, `refreshToken`, `get`, `list`, `setPassword`, `updateMetadata`, `changeUsername`, etc.). Do not add it to `DEFAULT_PROJECTION` exclusions.

### Non-functional

- No database migration required — MongoDB accepts the new field on next write.
- Follow existing patterns: Mongoose `Date` type (consistent with `createdAt` / `updatedAt`).

## Architecture

### Recommended approach: explicit `UserModel.recordLastLogin(userId)`

Add a static method on `UserModel` that performs an atomic update:

```javascript
static async recordLastLogin(userId) {
  return await this.findByIdAndUpdate(
    userId,
    { lastLoginTs: new Date() },
    { new: true, projection: DEFAULT_PROJECTION },
  );
}
```

Call it explicitly from the three route handlers. This keeps scope clear and avoids touching `lastLoginTs` from `_handleUserAndTokens`, which is also used by `changePassword`.

**Rejected alternatives:**

- **Flag on `_handleUserAndTokens`:** Couples timestamp logic to token handling; easy to forget on new call sites; email registration still needs a separate call.
- **Mongoose middleware:** Would fire on unrelated saves (`updateMetadata`, `changeUsername`, etc.).

### Route integration

| Route | When to call | Response handling |
|-------|--------------|-------------------|
| `register` (basic) | After `UserModel.register` succeeds | Return doc from `recordLastLogin` as `user` |
| `register` (email) | After user save, before verification email | DB updated only; response remains `{ status: "OK" }` |
| `login` | After auth + verified check | Return doc from `recordLastLogin` as `user` |
| `refreshToken` | After CSRF/token validation | Return full safe user doc from `recordLastLogin` instead of the slim refresh-token snapshot |

### refreshToken response shape change

Currently `refreshToken` returns a 4-field snapshot from the refresh-token document (`id`, `username`, `firstName`, `lastName`). After this change, it returns the full safe user document (same shape as `get` / `login`), so `lastLoginTs` and other profile fields are present and consistent.

## Files to change

| File | Change |
|------|--------|
| `src/models/user-model.js` | Add `lastLoginTs` field; add `recordLastLogin` static method |
| `src/routes/user-route.js` | Call `recordLastLogin` in `register`, `login`, `refreshToken` |
| `test/models/user-model.test.js` | Test `recordLastLogin` |
| `test/routes/user-route/login.test.js` | Assert `lastLoginTs` after login |
| `test/routes/user-route/register.test.js` | Assert `lastLoginTs` on basic register |
| `test/routes/user-route/registerEmailFlow.test.js` | Assert `lastLoginTs` in DB after email register |
| `test/routes/user-route/refreshToken.test.js` | Assert `lastLoginTs` updated on refresh |
| `test/routes/user-route/get.test.js` | Assert `lastLoginTs` present after prior login |

## Testing strategy

1. **Unit (model):** `recordLastLogin` sets `lastLoginTs` to a recent `Date` and excludes sensitive fields.
2. **Integration (routes):**
   - Login sets and returns recent `lastLoginTs`.
   - Basic register sets and returns `lastLoginTs`.
   - Email register sets `lastLoginTs` in DB even when response has no user.
   - Refresh updates `lastLoginTs` and returns it on the user object.
   - Get returns `lastLoginTs` after a prior auth event.
3. **Regression:** Existing tests continue to pass; `changePassword` does not alter `lastLoginTs`.

## Edge cases

- **Existing users:** `lastLoginTs` is `undefined` until the next register/login/refresh after deploy.
- **Email registration:** `lastLoginTs` is set at registration time even though tokens are not issued until later login.
- **Failed login:** No update.
- **Unverified login attempt:** No update (blocked before `recordLastLogin`).
