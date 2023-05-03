import TestService from "./test-service.js";
import mongoose from "mongoose";

async function main() {
  // stop mongo
  await TestService.stopMongo();

  // disconnect from mongo in mongoose connections
  await mongoose.disconnect();
}

export default main;
