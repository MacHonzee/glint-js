const IdentityFormat = {
  name: 'identity',
  format: {
    validate: (value) => {
      if (typeof value !== 'string') return false;

      // TODO add some better pattern to match identity
      return value.match(/^[a-zA-Z0-9]{3,255}$/);
    },
  },
};

export default IdentityFormat;
