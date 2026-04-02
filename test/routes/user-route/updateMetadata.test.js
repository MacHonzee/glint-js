import { describe, it, beforeAll, afterEach, expect } from "@jest/globals";
import { AuthenticationService } from "../../../src/index.js";
import { TestService, AssertionService } from "../../../src/test-utils/index.js";
import { TestUsers } from "../../test-utils/index.js";
import UserRoute from "../../../src/routes/user-route.js";
import UserModel from "../../../src/models/user-model.js";
import UserService from "../../../src/services/authentication/user-service.js";
import DefaultRoles from "../../../src/config/default-roles.js";

const USER = {
  username: "userformetadata@mail.com",
  password: "456ZUGfsfsg",
  confirmPassword: "456ZUGfsfsg",
  firstName: "John",
  lastName: "Doe",
  email: "userformetadata@mail.com",
  language: "en",
};

const OTHER_USER = {
  username: "otheruserformetadata@mail.com",
  password: "789XYZabc",
  confirmPassword: "789XYZabc",
  firstName: "Jane",
  lastName: "Smith",
  email: "otheruserformetadata@mail.com",
  language: "en",
};

describe("user/updateMetadata", () => {
  let testUser;
  let otherTestUser;
  let adminUser;
  let authorityUser;

  beforeAll(async () => {
    await AuthenticationService.init();
    testUser = await TestUsers.registerUser(USER);
    USER.id = testUser.user.id;
    otherTestUser = await TestUsers.registerUser(OTHER_USER);
    OTHER_USER.id = otherTestUser.user.id;
    adminUser = await TestUsers.admin();
    authorityUser = await TestUsers.authority();
  });

  afterEach(() => {
    UserRoute.setMetadataUpdatePolicy(null);
  });

  beforeEach(async () => {
    await UserModel.updateOne({ _id: USER.id }, { $set: { metadata: {} } });
    await UserModel.updateOne({ _id: OTHER_USER.id }, { $set: { metadata: {} } });
  });

  it("should successfully update metadata when userId matches session.user.id", async () => {
    const metadata = {
      customField: "customValue",
      nested: {
        data: 123,
        array: [1, 2, 3],
      },
    };
    const dtoIn = {
      userId: USER.id,
      metadata,
    };
    const ucEnv = await TestService.getUcEnv("user/updateMetadata", dtoIn, { user: USER }, []);

    const dtoOut = await UserRoute.updateMetadata(ucEnv);

    expect(dtoOut.metadata).toEqual(metadata);
    expect(dtoOut.id).toBe(USER.id);
    expect(dtoOut.username).toBe(USER.username);
  });

  it("should successfully update metadata when user has Admin role", async () => {
    const metadata = {
      adminUpdated: true,
      timestamp: Date.now(),
    };
    const dtoIn = {
      userId: USER.id,
      metadata,
    };
    const ucEnv = await TestService.getUcEnv(
      "user/updateMetadata",
      dtoIn,
      { id: adminUser.user.id, user: adminUser.user },
      [DefaultRoles.admin],
    );

    const dtoOut = await UserRoute.updateMetadata(ucEnv);

    expect(dtoOut.metadata).toEqual(metadata);
    expect(dtoOut.id).toBe(USER.id);
  });

  it("should successfully update metadata when user has Authority role", async () => {
    const metadata = {
      authorityUpdated: true,
      notes: "Updated by authority",
    };
    const dtoIn = {
      userId: OTHER_USER.id,
      metadata,
    };
    const ucEnv = await TestService.getUcEnv(
      "user/updateMetadata",
      dtoIn,
      { id: authorityUser.user.id, user: authorityUser.user },
      [DefaultRoles.authority],
    );

    const dtoOut = await UserRoute.updateMetadata(ucEnv);

    expect(dtoOut.metadata).toEqual(metadata);
    expect(dtoOut.id).toBe(OTHER_USER.id);
  });

  it("should raise error UnauthorizedMetadataUpdate when userId doesn't match and user lacks Admin/Authority roles", async () => {
    const metadata = {
      unauthorized: true,
    };
    const dtoIn = {
      userId: OTHER_USER.id,
      metadata,
    };
    const ucEnv = await TestService.getUcEnv("user/updateMetadata", dtoIn, { user: USER }, []);

    await AssertionService.assertThrows(
      () => UserRoute.updateMetadata(ucEnv),
      new UserRoute.ERRORS.UnauthorizedMetadataUpdate(),
    );
  });

  it("should raise error UserNotFound when userId doesn't exist", async () => {
    const nonExistentId = "507f1f77bcf86cd799439011"; // Valid ObjectId format but doesn't exist
    const metadata = {
      test: "value",
    };
    const dtoIn = {
      userId: nonExistentId,
      metadata,
    };
    const ucEnv = await TestService.getUcEnv(
      "user/updateMetadata",
      dtoIn,
      { id: nonExistentId, user: { id: nonExistentId, username: USER.username } },
      [],
    );

    await AssertionService.assertThrows(
      () => UserRoute.updateMetadata(ucEnv),
      new UserService.ERRORS.UserNotFound(nonExistentId),
    );
  });

  it("should merge patches into existing metadata (not replace)", async () => {
    const firstUpdate = {
      userId: USER.id,
      metadata: {
        field1: "value1",
        field2: "value2",
      },
    };
    const ucEnv1 = await TestService.getUcEnv("user/updateMetadata", firstUpdate, { user: USER }, []);
    await UserRoute.updateMetadata(ucEnv1);

    const secondUpdate = {
      userId: USER.id,
      metadata: {
        field3: "value3",
      },
    };
    const ucEnv2 = await TestService.getUcEnv("user/updateMetadata", secondUpdate, { user: USER }, []);
    const dtoOut = await UserRoute.updateMetadata(ucEnv2);

    expect(dtoOut.metadata).toEqual({
      field1: "value1",
      field2: "value2",
      field3: "value3",
    });
  });

  it("should remove a key when patch sets null", async () => {
    const ucEnv1 = await TestService.getUcEnv(
      "user/updateMetadata",
      {
        userId: USER.id,
        metadata: { keep: 1, drop: 2 },
      },
      { user: USER },
      [],
    );
    await UserRoute.updateMetadata(ucEnv1);

    const ucEnv2 = await TestService.getUcEnv(
      "user/updateMetadata",
      {
        userId: USER.id,
        metadata: { drop: null },
      },
      { user: USER },
      [],
    );
    const dtoOut = await UserRoute.updateMetadata(ucEnv2);
    expect(dtoOut.metadata).toEqual({ keep: 1 });
  });

  it("should leave metadata unchanged when metadata is omitted from dtoIn", async () => {
    const seed = { seedKey: "seedValue" };
    const ucEnv1 = await TestService.getUcEnv(
      "user/updateMetadata",
      { userId: USER.id, metadata: seed },
      { user: USER },
      [],
    );
    await UserRoute.updateMetadata(ucEnv1);

    const dtoIn = {
      userId: USER.id,
    };
    const ucEnv2 = await TestService.getUcEnv("user/updateMetadata", dtoIn, { user: USER }, []);

    const dtoOut = await UserRoute.updateMetadata(ucEnv2);

    expect(dtoOut.metadata).toEqual(seed);
  });

  it("should handle complex nested metadata structures", async () => {
    const complexMetadata = {
      userPreferences: {
        theme: "dark",
        language: "en",
        notifications: {
          email: true,
          push: false,
        },
      },
      tags: ["important", "work", "personal"],
      settings: {
        array: [1, 2, { nested: "value" }],
        nullValue: null,
        booleanValue: true,
        numberValue: 42,
      },
    };
    const dtoIn = {
      userId: USER.id,
      metadata: complexMetadata,
    };
    const ucEnv = await TestService.getUcEnv("user/updateMetadata", dtoIn, { user: USER }, []);

    const dtoOut = await UserRoute.updateMetadata(ucEnv);

    expect(dtoOut.metadata).toEqual(complexMetadata);
    expect(dtoOut.metadata.userPreferences.theme).toBe("dark");
    expect(dtoOut.metadata.tags).toHaveLength(3);
    expect(dtoOut.metadata.settings.array[2].nested).toBe("value");
  });

  it("should reject changing immutable key for non-privileged self-update", async () => {
    UserRoute.setMetadataUpdatePolicy({ immutableTopLevelKeys: ["birthnumber"] });

    const ucEnv1 = await TestService.getUcEnv(
      "user/updateMetadata",
      { userId: USER.id, metadata: { birthnumber: "first" } },
      { user: USER },
      [],
    );
    await UserRoute.updateMetadata(ucEnv1);

    const ucEnv2 = await TestService.getUcEnv(
      "user/updateMetadata",
      { userId: USER.id, metadata: { birthnumber: "second" } },
      { user: USER },
      [],
    );

    await AssertionService.assertThrows(
      () => UserRoute.updateMetadata(ucEnv2),
      new UserRoute.ERRORS.ImmutableMetadataViolation("birthnumber"),
    );
  });

  it("should allow Admin to change immutable key", async () => {
    UserRoute.setMetadataUpdatePolicy({ immutableTopLevelKeys: ["birthnumber"] });

    const ucEnv1 = await TestService.getUcEnv(
      "user/updateMetadata",
      { userId: USER.id, metadata: { birthnumber: "first" } },
      { user: USER },
      [],
    );
    await UserRoute.updateMetadata(ucEnv1);

    const ucEnv2 = await TestService.getUcEnv(
      "user/updateMetadata",
      { userId: USER.id, metadata: { birthnumber: "admin-changed" } },
      { id: adminUser.user.id, user: adminUser.user },
      [DefaultRoles.admin],
    );

    const dtoOut = await UserRoute.updateMetadata(ucEnv2);
    expect(dtoOut.metadata.birthnumber).toBe("admin-changed");
  });

  it("should call assertPatchAllowed for non-privileged self-update", async () => {
    const calls = [];
    UserRoute.setMetadataUpdatePolicy({
      assertPatchAllowed: (ctx) => {
        calls.push(ctx);
      },
    });

    const ucEnv = await TestService.getUcEnv(
      "user/updateMetadata",
      { userId: USER.id, metadata: { x: 1 } },
      { user: USER },
      [],
    );
    await UserRoute.updateMetadata(ucEnv);

    expect(calls).toHaveLength(1);
    expect(calls[0].isPrivilegedMetadataUpdate).toBe(false);
    expect(calls[0].patch).toEqual({ x: 1 });
  });
});
