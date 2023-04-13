import { describe, it, expect } from "@jest/globals";
import { ModelWarehouse } from "../../../src/services/database/abstract-model.js";

describe("sys/syncIndexes", () => {
  it("should return success", async () => {
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
