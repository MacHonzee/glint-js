import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import Config from "../utils/config.js";
import LoggerFactory from "../logging/logger-factory.js";

/**
 * Singleton wrapper around the Google Cloud Secret Manager API. Lazily
 * initializes the client on first access and caches retrieved secrets
 * in-memory for the lifetime of the process.
 */
class SecretManager {
  constructor() {
    this._logger = LoggerFactory.create("Service.SecretManager");
    this._active = false;
  }

  /**
   * Retrieves a secret's value, returning a cached copy when available.
   *
   * @param {string} secretName - Logical secret name (e.g. `"mongoDbUri_PRIMARY"`).
   * @param {string} [version="latest"] - Secret version.
   * @returns {Promise<string|undefined>}
   */
  async get(secretName, version = "latest") {
    if (!this._active) await this._init(); // lazy initialization during first call

    this._logger.debug(`Getting secret with name '${secretName}'`);
    const secretPath = await this.getSecretPath(secretName, version);
    this._logger.debug(`Secret with name '${secretName}' has path '${secretPath}'`);

    if (this._cachedSecrets[secretPath]) return this._cachedSecrets[secretPath];

    const [secret] = await this.client.accessSecretVersion({
      name: secretPath,
    });

    const secretContent = secret.payload.data.toString();

    this._cachedSecrets[secretPath] = secretContent;
    return secretContent;
  }

  /**
   * Same as {@link SecretManager.get}, but throws if the secret is not found.
   *
   * @param {string} secretName
   * @param {string} [version="latest"]
   * @returns {Promise<string>}
   * @throws {Error} If the secret does not exist.
   */
  async mustGet(secretName, version = "latest") {
    const secret = await this.get(secretName, version);
    if (secret === undefined) {
      throw new Error(`Secret ${secretName} in version ${version} was not found.`);
    }
    return secret;
  }

  /**
   * Builds the fully-qualified GCP resource path for a secret version.
   *
   * @param {string} secretName
   * @param {string} [version="latest"]
   * @returns {Promise<string>} e.g. `projects/my-project/secrets/foo/versions/latest`
   */
  async getSecretPath(secretName, version = "latest") {
    if (!this._active) await this._init(); // lazy initialization during first call

    return `projects/${this.gcpProject}/secrets/${secretName}/versions/${version}`;
  }

  _init() {
    this.gcpProject = Config.mustGet("GOOGLE_CLOUD_PROJECT");
    const gcpKeyFilename = Config.get("GCP_KEY_FILENAME");

    this._logger.debug(`Initializing SecretManager for project with id '${this.gcpProject}'`);
    this._logger.debug(`Key path for SecretManager is '${gcpKeyFilename}'`);

    this.client = new SecretManagerServiceClient({
      projectId: this.gcpProject, // necessary for localhost
      keyFilename: gcpKeyFilename, // necessary for localhost
    });
    this._cachedSecrets = {};
    this._active = true;
  }
}

export default new SecretManager();
