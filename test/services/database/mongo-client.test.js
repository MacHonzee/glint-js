import { jest, beforeEach, describe, it, expect, afterAll } from "@jest/globals";
import { MongoClient, Config, SecretManager, mongoose } from "../../../src/index.js";

async function closeCachedConnections() {
  for (const entry of Object.values(MongoClient.connections)) {
    if (typeof entry?.connection?.close === "function") {
      await entry.connection.close().catch(() => {});
    }
  }
  MongoClient.connections = {};
}

function mockConnection({ readyState = 0 } = {}) {
  const connection = {
    _readyState: readyState,
    get readyState() {
      return this._readyState;
    },
    set: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
    openUri: jest.fn().mockImplementation(async function openUri() {
      this._readyState = 1;
      return this;
    }),
  };
  return connection;
}

describe("MongoClient", () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
    jest.spyOn(SecretManager, "get");
    Config.set("MONGODB_DISABLED", false);
    Config.set("PRIMARY_MONGODB_URI", "");
    Config.set("AUTH_MONGODB_URI", "");
    await closeCachedConnections();
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

    it("returns this key's handle after init, not the fallback object", async () => {
      const fallbackConn = mockConnection({ readyState: 1 });
      MongoClient.connections.FALLBACK = {
        connection: fallbackConn,
        uri: "mongodb://localhost:27017/fallback",
        fallbackKey: undefined,
      };

      const primaryConn = mockConnection();
      jest.spyOn(mongoose, "createConnection").mockReturnValue(primaryConn);
      SecretManager.get.mockResolvedValue("mongodb://localhost:27017/primary");

      const result = await MongoClient.getConnection("PRIMARY", "FALLBACK");
      expect(result).toBe(primaryConn);
      expect(result).not.toBe(fallbackConn);
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
      const connection = mockConnection();
      jest.spyOn(mongoose, "createConnection").mockReturnValue(connection);
      SecretManager.get.mockResolvedValue("mongodb://localhost:27017/primary");

      const client = new MongoClient();
      await client.init();
      expect(runExclusiveSpy).toHaveBeenCalledWith(expect.any(Function));
    });

    it("does not openUri when this key is already connected", async () => {
      const connection = mockConnection({ readyState: 1 });
      MongoClient.connections.PRIMARY = {
        connection,
        uri: "mongodb://localhost:27017/primary",
        fallbackKey: undefined,
      };
      const client = new MongoClient();
      await client.init();
      expect(connection.openUri).not.toHaveBeenCalled();
      expect(client.connection).toBe(connection);
    });

    it("opens this key's handle with openUri", async () => {
      const connection = mockConnection();
      jest.spyOn(mongoose, "createConnection").mockReturnValue(connection);
      const mongoUri = "mongodb://localhost:27017/primary";
      SecretManager.get.mockResolvedValue(mongoUri);

      const client = new MongoClient();
      await client.init();

      expect(connection.openUri).toHaveBeenCalledWith(mongoUri, { autoIndex: false });
      expect(MongoClient.connections.PRIMARY).toMatchObject({
        connection,
        uri: mongoUri,
      });
      expect(client.connection).toBe(connection);
    });

    it("throws when openUri fails", async () => {
      const connection = mockConnection();
      connection.openUri.mockRejectedValue(new Error("connection error"));
      jest.spyOn(mongoose, "createConnection").mockReturnValue(connection);
      SecretManager.get.mockResolvedValue("mongodb://localhost:27017/primary");

      const client = new MongoClient();
      await expect(client.init()).rejects.toThrow("connection error");
    });
  });

  describe("fallback connections", () => {
    it("opens the requested key with the fallback URI", async () => {
      const fallbackUri = "mongodb://localhost:27017/fallback";
      Config.set("FALLBACK_MONGODB_URI", fallbackUri);
      SecretManager.get.mockResolvedValue(undefined);

      const connection = mockConnection();
      jest.spyOn(mongoose, "createConnection").mockReturnValue(connection);

      const client = new MongoClient("PRIMARY", "FALLBACK");
      await client.init();

      expect(connection.openUri).toHaveBeenCalledWith(fallbackUri, { autoIndex: false });
      expect(MongoClient.connections.PRIMARY).toBeDefined();
      expect(MongoClient.connections.PRIMARY.connection).toBe(connection);
      expect(MongoClient.connections.PRIMARY.uri).toBe(fallbackUri);
    });

    it("does not skip AUTH init just because PRIMARY is already open", async () => {
      const primaryConn = mockConnection({ readyState: 1 });
      MongoClient.connections.PRIMARY = {
        connection: primaryConn,
        uri: "mongodb://localhost:27017/primary",
        fallbackKey: undefined,
      };

      const authConn = mockConnection();
      jest.spyOn(mongoose, "createConnection").mockReturnValue(authConn);
      Config.set("AUTH_MONGODB_URI", "");
      Config.set("PRIMARY_MONGODB_URI", "mongodb://localhost:27017/primary");
      SecretManager.get.mockResolvedValue(undefined);

      await new MongoClient("AUTH", "PRIMARY").init();

      expect(authConn.openUri).toHaveBeenCalledWith("mongodb://localhost:27017/primary", { autoIndex: false });
      expect(MongoClient.connections.AUTH.connection).toBe(authConn);
      expect(MongoClient.connections.AUTH.connection).not.toBe(primaryConn);
    });

    it("throws when no URI is available and no fallback", async () => {
      SecretManager.get.mockResolvedValue(undefined);
      const connection = mockConnection();
      jest.spyOn(mongoose, "createConnection").mockReturnValue(connection);

      const client = new MongoClient("UNKNOWN");
      await expect(client.init()).rejects.toThrow("MongoDB connection not specified");
    });

    it("getConnection opens NONEXISTENT with FALLBACK URI instead of returning FALLBACK's object", async () => {
      const fallbackUri = "mongodb://localhost:27017/lazy-fallback";
      Config.set("LAZYFB_MONGODB_URI", fallbackUri);
      SecretManager.get.mockResolvedValue(undefined);

      const existingFallback = mockConnection({ readyState: 1 });
      MongoClient.connections.LAZYFB = {
        connection: existingFallback,
        uri: fallbackUri,
        fallbackKey: undefined,
      };

      const newConn = mockConnection();
      jest.spyOn(mongoose, "createConnection").mockReturnValue(newConn);

      const result = await MongoClient.getConnection("NOPRIMARY", "LAZYFB");
      expect(result).toBe(newConn);
      expect(result).not.toBe(existingFallback);
      expect(MongoClient.connections.NOPRIMARY.connection).toBe(newConn);
    });
  });

  describe("ensureHandle", () => {
    it("returns a disconnected connection without resolving a URI", () => {
      const secretSpy = jest.spyOn(SecretManager, "get");
      const connection = MongoClient.ensureHandle("PRIMARY", "FALLBACK");

      expect(connection).toBeInstanceOf(mongoose.Connection);
      expect(connection.readyState).toBe(0);
      expect(MongoClient.connections.PRIMARY).toMatchObject({
        connection,
        uri: null,
        fallbackKey: "FALLBACK",
      });
      expect(secretSpy).not.toHaveBeenCalled();
    });

    it("reuses the same handle for the same key", () => {
      const first = MongoClient.ensureHandle("AUTH", "PRIMARY");
      const second = MongoClient.ensureHandle("AUTH", "PRIMARY");
      expect(second).toBe(first);
    });

    it("records fallbackKey later if it was unset", () => {
      MongoClient.ensureHandle("ORDERS");
      MongoClient.ensureHandle("ORDERS", "PRIMARY");
      expect(MongoClient.connections.ORDERS.fallbackKey).toBe("PRIMARY");
    });

    it("does not call openUri", () => {
      const openUriSpy = jest.spyOn(mongoose.Connection.prototype, "openUri");
      MongoClient.ensureHandle("PRIMARY");
      expect(openUriSpy).not.toHaveBeenCalled();
      openUriSpy.mockRestore();
    });
  });

  describe("initPrimaryAndAuth", () => {
    it("inits PRIMARY then AUTH with PRIMARY fallback", async () => {
      const order = [];
      jest.spyOn(MongoClient.prototype, "init").mockImplementation(async function mockInit() {
        order.push({ envKey: this.envKey, fallbackEnvKey: this.fallbackEnvKey });
      });

      await MongoClient.initPrimaryAndAuth();

      expect(order).toEqual([
        { envKey: "PRIMARY", fallbackEnvKey: undefined },
        { envKey: "AUTH", fallbackEnvKey: "PRIMARY" },
      ]);
    });
  });

  describe("initRegistered", () => {
    it("opens only keys that are not yet connected", async () => {
      const primary = mockConnection({ readyState: 1 });
      MongoClient.connections.PRIMARY = { connection: primary, uri: "mongodb://x", fallbackKey: undefined };

      const orders = mockConnection({ readyState: 0 });
      MongoClient.connections.ORDERS = { connection: orders, uri: null, fallbackKey: "PRIMARY" };

      const inited = [];
      jest.spyOn(MongoClient.prototype, "init").mockImplementation(async function mockInit() {
        inited.push({ envKey: this.envKey, fallbackEnvKey: this.fallbackEnvKey });
      });

      await MongoClient.initRegistered();

      expect(inited).toEqual([{ envKey: "ORDERS", fallbackEnvKey: "PRIMARY" }]);
    });
  });
});
