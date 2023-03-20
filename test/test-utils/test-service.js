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

  async startExpress(port) {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    const serverPort = port || this.getRandomPort();
    this.expressServer = await app.listen(serverPort);

    return app;
  }

  async stopExpress() {
    await this.expressServer?.close();
  }

  getRandomPort() {
    global.usedPorts = global.usedPorts || [];
    let randomPort;
    do {
      randomPort = Math.floor(Math.random() * 10_000) + 20_000;
    } while (global.usedPorts.includes(randomPort));
    global.usedPorts.push(randomPort);
    return randomPort;
  }

  // async call() {}
}

export default new TestService();
