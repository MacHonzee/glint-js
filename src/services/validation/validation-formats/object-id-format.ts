/**
 * Custom Ajv format for MongoDB ObjectId validation.
 * Validates that a string is a valid 24-character hexadecimal ObjectId.
 *
 * @example
 * // Valid ObjectIds
 * "507f1f77bcf86cd799439011"
 * "5f9d88f9c1b6c8a9e8b9e9e9"
 */
const ObjectIdFormat = {
  name: "objectId",
  format: {
    validate: (value: unknown): boolean => {
      if (typeof value !== "string") return false;

      // Matches 24-character hexadecimal strings (MongoDB ObjectId format)
      // Case-insensitive to accept both uppercase and lowercase hex
      return !!value.match(/^[0-9a-fA-F]{24}$/);
    },
  },
};

export default ObjectIdFormat;
