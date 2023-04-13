import TestService from "./test-service.js";

const PERMISSION_SECRET = "testPermissionKey";

// TODO refactor while it is unused - return some object or instance of user that contains his info, token and roles
class TestUsers {
  tokens = {
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
    if (this.tokens.admin) return this.tokens.admin;
    const token = await this._getToken("admin");
    await this.grantPermissions("admin", ["Admin"], true);
    return token;
  }

  /**
   * Login as authority.
   *
   * @returns {Promise<string>}
   */
  async authority() {
    if (this.tokens.authority) return this.tokens.authority;
    const token = await this._getToken("authority");
    await this.grantPermissions("authority", ["Authority"]);
    return token;
  }

  /**
   * Login as trader.
   *
   * @returns {Promise<string>}
   */
  async trader() {
    if (this.tokens.trader) return this.tokens.trader;
    const token = await this._getToken("trader");
    await this.grantPermissions("trader", ["Trader"]);
    return token;
  }

  /**
   * Login as technician.
   *
   * @returns {Promise<string>}
   */
  async technician() {
    if (this.tokens.technician) return this.tokens.technician;
    const token = await this._getToken("technician");
    await this.grantPermissions("technician", ["Technician"]);
    return token;
  }

  /**
   * Login as client.
   *
   * @returns {Promise<string>}
   */
  async client() {
    if (this.tokens.client) return this.tokens.client;
    const token = await this._getToken("client");
    await this.grantPermissions("client", ["Client"]);
    return token;
  }

  /**
   * Method returns user token from cache, otherwise it registers the user.
   *
   * @param {string} user
   * @returns {Promise<string>}
   * @private
   */
  async _getToken(user) {
    const registeredUser = await TestService.callPost("user/register", {
      username: this._getUserName(user),
      password: `123${user}Password`,
      confirmPassword: `123${user}Password`,
      firstName: "User",
      lastName: user,
      email: this._getUserName(user),
      language: "en",
    });

    this.tokens[user] = "Bearer " + registeredUser.data.token;
    return this.tokens[user];
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
}

export default new TestUsers();
