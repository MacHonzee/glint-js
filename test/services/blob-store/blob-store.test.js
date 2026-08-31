import { jest, beforeEach, afterEach, describe, it, expect } from "@jest/globals";
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

describe("BlobStore.create", () => {
  beforeEach(() => {
    BlobStore._instances.clear();
  });

  it("returns the same instance for identical explicit options", () => {
    const a = BlobStore.create({ bucketName: "photos" });
    const b = BlobStore.create({ bucketName: "photos" });
    expect(a).toBe(b);
  });

  it("returns the same instance for create() and create({})", () => {
    expect(BlobStore.create()).toBe(BlobStore.create({}));
  });

  it("returns different instances for different bucket names", () => {
    expect(BlobStore.create({ bucketName: "photos" })).not.toBe(BlobStore.create({ bucketName: "pdfs" }));
  });

  it("interns regardless of option key order", () => {
    const a = BlobStore.create({ bucketName: "photos", apiEndpoint: "http://localhost:4443" });
    const b = BlobStore.create({ apiEndpoint: "http://localhost:4443", bucketName: "photos" });
    expect(a).toBe(b);
  });

  it("treats null option values as omitted", () => {
    expect(BlobStore.create({ bucketName: null })).toBe(BlobStore.create());
  });

  it("ignores unknown option keys in the fingerprint", () => {
    expect(BlobStore.create({ bucketName: "photos", extra: 1 })).toBe(BlobStore.create({ bucketName: "photos" }));
  });

  it("uses explicit options on init and Config for omitted fields", async () => {
    const store = BlobStore.create({ bucketName: "photos" });
    await store._init();
    expect(store.bucketName).toBe("photos");
    expect(store.gcpProject).toBe("projectId");
  });
});

describe("BlobStore", () => {
  const fileId = "test-file";
  const fileData = "Hello, world!";
  let store;

  beforeEach(async () => {
    BlobStore._instances.clear();
    store = BlobStore.create();
    await store._init();
    store.bucket = new MockBucket();
    MockBucket.prototype.getFiles.mockClear();
  });

  describe("save", () => {
    it("should save a file", async () => {
      const result = await store.save(fileData, { id: fileId });
      expect(result).toBe(fileId);
    });

    it("should save a file with random id", async () => {
      const result = await store.save(fileData);
      expect(typeof result).toBe("string");
      expect(result.length).toBeTruthy();
    });
  });

  describe("download", () => {
    it("should download a file", async () => {
      await store.save(fileData, { id: fileId });
      const result = await store.download(fileId);
      expect(result.toString()).toBe(fileData);
    });
  });

  describe("list", () => {
    it("should list no files", async () => {
      const files = await store.list("query");
      expect(files.length).toBe(0);
      expect(store.bucket.getFiles).toBeCalledTimes(1);
      expect(store.bucket.getFiles).toBeCalledWith("query");
    });

    it("should list files", async () => {
      await store.save(fileData, { id: fileId });
      await store.save(fileData, { id: fileId });
      const files = await store.list("query");
      expect(files.length).toBe(2);
      expect(store.bucket.getFiles).toBeCalledTimes(1);
      expect(store.bucket.getFiles).toBeCalledWith("query");
    });
  });

  describe("setMetadata", () => {
    it("should set metadata for a file", async () => {
      await store.save(fileData, { id: fileId });
      const metadata = { foo: "bar" };
      await store.setMetadata(fileId, metadata);
      const fileMetadata = await store.bucket.file(fileId).getMetadata();
      expect(fileMetadata).toEqual(metadata);
    });
  });

  describe("delete", () => {
    it("should delete a file", async () => {
      await store.save(fileData, { id: fileId });
      await store.delete(fileId);
      const exists = await store.bucket.file(fileId).exists();
      expect(exists).toBe(false);
    });
  });

  describe("deleteMany", () => {
    it("should delete multiple files", async () => {
      const fileIds = ["test-file1", "test-file2"];
      await Promise.all(fileIds.map((id) => store.save(fileData, { id })));
      await store.deleteMany({ prefix: "test-file" });
      const files = await store.list({ prefix: "test-file" });
      expect(files.length).toBe(0);
    });
  });

  describe("getSignedUrl", () => {
    it("should return a signed URL with default action read", async () => {
      const expires = new Date(Date.now() + 60_000);
      const url = await store.getSignedUrl(fileId, { expires });

      expect(url).toBe(`https://signed.example/${fileId}`);
      const config = store.bucket.file(fileId).lastSignedUrlConfig;
      expect(config.version).toBe("v4");
      expect(config.action).toBe("read");
      expect(config.expires).toEqual(expires);
    });

    it("should sign a write URL with contentType", async () => {
      const expires = new Date(Date.now() + 60_000);
      const url = await store.getSignedUrl(fileId, {
        action: "write",
        expires,
        contentType: "image/jpeg",
      });

      expect(url).toBe(`https://signed.example/${fileId}`);
      const config = store.bucket.file(fileId).lastSignedUrlConfig;
      expect(config.action).toBe("write");
      expect(config.contentType).toBe("image/jpeg");
    });

    it("should normalize duration string expires via ms", async () => {
      const before = Date.now();
      await store.getSignedUrl(fileId, { expires: "15m" });
      const after = Date.now();

      const config = store.bucket.file(fileId).lastSignedUrlConfig;
      expect(config.expires).toBeInstanceOf(Date);
      expect(config.expires.getTime()).toBeGreaterThanOrEqual(before + 15 * 60_000);
      expect(config.expires.getTime()).toBeLessThanOrEqual(after + 15 * 60_000);
    });

    it("should accept absolute number expires (ms epoch)", async () => {
      const expires = Date.now() + 120_000;
      await store.getSignedUrl(fileId, { expires });

      const config = store.bucket.file(fileId).lastSignedUrlConfig;
      expect(config.expires).toBe(expires);
    });

    it("should reject missing expires", async () => {
      await expect(store.getSignedUrl(fileId, {})).rejects.toThrow(/expires/i);
    });

    it("should reject invalid action", async () => {
      await expect(
        store.getSignedUrl(fileId, { action: "delete", expires: new Date(Date.now() + 60_000) }),
      ).rejects.toThrow(/action/i);
    });
  });

  describe("lazy initialization", () => {
    beforeEach(() => {
      store._active = false;
      jest.spyOn(store, "_init").mockImplementation(async () => {
        store._active = true;
        store.bucket = new MockBucket();
      });
    });

    afterEach(() => {
      store._init.mockRestore();
    });

    it("should lazy-init on save", async () => {
      await store.save(fileData, { id: fileId });
      expect(store._init).toHaveBeenCalled();
    });

    it("should lazy-init on download", async () => {
      await store.save(fileData, { id: fileId });
      store._active = false;
      await store.download(fileId);
      expect(store._init).toHaveBeenCalledTimes(2);
    });

    it("should lazy-init on setMetadata", async () => {
      await store.setMetadata(fileId, { foo: "bar" });
      expect(store._init).toHaveBeenCalled();
    });

    it("should lazy-init on delete", async () => {
      await store.delete(fileId);
      expect(store._init).toHaveBeenCalled();
    });

    it("should lazy-init on list", async () => {
      await store.list("query");
      expect(store._init).toHaveBeenCalled();
    });

    it("should lazy-init on deleteMany", async () => {
      await store.deleteMany({ prefix: "test-file" });
      expect(store._init).toHaveBeenCalled();
    });

    it("should lazy-init on getSignedUrl", async () => {
      await store.getSignedUrl(fileId, { expires: new Date(Date.now() + 60_000) });
      expect(store._init).toHaveBeenCalled();
    });
  });
});
