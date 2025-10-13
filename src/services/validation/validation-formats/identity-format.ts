/**
 * Custom Ajv format for identity/email validation.
 * Validates email addresses according to RFC 5322 simplified pattern.
 *
 * @example
 * // Valid identities
 * "user@example.com"
 * "user.name+tag@example.co.uk"
 * "user's.email@domain.com" (with apostrophe)
 */
const IdentityFormat = {
  name: "identity",
  format: {
    validate: (value: unknown): boolean => {
      if (typeof value !== "string") return false;

      // Matches email addresses (simplified RFC 5322 pattern)
      // Supports both regular apostrophe (') and curly apostrophe (')
      return !!value.match(/^[a-zA-Z0-9.!#$%&'\u2019*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/);
    },
  },
};

export default IdentityFormat;
