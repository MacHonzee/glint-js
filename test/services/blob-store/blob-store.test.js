import { jest, beforeEach, describe, it, expect } from "@jest/globals";
import { Config, BlobStore } from "../../../src/index.js";

// mock dependencies
Config.set("GOOGLE_CLOUD_PROJECT", "projectId");
class MockBucket {
  files = [];
  _handles = new Map();

  file(fileId) {
    if (!this._handles.has(fileId)) {
      this._handles.set(fileId, new MockFile(this, fileId));
    }
    return this._handles.get(fileId);
  }

  getFiles() {
    return this.files;
  }

  deleteFiles(prefix) {
    this.files = this.files.filter((file) => file.id.startsWith(prefix));
  }
}

class MockFile {
  constructor(bucket, fileId) {
    this.bucket = bucket;
    this.id = fileId;
    this._saved = false;
  }

  save(fileData) {
    this.fileData = fileData;
    this.bucket.files.push(this);
    this._saved = true;
  }

  download() {
    return [this.fileData];
  }

  setMetadata(metadata) {
    this.metadata = metadata;
  }

  getMetadata() {
    return this.metadata;
  }

  delete() {
    this.bucket.files = this.bucket.files.filter((file) => file !== this);
    this._saved = false;
  }

  exists() {
    return this._saved;
  }

  getSignedUrl(config) {
    this.lastSignedUrlConfig = config;
    return [`https://signed.example/${this.id}`];
  }
}
jest.spyOn(MockBucket.prototype, "getFiles");

describe("BlobStore", () => {
  const fileId = "test-file";
  const fileData = "Hello, world!";

  beforeEach(async () => {
    // Make sure the BlobStore is initialized before running the tests
    await BlobStore._init();
    BlobStore.bucket = new MockBucket();
  });

  describe("save", () => {
    it("should save a file", async () => {
      const result = await BlobStore.save(fileData, { id: fileId });
      expect(result).toBe(fileId);
    });

    it("should save a file with random id", async () => {
      const result = await BlobStore.save(fileData);
      expect(typeof result).toBe("string");
      expect(result.length).toBeTruthy();
    });
  });

  describe("download", () => {
    it("should download a file", async () => {
      await BlobStore.save(fileData, { id: fileId });
      const result = await BlobStore.download(fileId);
      expect(result.toString()).toBe(fileData);
    });
  });

  describe("list", () => {
    it("should list no files", async () => {
      const files = await BlobStore.list("query");
      expect(files.length).toBe(0);
      expect(BlobStore.bucket.getFiles).toBeCalledTimes(1);
      expect(BlobStore.bucket.getFiles).toBeCalledWith("query");
    });

    it("should list files", async () => {
      await BlobStore.save(fileData, { id: fileId });
      await BlobStore.save(fileData, { id: fileId });
      const files = await BlobStore.list("query");
      expect(files.length).toBe(2);
      expect(BlobStore.bucket.getFiles).toBeCalledTimes(2);
      expect(BlobStore.bucket.getFiles).toBeCalledWith("query");
    });
  });

  describe("setMetadata", () => {
    it("should set metadata for a file", async () => {
      await BlobStore.save(fileData, { id: fileId });
      const metadata = { foo: "bar" };
      await BlobStore.setMetadata(fileId, metadata);
      const fileMetadata = await BlobStore.bucket.file(fileId).getMetadata();
      expect(fileMetadata).toEqual(metadata);
    });
  });

  describe("delete", () => {
    it("should delete a file", async () => {
      await BlobStore.save(fileData, { id: fileId });
      await BlobStore.delete(fileId);
      const exists = await BlobStore.bucket.file(fileId).exists();
      expect(exists).toBe(false);
    });
  });

  describe("deleteMany", () => {
    it("should delete multiple files", async () => {
      const fileIds = ["test-file1", "test-file2"];
      await Promise.all(fileIds.map((id) => BlobStore.save(fileData, { id })));
      await BlobStore.deleteMany({ prefix: "test-file" });
      const files = await BlobStore.list({ prefix: "test-file" });
      expect(files.length).toBe(0);
    });
  });

  describe("getSignedUrl", () => {
    it("should return a signed URL with default action read", async () => {
      const expires = new Date(Date.now() + 60_000);
      const url = await BlobStore.getSignedUrl(fileId, { expires });

      expect(url).toBe(`https://signed.example/${fileId}`);
      const config = BlobStore.bucket.file(fileId).lastSignedUrlConfig;
      expect(config.version).toBe("v4");
      expect(config.action).toBe("read");
      expect(config.expires).toEqual(expires);
    });

    it("should sign a write URL with contentType", async () => {
      const expires = new Date(Date.now() + 60_000);
      const url = await BlobStore.getSignedUrl(fileId, {
        action: "write",
        expires,
        contentType: "image/jpeg",
      });

      expect(url).toBe(`https://signed.example/${fileId}`);
      const config = BlobStore.bucket.file(fileId).lastSignedUrlConfig;
      expect(config.action).toBe("write");
      expect(config.contentType).toBe("image/jpeg");
    });

    it("should normalize duration string expires via ms", async () => {
      const before = Date.now();
      await BlobStore.getSignedUrl(fileId, { expires: "15m" });
      const after = Date.now();

      const config = BlobStore.bucket.file(fileId).lastSignedUrlConfig;
      expect(config.expires).toBeInstanceOf(Date);
      expect(config.expires.getTime()).toBeGreaterThanOrEqual(before + 15 * 60_000);
      expect(config.expires.getTime()).toBeLessThanOrEqual(after + 15 * 60_000);
    });

    it("should accept absolute number expires (ms epoch)", async () => {
      const expires = Date.now() + 120_000;
      await BlobStore.getSignedUrl(fileId, { expires });

      const config = BlobStore.bucket.file(fileId).lastSignedUrlConfig;
      expect(config.expires).toBe(expires);
    });

    it("should reject missing expires", async () => {
      await expect(BlobStore.getSignedUrl(fileId, {})).rejects.toThrow(/expires/i);
    });

    it("should reject invalid action", async () => {
      await expect(
        BlobStore.getSignedUrl(fileId, { action: "delete", expires: new Date(Date.now() + 60_000) }),
      ).rejects.toThrow(/action/i);
    });
  });

  describe("lazy initialization", () => {
    beforeEach(() => {
      BlobStore._active = false;
      jest.spyOn(BlobStore, "_init").mockImplementation(async () => {
        BlobStore._active = true;
        BlobStore.bucket = new MockBucket();
      });
    });

    afterEach(() => {
      BlobStore._init.mockRestore();
    });

    it("should lazy-init on save", async () => {
      await BlobStore.save(fileData, { id: fileId });
      expect(BlobStore._init).toHaveBeenCalled();
    });

    it("should lazy-init on download", async () => {
      await BlobStore.save(fileData, { id: fileId });
      BlobStore._active = false;
      await BlobStore.download(fileId);
      expect(BlobStore._init).toHaveBeenCalledTimes(2);
    });

    it("should lazy-init on setMetadata", async () => {
      await BlobStore.setMetadata(fileId, { foo: "bar" });
      expect(BlobStore._init).toHaveBeenCalled();
    });

    it("should lazy-init on delete", async () => {
      await BlobStore.delete(fileId);
      expect(BlobStore._init).toHaveBeenCalled();
    });

    it("should lazy-init on getSignedUrl", async () => {
      await BlobStore.getSignedUrl(fileId, { expires: new Date(Date.now() + 60_000) });
      expect(BlobStore._init).toHaveBeenCalled();
    });
  });
});
