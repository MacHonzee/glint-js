import LruCache from './lru-cache.js';
import RouteRegister from './route-register.js';
import Permission from '../models/permission-model.js';

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

    const authorized = userRoles.some((userRole) => useCaseRoles.includes(userRole));

    return {
      authorized,
      user: user.identity,
      useCaseRoles,
      userRoles,
    };
  }

  async getUserRoles(user) {
    return await this._cache.fetch(user.identity);
  }

  async _fetchUserRoles(identity) {
    const roles = await Permission.listByUser(identity);
    return roles.map((role) => role.role);
  }
}

export default new AuthorizationService();
