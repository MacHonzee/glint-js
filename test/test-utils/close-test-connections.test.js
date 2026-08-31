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

  it("clears MongoClient.connections even when handles were never opened", async () => {
    Config.set("MONGODB_DISABLED", false);
    await closeTestConnections();
    MongoClient.ensureHandle("AUTH", "PRIMARY");
    expect(MongoClient.connections.AUTH).toBeDefined();
    expect(MongoClient.connections.AUTH.connection.readyState).toBe(0);

    const openUriSpy = jest.spyOn(mongoose.Connection.prototype, "openUri");
    try {
      await closeTestConnections();
      expect(openUriSpy).not.toHaveBeenCalled();
      expect(MongoClient.connections).toEqual({});
    } finally {
      openUriSpy.mockRestore();
    }
  });
});
