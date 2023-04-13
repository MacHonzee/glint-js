import TestService from "./test-service.js";
import path from "path";

async function main() {
  // start mongo
  const mongoUri = await TestService.startMongo();
  process.env["PRIMARY_MONGODB_URI"] = mongoUri;
  process.env["AUTH_MONGODB_URI"] = mongoUri;

  // setup Config from correct location and save mongo uri into the config
  const cwd = process.cwd();
  const appDir = path.join(cwd, "test", "test-app");
  process.chdir(appDir);
  await import("../../src/index.js");
  process.chdir(cwd);

  // start the server
  await TestService.startServer();
  await TestService.callGet("sys/ping"); // check that it is already running
}

export default main;
