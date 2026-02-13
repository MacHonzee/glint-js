import { jest, describe, it, expect } from "@jest/globals";
import fs from "fs";
import { TestService } from "../../../src/test-utils/index.js";

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

  it("should use cached package.json on subsequent calls", async () => {
    const readFileSpy = jest.spyOn(fs.promises, "readFile").mockResolvedValueOnce(`{ "version": "2.0.0" }`);

    const SysRoute = (await import("../../../src/routes/sys-route.js")).default;
    // Reset cached value to ensure first call reads from file
    SysRoute._pkgJson = undefined;

    const ucEnv1 = await TestService.getUcEnv("sys/ping", {});
    const dtoOut1 = await SysRoute.ping(ucEnv1);
    expect(dtoOut1.version).toBe("2.0.0");

    // Second call should use cached value, readFile should not be called again
    readFileSpy.mockClear();
    const ucEnv2 = await TestService.getUcEnv("sys/ping", {});
    const dtoOut2 = await SysRoute.ping(ucEnv2);

    expect(dtoOut2.version).toBe("2.0.0");
    expect(readFileSpy).not.toHaveBeenCalled();
  });
});
