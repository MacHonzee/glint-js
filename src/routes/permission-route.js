import PermissionModel from "../models/permission-model.js";
import UserModel from "../models/user-model.js";
import ValidationService from "../services/validation/validation-service.js";
import UseCaseError from "../services/server/use-case-error.js";
import DefaultRoles from "../config/default-roles.js";
import Config from "../services/utils/config.js";
import SecretManager from "../services/secret-manager/secret-manager.js";
import AuthorizationService from "../services/authorization/authorization-service.js";

const LIST_PRIVILEGED_ROLES = [DefaultRoles.admin, DefaultRoles.authority];

class CannotLoadRoles extends UseCaseError {
  constructor(userRoles) {
    super("You are not authorized to load roles of other users.", "cannotLoadRoles", {
      userRoles,
      privilegedRoles: LIST_PRIVILEGED_ROLES,
    });
  }
}

class PermissionSecretNotAvailable extends UseCaseError {
  constructor() {
    super(
      "Application is not deployed with any configuration to permission secret, contact administrator.",
      "permissionSecretNotAvailable",
    );
  }
}

class PermissionSecretNotMatching extends UseCaseError {
  constructor(secret) {
    super("Permission secret is not matching", "permissionSecretNotMatching", { secret });
  }
}

class UserNotFound extends UseCaseError {
  constructor(user) {
    super("User with given username was not found.", "userNotFound", { user });
  }
}

class PermissionRoute {
  async grant({ dtoIn, uri }) {
    await ValidationService.validate(dtoIn, uri.useCase);

    await this._checkUser(dtoIn.user);

    const permission = await new PermissionModel({ user: dtoIn.user, role: dtoIn.role }).save();

    AuthorizationService.clearUserCache(dtoIn.user);

    return {
      permission,
    };
  }

  async secretGrant({ dtoIn, uri }) {
    await ValidationService.validate(dtoIn, uri.useCase);

    const permissionKey = await this._getPermissionKey();
    if (!permissionKey) throw new PermissionSecretNotAvailable();

    if (permissionKey !== dtoIn.secret) throw new PermissionSecretNotMatching(dtoIn.secret);

    await this._checkUser(dtoIn.user);

    const permission = await new PermissionModel({ user: dtoIn.user, role: dtoIn.role }).save();

    AuthorizationService.clearUserCache(dtoIn.user);

    return {
      permission,
    };
  }

  async revoke({ dtoIn, uri }) {
    await ValidationService.validate(dtoIn, uri.useCase);

    let revoked;
    if (dtoIn.all) {
      await PermissionModel.deleteByUser(dtoIn.user);
      revoked = "all";
    } else {
      await PermissionModel.delete(dtoIn.user, dtoIn.role);
      revoked = dtoIn.role;
    }

    AuthorizationService.clearUserCache(dtoIn.user);

    return {
      revoked,
    };
  }

  async list({ dtoIn, uri, authorizationResult, session }) {
    await ValidationService.validate(dtoIn, uri.useCase);

    // set default value based on session
    if (!dtoIn.user) dtoIn.user = session.user.username;

    // allow listing only of your permissions when you are not "Admin" or "Authority"
    const userRoles = authorizationResult.userRoles;
    if (dtoIn.user !== session.user.username) {
      if (!LIST_PRIVILEGED_ROLES.find((privRole) => userRoles.includes(privRole))) {
        throw new CannotLoadRoles(userRoles);
      }
    }

    const permissions = await PermissionModel.listByUser(dtoIn.user);

    return {
      permissions,
    };
  }

  async listAll() {
    const permissions = await PermissionModel.list();

    return {
      permissions,
    };
  }

  async _getPermissionKey() {
    return Config.get("PERMISSION_GRANT_KEY") || (await SecretManager.get("permissionGrantSecret"));
  }

  async _checkUser(user) {
    const userObject = await UserModel.findByUsername(user);
    if (!userObject) {
      throw new UserNotFound(user);
    }
    return userObject;
  }
}

export default new PermissionRoute();
