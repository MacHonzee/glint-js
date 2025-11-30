import { describe, it, beforeAll, expect } from "@jest/globals";
import { AuthenticationService } from "../../../src/index.js";
import { TestService, AssertionService } from "../../../src/test-utils/index.js";
import { TestUsers } from "../../test-utils/index.js";
import UserRoute from "../../../src/routes/user-route.js";
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
    // Use the same userId so authorization passes, then UserNotFound will be thrown
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

  it("should replace entire metadata object (not merge)", async () => {
    // First update with initial metadata
    const initialMetadata = {
      field1: "value1",
      field2: "value2",
    };
    const firstUpdate = {
      userId: USER.id,
      metadata: initialMetadata,
    };
    const ucEnv1 = await TestService.getUcEnv("user/updateMetadata", firstUpdate, { user: USER }, []);
    await UserRoute.updateMetadata(ucEnv1);

    // Second update with different metadata
    const newMetadata = {
      field3: "value3",
    };
    const secondUpdate = {
      userId: USER.id,
      metadata: newMetadata,
    };
    const ucEnv2 = await TestService.getUcEnv("user/updateMetadata", secondUpdate, { user: USER }, []);
    const dtoOut = await UserRoute.updateMetadata(ucEnv2);

    // Should only have new metadata, not merged with old
    expect(dtoOut.metadata).toEqual(newMetadata);
    expect(dtoOut.metadata).not.toHaveProperty("field1");
    expect(dtoOut.metadata).not.toHaveProperty("field2");
  });

  it("should set metadata to empty object when metadata is not provided", async () => {
    const dtoIn = {
      userId: USER.id,
    };
    const ucEnv = await TestService.getUcEnv("user/updateMetadata", dtoIn, { user: USER }, []);

    const dtoOut = await UserRoute.updateMetadata(ucEnv);

    expect(dtoOut.metadata).toEqual({});
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
});
