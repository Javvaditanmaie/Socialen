import mongoAdapter from "./mongoAdapter.js";

const dbAdapter = {
  create: mongoAdapter.create,
  findOne: mongoAdapter.findOne,
  findById: mongoAdapter.findById,
  find: mongoAdapter.find,
  updateOne: mongoAdapter.updateOne,
  findByIdAndUpdate: mongoAdapter.findByIdAndUpdate,
  deleteOne: mongoAdapter.deleteOne,
  deleteById: mongoAdapter.deleteById,
  count: mongoAdapter.count,
};

export default dbAdapter;
