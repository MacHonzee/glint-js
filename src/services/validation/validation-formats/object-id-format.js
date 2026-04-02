/**
 * AJV custom format that validates 24-character hex strings (MongoDB ObjectId).
 *
 * @type {{ name: string, format: { validate: (value: string) => boolean } }}
 */
const ObjectIdFormat = {
  name: "objectId",
  format: {
    validate: (value) => {
      if (typeof value !== "string") return false;

      // this matches email currently
      return value.match(/^[0-9a-f]{24}$/);
    },
  },
};

export default ObjectIdFormat;
