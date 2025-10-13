import LruCache from "../utils/lru-cache.js";
import RouteRegister from "../server/route-register.js";
import Permission from "../../models/permission-model.js";
import DefaultRoles from "../../config/default-roles.js";
import Config from "../utils/config.js";
import AuthorizationResult from "./authorization-result.js";

/**
 * Default cache TTL for authorization results (5 minutes)
 */
const DEFAULT_CACHE = 1000 * 60 * 5;

/**
 * Permission document interface
 */
interface PermissionDoc {
  role: string;
  [key: string]: any;
}

/**
 * Authorization service for role-based access control (RBAC).
 * Manages user permissions and authorizes access to use cases based on roles.
 *
 * Features:
 * - Role-based authorization for all API endpoints
 * - LRU caching of user roles for performance
 * - Special handling for "authenticated" role (grants access to all logged-in users)
 * - Permission persistence in MongoDB
 * - Cache invalidation on permission changes
 *
 * Authorization flow:
 * 1. Get required roles for the use case from RouteRegister
 * 2. Get user's roles from cache or database
 * 3. Check if user has any of the required roles
 * 4. Return AuthorizationResult with decision and metadata
 *
 * Special roles:
 * - "public": Accessible without authentication
 * - "authenticated": Accessible by any logged-in user
 * - "admin": Administrator role
 * - "authority": Service-to-service role
 *
 * @example
 * // Authorize a user for a use case
 * const result = await AuthorizationService.authorize(
 *   "/user/profile",
 *   "user@example.com"
 * );
 *
 * if (result.authorized) {
 *   console.log("Access granted");
 * } else {
 *   console.log("Access denied");
 * }
 *
 * // Clear cache after permission change
 * AuthorizationService.clearUserCache("user@example.com");
 */
class AuthorizationService {
  /** LRU cache for user roles */
  private _cache: LruCache<string, string[]>;

  constructor() {
    this._cache = new LruCache({
      ttl: Number(Config.get("AUTHORIZATION_CACHE_TTL") ?? DEFAULT_CACHE),
      max: 10000,
      fetchMethod: this._fetchUserRoles.bind(this),
    });
  }

  /**
   * Authorizes a user for a specific use case.
   * Checks if the user has any of the roles required by the use case.
   *
   * @param useCase - The use case path (e.g., "/user/profile")
   * @param username - The user's email address
   * @returns Authorization result with decision and metadata
   * @throws Error if role configuration is not found for the use case
   *
   * @example
   * const result = await AuthorizationService.authorize(
   *   "/admin/users",
   *   "admin@example.com"
   * );
   *
   * if (result.authorized) {
   *   // Allow access
   * } else {
   *   // Deny access
   *   console.log("Required roles:", result.useCaseRoles);
   *   console.log("User roles:", result.userRoles);
   * }
   */
  async authorize(useCase: string, username: string): Promise<AuthorizationResult> {
    const useCaseRoles = RouteRegister.getRoute(useCase)?.config?.roles;
    if (!useCaseRoles) {
      throw new Error("Role configuration not found for use case " + useCase);
    }

    const userRoles = await this.getUserRoles(username);

    let authorized: boolean;
    if (useCaseRoles.includes(DefaultRoles.authenticated)) {
      // Special case: "authenticated" role grants access to all logged-in users
      authorized = true;
    } else {
      // Check if user has any of the required roles
      authorized = userRoles.some((userRole) => useCaseRoles.includes(userRole));
    }

    return new AuthorizationResult({
      authorized,
      username,
      useCaseRoles,
      userRoles,
      useCase,
    });
  }

  /**
   * Gets all roles for a user.
   * Results are cached in memory for performance.
   *
   * @param username - The user's email address
   * @returns Array of role names
   *
   * @example
   * const roles = await AuthorizationService.getUserRoles("user@example.com");
   * console.log(roles); // ["authenticated", "premium", "editor"]
   */
  async getUserRoles(username: string): Promise<string[]> {
    return await (this._cache as any).fetch(username);
  }

  /**
   * Clears the cached roles for a user.
   * Should be called after granting or revoking permissions.
   *
   * @param username - The user's email address
   *
   * @example
   * // After granting a new permission
   * await Permission.grant(username, "editor");
   * AuthorizationService.clearUserCache(username);
   */
  clearUserCache(username: string): void {
    (this._cache as any).delete(username);
  }

  /**
   * Fetches user roles from the database.
   * Called by the LRU cache when a user's roles are not cached.
   *
   * @param username - The user's email address
   * @returns Array of role names
   * @private
   */
  private async _fetchUserRoles(username: string): Promise<string[]> {
    const roles = (await Permission.listByUser(username)) as PermissionDoc[];
    return roles.map((role) => role.role);
  }
}

export default new AuthorizationService();
