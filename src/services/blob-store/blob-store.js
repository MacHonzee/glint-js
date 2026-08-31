import { Storage } from "@google-cloud/storage";
import { v4 as uuidV4 } from "uuid";
import ms from "ms";
import Config from "../utils/config.js";
import LoggerFactory from "../logging/logger-factory.js";

const SIGNED_URL_ACTIONS = new Set(["read", "write"]);
const OPTION_KEYS = ["projectId", "apiEndpoint", "keyFilename", "bucketName"];

/**
 * Wrapper around Google Cloud Storage. Provides lazy initialization and
 * simplified CRUD operations for binary objects within a single bucket.
 *
 * Obtain instances via {@link BlobStore.create}. Identical explicit options
 * intern to the same instance; omitted fields fall back to Config on first use.
 */
class BlobStore {
  static DEFAULT_BUCKET_NAME = "default-app-bucket";
  static _instances = new Map();

  /**
   * Returns an interned BlobStore for the given explicit options.
   * Omitted fields mean "use Config" and are not part of the intern key.
   *
   * @param {object} [options={}]
   * @param {string} [options.projectId] - GCP project; defaults to `GOOGLE_CLOUD_PROJECT`.
   * @param {string} [options.apiEndpoint] - Storage API endpoint; defaults to `GCP_STORAGE_ENDPOINT`.
   * @param {string} [options.keyFilename] - Service-account key path; defaults to `GCP_KEY_FILENAME`.
   * @param {string} [options.bucketName] - Bucket name; defaults to `GCP_BUCKET_NAME` or {@link BlobStore.DEFAULT_BUCKET_NAME}.
   * @returns {BlobStore}
   */
  static create(options = {}) {
    const fingerprint = BlobStore._fingerprint(options);
    const existing = BlobStore._instances.get(fingerprint);
    if (existing) return existing;

    const instance = new BlobStore(options);
    BlobStore._instances.set(fingerprint, instance);
    return instance;
  }

  /**
   * @param {object} [options={}]
   * @returns {string}
   */
  static _fingerprint(options = {}) {
    const explicit = {};
    for (const key of OPTION_KEYS) {
      if (options[key] != null) {
        explicit[key] = options[key];
      }
    }
    return JSON.stringify(explicit);
  }

  /**
   * @param {object} [options={}] - Explicit overrides; not interned. Prefer {@link BlobStore.create}.
   */
  constructor(options = {}) {
    this._logger = LoggerFactory.create("Service.BlobStore");
    this._active = false;
    this._options = options;
  }

  /**
   * Saves a file to the bucket.
   *
   * @param {Buffer|string|object} file - File content to save.
   * @param {object} [options={}]
   * @param {string} [options.id] - Explicit file ID; defaults to a random UUID.
   * @param {boolean} [options.resumable=false] - Enable resumable uploads (useful for files > 10 MB).
   * @returns {Promise<string>} The file ID under which the object was stored.
   */
  async save(file, options = {}) {
    if (!this._active) await this._init();

    // set up fileId (mostly random)
    const fileId = file.id || options.id || uuidV4();

    // default in GCP is true, but it is not suitable for files smaller then 10MB
    const resumable = options.resumable ?? false;

    await this.bucket.file(fileId).save(file, { ...options, resumable });

    return fileId;
  }

  /**
   * Downloads a file from the bucket.
   *
   * @param {string} fileId
   * @param {object} [options={}]
   * @returns {Promise<Buffer>}
   */
  async download(fileId, options = {}) {
    if (!this._active) await this._init();

    const fileData = await this.bucket.file(fileId).download(options);

    return fileData[0];
  }

  /**
   * Lists files in the bucket matching the given query.
   *
   * @param {object} query - GCS `getFiles` query options.
   * @returns {Promise<Array>}
   */
  async list(query) {
    if (!this._active) await this._init();

    return await this.bucket.getFiles(query);
  }

  /**
   * Updates metadata on a stored file.
   *
   * @param {string} fileId
   * @param {object} metadata
   * @param {object} [options={}]
   * @returns {Promise<*>}
   */
  async setMetadata(fileId, metadata, options = {}) {
    if (!this._active) await this._init();

    return await this.bucket.file(fileId).setMetadata(metadata, options);
  }

  /**
   * Deletes a single file from the bucket.
   *
   * @param {string} fileId
   * @param {object} [options={}]
   * @returns {Promise<*>}
   */
  async delete(fileId, options = {}) {
    if (!this._active) await this._init();

    return await this.bucket.file(fileId).delete(options);
  }

  /**
   * Deletes multiple files matching the given query.
   *
   * @param {object} query - GCS `deleteFiles` query options.
   * @returns {Promise<*>}
   */
  async deleteMany(query) {
    if (!this._active) await this._init();

    return await this.bucket.deleteFiles(query);
  }

  /**
   * Creates a V4 signed URL for reading or writing an object.
   *
   * @param {string} fileId - Object name in the configured bucket.
   * @param {object} options
   * @param {'read'|'write'} [options.action='read']
   * @param {string|number|Date} options.expires - Duration (`'15m'`), absolute `Date`, or ms-epoch `number`.
   * @param {string} [options.contentType] - Recommended for write (PUT) URLs.
   * @returns {Promise<string>} Signed URL.
   */
  async getSignedUrl(fileId, options = {}) {
    if (!this._active) await this._init();

    const action = options.action ?? "read";
    if (!SIGNED_URL_ACTIONS.has(action)) {
      throw new Error(`Invalid signed URL action '${action}'. Supported actions are 'read' and 'write'.`);
    }

    if (options.expires == null) {
      throw new Error("Signed URL requires options.expires (duration string, Date, or ms-epoch number).");
    }

    const expires = this._normalizeExpires(options.expires);
    const signedUrlOptions = {
      version: "v4",
      action,
      expires,
    };

    if (options.contentType != null) {
      signedUrlOptions.contentType = options.contentType;
    }

    const [url] = await this.bucket.file(fileId).getSignedUrl(signedUrlOptions);
    return url;
  }

  /**
   * @param {string|number|Date} expires
   * @returns {number|Date}
   */
  _normalizeExpires(expires) {
    if (expires instanceof Date || typeof expires === "number") {
      return expires;
    }

    if (typeof expires === "string") {
      const durationMs = ms(expires);
      if (typeof durationMs !== "number" || !Number.isFinite(durationMs)) {
        throw new Error(`Invalid signed URL expires duration '${expires}'.`);
      }
      return new Date(Date.now() + durationMs);
    }

    throw new Error("Signed URL expires must be a duration string, Date, or ms-epoch number.");
  }

  async _init() {
    this.gcpProject = this._options.projectId ?? Config.mustGet("GOOGLE_CLOUD_PROJECT");
    this.apiEndpoint = this._options.apiEndpoint ?? Config.get("GCP_STORAGE_ENDPOINT");
    const gcpKeyFilename = this._options.keyFilename ?? Config.get("GCP_KEY_FILENAME");

    this.bucketName = this._options.bucketName ?? (Config.get("GCP_BUCKET_NAME") || BlobStore.DEFAULT_BUCKET_NAME);

    this._logger.debug(`Initializing BlobStore for project with id '${this.gcpProject}'`);
    this._logger.debug(`ApiEndpoint for BlobStore is '${this.apiEndpoint}'`);
    this._logger.debug(`Key path for BlobStore is '${gcpKeyFilename}'`);
    this._logger.debug(`Bucket for BlobStore is '${this.bucketName}'`);

    this.storage = new Storage({
      projectId: this.gcpProject,
      keyFilename: gcpKeyFilename,
      apiEndpoint: this.apiEndpoint,
    });

    this.bucket = this.storage.bucket(this.bucketName);

    this._active = true;
  }
}

export default BlobStore;
