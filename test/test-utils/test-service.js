import express from "express";
import qs from "qs";
import axios from "axios";
import path from "path";
import { MongoMemoryServer } from "mongodb-memory-server-core";
import UseCaseEnvironment from "../../src/services/server/use-case-environment.js";

class TestService {
  /**
   * Starts GlintJs server from desired path.
   *
   * @param {string} appPath
   * @returns {Promise<void>}
   */
  async startServer(appPath = "test-app") {
    const cwd = process.cwd();

    process.chdir(path.join(cwd, "test", appPath));
    const appExport = await import("../test-app/app");
    process.chdir(cwd);

    this.app = appExport.default;
  }

  /**
   * Stops running GlintJs server.
   *
   * @returns {Promise<void>}
   */
  async stopServer() {
    await this.app.stop();
  }

  /**
   * Starts MongoDb in memory and returns connection string
   *
   * @returns {Promise<string>}
   */
  async startMongo() {
    const instance = await MongoMemoryServer.create();
    this.mongo = instance;
    return instance.getUri();
  }

  /**
   * Stops running memory server.
   *
   * @returns {Promise<void>}
   */
  async stopMongo() {
    await this.mongo.stop();
  }

  /**
   * Starts standard Express server in given port (could be randomly generated)
   *
   * @param {number?} port
   * @returns {Promise<Express>}
   */
  async startExpress(port) {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    const serverPort = port || this.getRandomPort();
    this.expressServer = await app.listen(serverPort);

    return app;
  }

  /**
   * Stops running Express server.
   *
   * @returns {Promise<void>}
   */
  async stopExpress() {
    await this.expressServer?.close();
  }

  /**
   * Method generates random port between 10_000 and 20_000 that is not used anywhere yet.
   *
   * @returns {number}
   */
  getRandomPort() {
    global.usedPorts = global.usedPorts || [];
    let randomPort;
    do {
      randomPort = Math.floor(Math.random() * 10_000) + 20_000;
    } while (global.usedPorts.includes(randomPort));
    global.usedPorts.push(randomPort);
    return randomPort;
  }

  /**
   * Method calls GET command on created AppServer
   *
   * @param {string} useCase
   * @param {(object | File)?} data
   * @param {Function | Promise<string>?} user
   * @returns {Promise<*>}
   */
  async callGet(useCase, data, user) {
    return await this.call("GET", useCase, data, user);
  }

  /**
   * Method calls POST command on created AppServer
   *
   * @param {string} useCase
   * @param {(object | File)?} data
   * @param {Function | Promise<string>?} user
   * @returns {Promise<*>}
   */
  async callPost(useCase, data, user) {
    return await this.call("POST", useCase, data, user);
  }

  /**
   * Method calls any method command on created server
   *
   * @param {"GET" | "POST"} method
   * @param {string} useCase
   * @param {(object | File)?} data
   * @param {Function | Promise<string>?} user
   * @returns {Promise<axios.AxiosResponse<any>>}
   */
  async call(method, useCase, data, user) {
    const { Config } = await import("../../src/index.js");
    const url = `http://localhost:${Config.PORT || 8080}/${useCase.replace(/^\//, "")}`;

    const requestOptions = {
      method,
      url,
    };

    // get token of user
    if (user) {
      const token = typeof user === "function" ? await user() : await user;
      requestOptions.headers = { authorization: token };
    }

    if (data) {
      if (method === "GET") {
        requestOptions.params = data;
        requestOptions.paramsSerializer = {
          serialize(params) {
            return qs.stringify(params);
          },
        };
      } else {
        requestOptions.data = data;
      }
    }

    try {
      return await axios.request(requestOptions);
    } catch (e) {
      console.error("Unexpected error when calling TestApp.", e.response.status, e.response.data);
      return e.response;
    }
  }

  /**
   * Method creates instance of UseCaseEnvironment filled with basic context and optionally with
   * dtoIn, session and authorizationResult.
   *
   * @param useCase
   * @param data
   * @returns {Promise<UseCaseEnvironment>}
   */
  async getUcEnv(useCase, data = {}) {
    const { jest } = await import("@jest/globals");

    const mockRequest = {
      protocol: "http",
      host: "localhost:8080",
      url: "/" + useCase.replace(/^\//, ""),
      originalUrl: "/" + useCase.replace(/^\//, ""),
      query: {},
      body: data,
      files: {},
      get: function (param) {
        return this[param];
      },
    };

    const mockResponse = {
      cookie: jest.fn(),
    };

    return new UseCaseEnvironment(mockRequest, mockResponse);
  }
}

export default new TestService();
