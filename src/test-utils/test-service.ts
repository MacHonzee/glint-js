import express, { Express } from "express";
import qs from "qs";
import axios, { AxiosResponse } from "axios";
import path from "path";
import { MongoMemoryServer } from "mongodb-memory-server-core";
import type UseCaseEnvironment from "../services/server/use-case-environment.js";
import type { Server } from "http";

/**
 * Test user data structure returned from authentication
 */
export interface TestUser {
  token: string;
  user: any;
}

/**
 * Service providing utilities for integration testing.
 * Handles server lifecycle, MongoDB in-memory instances, and HTTP request mocking.
 */
class TestService {
  private app?: any;
  private mongo?: MongoMemoryServer;
  private expressServer?: Server;

  /**
   * Starts GlintJs server from desired path.
   *
   * @param appPath - Path to the app file
   */
  async startServer(appPath: string = "./app.js"): Promise<void> {
    const cwd = process.cwd();

    const fullAppPath = path.join(cwd, appPath);
    process.chdir(path.dirname(fullAppPath));
    const appExport = await import(fullAppPath);
    process.chdir(cwd);

    this.app = appExport.default;
  }

  /**
   * Stops running GlintJs server.
   */
  async stopServer(): Promise<void> {
    await this.app.stop();
  }

  /**
   * Starts MongoDb in memory and returns connection string
   *
   * @returns MongoDB connection URI
   */
  async startMongo(): Promise<string> {
    const instance = await MongoMemoryServer.create();
    this.mongo = instance;
    return instance.getUri();
  }

  /**
   * Stops running memory server.
   */
  async stopMongo(): Promise<void> {
    await this.mongo!.stop();
  }

  /**
   * Starts standard Express server in given port (could be randomly generated)
   *
   * @param port - Port number (optional, will generate random if not provided)
   * @returns Express app instance
   */
  async startExpress(port?: number): Promise<Express> {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    const serverPort = port || this.getRandomPort();
    this.expressServer = await new Promise<Server>((resolve) => {
      const server = app.listen(serverPort, () => resolve(server));
    });

    return app;
  }

  /**
   * Stops running Express server.
   */
  async stopExpress(): Promise<void> {
    if (this.expressServer) {
      await new Promise<void>((resolve) => {
        this.expressServer!.close(() => resolve());
      });
    }
  }

  /**
   * Method generates random port between 20_000 and 30_000 that is not used anywhere yet.
   *
   * @returns Random unused port number
   */
  getRandomPort(): number {
    (global as any).usedPorts = (global as any).usedPorts || [];
    let randomPort: number;
    do {
      randomPort = Math.floor(Math.random() * 10_000) + 20_000;
    } while ((global as any).usedPorts.includes(randomPort));
    (global as any).usedPorts.push(randomPort);
    return randomPort;
  }

  /**
   * Method calls GET command on created AppServer
   *
   * @param useCase - Use case path
   * @param data - Request data
   * @param user - Test user for authentication
   * @param options - Additional axios options
   * @returns Axios response
   */
  async callGet(useCase: string, data?: any, user?: Promise<TestUser>, options?: any): Promise<any> {
    return await this.call("GET", useCase, data, user, options);
  }

  /**
   * Method calls POST command on created AppServer
   *
   * @param useCase - Use case path
   * @param data - Request data
   * @param user - Test user for authentication
   * @param options - Additional axios options
   * @returns Axios response
   */
  async callPost(useCase: string, data?: any, user?: Promise<TestUser>, options?: any): Promise<any> {
    return await this.call("POST", useCase, data, user, options);
  }

  /**
   * Method calls any method command on created server
   *
   * @param method - HTTP method
   * @param useCase - Use case path
   * @param data - Request data
   * @param user - Test user for authentication
   * @param options - Additional axios options
   * @returns Axios response
   */
  async call(
    method: "GET" | "POST",
    useCase: string,
    data?: any,
    user?: Promise<TestUser>,
    options?: any,
  ): Promise<AxiosResponse<any> | { error: any; response: any }> {
    const { Config } = await import("../index.js");
    const url = `http://localhost:${Config.PORT || 56123}/${useCase.replace(/^\//, "")}`;

    const requestOptions: any = {
      method,
      url,
      ...options,
    };

    // get token of user
    if (user) {
      const userData = await user;
      requestOptions.headers = requestOptions.headers || {};
      requestOptions.headers.authorization = "Bearer " + userData.token;
    }

    if (data) {
      if (method === "GET") {
        requestOptions.params = data;
        requestOptions.paramsSerializer = {
          serialize(params: any) {
            return qs.stringify(params);
          },
        };
      } else {
        requestOptions.data = data;
      }
    }

    try {
      return await axios.request(requestOptions);
    } catch (e: any) {
      console.error("Unexpected error when calling TestApp.", e.response.status, e.response.data);
      return { error: e, response: e.response };
    }
  }

  /**
   * Method creates instance of UseCaseEnvironment filled with basic context and optionally with
   * dtoIn, session and authorizationResult.
   *
   * @param useCase - Use case path
   * @param data - Request data (dtoIn)
   * @param user - User data for session
   * @param authorizedRoles - Roles to set in authorization result
   * @returns UseCaseEnvironment instance
   */
  async getUcEnv(
    useCase: string,
    data: any = {},
    user?: Function | Promise<string> | any,
    authorizedRoles: string[] = [],
  ): Promise<UseCaseEnvironment> {
    // cannot be at top-level imports
    const { jest } = await import("@jest/globals");
    const { UseCaseEnvironment, Session, AuthorizationResult, RouteRegister } = await import("../index.js");

    const mockRequest: any = {
      protocol: "http",
      host: "localhost:56123",
      url: "/" + useCase.replace(/^\//, ""),
      originalUrl: "/" + useCase.replace(/^\//, ""),
      query: {},
      body: data,
      files: {},
      headers: {},
      signedCookies: {},
      get: function (param: string) {
        return this[param];
      },
    };

    const mockResponse: any = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
      set: jest.fn(),
      _headers: {},
    };

    // Mock the set method to actually store headers so we can read them in tests
    mockResponse.set.mockImplementation((name: string, value: any) => {
      mockResponse._headers[name.toLowerCase()] = value;
    });

    const ucEnv = new UseCaseEnvironment(mockRequest, mockResponse);

    if (user) {
      const userData = typeof user === "function" ? await user() : await user;
      ucEnv.session = new Session(userData);
    }

    const sessionUser = ucEnv.session?.user;
    const username = typeof sessionUser === "string" ? sessionUser : sessionUser?.email;

    const route = RouteRegister.getRoute(useCase);

    ucEnv.authorizationResult = new AuthorizationResult({
      authorized: true,
      username,
      useCaseRoles: (route as any)?.roles || [],
      userRoles: authorizedRoles,
      useCase,
    });

    return ucEnv;
  }
}

export default new TestService();
