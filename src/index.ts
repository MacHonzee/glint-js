// services - authentication
import AuthenticationService from "./services/authentication/authentication-service.js";
import UserService from "./services/authentication/user-service.js";
import Session from "./services/authentication/session.js";

// services - authorization
import AuthorizationService from "./services/authorization/authorization-service.js";
import AuthorizationResult from "./services/authorization/authorization-result.js";

// services - database
import { AbstractModel, ModelWarehouse, DuplicateKeyError } from "./services/database/abstract-model.js";
import MongoClient from "./services/database/mongo-client.js";
import mongoose from "mongoose"; // Has to be exported because new Schema checks that we are using one Mongoose lib

// services - logging
import LoggerFactory from "./services/logging/logger-factory.js";

// services - mail
import MailService from "./services/mail/mail-service.js";

// services - secret-manager
import SecretManager from "./services/secret-manager/secret-manager.js";

// services - server
import Server from "./services/server/server.js";
import RouteRegister from "./services/server/route-register.js";
import UseCaseEnvironment from "./services/server/use-case-environment.js";
import UseCaseError from "./services/server/use-case-error.js";
import Uri from "./services/server/uri.js";

// services - utils
import LruCache from "./services/utils/lru-cache.js";
import Config from "./services/utils/config.js";
import AppEventEmitter from "./services/utils/app-event-emitter.js";

// services - validation
import ValidationService from "./services/validation/validation-service.js";

// service - blob store
import BlobStore from "./services/blob-store/blob-store.js";

// configs
import DefaultRoles from "./config/default-roles.js";
import Languages from "./config/languages.js";

/**
 * Glint.js - Core NPM framework for server applications
 *
 * A comprehensive server framework built upon Express, Mongoose, AJV, Passport and various
 * other services with integration and easy deployment to Google Cloud App Engine.
 *
 * @module glint-js
 */

export {
  // Authentication
  AuthenticationService,
  Session,
  UserService,

  // Authorization
  AuthorizationService,
  AuthorizationResult,

  // Database
  AbstractModel,
  ModelWarehouse,
  DuplicateKeyError,
  MongoClient,
  mongoose,

  // Logging
  LoggerFactory,

  // Mail
  MailService,

  // Secret Manager
  SecretManager,

  // Server
  Server,
  RouteRegister,
  UseCaseEnvironment,
  UseCaseError,
  Uri,

  // Utils
  LruCache,
  Config,
  AppEventEmitter,

  // Validation
  ValidationService,

  // Blob Store
  BlobStore,

  // Config
  DefaultRoles,
  Languages,
};
