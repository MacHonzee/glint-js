import TestService from "./test-service.js";
import AuthenticationService from "../../src/services/authentication/authentication-service.js";

const PERMISSION_SECRET = "testPermissionKey";

class TestUsers {
  _cache = {
    admin: null,
    authority: null,
    trader: null,
    technician: null,
    client: null,
  };

  /**
   * Login as admin.
   *
   * @returns {Promise<string>}
   */
  async admin() {
    if (this._cache.admin) return this._cache.admin;
    const user = await this._registerTestUser("admin");
    await this.grantPermissions("admin", ["Admin"], true);
    return user;
  }

  /**
   * Login as authority.
   *
   * @returns {Promise<string>}
   */
  async authority() {
    if (this._cache.authority) return this._cache.authority;
    const user = await this._registerTestUser("authority");
    await this.grantPermissions("authority", ["Authority"]);
    return user;
  }

  /**
   * Login as trader.
   *
   * @returns {Promise<string>}
   */
  async trader() {
    if (this._cache.trader) return this._cache.trader;
    const user = await this._registerTestUser("trader");
    await this.grantPermissions("trader", ["Trader"]);
    return user;
  }

  /**
   * Login as technician.
   *
   * @returns {Promise<string>}
   */
  async technician() {
    if (this._cache.technician) return this._cache.technician;
    const user = await this._registerTestUser("technician");
    await this.grantPermissions("technician", ["Technician"]);
    return user;
  }

  /**
   * Login as client.
   *
   * @returns {Promise<string>}
   */
  async client() {
    if (this._cache.client) return this._cache.client;
    const user = await this._registerTestUser("client");
    await this.grantPermissions("client", ["Client"]);
    return user;
  }

  /**
   * Method returns user token from cache, otherwise it registers the user.
   *
   * @param {string} user
   * @returns {Promise<string>}
   * @private
   */
  async _registerTestUser(user) {
    const userData = {
      username: this._getUserName(user),
      password: `123${user}Password`,
      confirmPassword: `123${user}Password`,
      firstName: "User",
      lastName: user,
      email: this._getUserName(user),
      language: "en",
    };

    this._cache[user] = await this.registerUser(userData);
    return this._cache[user];
  }

  /**
   * Returns username of given user type.
   *
   * @param {string} user
   * @returns {string}
   * @private
   */
  _getUserName(user) {
    return `${user}@test.com`;
  }

  /**
   * Method grants permissions for given user.
   *
   * @param {string} user
   * @param {Array<string>} roles
   * @param {boolean} [secretGrant = false]
   * @returns {Promise<void>}
   */
  async grantPermissions(user, roles, secretGrant = false) {
    const dtoIn = {
      user: this._getUserName(user),
    };
    if (secretGrant) dtoIn.secret = PERMISSION_SECRET;

    const useCase = secretGrant ? "permission/secretGrant" : "permission/grant";
    const ucEnv = TestService.getUcEnv(useCase, dtoIn);

    const PermissionRoute = (await import("../../src/routes/permission-route.js")).default;
    for (const role of roles) {
      dtoIn.role = role;
      const routeMethod = useCase.replace("permission/", "");
      await PermissionRoute[routeMethod](ucEnv);
    }
  }

  /**
   * Method registers user to application.
   *
   * @param {object} userData
   * @returns {Promise<*>}
   */
  async registerUser(userData) {
    const UserRoute = (await import("../../src/routes/user-route.js")).default;
    await AuthenticationService.init();

    const ucEnv = await TestService.getUcEnv("user/register", userData);
    return await UserRoute.register(ucEnv);
  }

  /**
   * Method returns refresh token for selected user
   *
   * @param username
   * @param password
   * @returns {Promise<string>}
   */
  async getRefreshToken(username, password) {
    const loginData = {
      username,
      password,
    };
    const loginUcEnv = await TestService.getUcEnv("user/login", loginData);

    const UserRoute = (await import("../../src/routes/user-route.js")).default;
    await UserRoute.login(loginUcEnv);
    return loginUcEnv.response.cookie.mock.calls[0][1];
  }
}

export default new TestUsers();
