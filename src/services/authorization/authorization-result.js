class AuthorizationResult {
  /**
   * Object represents state of the user's authorization against given useCase.
   *
   * @param {Boolean} authorized Represents whether user has rights for given useCase or not
   * @param {String} user E-mail of given user
   * @param {Array<String>} useCaseRoles List of roles that are valid for given useCase
   * @param {Array<String>} userRoles List of roles that the user currently possesses
   */
  constructor({authorized, user, useCaseRoles, userRoles}) {
    this.authorized = authorized;
    this.user = user;
    this.useCaseRoles = useCaseRoles;
    this.userRoles = userRoles;
  }
}

export default AuthorizationResult;
