import DefaultRoles from "../../src/config/default-roles.js";
import { AbstractTestUsers } from "../../src/index.js";

class TestUsers extends AbstractTestUsers {
  constructor() {
    super();
    DefaultRoles.add("Trader");
    DefaultRoles.add("Technician");
    DefaultRoles.add("Client");
  }

  /**
   * Login as trader.
   *
   * @returns {Promise<TestUser>}
   */
  async trader() {
    return this.registerRole("trader", ["Trader"]);
  }

  /**
   * Login as technician.
   *
   * @returns {Promise<TestUser>}
   */
  async technician() {
    return this.registerRole("technician", ["Technician"]);
  }

  /**
   * Login as client.
   *
   * @returns {Promise<TestUser>}
   */
  async client() {
    return this.registerRole("client", ["Client"]);
  }
}

export default new TestUsers();
