const IdentityFormat = {
  name: "identity",
  format: {
    validate: (value) => {
      if (typeof value !== "string") return false;

      // this matches email currently
      return value.match(/^[a-zA-Z0-9.!#$%&\u2019*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/);
    },
  },
};

export default IdentityFormat;
