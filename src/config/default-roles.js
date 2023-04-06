const DefaultRoles = {
  admin: "Admin",
  public: "Public",
  authenticated: "Authenticated",
  authority: "Authority",
};

DefaultRoles.all = Object.values(DefaultRoles);
DefaultRoles.privileged = [DefaultRoles.admin];
DefaultRoles.protected = [DefaultRoles.public, DefaultRoles.authenticated];
DefaultRoles.application = [DefaultRoles.authority];

/**
 * Method adds a role to a list of available roles
 *
 * @param {string} role
 * @param {string} [roleType="application"]
 */
DefaultRoles.add = function add(role, roleType = "application") {
  this[role] = role;
  this[roleType] = this[roleType] || [];
  this[roleType].push(role);
  this.all.push(role);
};

export default DefaultRoles;
