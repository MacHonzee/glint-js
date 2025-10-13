/**
 * Custom Ajv async format validator for privileged role fields.
 * Validates that a role exists in DefaultRoles.privileged at the time of validation.
 *
 * This approach uses async validation to dynamically import DefaultRoles,
 * ensuring we always check against the current state (including roles added at runtime).
 *
 * Benefits:
 * - Enums are frozen at schema compilation time, this checks at runtime
 * - Supports custom privileged roles added after schema registration
 * - Dynamic import ensures latest DefaultRoles state is used
 *
 * @param value - The role string to validate
 * @returns Promise that resolves to true if valid, false otherwise
 *
 * @example
 * // In schema definition:
 * role: { type: "string", format: "privilegedRole" }
 *
 * // At runtime, this will dynamically import DefaultRoles and check:
 * DefaultRoles.privileged.includes(role)
 */
const PrivilegedRoleFormat = {
  name: "privilegedRole",
  type: "string",
  format: {
    async: true,
    validate: async (value: unknown): Promise<boolean> => {
      if (typeof value !== "string") return false;
      if (value.length === 0) return false;

      // Dynamically import DefaultRoles to get the latest state
      const { default: DefaultRoles } = await import("../../../config/default-roles.js");

      return DefaultRoles.privileged.includes(value);
    },
  },
};

export default PrivilegedRoleFormat;
