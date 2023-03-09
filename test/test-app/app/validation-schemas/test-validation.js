const UsersCreateSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
  },
  required: ["id"],
  additionalProperties: false,
};

export { UsersCreateSchema };
export default {
  UsersCreateSchema,
};
