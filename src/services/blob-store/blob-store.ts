import {
  Storage,
  Bucket,
  File,
  GetFilesOptions,
  SetFileMetadataOptions,
  DeleteFileOptions,
} from "@google-cloud/storage";
import { v4 as uuidV4 } from "uuid";
import Config from "../utils/config.js";
import LoggerFactory from "../logging/logger-factory.js";
import type { Logger } from "winston";

/**
 * Options for saving a file to blob storage
 */
interface SaveOptions {
  /** Custom file ID (defaults to UUID) */
  id?: string;
  /** Whether to use resumable upload (default: false for files < 10MB) */
  resumable?: boolean;
  /** File metadata */
  metadata?: Record<string, any>;
  /** Content type */
  contentType?: string;
  [key: string]: any;
}

/**
 * Options for downloading a file from blob storage
 */
interface DownloadOptions {
  /** Byte range to download */
  start?: number;
  end?: number;
  [key: string]: any;
}

/**
 * Type alias for file metadata options
 */
type SetMetadataOptions = SetFileMetadataOptions;

/**
 * Type alias for delete options
 */
type DeleteOptions = DeleteFileOptions;

/**
 * Blob storage service for Google Cloud Storage.
 * Provides a simplified interface for file upload, download, and management operations.
 *
 * Features:
 * - Automatic lazy initialization
 * - UUID-based file identification
 * - Optimized upload strategy (non-resumable for small files)
 * - Metadata management
 * - Batch delete operations
 *
 * Configuration:
 * - GOOGLE_CLOUD_PROJECT: GCP project ID (required)
 * - GCP_BUCKET_NAME: Bucket name (default: "default-app-bucket")
 * - GCP_STORAGE_ENDPOINT: Custom API endpoint (optional, for emulators)
 * - GCP_KEY_FILENAME: Path to service account key file (optional)
 *
 * @example
 * // Save a file
 * const fileId = await BlobStore.save(fileBuffer, {
 *   contentType: "image/png",
 *   metadata: { userId: "123" }
 * });
 *
 * // Download a file
 * const fileData = await BlobStore.download(fileId);
 *
 * // Delete a file
 * await BlobStore.delete(fileId);
 */
class BlobStore {
  /** Default bucket name if not configured */
  static DEFAULT_BUCKET_NAME = "default-app-bucket";

  private _logger: Logger;
  private _active: boolean = false;

  /** Google Cloud Storage instance */
  private storage?: Storage;

  /** GCP bucket instance */
  private bucket?: Bucket;

  /** GCP project ID */
  private gcpProject?: string;

  /** Custom API endpoint (for emulators) */
  private apiEndpoint?: string;

  /** Bucket name */
  private bucketName?: string;

  constructor() {
    this._logger = LoggerFactory.create("Service.BlobStore");
    this._active = false;
  }

  /**
   * Saves a file to blob storage.
   *
   * @param file - File buffer or string to save
   * @param options - Save options (id, metadata, contentType, etc.)
   * @returns The generated or provided file ID
   *
   * @example
   * // Save with auto-generated ID
   * const fileId = await BlobStore.save(fileBuffer);
   *
   * // Save with custom ID and metadata
   * const fileId = await BlobStore.save(fileBuffer, {
   *   id: "profile-pic-123",
   *   contentType: "image/jpeg",
   *   metadata: { userId: "123", uploadedAt: Date.now() }
   * });
   */
  async save(file: Buffer | string, options: SaveOptions = {}): Promise<string> {
    if (!this._active) await this._init();

    // Set up fileId (mostly random)
    const fileId = (file as any).id || options.id || uuidV4();

    // Default in GCP is true, but it is not suitable for files smaller than 10MB
    const resumable = options.resumable ?? false;

    await this.bucket!.file(fileId).save(file, { ...options, resumable });

    return fileId;
  }

  /**
   * Downloads a file from blob storage.
   *
   * @param fileId - The file ID to download
   * @param options - Download options (byte range, etc.)
   * @returns The file data as a Buffer
   *
   * @example
   * const fileData = await BlobStore.download("file-123");
   *
   * // Download specific byte range
   * const chunk = await BlobStore.download("file-123", { start: 0, end: 1024 });
   */
  async download(fileId: string, options: DownloadOptions = {}): Promise<Buffer> {
    if (!this._active) await this._init();

    const fileData = await this.bucket!.file(fileId).download(options);

    return fileData[0];
  }

  /**
   * Lists files in the bucket matching the query.
   *
   * @param query - Query options (prefix, maxResults, etc.)
   * @returns Array of File objects and API response
   *
   * @example
   * // List all files with a prefix
   * const [files] = await BlobStore.list({ prefix: "uploads/" });
   */
  async list(query?: GetFilesOptions): Promise<[File[], {}, {}]> {
    if (!this._active) await this._init();

    return await this.bucket!.getFiles(query);
  }

  /**
   * Sets metadata for a file.
   *
   * @param fileId - The file ID
   * @param metadata - Metadata object to set
   * @param options - Set metadata options
   * @returns API response
   *
   * @example
   * await BlobStore.setMetadata("file-123", {
   *   contentType: "application/json",
   *   metadata: { processed: true }
   * });
   */
  async setMetadata(fileId: string, metadata: Record<string, any>, options: SetMetadataOptions = {}): Promise<any> {
    if (!this._active) await this._init();

    return await this.bucket!.file(fileId).setMetadata(metadata, options);
  }

  /**
   * Deletes a single file from blob storage.
   *
   * @param fileId - The file ID to delete
   * @param options - Delete options
   * @returns API response
   *
   * @example
   * await BlobStore.delete("file-123");
   */
  async delete(fileId: string, options: DeleteOptions = {}): Promise<any> {
    if (!this._active) await this._init();

    return await this.bucket!.file(fileId).delete(options);
  }

  /**
   * Deletes multiple files matching a query.
   *
   * @param query - Query options to match files for deletion
   * @returns API response
   *
   * @example
   * // Delete all files with a prefix
   * await BlobStore.deleteMany({ prefix: "temp/" });
   */
  async deleteMany(query?: GetFilesOptions): Promise<any> {
    if (!this._active) await this._init();

    return await this.bucket!.deleteFiles(query);
  }

  /**
   * Initializes the blob storage service.
   * Loads configuration and creates GCS client and bucket instances.
   * @private
   */
  private async _init(): Promise<void> {
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
