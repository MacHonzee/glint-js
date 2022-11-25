import GcpStorage from '@google-cloud/storage';
import {v4 as uuidV4} from 'uuid';
import Config from '../utils/config.js';
import LoggerFactory from '../logging/logger-factory.js';

class BlobStore {
  static DEFAULT_BUCKET_NAME = 'defaultAppBucket';

  constructor() {
    this._logger = LoggerFactory.create('Service.BlobStore');
    this._active = false;
  }

  async save(file, options = {}) {
    if (!this._active) await this._init();

    // set up fileId (mostly random)
    const fileId = file.id || options.id || uuidV4();

    // default in GCP is true, but it is not suitable for files smaller then 10MB
    const resumable = options.resumable ?? false;

    await this.bucket.file(fileId).save(file, {...options, resumable});

    return fileId;
  }

  async download(fileId, options = {}) {
    if (!this._active) await this._init();

    const fileData = await this.bucket.file(fileId).download(options);

    return fileData[0];
  }

  async setMetadata(fileId, metadata, options = {}) {
    if (!this._active) await this._init();

    return await this.bucket.file(fileId).setMetadata({metadata}, options);
  }

  async delete(fileId, options = {}) {
    if (!this._active) await this._init();

    return await this.bucket.file(fileId).delete(options);
  }

  async _init() {
    this.gcpProject = Config.mustGet('GOOGLE_CLOUD_PROJECT');
    this.apiEndpoint = Config.get('GCP_STORAGE_ENDPOINT');
    const gcpKeyFilename = Config.get('GCP_KEY_FILENAME');

    this.bucketName = Config.get('GCP_BUCKET_NAME') || BlobStore.DEFAULT_BUCKET_NAME;

    this._logger.debug(`Initializing BlobStore for project with id '${this.gcpProject}'`);
    this._logger.debug(`ApiEndpoint for BlobStore is '${this.apiEndpoint}'`);
    this._logger.debug(`Key path for BlobStore is '${gcpKeyFilename}'`);
    this._logger.debug(`Bucket for BlobStore is '${this.bucketName}'`);

    this.storage = new GcpStorage.Storage({
      projectId: this.gcpProject,
      keyFilename: gcpKeyFilename,
      apiEndpoint: this.apiEndpoint,
    });

    this.bucket = this.storage.bucket(this.bucketName);

    this._active = true;
  }
}

export default new BlobStore();
