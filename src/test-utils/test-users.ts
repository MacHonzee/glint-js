import TestService, { TestUser } from "./test-service.js";
import { AuthenticationService, DuplicateKeyError } from "../index.js";

const PERMISSION_SECRET = "testPermissionKey";

/**
 * Abstract base class for creating test users with specific roles.
 * Provides utilities for user registration, permission granting, and role management in tests.
 */
class AbstractTestUsers {
  /**
   * Cache for test users to avoid re-registration
   * @private
   */
  private _cache: {
    [role: string]: Promise<TestUser> | null;
  } = {
    admin: null,
    authority: null,
  };

  /**
   * Login as admin.
   *
   * @returns Test user with admin role
   */
  async admin(): Promise<TestUser> {
    return this.registerRole("admin", ["Admin"]);
  }

  /**
   * Login as authority.
   *
   * @returns Test user with authority role
   */
  async authority(): Promise<TestUser> {
    return this.registerRole("authority", ["Authority"]);
  }

  /**
   * Method to register a role and grant permissions.
   *
   * @param role - Role name
   * @param permissions - Array of permission names to grant
   * @returns Test user with specified role
   */
  async registerRole(role: string, permissions: string[]): Promise<TestUser> {
    if (this._cache[role]) return await this._cache[role];

    this._cache[role] = (async () => {
      const user = await this._registerTestUser(role);
      await this.grantPermissions(role, permissions, role === "admin");
      return user;
    })();

    return await this._cache[role];
  }

  /**
   * Method grants permissions for given user.
   *
   * @param user - Username or role
   * @param roles - Array of roles to grant
   * @param secretGrant - Whether to use secret grant (for bootstrapping admin)
   */
  async grantPermissions(user: string, roles: string[], secretGrant: boolean = false): Promise<void> {
    const dtoIn: any = {
      user: this._getUserName(user),
    };
    if (secretGrant) dtoIn.secret = PERMISSION_SECRET;

    const useCase = secretGrant ? "permission/secretGrant" : "permission/grant";
    const ucEnv = await TestService.getUcEnv(useCase, dtoIn);

    const PermissionRoute = (await import("../../src/routes/permission-route.js")).default;
    for (const role of roles) {
      ucEnv.dtoIn.role = role;
      const routeMethod = useCase.replace("permission/", "");
      try {
        await (PermissionRoute as any)[routeMethod](ucEnv);
      } catch (e) {
        if (!(e instanceof DuplicateKeyError)) {
          throw e;
        }
      }
    }
  }

  /**
   * Method registers user to application.
   *
   * @param userData - User registration data
   * @returns Test user
   */
  async registerUser(userData: any): Promise<TestUser> {
    const UserRoute = (await import("../../src/routes/user-route.js")).default;
    await AuthenticationService.init();

    const ucEnv = await TestService.getUcEnv("user/register", userData);

    try {
      return await UserRoute.register(ucEnv);
    } catch (e: any) {
      if (
        e instanceof UserRoute.ERRORS.RegistrationFailed &&
        e.params &&
        ((e.params as any).name === "UserExistsError" ||
          (e.params as any).cause === "A duplicate key error occurred in a database.")
      ) {
        const loginDtoIn = {
          username: userData.username,
          password: userData.password,
        };
        const loginUcEnv = await TestService.getUcEnv("user/login", loginDtoIn);
        return await UserRoute.login(loginUcEnv);
      } else {
        throw e;
      }
    }
  }

  /**
   * Method returns refresh token and CSRF token for selected user
   *
   * @param username - Username
   * @param password - Password
   * @returns Refresh token and CSRF token
   */
  async getRefreshToken(username: string, password: string): Promise<{ refreshToken: string; csrfToken: string }> {
    const loginData = {
      username,
      password,
    };
    const loginUcEnv = await TestService.getUcEnv("user/login", loginData);

    const UserRoute = (await import("../../src/routes/user-route.js")).default;
    await UserRoute.login(loginUcEnv);

    // Get refreshToken from cookie and CSRF token from response header
    const refreshToken = (loginUcEnv.response as any).cookie.mock.calls[0][1];
    const csrfToken = (loginUcEnv.response as any)._headers["x-csrf-token"];

    return { refreshToken, csrfToken };
  }

  /**
   * Method returns user token from cache, otherwise it registers the user.
   *
   * @param user - User role name
   * @returns Test user
   * @private
   */
  private async _registerTestUser(user: string): Promise<TestUser> {
    const userData = {
      username: this._getUserName(user),
      password: `123${user}Password`,
      confirmPassword: `123${user}Password`,
      firstName: "User",
      lastName: user,
      email: this._getUserName(user),
      language: "en",
    };

    return await this.registerUser(userData);
  }

  /**
   * Returns username of given user type.
   *
   * @param user - User role name
   * @returns Email address as username
   * @private
   */
  private _getUserName(user: string): string {
    return `${user}@test.com`;
  }
}

export default AbstractTestUsers;
