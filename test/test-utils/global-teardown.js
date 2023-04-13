import TestService from "./test-service.js";
import mongoose from "mongoose";

async function main() {
  // disconnect from mongo, stop mongo and stop server
  for (const connection of mongoose.connections) {
    await connection.close();
  }
  await TestService.stopMongo();
}

export default main;
