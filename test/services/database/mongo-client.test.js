import { jest, beforeEach, describe, it, expect, afterAll } from "@jest/globals";
import { MongoClient, Config, SecretManager, mongoose } from "../../../src/index.js";

jest.spyOn(SecretManager, "get");

describe("MongoClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Config.set("MONGODB_DISABLED", false);
    Config.set("PRIMARY_MONGODB_URI", "");
    Config.set("AUTH_MONGODB_URI", "");
    MongoClient.connections = {};
  });

  afterAll(async () => {
    Config.set("MONGODB_DISABLED", true);
  });

  describe("getConnection", () => {
    it("returns undefined if MONGODB_DISABLED is true", async () => {
      Config.set("MONGODB_DISABLED", true);
      const connection = await MongoClient.getConnection("PRIMARY", "FALLBACK");
      expect(connection).toBeUndefined();
    });

    it("returns the connection if already established", async () => {
      const connection = mongoose.createConnection();
      MongoClient.connections.PRIMARY = { connection, uri: "mongodb://localhost:27017/primary" };
      const getConnectionSpy = jest.spyOn(mongoose, "createConnection");
      const connectionFromCache = await MongoClient.getConnection("PRIMARY", "FALLBACK");
      expect(connectionFromCache).toBe(connection);
      expect(getConnectionSpy).not.toHaveBeenCalled();
    });

    it("creates a new connection and caches it if not already established", async () => {
      const createConnectionSpy = jest.spyOn(mongoose, "createConnection").mockResolvedValue(new mongoose.Connection());
      const mongoUri = "mongodb://localhost:27017/primary";
      SecretManager.get.mockResolvedValue(mongoUri);
      await MongoClient.getConnection("PRIMARY", "FALLBACK");
      expect(createConnectionSpy).toHaveBeenCalledWith(mongoUri, { autoIndex: false });
      expect(MongoClient.connections.PRIMARY).toMatchObject({
        connection: expect.any(mongoose.Connection),
        uri: mongoUri,
      });
    });
  });

  describe("init", () => {
    it("returns immediately if MONGODB_DISABLED is true", async () => {
      Config.set("MONGODB_DISABLED", true);
      const initSpy = jest.spyOn(MongoClient.prototype, "_init");
      const client = new MongoClient();
      await client.init();
      expect(initSpy).not.toHaveBeenCalled();
    });

    it("calls _init under exclusive mutex", async () => {
      const runExclusiveSpy = jest.spyOn(MongoClient.mutex, "runExclusive");
      const client = new MongoClient();
      await client.init();
      expect(runExclusiveSpy).toHaveBeenCalledWith(expect.any(Function));
    });

    it("caches the connection if already established", async () => {
      const connection = mongoose.createConnection();
      MongoClient.connections.PRIMARY = { connection, uri: "mongodb://localhost:27017/primary" };
      const client = new MongoClient();
      await client.init();
      expect(client.connection).toBe(connection);
    });

    it("establishes a new connection and caches it if not already established", async () => {
      const createConnectionSpy = jest.spyOn(mongoose, "createConnection").mockResolvedValue(new mongoose.Connection());
      const mongoUri = "mongodb://localhost:27017/primary";
      SecretManager.get.mockResolvedValue(mongoUri);
      const client = new MongoClient();
      await client.init();
      expect(createConnectionSpy).toHaveBeenCalledWith(mongoUri, { autoIndex: false });
      expect(client.connection).toBeInstanceOf(mongoose.Connection);
      expect(MongoClient.connections.PRIMARY).toMatchObject({
        connection: expect.any(mongoose.Connection),
        uri: mongoUri,
      });
    });

    it("throws an error if unable to establish a connection", async () => {
      const createConnectionSpy = jest
        .spyOn(mongoose, "createConnection")
        .mockRejectedValue(new Error("connection error"));
      const client = new MongoClient();
      await expect(() => client.init()).rejects.toThrowError("connection error");
      expect(createConnectionSpy).toHaveBeenCalled();
    });
  });

  describe("fallback connections", () => {
    afterEach(() => {
      MongoClient.connections = {};
    });

    it("should use fallback env key when primary URI is not available", async () => {
      const fallbackUri = "mongodb://localhost:27017/fallback";
      Config.set("FALLBACK_MONGODB_URI", fallbackUri);
      SecretManager.get.mockResolvedValue(undefined);

      const mockConn = new mongoose.Connection();
      const createConnectionSpy = jest.spyOn(mongoose, "createConnection").mockResolvedValue(mockConn);

      const client = new MongoClient("PRIMARY", "FALLBACK");
      await client.init();

      expect(createConnectionSpy).toHaveBeenCalledWith(fallbackUri, { autoIndex: false });
      expect(MongoClient.connections.FALLBACK).toBeDefined();
      expect(MongoClient.connections.PRIMARY).toBeUndefined();
    });

    it("should throw error when no URI is available and no fallback", async () => {
      SecretManager.get.mockResolvedValue(undefined);

      const client = new MongoClient("UNKNOWN");
      await expect(client.init()).rejects.toThrow("MongoDB connection not specified");
    });

    it("should return existing fallback connection via getConnection", async () => {
      const mockConn = { close: jest.fn() };
      MongoClient.connections.FALLBACK = { connection: mockConn, uri: "mongodb://localhost:27017/fallback" };

      const result = await MongoClient.getConnection("NONEXISTENT", "FALLBACK");
      expect(result).toBe(mockConn);
    });

    it("should lazy-init and resolve via fallback key in getConnection", async () => {
      const fallbackUri = "mongodb://localhost:27017/lazy-fallback";
      Config.set("LAZYFB_MONGODB_URI", fallbackUri);
      SecretManager.get.mockResolvedValue(undefined);

      const mockConn = new mongoose.Connection();
      jest.spyOn(mongoose, "createConnection").mockResolvedValue(mockConn);

      const result = await MongoClient.getConnection("NOPRIMARY", "LAZYFB");
      expect(result).toBe(mockConn);
      expect(MongoClient.connections.LAZYFB).toBeDefined();
      expect(MongoClient.connections.NOPRIMARY).toBeUndefined();
    });
  });
});
