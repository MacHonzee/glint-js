import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import Config from "../utils/config.js";
import LoggerFactory from "../logging/logger-factory.js";
import type { Logger } from "winston";

/**
 * Secret manager service for Google Cloud Secret Manager.
 * Provides a simplified interface for accessing secrets with caching support.
 *
 * Features:
 * - Lazy initialization (connects only when first secret is requested)
 * - In-memory caching of secrets to reduce API calls
 * - Support for secret versions
 * - Type-safe secret access with mustGet()
 *
 * Configuration:
 * - GOOGLE_CLOUD_PROJECT: GCP project ID (required)
 * - GCP_KEY_FILENAME: Path to service account key file (optional, for local development)
 *
 * @example
 * // Get a secret (returns undefined if not found)
 * const apiKey = await SecretManager.get("API_KEY");
 *
 * // Get a required secret (throws if not found)
 * const dbPassword = await SecretManager.mustGet("DB_PASSWORD");
 *
 * // Get specific version
 * const oldKey = await SecretManager.get("API_KEY", "5");
 */
class SecretManager {
  private _logger: Logger;
  private _active: boolean = false;

  /** GCP Secret Manager client */
  private client?: SecretManagerServiceClient;

  /** Cache for storing retrieved secrets */
  private _cachedSecrets?: Record<string, string>;

  /** GCP project ID */
  private gcpProject?: string;

  constructor() {
    this._logger = LoggerFactory.create("Service.SecretManager");
    this._active = false;
  }

  /**
   * Retrieves a secret from Google Cloud Secret Manager.
   * Secrets are cached in memory after first retrieval.
   *
   * @param secretName - The name of the secret
   * @param version - The secret version (default: "latest")
   * @returns The secret value as a string, or undefined if not found
   *
   * @example
   * const apiKey = await SecretManager.get("SENDGRID_API_KEY");
   * const oldApiKey = await SecretManager.get("SENDGRID_API_KEY", "3");
   */
  async get(secretName: string, version: string = "latest"): Promise<string | undefined> {
    if (!this._active) await this._init(); // Lazy initialization during first call

    this._logger.debug(`Getting secret with name '${secretName}'`);
    const secretPath = await this.getSecretPath(secretName, version);
    this._logger.debug(`Secret with name '${secretName}' has path '${secretPath}'`);

    if (this._cachedSecrets![secretPath]) {
      return this._cachedSecrets![secretPath];
    }

    try {
      const [secret] = await this.client!.accessSecretVersion({
        name: secretPath,
      });

      const secretContent = secret.payload?.data?.toString();

      if (secretContent) {
        this._cachedSecrets![secretPath] = secretContent;
      }

      return secretContent;
    } catch (error: any) {
      // Secret not found or access denied
      this._logger.warn(`Failed to retrieve secret '${secretName}': ${error.message}`);
      return undefined;
    }
  }

  /**
   * Retrieves a required secret from Google Cloud Secret Manager.
   * Throws an error if the secret is not found.
   *
   * @param secretName - The name of the secret
   * @param version - The secret version (default: "latest")
   * @returns The secret value as a string
   * @throws Error if the secret is not found
   *
   * @example
   * const dbPassword = await SecretManager.mustGet("DB_PASSWORD");
   * // Throws error if DB_PASSWORD is not found
   */
  async mustGet(secretName: string, version: string = "latest"): Promise<string> {
    const secret = await this.get(secretName, version);
    if (secret === undefined) {
      throw new Error(`Secret ${secretName} in version ${version} was not found.`);
    }
    return secret;
  }

  /**
   * Constructs the full secret path for Google Cloud Secret Manager.
   *
   * @param secretName - The name of the secret
   * @param version - The secret version (default: "latest")
   * @returns The full secret path in format: projects/{PROJECT}/secrets/{NAME}/versions/{VERSION}
   *
   * @example
   * const path = await SecretManager.getSecretPath("API_KEY", "latest");
   * // Returns: "projects/my-project/secrets/API_KEY/versions/latest"
   */
  async getSecretPath(secretName: string, version: string = "latest"): Promise<string> {
    if (!this._active) await this._init(); // Lazy initialization during first call

    return `projects/${this.gcpProject}/secrets/${secretName}/versions/${version}`;
  }

  /**
   * Initializes the Secret Manager client.
   * Loads configuration and creates the GCP Secret Manager client instance.
   * @private
   */
  private _init(): void {
    this.gcpProject = Config.mustGet("GOOGLE_CLOUD_PROJECT");
    const gcpKeyFilename = Config.get("GCP_KEY_FILENAME");

    this._logger.debug(`Initializing SecretManager for project with id '${this.gcpProject}'`);
    this._logger.debug(`Key path for SecretManager is '${gcpKeyFilename}'`);

    this.client = new SecretManagerServiceClient({
      projectId: this.gcpProject, // Necessary for localhost
      keyFilename: gcpKeyFilename, // Necessary for localhost
    });

    this._cachedSecrets = {};
    this._active = true;
  }
}

export default new SecretManager();
