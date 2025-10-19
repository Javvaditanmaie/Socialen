// config/dbAdapter.js
// Simple forwarder to mongoAdapter - makes it easy to swap adapters later
const mongoAdapter = require("./mongoAdapter");

module.exports = {
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
