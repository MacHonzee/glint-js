/**
 * Type definition for role categories
 */
type RoleType = "application" | "privileged" | "protected" | string;

/**
 * Interface for the DefaultRoles configuration object
 */
interface IDefaultRoles {
  /** Administrator role with full system access */
  admin: string;
  /** Public role for unauthenticated users */
  public: string;
  /** Authenticated role for logged-in users */
  authenticated: string;
  /** Authority role for service-to-service communication */
  authority: string;
  /** Array of all available roles */
  all: string[];
  /** Array of privileged roles (typically admin) */
  privileged: string[];
  /** Array of protected roles (public and authenticated) */
  protected: string[];
  /** Array of application-specific roles */
  application: string[];
  /** Method to add a new role to the configuration */
  add: (role: string, roleType?: RoleType) => void;
  /** Index signature for dynamic role additions */
  [key: string]: string | string[] | ((role: string, roleType?: RoleType) => void);
}

/**
 * Default roles configuration for the application.
 * Provides a centralized definition of system roles and role categories.
 *
 * Built-in roles:
 * - admin: Full system access
 * - public: Unauthenticated users
 * - authenticated: Logged-in users
 * - authority: Service-to-service communication
 *
 * Role categories:
 * - privileged: Roles with elevated permissions (admin)
 * - protected: Standard user roles (public, authenticated)
 * - application: Custom application-specific roles
 */
const DefaultRoles: IDefaultRoles = {
  admin: "Admin",
  public: "Public",
  authenticated: "Authenticated",
  authority: "Authority",
  all: [],
  privileged: [],
  protected: [],
  application: [],
  add: function () {}, // Placeholder, will be overwritten below
};

DefaultRoles.all = Object.values(DefaultRoles).filter((v) => typeof v === "string");
DefaultRoles.privileged = [DefaultRoles.admin];
DefaultRoles.protected = [DefaultRoles.public, DefaultRoles.authenticated];
DefaultRoles.application = [DefaultRoles.authority];

/**
 * Adds a custom role to the available roles and categorizes it.
 *
 * @param role - The name of the role to add
 * @param roleType - The category to add the role to (defaults to "application")
 *
 * @example
 * DefaultRoles.add("moderator", "privileged");
 * DefaultRoles.add("subscriber"); // Defaults to "application" category
 */
DefaultRoles.add = function add(role: string, roleType: RoleType = "application"): void {
  console.log("add role", role, roleType);
  DefaultRoles[role] = role;

  // Initialize the role type array if it doesn't exist
  if (!Array.isArray(DefaultRoles[roleType])) {
    DefaultRoles[roleType] = [];
  }

  DefaultRoles[roleType].push(role);
  DefaultRoles.all.push(role);
  console.log("DefaultRoles", DefaultRoles);
};

export default DefaultRoles;
