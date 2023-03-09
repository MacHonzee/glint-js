import path from "path";
import express from "express";
// import axios from "axios";

class TestService {
  async startServer(appPath = "test-app") {
    process.chdir(path.join(process.cwd(), "test", appPath));
    const appExport = await import("../test-app/app");
    this.app = appExport.default;
  }

  async stopServer() {
    await this.app.stop();
  }

  async startExpress() {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    this.expressServer = await app.listen(8080);

    return app;
  }

  async stopExpress() {
    await this.expressServer?.close();
  }

  // async call() {}
}

export default new TestService();
