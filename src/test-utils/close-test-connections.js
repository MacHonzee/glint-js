import mongoose from "mongoose";

/**
 * Closes Mongoose connections and clears the glint-js MongoClient cache.
 *
 * Must not import the public barrel (`src/index.js` / `glint-js`). That evaluates
 * UserModel and opens an AUTH connection even when the current test file never
 * used the database.
 *
 * @returns {Promise<void>}
 */
export async function closeTestConnections() {
  const hadOpenConnections = mongoose.connections.some((connection) => connection.readyState !== 0);
  await mongoose.disconnect();
  if (!hadOpenConnections) {
    return;
  }
  const { default: MongoClient } = await import("../services/database/mongo-client.js");
  for (const [key, entry] of Object.entries(MongoClient.connections)) {
    if (entry?.connection && entry.connection.readyState !== 0) {
      await entry.connection.close();
    }
    delete MongoClient.connections[key];
  }
}
