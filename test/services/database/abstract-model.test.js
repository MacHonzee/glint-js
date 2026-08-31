import { jest, beforeAll, afterAll, describe, it, expect } from "@jest/globals";
import { AbstractModel, ModelWarehouse, MongoClient, Config, mongoose } from "../../../src/index.js";

describe("AbstractModel", () => {
  let connection;
  let model;

  beforeAll(() => {
    connection = mongoose.createConnection();
    jest.spyOn(connection, "model");
    jest.spyOn(mongoose, "model");
    jest.spyOn(MongoClient, "ensureHandle").mockReturnValue(connection);
    jest.spyOn(MongoClient, "getConnection");
  });

  afterAll(async () => {
    MongoClient.ensureHandle.mockRestore();
    MongoClient.getConnection.mockRestore();
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
        MongoClient.getConnection.mockClear();
        MongoClient.ensureHandle.mockClear();
        await model.createModel("AUTH", "PRIMARY");
      });

      it("does not call getConnection", () => {
        expect(MongoClient.getConnection).not.toHaveBeenCalled();
      });

      it("binds the model via ensureHandle", () => {
        expect(MongoClient.ensureHandle).toHaveBeenCalledWith("AUTH", "PRIMARY");
        expect(connection.model).toHaveBeenCalledWith("Test", model.schema);
        expect(ModelWarehouse.Test).toBeDefined();
      });
    });
  });
});
