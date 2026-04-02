import { Storage } from "@google-cloud/storage";
import { v4 as uuidV4 } from "uuid";
import Config from "../utils/config.js";
import LoggerFactory from "../logging/logger-factory.js";

/**
 * Singleton wrapper around Google Cloud Storage. Provides lazy initialization
 * and simplified CRUD operations for binary objects within a single bucket.
 */
class BlobStore {
  static DEFAULT_BUCKET_NAME = "default-app-bucket";

  constructor() {
    this._logger = LoggerFactory.create("Service.BlobStore");
    this._active = false;
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
    return await this.bucket.deleteFiles(query);
  }

  async _init() {
    this.gcpProject = Config.mustGet("GOOGLE_CLOUD_PROJECT");
    this.apiEndpoint = Config.get("GCP_STORAGE_ENDPOINT");
    const gcpKeyFilename = Config.get("GCP_KEY_FILENAME");

    this.bucketName = Config.get("GCP_BUCKET_NAME") || BlobStore.DEFAULT_BUCKET_NAME;

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

export default new BlobStore();
