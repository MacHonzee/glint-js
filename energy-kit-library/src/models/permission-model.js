import mongoose from 'mongoose';

// TODO rewrite this to same ModelFactory, there is too much unnecessary boilerplate

// TODO disable autocreate on indexes for production and make sure that we can init it correctly somehow
const schema = new mongoose.Schema(
    {identity: {type: String}, role: {type: String}},
    {timestamps: true},
);
schema.index({identity: 1, role: 1}, {unique: true});

class ModelClass {
  static listByUser(identity) {
    return this.find({identity});
  }

  static deleteByUser(identity) {
    return this.deleteMany({identity});
  }

  static delete(identity, role) {
    return this.deleteOne({identity, role});
  }
}

schema.loadClass(ModelClass);
const Permission = mongoose.model('Permission', schema);
export default Permission;
