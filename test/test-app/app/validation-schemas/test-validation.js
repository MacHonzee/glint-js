import { CommonValidations } from "./test-validation-folder/common-validations.js";

const UsersCreateSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    testCommon: CommonValidations,
  },
  required: ["id"],
  additionalProperties: false,
};

/** Intentionally omits additionalProperties — used to assert removeAdditional: "all". */
const UsersLooseUpdateSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    name: { type: "string" },
  },
  required: ["id"],
};

export { UsersCreateSchema, UsersLooseUpdateSchema };
export default {
  UsersCreateSchema,
  UsersLooseUpdateSchema,
};
