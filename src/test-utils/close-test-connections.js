import mongoose from "mongoose";

/**
 * Closes Mongoose connections and clears the glint-js MongoClient cache.
 *
 * Must not import the public barrel (`src/index.js` / `glint-js`).
 *
 * @returns {Promise<void>}
 */
export async function closeTestConnections() {
  await mongoose.disconnect();
  const { default: MongoClient } = await import("../services/database/mongo-client.js");
  for (const [key, entry] of Object.entries(MongoClient.connections)) {
    if (entry?.connection && entry.connection.readyState !== 0) {
      await entry.connection.close();
    }
    delete MongoClient.connections[key];
  }
}
