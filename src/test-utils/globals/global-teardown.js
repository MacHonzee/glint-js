import mongoose from "mongoose";

async function main() {
  // Use compiled version from dist
  const testServicePath = new URL("../../../dist/test-utils/test-service.js", import.meta.url);
  const TestService = (await import(testServicePath)).default;

  // stop mongo
  await TestService.stopMongo();

  // disconnect from mongo in mongoose connections
  await mongoose.disconnect();

  // and disconnect from mongo in glint-js connections
  const { MongoClient } = await import("glint-js");
  for (const connection of Object.values(MongoClient.connections)) {
    await connection.connection.close();
  }
}

export default main;
