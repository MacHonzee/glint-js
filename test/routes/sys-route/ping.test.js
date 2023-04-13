import { jest, describe, it, expect } from "@jest/globals";
import fs from "fs";
import TestService from "../../test-utils/test-service.js";

describe("sys/ping", () => {
  it("should return success", async () => {
    jest.spyOn(fs.promises, "readFile").mockResolvedValueOnce(`{ "version": "1.0.3" }`);

    const SysRoute = (await import("../../../src/routes/sys-route.js")).default;
    const ucEnv = await TestService.getUcEnv("sys/ping", { hello: "world" });
    const dtoOut = await SysRoute.ping(ucEnv);

    expect(dtoOut).toEqual({
      status: "OK",
      version: "1.0.3",
      ts: expect.any(Date),
      nodeEnv: "test",
      cloudEnv: undefined,
      buildTs: undefined,
      dtoIn: { hello: "world" },
    });
  });
});
