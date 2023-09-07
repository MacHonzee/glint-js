class AuthorizationResult {
  /**
   * Object represents state of the user's authorization against given useCase.
   *
   * @param {Boolean} authorized Represents whether user has rights for given useCase or not
   * @param {String} username E-mail of given user
   * @param {String} useCase Currently authorized use case
   * @param {Array<String>} [useCaseRoles = []] List of roles that are valid for given useCase
   * @param {Array<String>} [userRoles = []] List of roles that the user currently possesses
   */
  constructor({ authorized, username, useCaseRoles = [], userRoles = [], useCase }) {
    this.authorized = authorized;
    this.username = username;
    this.useCaseRoles = useCaseRoles;
    this.userRoles = userRoles;
    this.useCase = useCase;
  }
}

export default AuthorizationResult;
