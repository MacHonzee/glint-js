import TestService from "./test-service.js";
import mongoose from "mongoose";

async function main() {
  // disconnect from mongo in mongoose connections
  for (const connection of mongoose.connections) {
    await connection.close();
  }

  // disconnect from internal connections (if available)
  // const MongoClient = await import("../../src/services/database/mongo-client.js");
  // for (const connection of MongoClient.default.connections) {
  //   await connection.close();
  // }

  // and stop mongo
  await TestService.stopMongo();
}

export default main;
