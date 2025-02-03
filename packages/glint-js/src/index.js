// services - authentication
import AuthenticationService from "./services/authentication/authentication-service.js";
import UserService from "./services/authentication/user-service.js";
import { Config, Uri, UseCaseError, UseCaseEnvironment, Session, AuthorizationResult } from "glint-js-core";

// services - authorization
import AuthorizationService from "./services/authorization/authorization-service.js";

// services - database
import { AbstractModel, ModelWarehouse, DuplicateKeyError } from "./services/database/abstract-model.js";
import MongoClient from "./services/database/mongo-client.js";
import mongoose from "mongoose"; // has to be exported because new Schema checks that we are using one Mongoose lib

// services - logging
import LoggerFactory from "glint-js-core/logging/logger-factory.js";

// services - mail
import MailService from "./services/mail/mail-service.js";

// services - secret-manager
import SecretManager from "./services/secret-manager/secret-manager.js";

// services - server
import Server from "./services/server/server.js";
import RouteRegister from "./services/server/route-register.js";

// services - utils
import LruCache from "./services/utils/lru-cache.js";
import AppEventEmitter from "./services/utils/app-event-emitter.js";

// services - validation
import ValidationService from "./services/validation/validation-service.js";

// service - blob store
import BlobStore from "./services/blob-store/blob-store.js";

// configs
import DefaultRoles from "./config/default-roles.js";
import Languages from "./config/languages.js";

// TODO describe everything with proper JSDoc
export {
  AuthenticationService,
  UserService,
  AuthorizationService,
  AbstractModel,
  ModelWarehouse,
  DuplicateKeyError,
  MongoClient,
  AppEventEmitter,
  MailService,
  SecretManager,
  Server,
  RouteRegister,
  LruCache,
  ValidationService,
  DefaultRoles,
  Languages,
  mongoose,
  BlobStore,

  // core re-exports
  Config,
  LoggerFactory,
  Uri,
  UseCaseError,
  UseCaseEnvironment,
  Session,
  AuthorizationResult,
};
