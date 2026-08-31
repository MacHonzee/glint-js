import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";

async function main() {
  dotenv.config({ path: path.join(process.cwd(), "env", "test.env") });

  const testAppServerRoot = process.env["DEFAULT_TEST_APP_ROOT"];
  if (testAppServerRoot) {
    const cwd = process.cwd();
    process.env["DEFAULT_SERVER_ROOT"] = path.join(cwd, testAppServerRoot);
  }

  const TestService = await import("../test-service.js");
  const mongoUri = await TestService.default.startMongo();
  process.env["PRIMARY_MONGODB_URI"] = mongoUri;
  process.env["AUTH_MONGODB_URI"] = mongoUri;

  const originalOpenUri = mongoose.Connection.prototype.openUri;
  let openUriCalls = 0;
  mongoose.Connection.prototype.openUri = function patchedOpenUri(...args) {
    openUriCalls += 1;
    return originalOpenUri.apply(this, args);
  };

  const originalCreateConnection = mongoose.createConnection.bind(mongoose);
  let createConnectionWithUri = 0;
  mongoose.createConnection = function patchedCreateConnection(...args) {
    if (typeof args[0] === "string") createConnectionWithUri += 1;
    return originalCreateConnection(...args);
  };

  await import("glint-js");

  mongoose.Connection.prototype.openUri = originalOpenUri;
  mongoose.createConnection = originalCreateConnection;

  if (openUriCalls !== 0 || createConnectionWithUri !== 0) {
    throw new Error(
      `Importing glint-js opened Mongo (openUri=${openUriCalls}, createConnection(uri)=${createConnectionWithUri}).`,
    );
  }

  const { default: MongoClient } = await import("../../services/database/mongo-client.js");
  await MongoClient.initPrimaryAndAuth();

  const SysRoute = (await import("../../../src/routes/sys-route.js")).default;
  await SysRoute.syncIndexes();
}

export default main;
