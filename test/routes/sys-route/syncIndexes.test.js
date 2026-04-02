import { jest, describe, it, expect } from "@jest/globals";
import { ModelWarehouse } from "../../../src/index.js";

describe("sys/syncIndexes", () => {
  it("should return success", async () => {
    // import models that we want to be rebuilt
    await import("../../../src/models/permission-model.js");
    await import("../../../src/models/refresh-token-model.js");
    await import("../../../src/models/user-model.js");

    Object.values(ModelWarehouse).forEach((model) => {
      jest.spyOn(model, "buildIndexes");
    });

    const SysRoute = (await import("../../../src/routes/sys-route.js")).default;
    const dtoOut = await SysRoute.syncIndexes();

    expect(dtoOut.results).toBeInstanceOf(Array);
    Object.values(ModelWarehouse).forEach((model) => {
      expect(model.buildIndexes).toHaveBeenCalled();
    });
  });

  it("should report 'updated' state when indexes were dropped", async () => {
    const modelName = "TestModelWithDroppedIndexes";
    ModelWarehouse[modelName] = {
      buildIndexes: jest.fn().mockResolvedValue(["index_1", "index_2"]),
    };

    try {
      const SysRoute = (await import("../../../src/routes/sys-route.js")).default;
      const dtoOut = await SysRoute.syncIndexes();

      const entry = dtoOut.results.find((r) => r.modelName === modelName);
      expect(entry).toBeDefined();
      expect(entry.state).toBe("updated");
      expect(entry.droppedIndexes).toEqual(["index_1", "index_2"]);
    } finally {
      delete ModelWarehouse[modelName];
    }
  });

  it("should skip models without buildIndexes method", async () => {
    // Add a model without buildIndexes to the warehouse
    const modelName = "TestModelWithoutBuildIndexes";
    ModelWarehouse[modelName] = { name: modelName };

    try {
      const SysRoute = (await import("../../../src/routes/sys-route.js")).default;
      const dtoOut = await SysRoute.syncIndexes();

      expect(dtoOut.results).toBeInstanceOf(Array);
      // The model without buildIndexes should not appear in results
      const resultNames = dtoOut.results.map((r) => r.modelName);
      expect(resultNames).not.toContain(modelName);
    } finally {
      delete ModelWarehouse[modelName];
    }
  });
});
