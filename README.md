# Glint.js

Core server-side library (Express, Mongoose, validation, auth, and related services) with deployment patterns for Google Cloud App Engine.

## Documentation

- **[Design & feature specifications](docs/README.md)** — growing index of specs (e.g. user metadata, merge rules). Start there for integrator-facing detail.

This file is intentionally short: contributor workflow, essentials, and links. Deeper behaviour belongs in `/docs`.

## Repository

Source: [github.com/MacHonzee/glint-js](https://github.com/MacHonzee/glint-js)

---

## Contributing (local checks)

```bash
npm test
npm run analyze
```

---

## Deployment to Google App Engine

Prerequisites:

1. **Google Cloud project** — [App Engine | Google Cloud](https://cloud.google.com/appengine)
2. **MongoDB** (e.g. Atlas) — [MongoDB Atlas](https://www.mongodb.com/atlas/database)
3. **Secrets in Secret Manager** — [Secret Manager | Google Cloud](https://cloud.google.com/secret-manager)

Expected secret (among others):

| Secret name               | Typical use        |
|---------------------------|---------------------|
| `permissionGrantSecret`   | `user/secretGrant` |

> TODO: document the full secret list (Mongo, auth, grant flows) for production.
