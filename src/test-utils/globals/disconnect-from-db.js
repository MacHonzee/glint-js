import { afterAll } from "@jest/globals";
import mongoose from "mongoose";

afterAll(async () => {
  await mongoose.disconnect();

  // and disconnect from mongo in glint-js connections
  const { MongoClient } = await import("../../index.js");
  for (const [key, connection] of Object.entries(MongoClient.connections)) {
    await connection.connection.close();
    delete MongoClient.connections[key];
  }
});
