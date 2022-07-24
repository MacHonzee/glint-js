// TODO we might need some interface to allow application to add profiles on startup
const DefaultRoles = {
  admin: 'Admin',
  public: 'Public',
  authenticated: 'Authenticated',
  authority: 'Authority',
};

DefaultRoles.all = Object.values(DefaultRoles);
DefaultRoles.privileged = [DefaultRoles.admin];
DefaultRoles.protected = [DefaultRoles.public, DefaultRoles.authenticated];
DefaultRoles.application = [DefaultRoles.authority];

export default DefaultRoles;
