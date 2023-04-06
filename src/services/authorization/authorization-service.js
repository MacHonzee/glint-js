import LruCache from "../utils/lru-cache.js";
import RouteRegister from "../server/route-register.js";
import Permission from "../../models/permission-model.js";
import DefaultRoles from "../../config/default-roles.js";
import Config from "../utils/config.js";
import AuthorizationResult from "./authorization-result.js";

const DEFAULT_CACHE = 1000 * 60 * 5;

class AuthorizationService {
  _cache = new LruCache({
    ttl: Config.get("AUTHORIZATION_CACHE_TTL") ?? DEFAULT_CACHE,
    max: 10000,
    fetchMethod: this._fetchUserRoles,
  });

  /**
   * @param {string} useCase
   * @param {string} username
   * @returns {Promise<AuthorizationResult>}
   */
  async authorize(useCase, username) {
    const useCaseRoles = RouteRegister.getRoute(useCase)?.config?.roles;
    if (!useCaseRoles) {
      throw new Error("Role configuration not found for use case " + useCase);
    }

    const userRoles = await this.getUserRoles(username);

    let authorized;
    if (useCaseRoles.includes(DefaultRoles.authenticated)) {
      authorized = true;
    } else {
      authorized = userRoles.some((userRole) => useCaseRoles.includes(userRole));
    }

    return new AuthorizationResult({
      authorized,
      username,
      useCaseRoles,
      userRoles,
    });
  }

  /**
   * @param {string} username
   * @returns {Promise<*>}
   */
  async getUserRoles(username) {
    return await this._cache.fetch(username);
  }

  /**
   * @param username
   */
  clearUserCache(username) {
    this._cache.delete(username);
  }

  /**
   * @private
   * @param username
   * @returns {Promise<Array<string>>}
   */
  async _fetchUserRoles(username) {
    const roles = await Permission.listByUser(username);
    return roles.map((role) => role.role);
  }
}

export default new AuthorizationService();
