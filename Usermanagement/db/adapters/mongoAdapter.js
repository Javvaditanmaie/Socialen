import DBInterface from "../db.interface.js";

class MongoAdapter extends DBInterface {
  create(Model, data) {
    return Model.create(data);
  }

  findOne(Model, query = {}, projection = null, opts = {}) {
    return Model.findOne(query, projection, opts);
  }

  findById(Model, id, projection = null, opts = {}) {
    return Model.findById(id, projection, opts);
  }

  find(Model, query = {}, projection = null, opts = {}) {
    return Model.find(query, projection, opts);
  }

  updateOne(Model, query, update, opts = {}) {
    return Model.updateOne(query, update, opts);
  }

  findByIdAndUpdate(Model, id, update, opts = { new: true }) {
    return Model.findByIdAndUpdate(id, update, opts);
  }

  deleteOne(Model, query) {
    return Model.deleteOne(query);
  }

  deleteById(Model, id) {
    return Model.findByIdAndDelete(id);
  }

  count(Model, query = {}) {
    return Model.countDocuments(query);
  }
}

export default new MongoAdapter();
