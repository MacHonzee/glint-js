import passport from 'passport';

class LocalStrategy {
  async init() {
    const UserModel = (await import('../../models/user-model.js')).default;
    passport.use(UserModel.createStrategy());
    passport.serializeUser(UserModel.serializeUser());
    passport.deserializeUser(UserModel.deserializeUser());
  }
}

export default new LocalStrategy();
