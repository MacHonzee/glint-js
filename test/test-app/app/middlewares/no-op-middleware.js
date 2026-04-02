class NoOpMiddleware {
  ORDER = -100;

  process(req, res, next) {
    next();
  }
}

export default new NoOpMiddleware();
