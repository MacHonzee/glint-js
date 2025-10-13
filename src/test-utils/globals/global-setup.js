import path from "path";
import dotenv from "dotenv";

async function main() {
  // check whether there is a default test app root set in order to properly set the server root for configurations
  dotenv.config({ path: path.join(process.cwd(), "env", "test.env") });

  // set the server root to the test app root
  const testAppServerRoot = process.env["DEFAULT_TEST_APP_ROOT"];
  if (testAppServerRoot) {
    const cwd = process.cwd();
    process.env["DEFAULT_SERVER_ROOT"] = path.join(cwd, testAppServerRoot);
  }

  // start mongo and save it to process, so it will get propagated to config
  // Use compiled version from dist
  const testServicePath = new URL("../../../dist/test-utils/test-service.js", import.meta.url);
  const TestService = await import(testServicePath);
  const mongoUri = await TestService.default.startMongo();
  process.env["PRIMARY_MONGODB_URI"] = mongoUri;
  process.env["AUTH_MONGODB_URI"] = mongoUri;

  // to make sure that it loads properly
  await import("glint-js");

  // Use compiled route from dist
  const sysRoutePath = new URL("../../../dist/routes/sys-route.js", import.meta.url);
  const SysRoute = (await import(sysRoutePath)).default;
  await SysRoute.syncIndexes();
}

export default main;
