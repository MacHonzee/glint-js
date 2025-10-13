/**
 * Custom Ajv async format validator for role fields.
 * Validates that a role exists in DefaultRoles.all at the time of validation.
 *
 * This approach uses async validation to dynamically import DefaultRoles,
 * ensuring we always check against the current state (including roles added at runtime).
 *
 * Benefits:
 * - Enums are frozen at schema compilation time, this checks at runtime
 * - Supports custom roles added after schema registration
 * - Dynamic import ensures latest DefaultRoles state is used
 *
 * @param value - The role string to validate
 * @returns Promise that resolves to true if valid, false otherwise
 *
 * @example
 * // In schema definition:
 * role: { type: "string", format: "role" }
 *
 * // At runtime, this will dynamically import DefaultRoles and check:
 * DefaultRoles.all.includes(role)
 */
const RoleFormat = {
  name: "role",
  type: "string",
  format: {
    async: true,
    validate: async (value: unknown): Promise<boolean> => {
      if (typeof value !== "string") return false;
      if (value.length === 0) return false;

      // Dynamically import DefaultRoles to get the latest state
      const { default: DefaultRoles } = await import("../../../config/default-roles.js");

      return DefaultRoles.all.includes(value);
    },
  },
};

export default RoleFormat;
