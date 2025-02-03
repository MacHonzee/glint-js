import { jest, beforeAll, afterAll, describe, it, expect } from "@jest/globals";
import { AbstractModel, ModelWarehouse, MongoClient, Config, mongoose } from "../../../src/index.js";

MongoClient.getConnection = jest.fn();

describe("AbstractModel", () => {
  let connection;
  let model;

  beforeAll(() => {
    connection = mongoose.createConnection();
    jest.spyOn(connection, "model");
    jest.spyOn(mongoose, "model");
    MongoClient.getConnection.mockResolvedValue(connection);
  });

  afterAll(async () => {
    await connection.close();
  });

  describe("#createModel", () => {
    beforeAll(() => {
      class TestModel extends AbstractModel {}

      const schema = new mongoose.Schema({
        name: String,
        age: Number,
      });

      model = new TestModel(schema);
    });

    describe("when MONGODB_DISABLED is true", () => {
      beforeAll(async () => {
        Config.set("MONGODB_DISABLED", true);
        await model.createModel();
      });

      it("creates the model with mongoose", () => {
        expect(mongoose.model).toHaveBeenCalledWith("Test", model.schema);
        expect(ModelWarehouse.Test).toBeDefined();
      });
    });

    describe("when MONGODB_DISABLED is false", () => {
      beforeAll(async () => {
        Config.set("MONGODB_DISABLED", false);
        await model.createModel();
      });

      it("gets a connection from the MongoClient", () => {
        expect(MongoClient.getConnection).toHaveBeenCalledWith("PRIMARY", undefined);
      });

      it("creates the model with the connection", () => {
        expect(connection.model).toHaveBeenCalledWith("Test", model.schema);
        expect(ModelWarehouse.Test).toBeDefined();
      });
    });
  });

  // TODO test to check that it raises DuplicateKeyError
});
