import path from 'path';
import Config from '../services/utils/config.js';

class ServeStaticMiddleware {
  ORDER = -999;

  async process(req, res, next) {
    if (!req.ucEnv.static) {
      return next();
    }

    const staticFld = path.join(Config.SERVER_ROOT, 'build');
    const indexHtmlPath = path.join(staticFld, 'index.html');

    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(indexHtmlPath);
  }
}

export default new ServeStaticMiddleware();
