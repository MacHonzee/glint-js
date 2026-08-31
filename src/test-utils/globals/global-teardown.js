import TestService from "../test-service.js";
import { closeTestConnections } from "../close-test-connections.js";

async function main() {
  await TestService.stopMongo();
  await closeTestConnections();
}

export default main;
