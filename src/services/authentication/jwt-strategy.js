import passport from 'passport';
import {Strategy, ExtractJwt} from 'passport-jwt';

class JwtStrategy {
  async init() {
    const UserModel = await import('../../models/user-model.js');

    const opts = {};
    opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
    opts.secretOrKey = process.env.JWT_SECRET;

    // TODO check whether it can be async
    function verifyCallback(jwtPayload, done) {
      console.log('-> jwtPayload', jwtPayload);

      // TODO check this whether we need it really
      // Check against the DB only if necessary.
      // This can be avoided if you don't want to fetch user details in each request.
      UserModel.default.findOne({_id: jwtPayload._id}, function(err, user) {
        console.log('-> user', user);
        console.log('-> err', err);

        if (err) {
          return done(err, false);
        }
        if (user) {
          return done(null, user);
        } else {
          return done(null, false);
          // or you could create a new account
        }
      });
    }

    // Used by the authenticated requests to deserialize the user,
    // i.e., to fetch user details from the JWT.
    const jwtStrategy = new Strategy(opts, verifyCallback);

    passport.use(jwtStrategy);
  }
}

export default new JwtStrategy();
