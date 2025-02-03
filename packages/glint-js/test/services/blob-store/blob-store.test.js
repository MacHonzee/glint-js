import { jest, beforeEach, describe, it, expect } from "@jest/globals";
import { Config, BlobStore } from "../../../src/index.js";

// mock dependencies
Config.set("GOOGLE_CLOUD_PROJECT", "projectId");
class MockBucket {
  files = [];

  file(fileId) {
    const foundFile = this.files.find((file) => file.id === fileId);
    return foundFile || new MockFile(this, fileId);
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
});
