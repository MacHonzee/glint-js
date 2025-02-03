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

export { UsersCreateSchema };
export default {
  UsersCreateSchema,
};
