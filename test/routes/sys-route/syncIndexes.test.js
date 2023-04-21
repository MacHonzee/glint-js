import { jest, describe, it, expect } from "@jest/globals";
import { ModelWarehouse } from "../../../src/services/database/abstract-model.js";

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
});
