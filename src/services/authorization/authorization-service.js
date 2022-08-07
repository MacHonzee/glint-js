import LruCache from '../utils/lru-cache.js';
import RouteRegister from '../server/route-register.js';
import Permission from '../../models/permission-model.js';
import DefaultRoles from '../../config/default-roles.js';

const DEFAULT_CACHE = 1000 * 60 * 5;

class AuthorizationService {
  constructor() {
    this._cache = new LruCache({
      ttl: process.env.AUTHORIZATION_CACHE_TTL ?? DEFAULT_CACHE,
      max: 10000,
      fetchMethod: this._fetchUserRoles,
    });
  }

  async authorize(useCase, user) {
    const useCaseRoles = RouteRegister.getRoute(useCase)?.config?.roles;
    if (!useCaseRoles) {
      throw new Error('Role configuration not found for use case ' + useCase);
    }

    const userRoles = await this.getUserRoles(user);

    let authorized;
    if (useCaseRoles.includes(DefaultRoles.authenticated)) {
      authorized = true;
    } else {
      authorized = userRoles.some((userRole) => useCaseRoles.includes(userRole));
    }

    return {
      authorized,
      user: user,
      useCaseRoles,
      userRoles,
    };
  }

  async getUserRoles(user) {
    return await this._cache.fetch(user);
  }

  async _fetchUserRoles(user) {
    const roles = await Permission.listByUser(user);
    return roles.map((role) => role.role);
  }
}

export default new AuthorizationService();
