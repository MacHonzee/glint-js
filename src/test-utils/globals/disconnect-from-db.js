import { afterAll } from "@jest/globals";
import { closeTestConnections } from "../close-test-connections.js";

afterAll(async () => {
  await closeTestConnections();
});
