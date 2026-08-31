import { describe, it, expect, jest } from "@jest/globals";
import mongoose from "mongoose";
import { closeTestConnections } from "../../src/test-utils/close-test-connections.js";
import MongoClient from "../../src/services/database/mongo-client.js";
import Config from "../../src/services/utils/config.js";

describe("closeTestConnections", () => {
  it("does not open AUTH when no mongoose connection is open", async () => {
    const createConnectionSpy = jest.spyOn(mongoose, "createConnection");
    try {
      await closeTestConnections();
      expect(createConnectionSpy).not.toHaveBeenCalled();
    } finally {
      createConnectionSpy.mockRestore();
    }
  });

  it("clears MongoClient.connections after a real glint connection", async () => {
    Config.set("MONGODB_DISABLED", false);
    await new MongoClient("PRIMARY").init();
    expect(MongoClient.connections.PRIMARY).toBeDefined();

    await closeTestConnections();

    expect(MongoClient.connections).toEqual({});
    expect(mongoose.connections.every((connection) => connection.readyState === 0)).toBe(true);
  });
});
